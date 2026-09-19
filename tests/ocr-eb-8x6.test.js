const { accuracy } = require('./ocr-test-helper');

test('primary 8x6 classifier with uncleaned EB vectors', async () => {
  expect(await accuracy('8x6', 'eb')).toBeGreaterThan(0.95);
}, 120000);
