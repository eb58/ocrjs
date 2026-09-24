const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const { analyzeImage, listTasks, loadDatabases, recognitionOptionsFor } = require('../src/analysis');
const {
  createServer,
  normalizePng,
  planAnalysis,
  regenerateDatabases,
  relabelImage,
  removeTrainingImage,
  requestParams,
  runAnalysis,
  stopWorkers,
  traceAnalysis,
} = require('../src/visual-test-server');

afterAll(() => stopWorkers());

const buildPng = ({ width, height, background, foreground, foregroundPixels }) => {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const value = foregroundPixels.has(i) ? foreground : background;
    png.data[4 * i] = value;
    png.data[4 * i + 1] = value;
    png.data[4 * i + 2] = value;
    png.data[4 * i + 3] = 255;
  }
  return PNG.sync.write(png);
};

const cornerPixel = (buffer) => PNG.sync.read(buffer).data[0];

test('normalizePng leaves an already white-background image unchanged in polarity', () => {
  const buffer = buildPng({
    width: 4,
    height: 4,
    background: 255,
    foreground: 0,
    foregroundPixels: new Set([5, 6, 9, 10]),
  });

  expect(cornerPixel(normalizePng(buffer))).toBe(255);
});

test('normalizePng inverts a black-background training image to a white background', () => {
  const buffer = buildPng({
    width: 4,
    height: 4,
    background: 0,
    foreground: 255,
    foregroundPixels: new Set([5, 6, 9, 10]),
  });

  expect(cornerPixel(normalizePng(buffer))).toBe(255);
});

describe('runAnalysis via worker pool', () => {
  const params = { dataset: 'eb', limit: 2, offset: 0, mode: '6x4', secureThreshold: 2.4 };

  test('matches a sequential run exactly, including order', async () => {
    const databases = loadDatabases(params.dataset, params.mode);
    const expected = listTasks(params).map(({ file, expected: digit }) =>
      analyzeImage(
        file,
        digit,
        params.dataset,
        databases,
        params.secureThreshold,
        recognitionOptionsFor(params.dataset),
      ),
    );

    const actual = await runAnalysis(params);

    expect(actual.total).toBe(expected.length);
    expect(actual.results).toEqual(expected);
  }, 60000);

  test('returns an empty batch past the end without failing', async () => {
    await expect(runAnalysis({ ...params, offset: 999999 })).resolves.toEqual({
      durationMs: 0,
      results: [],
      total: 0,
    });
  });

  test('supports the complete search as a comparison mode', async () => {
    const fullParams = { ...params, searchMode: 'full' };
    const databases = loadDatabases(params.dataset, params.mode);
    const expected = listTasks(params).map(({ file, expected: digit }) =>
      analyzeImage(file, digit, params.dataset, databases, params.secureThreshold),
    );
    await expect(runAnalysis(fullParams)).resolves.toMatchObject({ results: expected });
  }, 60000);

  test('rejects an unknown search mode', async () => {
    await expect(runAnalysis({ ...params, searchMode: 'unknown' })).rejects.toThrow('Unbekannter Suchmodus');
  });

  test('rejects an unknown dataset', async () => {
    await expect(runAnalysis({ ...params, dataset: 'unbekannt' })).rejects.toThrow('Unbekannter Datensatz');
  });
});

describe('planAnalysis', () => {
  test('counts the images a run will process', () => {
    expect(planAnalysis({ dataset: 'eb', limit: 2, offset: 0 })).toEqual({
      total: listTasks({ dataset: 'eb', limit: 2, offset: 0 }).length,
    });
  });

  test('rejects an unknown dataset', () => {
    expect(() => planAnalysis({ dataset: 'unbekannt', limit: 2, offset: 0 })).toThrow('Unbekannter Datensatz');
  });

  test('plans the separately selectable EB test set', () => {
    expect(planAnalysis({ dataset: 'eb', testSet: '2026-09-21', limit: 1, offset: 0 })).toEqual({
      total: listTasks({ dataset: 'eb', testSet: '2026-09-21', limit: 1, offset: 0 }).length,
    });
  });
});

describe('traceAnalysis', () => {
  const [{ file }] = listTasks({ dataset: 'eb', limit: 1, offset: 0 });
  const digit = Number(path.basename(path.dirname(file)).replace('img', ''));

  test('describes the same recognition result step by step', () => {
    const trace = traceAnalysis({
      dataset: 'eb',
      digit,
      filename: path.basename(file),
      mode: '6x4',
      searchMode: 'full',
      secureThreshold: 2.4,
    });

    expect(trace.steps[0]).toMatchObject({ dimension: '6x4', search: 'full', type: 'dimension' });
    expect(trace.steps[0].candidates).toHaveLength(3);
    expect(trace.result.filename).toBe(path.basename(file));
  });

  test('does not allow tracing a file outside the selected test directory', () => {
    expect(() => traceAnalysis({ dataset: 'eb', digit, filename: '../secret.png' })).toThrow('Testbild nicht gefunden');
  });
});

