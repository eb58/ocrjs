const { accuracy } = require('./ocr-test-helper');

test('ocr 7x5 with EB data', () => {
  expect(accuracy('7x5', 'eb')).toBeGreaterThan(0.97);
});
