const { accuracy } = require('./ocr-test-helper');

test('primary 7x5 classifier with uncleaned EB vectors', () => {
  expect(accuracy('7x5', 'eb')).toBeGreaterThan(0.95);
});
