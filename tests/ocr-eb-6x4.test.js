const { accuracy } = require('./ocr-test-helper');

test('primary 6x4 classifier with uncleaned EB vectors', async () => {
  expect(await accuracy('6x4', 'eb')).toBeGreaterThan(0.94);
}, 120000);
