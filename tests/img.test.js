const createImage = require('../src/img');

test('clone keeps dimensions and isolates mutating operations', () => {
  const original = createImage([0, 1, 1, 0, 0, 1], 3, 2);
  const clone = original.clone().invert();
  expect(original.imgdata).toEqual([0, 1, 1, 0, 0, 1]);
  expect(clone.getPix(2, 1)).toBe(0);
  expect(clone.getPix(0, 1)).toBe(1);
});

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

  expect(image.imgdata).toEqual([1, 0, 0, 1]);
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

  expect(image.imgdata).toHaveLength(2);
  expect(pixels(image, 2, 1)).toEqual([[1, 0]]);
});

test('does not leak implementation names into the global scope', () => {
  createImage([0, 1, 0], 3, 1).cropGlyphInner();

  expect(global.createImage).toBeUndefined();
  expect(global.createImageWithMargin).toBeUndefined();
  expect(global.innerbox).toBeUndefined();
  expect(global.foundInRow).toBeUndefined();
  expect(global.foundInCol).toBeUndefined();
});

test('cropGlyph removes the white border around a glyph', () => {
  const image = createImage([0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0], 5, 4).cropGlyph();

  expect(image.imgdata).toEqual([1, 1, 1, 1, 0, 1]);
  expect(pixels(image, 3, 2)).toEqual([
    [1, 1, 1],
    [1, 0, 1],
  ]);
});

test('cropGlyph returns a single white pixel for an empty image', () => {
  expect(createImage(Array(12).fill(0), 4, 3).cropGlyph().imgdata).toEqual([0]);
});

test('cropGlyphInner crops a glyph around the image centre', () => {
  const image = createImage(
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    5,
    5
  ).cropGlyphInner();

  expect(image.imgdata).toEqual(Array(9).fill(1));
});

test('createImageWithMargin centres an extremely wide image', () => {
  const image = createImage(Array(8).fill(1), 8, 1).createImageWithMargin();

  expect(image.imgdata).toHaveLength(88);
  expect(pixels(image, 8, 11)[5]).toEqual(Array(8).fill(1));
  expect(image.imgdata.filter(Boolean)).toHaveLength(8);
});

test('createImageWithMargin centres an extremely tall image', () => {
  const image = createImage(Array(8).fill(1), 1, 8).createImageWithMargin();

  expect(image.imgdata).toHaveLength(48);
  expect(Array.from({ length: 8 }, (_, row) => image.getPix(2, row))).toEqual(Array(8).fill(1));
  expect(image.imgdata.filter(Boolean)).toHaveLength(8);
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

test('despeckle(0) keeps pixels that have no black neighbours at all', () => {
  const image = createImage([0, 0, 0, 0, 1, 0, 0, 0, 0], 3, 3).despeckle(0);

  expect(image.getPix(1, 1)).toBe(1);
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

test('extractGlyph leaves a blank image unchanged instead of crashing', () => {
  const image = createImage(Array(9).fill(0), 3, 3).extractGlyph();

  expect(image.imgdata).toEqual(Array(9).fill(0));
});

test('extractBiggestGlyph retains only the largest connected region', () => {
  const image = createImage([1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1], 5, 4).extractBiggestGlyph();

  expect(pixels(image, 5, 4)).toEqual([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 0, 1, 1],
    [0, 0, 0, 1, 1],
  ]);
});

test('prepare can discard disconnected marks before cropping the glyph', () => {
  const png = {
    width: 10,
    height: 8,
    data: Array.from({ length: 80 }, (_, index) => {
      const row = Math.floor(index / 10);
      const column = index % 10;
      const black =
        (row >= 1 && row <= 6 && column >= 6 && column <= 9) || (row >= 2 && row <= 5 && column === 0);
      return black ? [0, 0, 0, 255] : [255, 255, 255, 255];
    }).flat(),
  };
  const complete = createImage().frompng(png).prepare(5, 7).imgdata;
  const cleaned = createImage().frompng(png).prepare(5, 7, { cleanGlyph: true }).imgdata;

  expect(complete).not.toEqual(cleaned);
  expect(cleaned.reduce((sum, pixel) => sum + pixel, 0)).toBeGreaterThan(
    complete.reduce((sum, pixel) => sum + pixel, 0)
  );
});
