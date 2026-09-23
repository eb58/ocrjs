// Vereinfacht die tief verschachtelte Ordnerstruktur der TestListenH_*-Formulare
// (z.B. "rechserv\region4\76\25\056\9\0242129h\1.tif") auf eine flache Struktur
// "<TestListenH_X>\<relativer Pfad mit "_" statt "\">\1.tif". Die Datensatz-ID allein
// (letzter Ordnername) ist NICHT eindeutig - sie wiederholt sich in verschiedenen
// Zwischenordnern teils 10-27x (unterschiedliche Erfassungslaeufe/Batches). Deshalb wird
// der komplette relative Pfad zusammengezogen statt nur der letzte Ordnername - das ist
// per Konstruktion kollisionsfrei (es war vorher schon ein eindeutiger Pfad).
//
// Aufruf: node scripts/import/flatten-postlisten.js <TestListenH-Ordner> [--dry-run]

const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');
if (!root) {
  console.error('Aufruf: node scripts/import/flatten-postlisten.js <TestListenH-Ordner> [--dry-run]');
  process.exit(1);
}

// Ein "Blattordner" ist ein Ordner, der direkt Dateien enthaelt (keine Unterordner) -
// das ist der Datensatz-Ordner (ID), z.B. "0242129h" mit "1.tif"/"1.att" darin.
const findLeafDirs = (dir, results = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => e.isFile());
  if (subdirs.length === 0 && files.length > 0) {
    results.push(dir);
  } else {
    subdirs.forEach((entry) => findLeafDirs(path.join(dir, entry.name), results));
  }
  return results;
};

const removeEmptyDirs = (dir) => {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.filter((e) => e.isDirectory()).forEach((entry) => removeEmptyDirs(path.join(dir, entry.name)));
  if (fs.readdirSync(dir).length === 0 && path.resolve(dir) !== path.resolve(root)) {
    fs.rmdirSync(dir);
  }
};

const main = () => {
  console.log(`Suche Blattordner unter ${root} ...`);
  const leafDirs = findLeafDirs(root);
  console.log(`${leafDirs.length} Datensatz-Ordner gefunden.`);

  const flatName = (dir) => path.relative(root, dir).split(path.sep).join('_');

  const alreadyFlat = leafDirs.filter((dir) => path.dirname(dir) === path.resolve(root));
  const toMove = leafDirs.filter((dir) => path.dirname(dir) !== path.resolve(root));
  const targets = new Map();
  toMove.forEach((dir) => {
    const name = flatName(dir);
    if (!targets.has(name)) targets.set(name, []);
    targets.get(name).push(dir);
  });
  const collisions = [...targets.entries()].filter(([, dirs]) => dirs.length > 1);

  console.log(
    `Bereits flach: ${alreadyFlat.length}, zu verschieben: ${toMove.length}, Namenskollisionen: ${collisions.length}`,
  );
  if (collisions.length) {
    // Sollte per Konstruktion nicht vorkommen (der volle relative Pfad war vorher
    // eindeutig) - falls doch, z.B. durch Gross-/Kleinschreibungsunterschiede im
    // Dateisystem, werden diese IDs sicherheitshalber uebersprungen statt verschoben.
    console.log('Unerwartete Kollisionen (werden NICHT verschoben):');
    collisions.forEach(([name, dirs]) => console.log(`  ${name}: ${dirs.length}x`));
  }

  if (DRY_RUN) {
    console.log('Dry-run: es wurde nichts verschoben.');
    return;
  }

  let moved = 0;
  toMove
    .filter((dir) => targets.get(flatName(dir)).length === 1)
    .forEach((dir) => {
      const dest = path.join(root, flatName(dir));
      fs.renameSync(dir, dest);
      moved++;
      if (moved % 200 === 0) console.log(`${moved}/${toMove.length} verschoben...`);
    });
  console.log(`${moved} Ordner verschoben. Raeume leere Zwischenordner auf ...`);
  removeEmptyDirs(root);
  console.log('Fertig.');
};

main();
