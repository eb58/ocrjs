// Extrahiert Ziffern-Glyphen aus den "291mitGW/291ohneGWvonKadmosbearbeitet"-Formularen
// (Handlisten\291...) MIT ECHTER GROUND TRUTH statt Erkenner-Schaetzung: Die .att-Datei
// enthaelt pro Zeilenpaar einen 12-stelligen Identcode (S=...), bei dem eine unsichere
// Ziffer als "+" markiert ist. Der Identcode-Pruefziffernalgorithmus (Gewichtung 4/9
// alternierend von rechts, Pruefziffer = (10 - Summe mod 10) mod 10) legt eine einzelne
// unbekannte Ziffer eindeutig fest - damit lassen sich viele Formulare vollstaendig
// validieren, ohne auf den bestehenden Erkenner angewiesen zu sein.
//
// Layout: pro Identcode-Feld zwei handschriftliche Zeilen zu je 6 Ziffern (+ evtl. ein
// nachgestelltes Kontrollzeichen wie "X"/"N", das ignoriert wird). Die Reihenfolge der
// Zeilenpaare im Bild entspricht der Reihenfolge der Felder in der .att.
//
// Aufruf: node scripts/import/extract-kadmos-digits.js [--root <Handlisten-Ordner>] [--limit n] [--dry-run]

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const mkdirp = require('mkdirp');
const { PNG } = require('pngjs');
const createImage = require('../../src/img');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? fallback : args[idx + 1];
};
const ROOT = flag('root', String.raw`G:\Meine Ablage\ATOS\Projekte\OCR\Data\02 - Postlisten Aliste\Handlisten`);
const LIMIT = Number(flag('limit', Infinity));
const DRY_RUN = args.includes('--dry-run');

const dataPath = path.resolve(__dirname, '../../data');
const testDir = path.join(dataPath, 'imgs', 'eb', 'test');
const logFile = path.join(dataPath, 'imgs', 'eb', 'kadmos-extract.log');

// An zwei Beispielformularen (4-zeilig und 16-zeilig) verifiziert: deckt alle
// vorkommenden Zeilenpaare ab, laesst Kopfzeile (Barcode/Datum) und Fussbereich aussen vor.
const FIELD_REGION = { x0: 140, y0: 841, x1: 1226, y1: 3241 };
const ROW_MIN_GAP = 12;
const ROW_MIN_HEIGHT = 18;
const COL_MIN_GAP = 9;
const COL_MIN_WIDTH = 5;
const GLYPH_MARGIN = 8;
const DIGITS_PER_ROW = 6;
const FIELD_LEN = 12;

const findFfmpeg = () => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    throw new Error('ffmpeg wurde nicht gefunden (wird zur TIFF->PNG-Konvertierung benoetigt).');
  }
};

const tifToPng = (ffmpeg, tifFile) => {
  const outFile = path.join(os.tmpdir(), `kdx-${crypto.randomBytes(8).toString('hex')}.png`);
  execFileSync(ffmpeg, ['-y', '-i', tifFile, '-update', '1', '-frames:v', '1', outFile], { stdio: 'ignore' });
  return outFile;
};

// Wie in extract-postlisten-digits.js: img.js exponiert Breite/Hoehe nicht in seiner
// oeffentlichen API, daher wird hier durchgehend mit (imgdata, w, h) gearbeitet.
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

// Identcode-Pruefziffer: Gewichtung 4/9 alternierend von rechts ueber die ersten 11
// Ziffern, Pruefziffer = (10 - Summe mod 10) mod 10. An zwei Formularen verifiziert.
const checkDigit = (digits11) => {
  let sum = 0;
  digits11.forEach((d, i) => {
    const posFromRight = 11 - i;
    sum += d * (posFromRight % 2 === 1 ? 4 : 9);
  });
  return (10 - (sum % 10)) % 10;
};

// raw: 12 Zeichen aus 0-9 und "+" (unsicher erkannte Ziffer). Bei genau einer unbekannten
// Ziffer legt die Pruefziffer sie eindeutig fest; bei 0 wird nur validiert; bei >1 kann
// nicht aufgeloest werden.
const resolveField = (raw) => {
  if (!raw || raw.length !== FIELD_LEN) return undefined;
  const chars = raw.split('');
  const unknownIdx = chars.reduce((acc, c, i) => (c === '+' ? [...acc, i] : acc), []);
  if (unknownIdx.length > 1) return undefined;
  const base = chars.map((c) => (c === '+' ? null : Number(c)));
  if (unknownIdx.length === 0) {
    return checkDigit(base.slice(0, 11)) === base[11] ? base : undefined;
  }
  const idx = unknownIdx[0];
  for (let d = 0; d <= 9; d++) {
    const trial = base.map((v, i) => (i === idx ? d : v));
    if (checkDigit(trial.slice(0, 11)) === trial[11]) return trial;
  }
  return undefined;
};

const parseFields = (attContent) => {
  const fields = [];
  attContent.split('\n').forEach((line) => {
    const m = line.match(/S=([0-9+]{12});/);
    if (m) fields.push(m[1]);
  });
  return fields;
};

