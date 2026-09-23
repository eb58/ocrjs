// Schneidet aus gescannten Postlisten-Formularen (TestListenH_*, G:\...\02 - Postlisten Aliste)
// einzelne Ziffern-Glyphen aus und ordnet sie ueber den bestehenden Erkenner data/imgs/eb/test
// zu. Die .att-Begleitdateien liefern keine verlaessliche Ground Truth fuer die beiden
// handschriftlichen Zahlenzeilen (Feldbedeutung nicht dokumentiert), daher gibt es hier keine
// Ground-Truth-Zuordnung ueber sie - stattdessen entscheidet die bestehende Erkennung
// (createRecognizer/vote, dasselbe wie im OCR-Pruefstand) je Ausschnitt, ob die Ziffer sicher
// genug ist fuers Testset. Unsichere Ausschnitte (z.B. Buchstaben wie "N" am Zeilenende) landen
// zur manuellen Pruefung in data/imgs/eb/review statt das Testset zu verunreinigen.
//
// Aufruf: node scripts/import/extract-postlisten-digits.js [--root <ordner>] [--limit n]
//         [--threshold n] [--dry-run]

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { PNG } = require('pngjs');
const createImage = require('../../src/img');
const ocrengine = require('../../src/ocr');
const { loadDatabases } = require('../../src/analysis');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? fallback : args[idx + 1];
};
const DEFAULT_ROOT = String.raw`G:\Meine Ablage\ATOS\Projekte\OCR\Data\02 - Postlisten Aliste`;
const ROOT = flag('root', DEFAULT_ROOT);
const ROOT_IS_DEFAULT = ROOT === DEFAULT_ROOT;
const LIMIT = Number(flag('limit', Infinity));
const THRESHOLD = Number(flag('threshold', 3.0));
const DRY_RUN = args.includes('--dry-run');

const dataPath = path.resolve(__dirname, '../../data');
const testDir = path.join(dataPath, 'imgs', 'eb', 'test');
const reviewDir = path.join(dataPath, 'imgs', 'eb', 'review');
const logFile = path.join(dataPath, 'imgs', 'eb', 'postlisten-extract.log');

// In allen Beispielen identisch positioniert (siehe Untersuchung an Formularen aus
// TestListenH_A und TestListenH_C): zwei handschriftliche Zahlenzeilen unterhalb von
// Barcode/Datum, links durch eine Formularlinie geteilt, rechts von Namen/Betrag getrennt.
const ROW_REGION = { x0: 150, y0: 780, x1: 900, y1: 1150 };
const RULED_LINE_DENSITY = 0.85; // Anteil schwarzer Pixel je Spalte, ab dem sie als Formularlinie gilt
const RULED_LINE_MAXWIDTH = 6; // nur duenne Linien entfernen, keine breiten Ziffern-Striche
const ROW_MIN_GAP = 12; // Zeilen mit >= soviel leeren Pixelzeilen dazwischen gelten als getrennt
const ROW_MIN_HEIGHT = 20;
const COL_MIN_GAP = 9; // Spalten mit >= soviel leeren Pixelspalten dazwischen trennen Ziffern
const COL_MIN_WIDTH = 5;
const GLYPH_MARGIN = 8;

const findFfmpeg = () => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    throw new Error(
      'ffmpeg wurde nicht gefunden (wird zur TIFF->PNG-Konvertierung benoetigt). Bitte installieren und in PATH aufnehmen.',
    );
  }
};

const findTifFiles = (root) => {
  const results = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.tif')) results.push(full);
    });
  };
  if (ROOT_IS_DEFAULT) {
    // Default-Root ist der Sammelordner - nur die TestListenH_*-Unterordner durchsuchen,
    // nicht die anderen Listentypen (NC2001, W, PmitGW, ...) darin.
    fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^TestListenH/i.test(entry.name))
      .forEach((entry) => walk(path.join(root, entry.name)));
  } else {
    // Explizit angegebene Root (z.B. ein einzelner TestListenH_*-Unterordner zum Testen):
    // direkt durchsuchen.
    walk(root);
  }
  return results;
};

