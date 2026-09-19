const { runAnalysis, stopWorkers } = require('../src/visual-test-server');

afterAll(() => stopWorkers());

const cascadeAccuracy = async (dataset) => {
  const { results, durationMs } = await runAnalysis({ dataset, limit: 0, offset: 0, mode: 'auto' });
  const correct = results.filter((result) => result.correct).length;
  const accuracy = correct / results.length;
  // Direkt auf stderr, weil Jest console.log im Parallellauf ohne --verbose verschluckt.
  process.stderr.write(
    `\nKaskade ${dataset}: ${(accuracy * 100).toFixed(2)}% korrekt ` +
      `(${correct}/${results.length}, ${results.length - correct} Fehler, ${(durationMs / 1000).toFixed(1)}s)\n`
  );
  return accuracy;
};

test('cascade over the EB test set', async () => {
  expect(await cascadeAccuracy('eb')).toBeGreaterThan(0.97);
}, 600000);

// Laeuft nicht standardmaessig mit: verdoppelt die Suite-Laufzeit.
// Zum Messen der MNIST-Genauigkeit das .skip entfernen.
test.skip('cascade over the MNIST test set', async () => {
  expect(await cascadeAccuracy('mnist')).toBeGreaterThan(0.97);
}, 600000);
