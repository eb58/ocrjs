const { runAnalysis, stopWorkers } = require('../src/visual-test-server');

afterAll(() => stopWorkers());

const cascadeAccuracy = async (dataset, testSet = 'standard') => {
  const { results, durationMs } = await runAnalysis({ dataset, testSet, limit: 0, offset: 0, mode: 'auto' });
  const correct = results.filter((result) => result.correct).length;
  const accuracy = correct / results.length;
  // Direkt auf stderr, weil Jest console.log im Parallellauf ohne --verbose verschluckt.
  process.stderr.write(
    `\nKaskade ${dataset}${testSet === 'standard' ? '' : `/${testSet}`}: ${(accuracy * 100).toFixed(2)}% korrekt ` +
      `(${correct}/${results.length}, ${results.length - correct} Fehler, ${(durationMs / 1000).toFixed(1)}s)\n`,
  );
  return accuracy;
};

// Grosse Testmengen laufen nur mit npm run test:full (setzt OCR_FULL_TESTS): sie wuerden die
// Suite und damit den Pre-commit-Hook um ein Mehrfaches verlaengern.
const fullTest = process.env.OCR_FULL_TESTS ? test : test.skip;

test('cascade over the EB test set', async () => {
  expect(await cascadeAccuracy('eb')).toBeGreaterThan(0.995);
}, 600000);

// Nachsortierte, schwierige Faelle; die Schwelle liegt knapp unter dem Stand vom 24.09.2026 (95,2 %).
test('cascade over the EB review set', async () => {
  expect(await cascadeAccuracy('eb', 'review')).toBeGreaterThan(0.945);
}, 600000);

fullTest(
  'cascade over the EB test set added on 2026-09-21',
  async () => {
    expect(await cascadeAccuracy('eb', '2026-09-21')).toBeGreaterThan(0.99);
  },
  600000,
);

fullTest(
  'cascade over the MNIST test set',
  async () => {
    expect(await cascadeAccuracy('mnist')).toBeGreaterThan(0.97);
  },
  600000,
);
