const { accuracy } = require('./ocr-test-helper');

test('ocr 6x4 with MNIST data', () => {
  expect(accuracy('6x4', 'mnist')).toBeGreaterThan(0.964);
});
