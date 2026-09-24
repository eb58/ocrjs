const { createRejectDetector, scoreVector } = require('../src/reject');

const sample = (value) => ({ imgvec: Array(48).fill(value) });
const database = () => ({
  dimr: 8,
  dimc: 6,
  ...Object.fromEntries([...Array(10).keys()].map((digit) => [digit, [sample(digit * 10)]])),
});

test('accepts vectors close to a known digit', () => {
  expect(scoreVector(Array(48).fill(21), database(), 100)).toMatchObject({ digit: 2, dist: 48, rejected: false });
});

test('rejects vectors far from every known digit', () => {
  expect(scoreVector(Array(48).fill(200), database(), 100)).toMatchObject({ digit: 9, rejected: true });
});

test('keeps a sample exactly at the configured boundary', () => {
  expect(scoreVector(Array(48).fill(21), database(), 48).rejected).toBe(false);
});

test('requires matching vector and database dimensions', () => {
  expect(() => scoreVector([1], database())).toThrow('dimensions');
  expect(() => createRejectDetector({ ...database(), dimr: 7, dimc: 5 })).toThrow('8x6');
});
