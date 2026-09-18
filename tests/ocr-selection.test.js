jest.mock('fs', () => ({ readFileSync: jest.fn(() => Buffer.from([])) }));
jest.mock('pngjs', () => ({ PNG: { sync: { read: jest.fn(() => ({})) } } }));
jest.mock('../src/img', () => () => ({
  frompng: () => ({ prepare: () => ({ imgdata: [0] }) }),
}));

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

test('recognizeImage selects the result with the highest confidence', () => {
  const result = ocrengine.recognizeImage('unused.png', [database(1, 4, 8), database(3, 4, 6)]);

  expect(result[0].digit).toBe(1);
});

test('recognizeImage keeps earlier results when several results are secure', () => {
  const result = ocrengine.recognizeImage('unused.png', [database(2, 4, 16), database(4, 4, 12)]);

  expect(result[0].digit).toBe(2);
});
