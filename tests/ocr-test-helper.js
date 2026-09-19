const path = require('path');
const { Worker } = require('worker_threads');

// Jede Testdatei laeuft in einem eigenen Jest-Worker und teilt die Testvektoren
// zusaetzlich auf eigene Threads auf. Bewusst konservativ, weil mehrere Testdateien
// gleichzeitig laufen und jeder Thread die Trainingsdatenbank selbst laedt (~30MB).
const workerCount = Math.max(1, Number(process.env.OCR_TEST_WORKERS) || 4);
const workerFile = path.join(__dirname, 'accuracy-worker.js');

const runShard = (workerData) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(workerFile, { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
  });

const accuracy = async (dim, trainingSet, testSet = trainingSet) => {
  const shards = await Promise.all(
    Array.from({ length: workerCount }, (_, offset) =>
      runShard({ dim, trainingSet, testSet, stride: workerCount, offset })
    )
  );
  const correct = shards.reduce((sum, shard) => sum + shard.correct, 0);
  const total = shards.reduce((sum, shard) => sum + shard.total, 0);
  return correct / total;
};

module.exports = { accuracy };
