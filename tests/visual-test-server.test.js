const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const { analyzeImage, listTasks, loadDatabases } = require('../src/analysis');
const { createServer, normalizePng, planAnalysis, runAnalysis, stopWorkers } = require('../src/visual-test-server');

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
  const buffer = buildPng({ width: 4, height: 4, background: 255, foreground: 0, foregroundPixels: new Set([5, 6, 9, 10]) });

  expect(cornerPixel(normalizePng(buffer))).toBe(255);
});

test('normalizePng inverts a black-background training image to a white background', () => {
  const buffer = buildPng({ width: 4, height: 4, background: 0, foreground: 255, foregroundPixels: new Set([5, 6, 9, 10]) });

  expect(cornerPixel(normalizePng(buffer))).toBe(255);
});

describe('runAnalysis via worker pool', () => {
  const params = { dataset: 'eb', limit: 2, offset: 0, mode: '6x4', secureThreshold: 2.4 };

  test('matches a sequential run exactly, including order', async () => {
    const databases = loadDatabases(params.dataset, params.mode);
    const expected = listTasks(params).map(({ file, expected: digit }) =>
      analyzeImage(file, digit, params.dataset, databases, params.secureThreshold)
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
});
