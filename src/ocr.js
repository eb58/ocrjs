const fs = require('fs');
const PNG = require('pngjs').PNG;
const img = require('./img');

const SECURE_CONFIDENCE = 2.4;

const range = (n) => [...Array(n).keys()];
const DIGITS = range(10);
const distFct = (v1, v2, bestDistance) => {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
    if (sum >= bestDistance) return sum;
  }
  return sum;
};

const findNearestDigit = (imgvec, db, limit = 3, seeds, seedCount = 32) =>
  DIGITS.map((digit) => {
    const best = { digit, dist: Number.MAX_SAFE_INTEGER };
    const selected = seeds ? (seeds[digit] = []) : undefined;
    db[digit].forEach((dbi) => {
      const threshold = selected
        ? selected.length < seedCount
          ? Infinity
          : selected[selected.length - 1].dist
        : best.dist;
      const dist = distFct(imgvec, dbi.imgvec, threshold);
      if (selected && dist < threshold) {
        const position = selected.findIndex((candidate) => candidate.dist > dist);
        selected.splice(position < 0 ? selected.length : position, 0, { sample: dbi, dist });
        if (selected.length > seedCount) selected.pop();
      }
      if (dist < best.dist) {
        best.dist = dist;
        best.imgvec = dbi.imgvec;
        best.name = dbi.name;
      }
    });
    return best;
  })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);

const confidence = (res) => (res[0] && res[1] ? (res[0].dist ? res[1].dist / res[0].dist : 99) : 0);

// Zusaetzliche, verschiebungstolerante Abstandsmasse neben der einfachen
// Zell-fuer-Zell-Distanz (distFct): portiert aus dem alten Recm/CharDatabase-System
// (C++/Java), das mit denselben Rastergroessen (6x4/7x5/8x6) >99% erreichte. Werden
// erst bei Unsicherheit nacheinander probiert - jede kann fuer sich ein sicheres
// Ergebnis liefern, das die primaere Distanz allein nicht gefunden hat.
// Bewusst einseitig (Zelle + Nachbarn oben/links): ein symmetrisches 3x3-Mittel wurde
// am 2026-09-23 gemessen und kostete auf MNIST 12 zusaetzliche Fehler (EB unveraendert).
const smoothCell = (vec, dimc, r, c) => {
  let sum = 0,
    cnt = 0;
  for (let rr = Math.max(0, r - 1); rr <= r; rr++)
    for (let cc = Math.max(0, c - 1); cc <= c; cc++) {
      sum += vec[rr * dimc + cc];
      cnt++;
    }
  return sum / cnt;
};
const smoothVec = (vec, dimc) => vec.map((_, i) => smoothCell(vec, dimc, Math.floor(i / dimc), i % dimc));

const distBased = (v1, s1, v2, s2, bestDistance) => {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.abs(v1[i] - v2[i]) * (1 + Math.abs(s1[i] - s2[i]));
    if (sum >= bestDistance) return sum;
  }
  return sum;
};
const searchBased = (query, querySmooth, db, dimc) =>
  DIGITS.map((digit) => {
    const best = { digit, dist: Number.MAX_SAFE_INTEGER };
    db[digit].forEach((dbi) => {
      if (!dbi.smooth) dbi.smooth = smoothVec(dbi.imgvec, dimc);
      const dist = distBased(dbi.imgvec, dbi.smooth, query, querySmooth, best.dist);
      if (dist < best.dist) {
        best.dist = dist;
        best.name = dbi.name;
      }
    });
    return best;
  }).sort((a, b) => a.dist - b.dist);

