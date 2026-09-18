jest.mock('fs', () => ({ readFileSync: jest.fn(() => Buffer.from([])) }));
jest.mock('pngjs', () => ({ PNG: { sync: { read: jest.fn(() => ({})) } } }));
jest.mock('../src/img', () => () => {
  const image = { imgdata: [0] };
  ['frompng', 'adjustBW', 'despeckle', 'cropGlyph', 'clone', 'extractGlyph', 'scaleDown'].forEach(name => {
    image[name] = () => image;
  });
  return image;
});

const ocrengine = require('../src/ocr')();

const database = (digit, bestDistance, secondDistance) => {
  const db = Object.assign(
    Array.from({ length: 10 }, () => [{ imgvec: [10] }]),
    {
      [digit]: [{ imgvec: [Math.sqrt(bestDistance)] }],
      [(digit + 1) % 10]: [{ imgvec: [Math.sqrt(secondDistance)] }],
    }
  );
  db.dimr = 1;
  db.dimc = 1;
  return db;
};

test('findNearestDigit returns the three closest digits ordered by distance', () => {
  const db = Array.from({ length: 10 }, (_, digit) => [{ imgvec: [digit] }]);

  expect(ocrengine.findNearestDigit([4.2], db).map(({ digit }) => digit)).toEqual([4, 5, 3]);
});

test('distance pruning preserves every class minimum and the first equal-distance candidate', () => {
  const db = Array.from({ length: 10 }, (_, digit) => [
    { name: 'first', imgvec: [digit, 2] },
    { name: 'worse', imgvec: [digit + 20, 0] },
    { name: 'tie', imgvec: [digit, -2] },
  ]);
  expect(ocrengine.findNearestDigit([0, 0], db, 10)).toEqual(
    db.map((samples, digit) => ({ digit, dist: digit * digit + 4, ...samples[0] }))
  );
});

test('multiple models decode the PNG once', () => {
  const read = require('pngjs').PNG.sync.read;
  read.mockClear();
  ocrengine.recognizeImage('unused.png', [database(1, 4, 8), database(3, 4, 6)]);
  expect(read).toHaveBeenCalledTimes(1);
});

test('recognizeImage selects the result with the highest confidence', () => {
  const result = ocrengine.recognizeImage('unused.png', [database(1, 4, 8), database(3, 4, 6)]);

  expect(result[0].digit).toBe(1);
});

test('recognizeImage keeps earlier results when several results are secure', () => {
  const result = ocrengine.recognizeImage('unused.png', [database(2, 4, 16), database(4, 4, 12)]);

  expect(result[0].digit).toBe(2);
});
