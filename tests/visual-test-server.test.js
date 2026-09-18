const http = require('http');
const { PNG } = require('pngjs');
const { createServer, normalizePng } = require('../src/visual-test-server');

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