// Statt jede Zelle strikt an derselben Position zu vergleichen, wird pro Zeile/Spalte
// in jeder Trainingsprobe einzeln die beste Uebereinstimmung gesucht (mit Fenster) und
// ueber alle Zeilen/Spalten aufsummiert - toleriert kleine Verschiebungen der Handschrift.
const distRowBand = (v1, v2, dimc, row, a, e, bestDistance) => {
  let sum = 0;
  for (let r = a; r <= e; r++) {
    const rs = r * dimc;
    let drow = 0;
    for (let c = 0; c < dimc; c++) {
      const d = v1[rs + c] - v2[rs + c];
      drow += d * d;
    }
    sum += r === row ? 2 * drow : drow;
    if (sum >= bestDistance) return sum;
  }
  return sum;
};
const searchRows = (query, db, dimr, dimc) => {
  const window = Math.max(1, Math.floor(dimr / 6));
  const starts = Array.from({ length: dimr }, (_, row) => Math.max(0, row - window));
  const ends = Array.from({ length: dimr }, (_, row) => Math.min(dimr - 1, row + window));
  return DIGITS.map((digit) => {
    const perRow = new Array(dimr).fill(Number.MAX_SAFE_INTEGER);
    db[digit].forEach((dbi) => {
      for (let row = 0; row < dimr; row++) {
        const dist = distRowBand(dbi.imgvec, query, dimc, row, starts[row], ends[row], perRow[row]);
        if (dist < perRow[row]) perRow[row] = dist;
      }
    });
    return { digit, dist: perRow.reduce((sum, d) => sum + d, 0) };
  }).sort((a, b) => a.dist - b.dist);
};

const distColBand = (v1, v2, dimr, dimc, col, a, e, bestDistance) => {
  let sum = 0;
  for (let c = a; c <= e; c++) {
    let dcol = 0;
    for (let r = 0; r < dimr; r++) {
      const n = r * dimc + c;
      const d = v1[n] - v2[n];
      dcol += d * d;
    }
    sum += c === col ? 2 * dcol : dcol;
    if (sum >= bestDistance) return sum;
  }
  return sum;
};
const searchCols = (query, db, dimr, dimc) => {
  const window = Math.max(1, Math.floor(dimc / 4));
  const starts = Array.from({ length: dimc }, (_, col) => Math.max(0, col - window));
  // Fenster reicht nur nach links, anders als bei searchRows/searchQuad. Symmetrisch
  // gemessen (2026-09-23): gleiche Fehlerzahl auf EB und MNIST, daher unveraendert.
  const ends = Array.from({ length: dimc }, (_, col) => Math.min(dimc - 1, col));
  return DIGITS.map((digit) => {
    const perCol = new Array(dimc).fill(Number.MAX_SAFE_INTEGER);
    db[digit].forEach((dbi) => {
      for (let col = 0; col < dimc; col++) {
        const dist = distColBand(dbi.imgvec, query, dimr, dimc, col, starts[col], ends[col], perCol[col]);
        if (dist < perCol[col]) perCol[col] = dist;
      }
    });
    return { digit, dist: perCol.reduce((sum, d) => sum + d, 0) };
  }).sort((a, b) => a.dist - b.dist);
};

// Wie Row/Col, aber zweidimensional: pro Zelle wird das beste lokale Fenster gesucht,
// toleriert kleine Verzerrungen in beide Richtungen gleichzeitig. Teuerste der vier
// Zusatzmasse (ein Fenster pro Zelle statt pro Zeile/Spalte), daher zuletzt probiert.
const distQuad = (v1, v2, dimc, ar, er, ac, ec, row, col, bestDistance) => {
  let sum = 0;
  for (let r = ar; r <= er; r++) {
    const rs = r * dimc;
    for (let c = ac; c <= ec; c++) {
      const d = v1[rs + c] - v2[rs + c];
      sum += r === row && c === col ? 2 * d * d : d * d;
      if (sum >= bestDistance) return sum;
    }
  }
  return sum;
};
const searchQuad = (query, db, dimr, dimc) => {
  const rowWindow = Math.max(1, Math.floor(dimr / 6));
  const colWindow = Math.max(1, Math.floor(dimc / 4));
  const rowStarts = Array.from({ length: dimr }, (_, row) => Math.max(0, row - rowWindow));
  const rowEnds = Array.from({ length: dimr }, (_, row) => Math.min(dimr - 1, row + rowWindow));
  const colStarts = Array.from({ length: dimc }, (_, col) => Math.max(0, col - colWindow));
  const colEnds = Array.from({ length: dimc }, (_, col) => Math.min(dimc - 1, col + colWindow));
  return DIGITS.map((digit) => {
    const perCell = new Array(dimr * dimc).fill(Number.MAX_SAFE_INTEGER);
    db[digit].forEach((dbi) => {
      for (let row = 0; row < dimr; row++) {
        for (let col = 0; col < dimc; col++) {
          const idx = row * dimc + col;
          const dist = distQuad(
            dbi.imgvec,
            query,
            dimc,
            rowStarts[row],
            rowEnds[row],
            colStarts[col],
            colEnds[col],
            row,
            col,
            perCell[idx],
          );
          if (dist < perCell[idx]) perCell[idx] = dist;
        }
      }
    });
    return { digit, dist: perCell.reduce((sum, d) => sum + d, 0) };
  }).sort((a, b) => a.dist - b.dist);
};

