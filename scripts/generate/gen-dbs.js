// Erzeugt die Trainingsdatenbanken data/dbs/<datensatz>-db-train-<raster>.js aus
// data/imgs/<datensatz>/train. Aufruf: npm run gen-dbs [-- eb mnist]
// Jedes Bild wird einmal dekodiert und vorverarbeitet und dann fuer alle Raster verkleinert;
// ein Worker-Pool verteilt die Bilder blockweise auf alle Kerne.
const { Worker, isMainThread, parentPort } = require('worker_threads');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectPath = path.resolve(__dirname, '../..');
const dataPath = path.join(projectPath, 'data');
const dbPath = path.join(dataPath, 'dbs');
const DIMS = [
  [6, 4],
  [7, 5],
  [8, 6],
];
const CHUNK_SIZE = 500;

const vectorize = ({ dir, names }) => {
  const { PNG } = require('pngjs');
  const img = require('../../src/img');
  return names.map((name) => {
    const glyph = img()
      .frompng(PNG.sync.read(fs.readFileSync(path.join(dir, name))))
      .adjustBW()
      .despeckle()
      .extractGlyphFarFromBiggest(15)
      .cropGlyph();
    return DIMS.map(([dimr, dimc]) => glyph.scaleDown(dimr, dimc).imgdata);
  });
};

// Verteilt die Jobs auf einen Worker-Pool; die Ergebnisse stehen in Job-Reihenfolge.
const runJobs = (jobs) => {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = () =>
    new Promise((resolve, reject) => {
      const w = new Worker(__filename);
      let current;
      const feed = () => (next < jobs.length ? w.postMessage(jobs[(current = next++)]) : w.terminate().then(resolve));
      w.on('message', (vectors) => ((results[current] = vectors), feed()));
      w.on('error', reject);
      feed();
    });
  return Promise.all(Array.from({ length: Math.min(os.availableParallelism(), jobs.length) }, worker)).then(
    () => results,
  );
};

const chunks = (xs) =>
  Array.from({ length: Math.ceil(xs.length / CHUNK_SIZE) }, (_, i) => xs.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));

const generate = async (datasets) => {
  const startedAt = Date.now();
  const jobs = datasets.flatMap((dataset) =>
    Array.from({ length: 10 }, (_, digit) => {
      const dir = path.join(dataPath, 'imgs', dataset, 'train', `img${digit}`);
      const names = fs.readdirSync(dir).filter((name) => name.endsWith('.png'));
      return chunks(names).map((part) => ({ dataset, digit, dir, names: part }));
    }).flat(),
  );
  const results = await runJobs(jobs);
  datasets.forEach((dataset) =>
    DIMS.forEach(([dimr, dimc], d) => {
      const db = { dimr, dimc, dir: path.relative(projectPath, path.join(dataPath, 'imgs', dataset, 'train')) };
      for (let digit = 0; digit < 10; digit++) db[digit] = [];
      jobs.forEach((job, j) => {
        if (job.dataset === dataset)
          job.names.forEach((name, k) => db[job.digit].push({ imgvec: results[j][k][d], name }));
      });
      fs.writeFileSync(
        path.join(dbPath, `${dataset}-db-train-${dimr}x${dimc}.js`),
        'module.exports = ' + JSON.stringify(db),
      );
    }),
  );
  const images = jobs.reduce((sum, job) => sum + job.names.length, 0);
  console.log(`${datasets.join(', ')}: ${images} Bilder in ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
};

if (isMainThread) {
  const args = process.argv.slice(2);
  generate(args.length ? args : ['eb', 'mnist']).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  parentPort.on('message', (job) => parentPort.postMessage(vectorize(job)));
}
