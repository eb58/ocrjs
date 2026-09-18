const { accuracy } = require('./ocr-test-helper');

test('primary 8x6 classifier with uncleaned EB vectors', () => {
  expect(accuracy('8x6', 'eb')).toBeGreaterThan(0.95);
});