// Vorauswahl der `limit` naechsten Proben je Ziffer nach voller quadratischer Distanz.
// Gleichstaende behalten die Reihenfolge der Datenbank; der Fruehabbruch nutzt die
// schlechteste behaltene Distanz als Schranke.
const shortlist = (query, db, limit) =>
  Object.fromEntries(
    DIGITS.map((digit) => {
      const best = [];
      db[digit].forEach((sample) => {
        const threshold = best.length < limit ? Infinity : best[best.length - 1].dist;
        const dist = distFct(query, sample.imgvec, threshold);
        if (dist >= threshold) return;
        const position = best.findIndex((candidate) => candidate.dist > dist);
        best.splice(position < 0 ? best.length : position, 0, { sample, dist });
        if (best.length > limit) best.pop();
      });
      return [digit, best.map(({ sample }) => sample)];
    }),
  );

// Kaskadiert ueber die verschiebungstoleranten Abstandsmasse, sobald die einfache
// Distanz kein sicheres Ergebnis liefert. Liefert keines davon ein sicheres Ergebnis,
// bekommt die aufrufende Stelle alle Versuche zurueck, um sie per Abstimmung (vote)
// mit der bereinigten Bildsicht zu kombinieren, statt sie einfach zu verwerfen.
const searchSecure = (query, db, candidateLimit, priorityCount) => {
  const { dimr, dimc } = db;
  const attempts = [];
  const seeds = priorityCount ? {} : undefined;
  const sqr = findNearestDigit(query, db, 10, seeds, priorityCount);
  // Rows/Cols/Quad summieren pro Zeile/Spalte/Zelle ueber alle Trainingsproben und
  // koennen deshalb kein einzelnes naechstes Trainingsbild benennen (kein .name). Hier
  // wird - egal ob eine Sicht direkt sicher ist oder erst per vote() gewinnt - das
  // naechste benannte Trainingsbild der einfachen Distanz nachgereicht (die immer alle
  // 10 Ziffern benennt), damit der Pruefstand nie ein Bild ohne Namen anzeigen muss.
  const namedByDigit = Object.fromEntries(sqr.map((candidate) => [candidate.digit, candidate]));
  const trySecure = (candidates) => {
    const named = candidates.map((candidate) => ({ ...namedByDigit[candidate.digit], ...candidate }));
    attempts.push(named);
    return confidence(named) >= SECURE_CONFIDENCE ? named : undefined;
  };

  const sqrChecked = trySecure(sqr);
  if (sqrChecked) return { secure: sqrChecked, attempts };

  const querySmooth = smoothVec(query, dimc);
  const based = trySecure(searchBased(query, querySmooth, db, dimc));
  if (based) return { secure: based, attempts };

  const localDb = seeds
    ? Object.fromEntries(
        DIGITS.map((digit) => {
          const first = seeds[digit].map(({ sample }) => sample);
          const selected = new Set(first);
          return [digit, [...first, ...db[digit].filter((sample) => !selected.has(sample))]];
        }),
      )
    : candidateLimit
      ? shortlist(query, db, candidateLimit)
      : db;
  const rows = trySecure(searchRows(query, localDb, dimr, dimc));
  if (rows) return { secure: rows, attempts };

  const cols = trySecure(searchCols(query, localDb, dimr, dimc));
  if (cols) return { secure: cols, attempts };

  const quad = trySecure(searchQuad(query, localDb, dimr, dimc));
  if (quad) return { secure: quad, attempts };

  return { secure: undefined, attempts };
};

