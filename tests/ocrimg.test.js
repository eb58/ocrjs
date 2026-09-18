const createImage = require('../src/ocrimg');

const pixels = (image, width, height) =>
  Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, column) => image.getPix(column, row)));

test('stores pixels in row-major order', () => {
  const image = createImage([0, 1, 1, 0, 1, 0], 3, 2);

  expect(pixels(image, 3, 2)).toEqual([
    [0, 1, 1],
    [0, 1, 0],
  ]);
});

test('invert swaps black and white pixels', () => {
  const image = createImage([0, 1, 1, 0], 2, 2).invert();

  expect(pixels(image, 2, 2)).toEqual([
    [1, 0],
    [0, 1],
  ]);
});

test('adjustBW inverts an image with a predominantly black background', () => {
  const image = createImage(Array(26).fill(1), 13, 2).adjustBW();

  expect(pixels(image, 13, 2).flat()).toEqual(Array(26).fill(0));
});

test('frompng converts RGBA pixels to black and white values', () => {
  const png = {
    width: 2,
    height: 1,
    data: [255, 20, 20, 255, 0, 240, 240, 255],
  };
  const image = createImage().frompng(png);

  expect(pixels(image, 2, 1)).toEqual([[true, false]]);
});

test('cropGlyph removes the white border around a glyph', () => {
  const image = createImage([0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0], 5, 4).cropGlyph();

  expect(image.imgdata).toEqual([1, 1, 1, 1, 0, 1]);
  expect(pixels(image, 3, 2)).toEqual([
    [1, 1, 1],
    [1, 0, 1],
  ]);
});

test('scaleUp duplicates source pixels into nearest-neighbour blocks', () => {
  const image = createImage([1, 0, 0, 1], 2, 2).scaleUp(4, 4);

  expect(pixels(image, 4, 4)).toEqual([
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 1, 1],
  ]);
});

test('scaleDown expresses occupied target cells as percentages', () => {
  const image = createImage(Array(16).fill(1), 4, 4).scaleDown(2, 2);

  expect(image.imgdata).toEqual([100, 100, 100, 100]);
});

test('despeckle removes an isolated black pixel', () => {
  const image = createImage([0, 0, 0, 0, 1, 0, 0, 0, 0], 3, 3).despeckle();

  expect(image.getPix(1, 1)).toBe(0);
});

test('extractGlyph removes tiny regions and retains a connected glyph', () => {
  const image = createImage([1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0], 4, 4).extractGlyph();

  expect(pixels(image, 4, 4)).toEqual([
    [0, 0, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 1, 1],
    [0, 0, 0, 0],
  ]);
});