const tifToPng = (ffmpeg, tifFile) => {
  const outFile = path.join(os.tmpdir(), `plx-${crypto.randomBytes(8).toString('hex')}.png`);
  execFileSync(ffmpeg, ['-y', '-i', tifFile, '-update', '1', '-frames:v', '1', outFile], { stdio: 'ignore' });
  return outFile;
};

// img.js exponiert Breite/Hoehe nicht in seiner oeffentlichen API (nur imgdata) - daher wird
// hier durchgehend mit expliziten (imgdata, w, h) statt mit dem img.js-Objekt selbst gearbeitet,
// und erst beim Schreiben/Weitergeben an den Erkenner wieder in ein img.js-Objekt gewrappt.
const wrap = (data, w, h) => ({ ...createImage(data, w, h), imgdata: data, w, h });

const cropRect = (imgdata, srcW, srcH, x0, y0, x1, y1) => {
  const [cx0, cy0] = [Math.max(0, x0), Math.max(0, y0)];
  const [cx1, cy1] = [Math.min(srcW, x1), Math.min(srcH, y1)];
  const [w, h] = [cx1 - cx0, cy1 - cy0];
  const data = new Array(w * h);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) data[r * w + c] = imgdata[(cy0 + r) * srcW + (cx0 + c)];
  }
  return wrap(data, w, h);
};

const removeRuledLines = (img) => {
  const { w, h, imgdata } = img;
  let runStart = -1;
  for (let c = 0; c <= w; c++) {
    let black = 0;
    if (c < w) for (let r = 0; r < h; r++) if (imgdata[r * w + c] === 1) black++;
    const dense = c < w && black / h >= RULED_LINE_DENSITY;
    if (dense && runStart === -1) runStart = c;
    if (!dense && runStart !== -1) {
      if (c - runStart <= RULED_LINE_MAXWIDTH) {
        for (let cc = runStart; cc < c; cc++) for (let r = 0; r < h; r++) imgdata[r * w + cc] = 0;
      }
      runStart = -1;
    }
  }
  return img;
};

// Findet zusammenhaengende Baender mit Tinte entlang einer Achse (Zeilen oder Spalten),
// getrennt durch mindestens minGap leere Zeilen/Spalten, und verwirft zu kleine Baender.
const findBands = (counts, minGap, minSize) => {
  const bands = [];
  let start = -1;
  let gap = 0;
  counts.forEach((count, i) => {
    if (count > 0) {
      if (start === -1) start = i;
      gap = 0;
    } else if (start !== -1) {
      gap++;
      if (gap >= minGap) {
        const end = i - gap;
        if (end - start >= minSize) bands.push({ min: start, max: end });
        start = -1;
      }
    }
  });
  if (start !== -1) {
    const end = counts.length - gap;
    if (end - start >= minSize) bands.push({ min: start, max: end });
  }
  return bands;
};

const rowCounts = (img) => {
  const { w, h, imgdata } = img;
  const counts = new Array(h).fill(0);
  for (let r = 0; r < h; r++) {
    let sum = 0;
    for (let c = 0; c < w; c++) sum += imgdata[r * w + c];
    counts[r] = sum;
  }
  return counts;
};
const colCounts = (img) => {
  const { w, h, imgdata } = img;
  const counts = new Array(w).fill(0);
  for (let c = 0; c < w; c++) {
    let sum = 0;
    for (let r = 0; r < h; r++) sum += imgdata[r * w + c];
    counts[c] = sum;
  }
  return counts;
};

const writePng = (img, file) => {
  const png = new PNG({ width: img.w, height: img.h });
  for (let i = 0; i < img.w * img.h; i++) {
    const value = img.imgdata[i] ? 0 : 255;
    png.data[i * 4] = value;
    png.data[i * 4 + 1] = value;
    png.data[i * 4 + 2] = value;
    png.data[i * 4 + 3] = 255;
  }
  fs.writeFileSync(file, PNG.sync.write(png));
};

const loadProcessedLog = () =>
  new Set(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean) : []);
const appendLog = (relPath) => fs.appendFileSync(logFile, `${relPath}\n`);

