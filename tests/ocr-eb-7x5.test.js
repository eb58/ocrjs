const { accuracy } = require('./ocr-test-helper');

test('primary 7x5 classifier with uncleaned EB vectors', async () => {
  expect(await accuracy('7x5', 'eb')).toBeGreaterThan(0.95);
}, 120000);
