const { PNG } = require('pngjs');
const { normalizePng } = require('../src/visual-test-server');

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
