const { accuracy } = require('./ocr-test-helper');

test('ocr 8x6 with EB data', () => {
  expect(accuracy('8x6', 'eb')).toBeGreaterThan(0.97);
});
