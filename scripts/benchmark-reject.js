const fs = require('fs');
const path = require('path');
const { createRejectDetector, MAX_DISTANCE } = require('../src/reject');

const root = path.resolve(__dirname, '..');
const db = require(path.join(root, 'data/dbs/eb-db-train-8x6'));
const detect = createRejectDetector(db);
const pngs = (directory) =>
  fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => path.join(entry.parentPath, entry.name));
const evaluate = (name, files) => {
  const rows = files.map((file) => ({ file, ...detect(file) }));
  const rejected = rows.filter((row) => row.rejected);
  console.log(
    `${name}: ${rejected.length}/${rows.length} markiert (${((100 * rejected.length) / rows.length).toFixed(2)} %)`,
  );
  return rows;
};

console.log(`Ausschussschwelle: Distanz > ${MAX_DISTANCE}`);
evaluate('Gueltige EB-Testbilder', pngs(path.join(root, 'data/imgs/eb/test')));
evaluate('Manuell aussortierte Bilder', pngs(path.join(root, 'data/imgs/eb/removed')));
