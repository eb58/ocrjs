const { accuracy } = require('./ocr-test-helper');

test('ocr 6x4 with MNIST data', async () => {
  expect(await accuracy('6x4', 'mnist')).toBeGreaterThan(0.964);
}, 120000);
