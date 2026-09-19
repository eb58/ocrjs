const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { analyzeImage, listTasks, loadDatabases } = require('../src/analysis');

const thresholds = [1.1, 1.25, 1.5, 2, 2.4];

if (!isMainThread) {
  const databases = loadDatabases(workerData.dataset, 'auto');
  const results = workerData.tasks.map(({ file, expected, index }) => {
    const fast = analyzeImage(file, expected, workerData.dataset, databases, 2.4, { candidateLimit: 128 });
    const full = fast.confidence < thresholds.at(-1)
      ? analyzeImage(file, expected, workerData.dataset, databases)
      : undefined;
    return { index, expected, fast: fast.prediction, confidence: fast.confidence, full: full?.prediction };
  });
  parentPort.postMessage(results);
} else {
  const workers = Math.min(4, os.availableParallelism());
  const run = async dataset => {
    const tasks = listTasks({ dataset, limit: 0, offset: 0 }).map((task, index) => ({ ...task, index }));
    const started = performance.now();
    const parts = await Promise.all(Array.from({ length: workers }, (_, chunk) => new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: {
        dataset, tasks: tasks.filter(({ index }) => index % workers === chunk),
      } });
      worker.once('message', resolve);
      worker.once('error', reject);
    })));
    const results = parts.flat().sort((a, b) => a.index - b.index);
    const variants = thresholds.map(threshold => {
      const predictions = results.map(result => result.confidence < threshold ? result.full : result.fast);
      return {
        threshold,
        fallbacks: results.filter(result => result.confidence < threshold).length,
        errors: predictions.filter((prediction, index) => prediction !== tasks[index].expected).length,
        fixedFastErrors: results.filter((result, index) => result.fast !== tasks[index].expected && predictions[index] === tasks[index].expected).length,
        regressedFastHits: results.filter((result, index) => result.fast === tasks[index].expected && predictions[index] !== tasks[index].expected).length,
      };
    });
    return { dataset, total: tasks.length, analysisSeconds: Math.round((performance.now() - started) / 100) / 10, variants };
  };
  Promise.all(['eb', 'mnist'].map(run)).then(results => {
    const report = { created: new Date().toISOString(), workers, results };
    fs.writeFileSync(path.join(__dirname, 'benchmark-shortlist-fallback-results.json'), JSON.stringify(report, null, 2));
    results.forEach(result => console.log(JSON.stringify(result)));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
