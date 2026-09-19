const { parentPort } = require('worker_threads');
const { analyzeImage, loadDatabases, recognitionOptionsFor } = require('./analysis');

const databaseCache = new Map();
const databasesFor = (dataset, mode) => {
  const key = `${dataset}|${mode}`;
  if (!databaseCache.has(key)) databaseCache.set(key, loadDatabases(dataset, mode));
  return databaseCache.get(key);
};

parentPort.on('message', ({ id, tasks, dataset, mode, searchMode, secureThreshold }) => {
  try {
    const databases = databasesFor(dataset, mode);
    const results = tasks.map(({ file, expected, index }) => ({
      index,
      result: analyzeImage(file, expected, dataset, databases, secureThreshold, recognitionOptionsFor(dataset, searchMode)),
    }));
    parentPort.postMessage({ id, results });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message });
  }
});
