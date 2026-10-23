// Entfernt exakte Duplikate eines neu erzeugten Bildsets anhand des kanonischen 8x6-Vektors.
const fs = require('fs');
const path = require('path');
const { vectorize } = require('../../src/reject');
const db = require('../../data/dbs/eb-db-train-8x6');

const root = path.resolve(__dirname, '../..');
const ebRoot = path.join(root, 'data', 'imgs', 'eb');
const targets = ['test-handlisten', 'review-handlisten'];
const key = (file) => vectorize(file).join(',');
const pngs = (directory) =>
  fs.existsSync(directory)
    ? fs
        .readdirSync(directory, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
        .map((entry) => path.join(entry.parentPath, entry.name))
        .sort()
    : [];

const known = new Set([...Array(10).keys()].flatMap((digit) => db[digit].map(({ imgvec }) => imgvec.join(','))));
fs.readdirSync(ebRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !targets.includes(entry.name) && entry.name !== 'train')
  .flatMap((entry) => pngs(path.join(ebRoot, entry.name)))
  .forEach((file) => known.add(key(file)));

let removed = 0;
let kept = 0;
targets
  .flatMap((name) => pngs(path.join(ebRoot, name)))
  .forEach((file) => {
    const vector = key(file);
    if (known.has(vector)) {
      fs.rmSync(file);
      removed++;
    } else {
      known.add(vector);
      kept++;
    }
  });
console.log({ kept, removed });
