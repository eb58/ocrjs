// WASM-Kerne der Suchfunktionen aus src/ocr.js. Semantik bitgleich zur JS-Fassung: gleiche
// Rechenreihenfolge, gleiche Abbruchpunkte (Teilsumme >= Schranke), Uebernahme nur bei echt
// kleinerer Distanz, Gleichstaende behalten das fruehere Trainingsbild.
// Speicher verwaltet src/wasm-search.js: Vektoren liegen flach als i32 (n Zellen je Bild),
// geglaettete Vektoren als f64. Jeder Kern bekommt die zu pruefenden Bilder als i32-Indexliste
// und liefert Positionen in dieser Liste (nicht im flachen Speicher) zurueck.

export function heapBase(): usize {
  return __heap_base;
}

let resultDist: f64 = 0;
export function lastDist(): f64 {
  return resultDist;
}

@inline function cell(ptr: usize, i: i32): i32 {
  return load<i32>(ptr + (<usize>i << 2));
}

@inline function vector(db: usize, idx: usize, k: i32, n: i32): usize {
  return db + (<usize>(cell(idx, k) * n) << 2);
}

// Position des naechsten Bilds nach quadrierter Zelldistanz (findNearestDigit), -1 bei count 0.
export function nearest(q: usize, db: usize, idx: usize, count: i32, n: i32): i32 {
  let best = i32.MAX_VALUE;
  let bestIdx = -1;
  for (let k = 0; k < count; k++) {
    const v = vector(db, idx, k, n);
    let sum = 0;
    for (let i = 0; i < n && sum < best; i++) {
      const d = cell(q, i) - cell(v, i);
      sum += d * d;
    }
    if (sum < best) {
      best = sum;
      bestIdx = k;
    }
  }
  resultDist = <f64>best;
  return bestIdx;
}

// Die `limit` naechsten Bilder aufsteigend nach Distanz, stabil bei Gleichstand (shortlist).
// Schreibt Positionen nach outIdx (Platz fuer limit Eintraege), outDist dient als Arbeitsspeicher.
export function topK(
  q: usize, db: usize, idx: usize, count: i32, n: i32, limit: i32, outIdx: usize, outDist: usize,
): i32 {
  let len = 0;
  for (let k = 0; k < count; k++) {
    const threshold = len < limit ? i32.MAX_VALUE : cell(outDist, len - 1);
    const v = vector(db, idx, k, n);
    let sum = 0;
    for (let i = 0; i < n && sum < threshold; i++) {
      const d = cell(q, i) - cell(v, i);
      sum += d * d;
    }
    if (sum >= threshold) continue;
    let pos = 0;
    while (pos < len && cell(outDist, pos) <= sum) pos++;
    const last = len < limit ? len : len - 1;
    for (let j = last; j > pos; j--) {
      store<i32>(outDist + (<usize>j << 2), cell(outDist, j - 1));
      store<i32>(outIdx + (<usize>j << 2), cell(outIdx, j - 1));
    }
    store<i32>(outDist + (<usize>pos << 2), sum);
    store<i32>(outIdx + (<usize>pos << 2), k);
    if (len < limit) len++;
  }
  return len;
}

// Geglaettete Distanz (searchBased): sum |v1-v2| * (1 + |s1-s2|) in f64 wie in JS.
export function based(q: usize, qs: usize, db: usize, dbs: usize, idx: usize, count: i32, n: i32): i32 {
  let best: f64 = 9007199254740991; // Number.MAX_SAFE_INTEGER
  let bestIdx = -1;
  for (let k = 0; k < count; k++) {
    const v = vector(db, idx, k, n);
    const s = dbs + (<usize>(cell(idx, k) * n) << 3);
    let sum: f64 = 0;
    for (let i = 0; i < n && sum < best; i++) {
      const dv = <f64>(cell(v, i) - cell(q, i));
      const ds = load<f64>(s + (<usize>i << 3)) - load<f64>(qs + (<usize>i << 3));
      sum += Math.abs(dv) * (1 + Math.abs(ds));
    }
    if (sum < best) {
      best = sum;
      bestIdx = k;
    }
  }
  resultDist = best;
  return bestIdx;
}

