// Full PNG cascade; fresh, equally sized worker pool for each variant.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { analyzeImage, listTasks, loadDatabases } = require('../src/analysis');

if (!isMainThread) {
  const { dataset, tasks, candidateLimit } = workerData;
  const databases = loadDatabases(dataset, 'auto');
  const predictions = tasks.map(({ file, expected, index }) => ({
    index, prediction: analyzeImage(file, expected, dataset, databases, 2.4, { candidateLimit }).prediction,
  }));
  parentPort.postMessage(predictions);
} else {
  const requested = process.argv.slice(2).map(Number);
  if (requested.some(value => !Number.isInteger(value) || value <= 0)) {
    throw new Error('Candidate limits must be positive integers');
  }
  const limits = [0, ...new Set(requested.length ? requested : [16, 32, 64])];
  const outputName = requested.length ? `benchmark-shortlist-${requested.join('-')}-results.json` : 'benchmark-shortlist-results.json';
  const workers = Math.min(4, os.availableParallelism());
  const report = { created: new Date().toISOString(), workers, results: [] };
  const run = async () => {
    for (const dataset of ['eb', 'mnist']) {
      const tasks = listTasks({ dataset, limit: 0, offset: 0 }).map((task, index) => ({ ...task, index }));
      const baseline = [];
      for (const candidateLimit of limits) {
        const start = performance.now();
        const parts = await Promise.all(Array.from({ length: workers }, (_, chunk) => new Promise((resolve, reject) => {
          const worker = new Worker(__filename, { workerData: {
            dataset, candidateLimit, tasks: tasks.filter(({ index }) => index % workers === chunk),
          } });
          const result = [];
          worker.once('message', predictions => result.push(...predictions));
          worker.once('error', reject);
          worker.once('exit', code => code ? reject(new Error(`Worker exit ${code}`)) : resolve(result));
        })));
        const predictions = parts.flat().sort((a, b) => a.index - b.index).map(({ prediction }) => prediction);
        if (!candidateLimit) baseline.push(...predictions);
        const fixed = [];
        const regressed = [];
        tasks.forEach(({ expected, file }, index) => {
          if (predictions[index] === expected && baseline[index] !== expected) fixed.push(file);
          if (predictions[index] !== expected && baseline[index] === expected) regressed.push(file);
        });
        const correct = predictions.filter((prediction, index) => prediction === tasks[index].expected).length;
        const row = { dataset, candidateLimit, total: tasks.length, correct, errors: tasks.length - correct,
          seconds: Math.round((performance.now() - start) / 100) / 10, fixed, regressed };
        report.results.push(row);
        fs.writeFileSync(path.join(__dirname, outputName), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ ...row, fixed: fixed.length, regressed: regressed.length }));
      }
    }
  };
  run().catch(error => { console.error(error); process.exitCode = 1; });
}
