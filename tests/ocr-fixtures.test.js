const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const createImage = require('../src/img');

const fixtureDir = path.join(__dirname, 'fixtures');
const fixtureNames = fs.readdirSync(fixtureDir).filter((name) => name.endsWith('.png'));
const loadFixture = (name) => PNG.sync.read(fs.readFileSync(path.join(fixtureDir, name)));

const countBlackPixels = (image, width, height) =>
  Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, column) => image.getPix(column, row)))
    .flat()
    .filter(Boolean).length;

test('contains two real examples of every digit', () => {
  const digits = fixtureNames.map((name) => Number(name.match(/^digit-(\d)/)[1]));

  expect(fixtureNames).toHaveLength(20);
  expect(Array.from({ length: 10 }, (_, digit) => digits.filter((value) => value === digit).length)).toEqual(
    Array(10).fill(2),
  );
});

test.each(fixtureNames)('runs the complete preprocessing pipeline for %s', (filename) => {
  const png = loadFixture(filename);
  const image = createImage().frompng(png).adjustBW();
  const blackPixels = countBlackPixels(image, png.width, png.height);
  const scaled = image.despeckle().cropGlyph().scaleDown(8, 6).imgdata;

  expect(blackPixels).toBeGreaterThan(0);
  expect(blackPixels).toBeLessThan(png.width * png.height);
  expect(scaled).toHaveLength(48);
  expect(scaled.every(Number.isFinite)).toBe(true);
  expect(scaled.some((pixel) => pixel > 0)).toBe(true);
});

test.each([
  ['digit-0.png', 658, 1374],
  ['digit-1.png', 385, 1460],
  ['digit-8.png', 933, 1549],
])('preprocesses the real fixture %s', (filename, expectedBlackPixels, expectedChecksum) => {
  const png = loadFixture(filename);
  const image = createImage().frompng(png).adjustBW();

  expect([png.width, png.height]).toEqual([110, 150]);
  expect(countBlackPixels(image, png.width, png.height)).toBe(expectedBlackPixels);

  const scaled = image.despeckle().cropGlyph().scaleDown(8, 6).imgdata;

  expect(scaled).toHaveLength(48);
  expect(scaled.reduce((sum, pixel) => sum + pixel, 0)).toBe(expectedChecksum);
  expect(scaled.some((pixel) => pixel > 0)).toBe(true);
});