// Zeilenbaender (searchRows) ueber die Bilder aus der Indexliste; starts/ends je Zeile.
// best: Arbeitsspeicher fuer dimr i32. Rueckgabe: Summe der besten Bandabstaende.
export function rows(q: usize, db: usize, idx: usize, count: i32, dimr: i32, dimc: i32, starts: usize, ends: usize, best: usize): i32 {
  const n = dimr * dimc;
  for (let row = 0; row < dimr; row++) store<i32>(best + (<usize>row << 2), i32.MAX_VALUE);
  for (let k = 0; k < count; k++) {
    const v = vector(db, idx, k, n);
    for (let row = 0; row < dimr; row++) {
      const bound = cell(best, row);
      const e = cell(ends, row);
      let sum = 0;
      for (let r = cell(starts, row); r <= e && sum < bound; r++) {
        let drow = 0;
        for (let c = 0; c < dimc; c++) {
          const d = cell(v, r * dimc + c) - cell(q, r * dimc + c);
          drow += d * d;
        }
        sum += r == row ? 2 * drow : drow;
      }
      if (sum < bound) store<i32>(best + (<usize>row << 2), sum);
    }
  }
  let total = 0;
  for (let row = 0; row < dimr; row++) total += cell(best, row);
  return total;
}

// Spaltenbaender (searchCols), analog zu rows.
export function cols(q: usize, db: usize, idx: usize, count: i32, dimr: i32, dimc: i32, starts: usize, ends: usize, best: usize): i32 {
  const n = dimr * dimc;
  for (let col = 0; col < dimc; col++) store<i32>(best + (<usize>col << 2), i32.MAX_VALUE);
  for (let k = 0; k < count; k++) {
    const v = vector(db, idx, k, n);
    for (let col = 0; col < dimc; col++) {
      const bound = cell(best, col);
      const e = cell(ends, col);
      let sum = 0;
      for (let c = cell(starts, col); c <= e && sum < bound; c++) {
        let dcol = 0;
        for (let r = 0; r < dimr; r++) {
          const d = cell(v, r * dimc + c) - cell(q, r * dimc + c);
          dcol += d * d;
        }
        sum += c == col ? 2 * dcol : dcol;
      }
      if (sum < bound) store<i32>(best + (<usize>col << 2), sum);
    }
  }
  let total = 0;
  for (let col = 0; col < dimc; col++) total += cell(best, col);
  return total;
}

// Lokale 2D-Fenster je Zelle (searchQuad); Abbruchpruefung nach jeder Zelle wie in JS.
export function quad(
  q: usize, db: usize, idx: usize, count: i32, dimr: i32, dimc: i32,
  rowStarts: usize, rowEnds: usize, colStarts: usize, colEnds: usize, best: usize,
): i32 {
  const n = dimr * dimc;
  for (let i = 0; i < n; i++) store<i32>(best + (<usize>i << 2), i32.MAX_VALUE);
  for (let k = 0; k < count; k++) {
    const v = vector(db, idx, k, n);
    for (let row = 0; row < dimr; row++) {
      const ar = cell(rowStarts, row);
      const er = cell(rowEnds, row);
      for (let col = 0; col < dimc; col++) {
        const at = row * dimc + col;
        const bound = cell(best, at);
        const ac = cell(colStarts, col);
        const ec = cell(colEnds, col);
        let sum = 0;
        for (let r = ar; r <= er && sum < bound; r++) {
          for (let c = ac; c <= ec && sum < bound; c++) {
            const d = cell(v, r * dimc + c) - cell(q, r * dimc + c);
            sum += r == row && c == col ? 2 * d * d : d * d;
          }
        }
        if (sum < bound) store<i32>(best + (<usize>at << 2), sum);
      }
    }
  }
  let total = 0;
  for (let i = 0; i < n; i++) total += cell(best, i);
  return total;
}
