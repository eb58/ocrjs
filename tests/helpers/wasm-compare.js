// Rechnet jeden Fall einmal mit und einmal ohne WASM und gibt beide Ergebnisse als JSON aus.
// Laeuft als eigener Node-Prozess, weil die Suche in der Jest-VM um ein Vielfaches langsamer ist;
// alle Faelle in einem Prozess, damit jede Datenbank nur einmal geladen wird.
const fs = require('fs');
const path = require('path');
const wasmSearch = require('../../src/wasm-search');
const { analyzeImage, listTasks, loadDatabases, recognitionOptionsFor } = require('../../src/analysis');

const hardCases = path.join(__dirname, '..', 'fixtures', 'hard-cases');
const hardCaseTasks = fs
  .readdirSync(hardCases)
  .map((name) => ({ file: path.join(hardCases, name), expected: Number(name[0]) }));
const databases = {};
const compare = ([dataset, searchMode, perDigit]) => {
  // perDigit 0 heisst hier: nur die schweren Faelle (listTasks deutet limit 0 als "alle Bilder").
  const tasks = [...(perDigit ? listTasks({ dataset, limit: perDigit, offset: 0 }) : []), ...hardCaseTasks];
  const dbs = (databases[dataset] ||= loadDatabases(dataset, 'auto'));
  const options = searchMode === 'priority' ? { priorityCount: 32 } : recognitionOptionsFor(dataset, searchMode);
  const run = (enabled) => {
    wasmSearch.state.enabled = enabled;
    return tasks.map(({ file, expected }) => analyzeImage(file, expected, dataset, dbs, undefined, options));
  };
  return { wasm: run(true), js: run(false) };
};
process.stdout.write(JSON.stringify(JSON.parse(process.argv[2]).map(compare)));