const loadProcessedLog = () => new Set(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean) : []);
const appendLog = (relPath) => fs.appendFileSync(logFile, `${relPath}\n`);
const range = (n) => [...Array(n).keys()];

const main = () => {
  const ffmpeg = findFfmpeg();
  range(10).forEach((digit) => mkdirp.sync(path.join(testDir, `img${digit}`)));

  const attFiles = fs
    .readdirSync(ROOT)
    .filter((n) => /^291(mit|ohne)GWvonKadmosbearbeitet.*\.att$/i.test(n))
    .map((n) => path.join(ROOT, n));

  const processed = loadProcessedLog();
  const toProcess = attFiles.filter((f) => !processed.has(path.basename(f))).slice(0, LIMIT);
  console.log(`${attFiles.length} Kadmos-Formulare gefunden, ${toProcess.length} neu zu verarbeiten${DRY_RUN ? ' (dry-run)' : ''}.`);

  const stats = { forms: 0, skippedForms: 0, fieldsResolved: 0, fieldsUnresolved: 0, digitsWritten: Array(10).fill(0) };

  toProcess.forEach((attFile) => {
    const base = path.basename(attFile);
    const tifFile = attFile.replace(/\.att$/i, '.tif').replace(/\.ATT$/, '.TIF');
    let pngFile;
    try {
      if (!fs.existsSync(tifFile)) throw new Error('kein .tif gefunden');
      const rawFields = parseFields(fs.readFileSync(attFile, 'utf8'));
      if (rawFields.length === 0) throw new Error('keine Identcode-Felder in .att');

      pngFile = tifToPng(ffmpeg, tifFile);
      const source = PNG.sync.read(fs.readFileSync(pngFile));
      const page = createImage().frompng(source).adjustBW();
      const region = cropRect(page.imgdata, source.width, source.height, FIELD_REGION.x0, FIELD_REGION.y0, FIELD_REGION.x1, FIELD_REGION.y1);
      region.despeckle();

      const rows = findBands(rowCounts(region), ROW_MIN_GAP, ROW_MIN_HEIGHT);
      if (rows.length !== rawFields.length * 2) {
        throw new Error(`Zeilenanzahl passt nicht (${rows.length} Zeilen fuer ${rawFields.length} Felder)`);
      }

      rawFields.forEach((raw, fieldIdx) => {
        const digits = resolveField(raw);
        if (!digits) {
          stats.fieldsUnresolved++;
          return;
        }
        const [rowA, rowB] = [rows[fieldIdx * 2], rows[fieldIdx * 2 + 1]];
        const blobsOf = (row) => {
          const rowImg = cropRect(region.imgdata, region.w, region.h, 0, row.min, region.w, row.max);
          return findBands(colCounts(rowImg), COL_MIN_GAP, COL_MIN_WIDTH)
            .sort((a, b) => a.min - b.min)
            .slice(0, DIGITS_PER_ROW);
        };
        const blobsA = blobsOf(rowA);
        const blobsB = blobsOf(rowB);
        if (blobsA.length !== DIGITS_PER_ROW || blobsB.length !== DIGITS_PER_ROW) {
          stats.fieldsUnresolved++;
          return;
        }
        const positions = [...blobsA.map((b) => ({ col: b, row: rowA })), ...blobsB.map((b) => ({ col: b, row: rowB }))];

        stats.fieldsResolved++;
        positions.forEach(({ col, row }, digitIdx) => {
          const digit = digits[digitIdx];
          const glyph = cropRect(
            region.imgdata,
            region.w,
            region.h,
            Math.max(0, col.min - GLYPH_MARGIN),
            Math.max(0, row.min - GLYPH_MARGIN),
            Math.min(region.w, col.max + GLYPH_MARGIN),
            Math.min(region.h, row.max + GLYPH_MARGIN)
          );
          const id = crypto.createHash('md5').update(`${base}-${fieldIdx}`).digest('hex').slice(0, 10);
          const name = `kad-${id}-d${digitIdx}.png`;
          stats.digitsWritten[digit]++;
          if (!DRY_RUN) writePng(glyph, path.join(testDir, `img${digit}`, name));
        });
      });

      stats.forms++;
      if (!DRY_RUN) appendLog(base);
    } catch (error) {
      console.error(`Fehler bei ${base}: ${error.message}`);
      stats.skippedForms++;
    } finally {
      if (pngFile) fs.rmSync(pngFile, { force: true });
    }
  });

  console.log('\nFertig.');
  console.log(`Formulare verarbeitet: ${stats.forms}, uebersprungen: ${stats.skippedForms}`);
  console.log(`Felder aufgeloest: ${stats.fieldsResolved}, nicht aufloesbar (>1 unsichere Ziffer o.ae.): ${stats.fieldsUnresolved}`);
  console.log(`Ziffern geschrieben: ${stats.digitsWritten.reduce((a, b) => a + b, 0)} (${stats.digitsWritten.map((n, d) => `${d}:${n}`).join(', ')})`);
};

main();