// Abstimmung ueber mehrere Kandidatenlisten (eine pro Sicht/Abstandsmass): jede Liste
// traegt ihren TOP-1-Kandidaten mit dessen eigener Konfidenz (2.Bester/Bester) ein;
// Ziffern, auf die sich mehrere Masse einigen, summieren diese Konfidenz multiplikativ.
// Portiert aus dem Voter des alten Recm-Systems - schlaegt sowohl das einfache Verwerfen
// unsicherer Sichten als auch das bisherige Zwei-Sichten-Blending deutlich.
const vote = (attempts) => {
  const val = Object.fromEntries(DIGITS.map((digit) => [digit, 1]));
  const bestCandidate = {};
  attempts.forEach((candidates) => {
    const top = candidates[0];
    if (!top) return;
    val[top.digit] *= confidence(candidates) || 1;
    if (!bestCandidate[top.digit]) bestCandidate[top.digit] = top;
  });
  // Digits, die bei keinem Mass Platz 1 belegen, haben keinen bestCandidate-Eintrag;
  // attempts[0] (die einfache Distanz) nennt aber immer alle 10 Ziffern.
  const namedByDigit = Object.fromEntries(attempts[0].map((candidate) => [candidate.digit, candidate]));
  return DIGITS.map((digit) => ({
    ...namedByDigit[digit],
    ...bestCandidate[digit],
    digit,
    dist: 1 / val[digit],
  })).sort((a, b) => a.dist - b.dist);
};

const png = (pngfile) => PNG.sync.read(fs.readFileSync(pngfile));
const createRecognizer = (pngfile, { candidateLimit = 0, priorityCount = 0 } = {}) => {
  if (!Number.isInteger(priorityCount) || priorityCount < 0 || (priorityCount && candidateLimit)) {
    throw new RangeError('priorityCount must be non-negative and cannot be combined with candidateLimit');
  }
  if (!Number.isInteger(candidateLimit) || candidateLimit < 0) {
    throw new RangeError('candidateLimit must be a non-negative integer (0 means full search)');
  }
  const base = img().frompng(png(pngfile)).adjustBW().despeckle();
  const primaryGlyph = base.clone().extractGlyphFarFromBiggest(15).cropGlyph();
  const cache = new Map();
  return (db) => {
    const primaryVector = primaryGlyph.scaleDown(db.dimr, db.dimc).imgdata;
    const primary = searchSecure(primaryVector, db, candidateLimit, priorityCount);
    if (primary.secure) return primary.secure.slice(0, 3);

    if (!cache.has('cleaned')) cache.set('cleaned', base.clone().extractGlyph().cropGlyph());
    const cleanedVector = cache.get('cleaned').scaleDown(db.dimr, db.dimc).imgdata;
    const identical = primaryVector.every((value, index) => value === cleanedVector[index]);
    // Bei identischen Pixeln (nur ein Bestandteil, extractGlyph aendert nichts) liefert
    // die bereinigte Sicht keine neue Information - die Kaskade dort nochmal zu laufen
    // waere reine Verdopplung, deshalb dann nur die Primaersicht abstimmen lassen.
    if (identical) return vote(primary.attempts).slice(0, 3);

    const cleaned = searchSecure(cleanedVector, db, candidateLimit, priorityCount);
    if (cleaned.secure) return cleaned.secure.slice(0, 3);

    return vote([...primary.attempts, ...cleaned.attempts]).slice(0, 3);
  };
};
const recImage = (pngfile, dbs) => (dbs.length ? dbs.map(createRecognizer(pngfile)) : []);
const recognizeImage = (pngfile, dbs) => recImage(pngfile, dbs).sort((a, b) => confidence(b) - confidence(a))[0];

module.exports = {
  SECURE_CONFIDENCE,
  confidence,
  createRecognizer,
  findNearestDigit,
  recognizeImage,
  vote,
};
