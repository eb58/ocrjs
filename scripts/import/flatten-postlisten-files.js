// Naechster Schritt nach flatten-postlisten.js: zieht .tif/.att direkt aus dem
// Datensatz-Ordner eine Ebene hoeher und benennt sie nach dem Ordnernamen, z.B.
// "01_00_011_0_2672100h\1.tif" -> "01_00_011_0_2672100h.tif". Der (dann leere)
// Datensatz-Ordner wird anschliessend entfernt.
//
// Aufruf: node scripts/import/flatten-postlisten-files.js <TestListenH-Ordner> [--dry-run]

const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');
if (!root) {
  console.error('Aufruf: node scripts/import/flatten-postlisten-files.js <TestListenH-Ordner> [--dry-run]');
  process.exit(1);
}

const main = () => {
  const entries = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
  console.log(`${entries.length} Datensatz-Ordner unter ${root}.`);

  const existingNames = new Set(fs.readdirSync(root));
  const plan = [];
  const skipped = [];

  entries.forEach((entry) => {
    const dir = path.join(root, entry.name);
    const files = fs.readdirSync(dir, { withFileTypes: true }).filter((f) => f.isFile());
    const byExt = new Map();
    files.forEach((f) => {
      const ext = path.extname(f.name);
      if (!byExt.has(ext)) byExt.set(ext, []);
      byExt.get(ext).push(f.name);
    });

    let ok = true;
    const moves = [];
    byExt.forEach((names, ext) => {
      names.forEach((name) => {
        const target = names.length === 1 ? `${entry.name}${ext}` : `${entry.name}_${path.basename(name, ext)}${ext}`;
        if (existingNames.has(target)) {
          ok = false;
          skipped.push(`${entry.name}: Zielname ${target} existiert bereits`);
        }
        moves.push({ from: path.join(dir, name), to: path.join(root, target), target });
      });
    });
    if (ok) {
      moves.forEach((m) => existingNames.add(m.target));
      plan.push({ dir, moves });
    }
  });

  console.log(`Verschiebbar: ${plan.length}, uebersprungen (Namenskonflikt): ${skipped.length}`);
  if (skipped.length) {
    console.log('Uebersprungen:');
    skipped.slice(0, 20).forEach((s) => console.log(`  ${s}`));
    if (skipped.length > 20) console.log(`  ... und ${skipped.length - 20} weitere`);
  }

  if (DRY_RUN) {
    console.log('Dry-run: es wurde nichts verschoben.');
    if (plan.length)
      console.log(
        'Beispiel:',
        plan[0].moves.map((m) => `${path.basename(m.from)} -> ${m.target}`),
      );
    return;
  }

  let moved = 0;
  const leftover = [];
  plan.forEach(({ dir, moves }) => {
    moves.forEach((m) => fs.renameSync(m.from, m.to));
    try {
      fs.rmdirSync(dir);
    } catch {
      // Ordner enthielt noch mehr als die verschobenen Dateien (z.B. weitere Unterordner
      // mit fremdem Inhalt wie .nok-Fehlermarkern) - Verschobenes bleibt verschoben,
      // der Rest wird gemeldet statt den ganzen Lauf abzubrechen.
      leftover.push(dir);
    }
    moved++;
    if (moved % 500 === 0) console.log(`${moved}/${plan.length} Ordner aufgeloest...`);
  });
  console.log(`Fertig. ${moved} Ordner aufgeloest.`);
  if (leftover.length) {
    console.log(`${leftover.length} Ordner enthielten mehr als die erwarteten Dateien und wurden nicht geloescht:`);
    leftover.slice(0, 20).forEach((d) => console.log(`  ${d}`));
    if (leftover.length > 20) console.log(`  ... und ${leftover.length - 20} weitere`);
  }
};

main();
