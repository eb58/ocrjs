const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { analyzeImage, listTasks, loadDatabases } = require('../../src/analysis');

if (!isMainThread) {
  const { dataset, tasks, priorityCount } = workerData;
  const databases = loadDatabases(dataset, 'auto');
  parentPort.postMessage(tasks.map(({ file, expected, index }) => ({
    index, result: analyzeImage(file, expected, dataset, databases, 2.4, { priorityCount }),
  })));
} else {
  const workers = Math.min(4, os.availableParallelism());
  const report = { created: new Date().toISOString(), workers, results: [] };
  const run = async () => {
    for (const dataset of ['eb', 'mnist']) {
      const tasks = listTasks({ dataset, limit: 0, offset: 0 }).map((task, index) => ({ ...task, index }));
      const baseline = [];
      for (const priorityCount of [0, 32]) {
        const start = performance.now();
        const parts = await Promise.all(Array.from({ length: workers }, (_, chunk) => new Promise((resolve, reject) => {
          const worker = new Worker(__filename, { workerData: {
            dataset, priorityCount, tasks: tasks.filter(({ index }) => index % workers === chunk),
          } });
          const output = [];
          worker.once('message', results => output.push(...results));
          worker.once('error', reject);
          worker.once('exit', code => code ? reject(new Error(`Worker exit ${code}`)) : resolve(output));
        })));
        const results = parts.flat().sort((a, b) => a.index - b.index).map(({ result }) => result);
        if (!priorityCount) baseline.push(...results);
        const changed = tasks.filter((_, index) => JSON.stringify(results[index]) !== JSON.stringify(baseline[index])).map(({ file }) => file);
        const row = { dataset, priorityCount, total: tasks.length,
          errors: results.filter(result => !result.correct).length,
          seconds: Math.round((performance.now() - start) / 100) / 10, changed };
        report.results.push(row);
        fs.writeFileSync(path.join(__dirname, 'benchmark-priority-results.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ ...row, changed: changed.length }));
      }
    }
  };
  run().catch(error => { console.error(error); process.exitCode = 1; });
}