const main = () => {
  const ffmpeg = findFfmpeg();
  const dbs = loadDatabases('eb', 'auto').map((entry) => entry.data);
  range(10).forEach((digit) => fs.mkdirSync(path.join(testDir, `img${digit}`), { recursive: true }));
  fs.mkdirSync(reviewDir, { recursive: true });

  const processed = loadProcessedLog();
  const allTifs = findTifFiles(ROOT).filter((file) => !processed.has(path.relative(ROOT, file)));
  const tifs = allTifs.slice(0, LIMIT);
  console.log(
    `${allTifs.length} neue Formulare gefunden, verarbeite ${tifs.length}${DRY_RUN ? ' (dry-run, es wird nichts geschrieben)' : ''}.`,
  );

  const stats = { accepted: Array(10).fill(0), review: 0, skippedForms: 0, forms: 0 };

  tifs.forEach((tifFile, i) => {
    const relPath = path.relative(ROOT, tifFile);
    let pngFile;
    try {
      pngFile = tifToPng(ffmpeg, tifFile);
      const source = PNG.sync.read(fs.readFileSync(pngFile));
      const page = createImage().frompng(source).adjustBW();
      const region = cropRect(
        page.imgdata,
        source.width,
        source.height,
        ROW_REGION.x0,
        ROW_REGION.y0,
        ROW_REGION.x1,
        ROW_REGION.y1,
      );
      removeRuledLines(region);
      region.despeckle();

      const rows = findBands(rowCounts(region), ROW_MIN_GAP, ROW_MIN_HEIGHT);
      if (rows.length !== 2) {
        stats.skippedForms++;
        if (!DRY_RUN) appendLog(relPath);
        return;
      }

      rows.forEach((row, rowIdx) => {
        const rowImg = cropRect(region.imgdata, region.w, region.h, 0, row.min, region.w, row.max);
        const cols = findBands(colCounts(rowImg), COL_MIN_GAP, COL_MIN_WIDTH);
        cols.forEach((col, colIdx) => {
          const glyph = cropRect(
            region.imgdata,
            region.w,
            region.h,
            Math.max(0, col.min - GLYPH_MARGIN),
            Math.max(0, row.min - GLYPH_MARGIN),
            Math.min(region.w, col.max + GLYPH_MARGIN),
            Math.min(region.h, row.max + GLYPH_MARGIN),
          );
          const glyphFile = path.join(os.tmpdir(), `plg-${crypto.randomBytes(8).toString('hex')}.png`);
          writePng(glyph, glyphFile);
          try {
            const candidates = ocrengine.recognizeImage(glyphFile, dbs);
            const conf = ocrengine.confidence(candidates);
            const digit = candidates[0] && candidates[0].digit;
            const id = crypto.createHash('md5').update(relPath).digest('hex').slice(0, 10);
            const name = `pl-${id}-r${rowIdx}c${colIdx}.png`;
            if (digit !== undefined && conf >= THRESHOLD) {
              stats.accepted[digit]++;
              if (!DRY_RUN) fs.copyFileSync(glyphFile, path.join(testDir, `img${digit}`, name));
            } else {
              stats.review++;
              if (!DRY_RUN) fs.copyFileSync(glyphFile, path.join(reviewDir, `guess${digit ?? 'x'}-${name}`));
            }
          } finally {
            fs.rmSync(glyphFile, { force: true });
          }
        });
      });

      stats.forms++;
      if (!DRY_RUN) appendLog(relPath);
    } catch (error) {
      console.error(`Fehler bei ${relPath}: ${error.message}`);
      stats.skippedForms++;
    } finally {
      if (pngFile) fs.rmSync(pngFile, { force: true });
    }

    if ((i + 1) % 50 === 0) console.log(`${i + 1}/${tifs.length} Formulare verarbeitet...`);
  });

  console.log('\nFertig.');
  console.log(
    `Formulare verarbeitet: ${stats.forms}, uebersprungen (Zeilenlayout unerwartet/Fehler): ${stats.skippedForms}`,
  );
  console.log(
    `In eb/test uebernommen: ${stats.accepted.reduce((a, b) => a + b, 0)} (${stats.accepted.map((n, d) => `${d}:${n}`).join(', ')})`,
  );
  console.log(`Zur manuellen Pruefung in eb/review: ${stats.review}`);
};

const range = (n) => [...Array(n).keys()];

main();
