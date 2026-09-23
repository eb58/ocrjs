// Benennt die Trainingsbilder so um, dass die haeufigsten naechsten Nachbarn zuerst kommen:
// data/imgs/<datensatz>/train/img<ziffer>/<rang>__<name>.png. Die Suchen brechen ab, sobald eine
// Teilsumme die bisher beste Distanz erreicht; frueh gefundene gute Treffer verkuerzen das.
// Aufruf: node scripts/generate/sort-train-images.js [eb mnist] [--undo]
// Bewertet wird mit den aktuellen Datenbanken (vorher npm run gen-dbs), danach gen-dbs erneut
// ausfuehren. Jedes Trainingsbild dient einmal als Anfrage (ohne sich selbst); gezaehlt wird, wie
// oft ein Bild ueber alle Raster der naechste Nachbar seiner Ziffer ist. Gleichstand: bisherige
// Reihenfolge. rename-log.json haelt alte und neue Namen fest, --undo benennt zurueck.
const fs = require('fs');
const path = require('path');
const wasmSearch = require('../../src/wasm-search');

const dataPath = path.join(__dirname, '../../data');
const DIMENSIONS = ['6x4', '7x5', '8x6'];
const PREFIX = /^\d{5}__/;
const trainDir = (dataset) => path.join(dataPath, 'imgs', dataset, 'train');
const logFile = (dataset) => path.join(trainDir(dataset), 'rename-log.json');

const renameAll = (dataset, renames) =>
  renames.forEach(({ digit, from, to }) => {
    const dir = path.join(trainDir(dataset), `img${digit}`);
    if (from !== to && fs.existsSync(path.join(dir, from))) fs.renameSync(path.join(dir, from), path.join(dir, to));
  });

const hitsFor = (dataset) => {
  const dbs = DIMENSIONS.map((dimension) => require(path.join(dataPath, 'dbs', `${dataset}-db-train-${dimension}`)));
  const hits = Array.from({ length: 10 }, (_, digit) => new Array(dbs[0][digit].length).fill(0));
  dbs.forEach((db) => {
    const indexOf = Array.from({ length: 10 }, (_, digit) => new Map(db[digit].map((sample, i) => [sample, i])));
    Array.from({ length: 10 }, (_, qd) =>
      db[qd].forEach((query, qi) => {
        for (let digit = 0; digit < 10; digit++) {
          const samples = db[digit];
          if (digit !== qd) hits[digit][wasmSearch.nearest(query.imgvec, samples).index]++;
          else {
            const [first, second] = wasmSearch.topK(query.imgvec, samples, 2);
            const nearest = first === samples[qi] ? second : first;
            if (nearest) hits[digit][indexOf[digit].get(nearest)]++;
          }
        }
      }),
    );
  });
  return { names: Array.from({ length: 10 }, (_, digit) => dbs[0][digit].map(({ name }) => name)), hits };
};

const sortDataset = (dataset) => {
  const startedAt = Date.now();
  const { names, hits } = hitsFor(dataset);
  const renames = names.flatMap((digitNames, digit) => {
    const onDisk = fs.readdirSync(path.join(trainDir(dataset), `img${digit}`)).filter((n) => n.endsWith('.png'));
    if (onDisk.length !== digitNames.length || !digitNames.every((name) => onDisk.includes(name))) {
      throw new Error(`${dataset}/img${digit}: Datenbank passt nicht zu den Dateien - erst npm run gen-dbs`);
    }
    return digitNames
      .map((name, index) => ({ name, index, count: hits[digit][index] }))
      .sort((a, b) => b.count - a.count || a.index - b.index)
      .map(({ name }, rank) => ({
        digit,
        from: name,
        to: `${String(rank).padStart(5, '0')}__${name.replace(PREFIX, '')}`,
      }));
  });
  // Liste vor dem Umbenennen schreiben, damit auch ein abgebrochener Lauf zurueckbenannt werden kann.
  fs.writeFileSync(logFile(dataset), JSON.stringify(renames, null, 1));
  renameAll(dataset, renames);
  const moved = renames.filter(({ from, to }) => from !== to).length;
  console.log(
    `${dataset}: ${moved} von ${renames.length} Bildern umbenannt in ${((Date.now() - startedAt) / 1000).toFixed(1)} s`,
  );
};

const undoDataset = (dataset) => {
  const renames = JSON.parse(fs.readFileSync(logFile(dataset), 'utf8'));
  renameAll(
    dataset,
    renames.map(({ digit, from, to }) => ({ digit, from: to, to: from })),
  );
  fs.unlinkSync(logFile(dataset));
  console.log(`${dataset}: ${renames.length} Bilder zurueckbenannt`);
};

const args = process.argv.slice(2);
const datasets = args.filter((arg) => !arg.startsWith('--'));
(datasets.length ? datasets : ['eb', 'mnist']).forEach(args.includes('--undo') ? undoDataset : sortDataset);