describe('handleRequest method guard', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    server = createServer();
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  const request = (method, path) =>
    new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}${path}`, { method, agent: false }, (res) => {
        res.resume();
        res.on('end', () => resolve(res));
      });
      req.on('error', reject);
      req.end();
    });

  test('rejects POST with 405 and an Allow header', async () => {
    const res = await request('POST', '/api/run');

    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('GET, HEAD');
  });

  test('rejects DELETE with 405', async () => {
    const res = await request('DELETE', '/');

    expect(res.statusCode).toBe(405);
  });

  test('still serves GET requests normally', async () => {
    const res = await request('GET', '/api/run?dataset=unknown');

    expect(res.statusCode).toBe(500);
  });
});

describe('/image/query - das tatsaechlich verglichene Raster', () => {
  let server;
  let baseUrl;
  const [{ file }] = listTasks({ dataset: 'eb', limit: 1, offset: 0 });
  const filename = path.basename(file);
  const digit = path.basename(path.dirname(file)).replace('img', '');

  beforeAll((done) => {
    server = createServer();
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  const requestBody = (path) =>
    new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}${path}`, { agent: false }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      req.end();
    });

  test('renders an upscaled grayscale grid sized to the requested dimension', async () => {
    const res = await requestBody(`/image/query/8x6/test/eb/${digit}/${encodeURIComponent(filename)}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    const png = PNG.sync.read(res.body);
    expect([png.width, png.height]).toEqual([6 * 16, 8 * 16]);
  });

  test('rejects an unknown dimension', async () => {
    const res = await requestBody(`/image/query/9x9/test/eb/${digit}/${encodeURIComponent(filename)}`);

    expect(res.status).toBe(404);
  });

  test.each(['2026-09-21', 'review'])('serves images of the additional EB test set %s', async (testSet) => {
    const [task] = listTasks({ dataset: 'eb', testSet, limit: 1, offset: 0 });
    const result = analyzeImage(task.file, task.expected, 'eb', loadDatabases('eb', '6x4'));
    const group = path.basename(path.dirname(path.dirname(task.file)));

    expect(result.image).toBe(`/image/${group}/eb/${task.expected}/${encodeURIComponent(path.basename(task.file))}`);
    for (const url of [result.image, result.queryImage]) {
      const res = await requestBody(url);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    }
  });

  test('refuses image folders that are neither training data nor a registered test set', async () => {
    const res = await requestBody(`/image/dbs/eb/${digit}/${encodeURIComponent(filename)}`);

    expect(res.status).toBe(404);
  });
});

describe('requestParams', () => {
  const parse = (query) => requestParams(new URLSearchParams(query));

  test('uses the defaults when parameters are missing or empty', () => {
    const defaults = { limit: 20, offset: 0, secureThreshold: 2.4 };
    expect(parse('')).toMatchObject(defaults);
    expect(parse('limit=&offset=&threshold=')).toMatchObject(defaults);
  });

  test('clamps given values to their allowed range', () => {
    expect(parse('limit=99999&offset=-5&threshold=0.5')).toMatchObject({ limit: 5000, offset: 0, secureThreshold: 1 });
    expect(parse('limit=0&threshold=3')).toMatchObject({ limit: 0, secureThreshold: 3 });
  });

  test('falls back to the defaults for non-numeric values', () => {
    expect(parse('limit=abc&threshold=x')).toMatchObject({ limit: 20, secureThreshold: 2.4 });
  });
});

describe('relabelImage - falsch einsortierte Testbilder verschieben', () => {
  const reviewDir = path.join(__dirname, '..', 'data', 'imgs', 'eb', 'review');
  const removedDir = path.join(__dirname, '..', 'data', 'imgs', 'eb', 'removed', 'review');
  const name = '__relabel-test.png';
  const at = (digit) => path.join(reviewDir, `img${digit}`, name);
  const cleanup = () =>
    [...Array.from({ length: 10 }, (_, digit) => at(digit)), path.join(removedDir, 'img3', name)].forEach((file) =>
      fs.rmSync(file, { force: true }),
    );
  const params = (digit, target) => ({ dataset: 'eb', testSet: 'review', digit, filename: name, target });

  beforeEach(() => {
    cleanup();
    fs.copyFileSync(listTasks({ dataset: 'eb', testSet: 'review', limit: 1, offset: 0 })[0].file, at(0));
  });
  afterAll(cleanup);

  test('moves an image to another digit folder of the same test set and back', () => {
    expect(relabelImage(params(0, 3))).toEqual({ moved: `imgs/eb/review/img3/${name}`, target: 3 });
    expect(fs.existsSync(at(0))).toBe(false);
    expect(fs.existsSync(at(3))).toBe(true);
    relabelImage(params(3, 0));
    expect(fs.existsSync(at(0))).toBe(true);
  });

  test('sets an image aside under removed/, keeping its digit folder', () => {
    relabelImage(params(0, 3));
    expect(relabelImage(params(3, 'removed')).moved).toBe(`imgs/eb/removed/review/img3/${name}`);
    expect(fs.existsSync(path.join(removedDir, 'img3', name))).toBe(true);
  });

  test('refuses invalid moves and never overwrites', () => {
    expect(() => relabelImage(params(0, 0))).toThrow('Ungueltiges Ziel');
    expect(() => relabelImage(params(0, 10))).toThrow('Ungueltiges Ziel');
    expect(() => relabelImage({ ...params(4, 1), filename: 'gibt-es-nicht.png' })).toThrow('nicht gefunden');
    expect(() => relabelImage({ ...params(0, 1), testSet: 'train' })).toThrow('Unbekanntes Testset');
    fs.copyFileSync(at(0), at(5));
    expect(() => relabelImage(params(0, 5))).toThrow('schon ein Bild');
    expect(fs.existsSync(at(0))).toBe(true);
  });

  test('ignores path components in the file name', () => {
    expect(() => relabelImage({ ...params(0, 1), filename: `../img0/${name}` })).not.toThrow();
    expect(fs.existsSync(at(1))).toBe(true);
  });

  test('is reachable via POST /api/relabel only', async () => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const url = (target) =>
      `http://localhost:${server.address().port}/api/relabel?dataset=eb&testSet=review&digit=0&file=${name}&target=${target}`;
    const send = (method, target) =>
      new Promise((resolve, reject) => {
        const req = http.request(url(target), { method, agent: false }, (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
        });
        req.on('error', reject);
        req.end();
      });
    try {
      expect((await send('PUT', 2)).status).toBe(405);
      expect((await send('POST', 0)).status).toBe(400);
      const moved = await send('POST', 2);
      expect(moved.status).toBe(200);
      expect(JSON.parse(moved.body).target).toBe(2);
      expect(fs.existsSync(at(2))).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe('removeTrainingImage - Trainingsbilder aussortieren', () => {
  const name = '__remove-train-test.png';
  const trainFile = path.join(__dirname, '..', 'data', 'imgs', 'eb', 'train', 'img4', name);
  const removedFile = path.join(__dirname, '..', 'data', 'imgs', 'eb', 'removed', 'train', 'img4', name);
  const cleanup = () => [trainFile, removedFile].forEach((file) => fs.rmSync(file, { force: true }));

  beforeEach(() => {
    cleanup();
    fs.copyFileSync(listTasks({ dataset: 'eb', limit: 1, offset: 0 })[0].file, trainFile);
  });
  afterAll(cleanup);

  test('moves the image to removed/train and leaves the DBs alone when it is not in them', () => {
    expect(removeTrainingImage({ dataset: 'eb', digit: 4, filename: name })).toEqual({
      moved: `imgs/eb/removed/train/img4/${name}`,
      databases: [],
    });
    expect(fs.existsSync(trainFile)).toBe(false);
    expect(fs.existsSync(removedFile)).toBe(true);
  });

  test('refuses invalid requests and never overwrites', () => {
    expect(() => removeTrainingImage({ dataset: 'eb', digit: 10, filename: name })).toThrow('Ungueltige Ziffer');
    expect(() => removeTrainingImage({ dataset: 'eb', digit: 3, filename: name })).toThrow('nicht gefunden');
    expect(() => removeTrainingImage({ dataset: 'eb', digit: 4, filename: `../img3/${name}` })).not.toThrow();
    fs.copyFileSync(removedFile, trainFile);
    expect(() => removeTrainingImage({ dataset: 'eb', digit: 4, filename: name })).toThrow('schon ein Bild');
    expect(fs.existsSync(trainFile)).toBe(true);
  });
});

describe('regenerateDatabases', () => {
  test('rejects unknown datasets instead of throwing synchronously', async () => {
    await expect(regenerateDatabases({ dataset: 'xx' })).rejects.toThrow('Unbekannter Datensatz');
  });
});
