const fs = require('fs');
const path = require('path');

// Bindet die WASM-Kerne aus assembly/search.ts an (Build: npm run build:wasm). Jede Ziffer einer
// Trainingsdatenbank wird beim ersten Gebrauch einmal flach in den WASM-Speicher kopiert, danach
// kostet eine Suche nur noch einen Aufruf je Ziffer. Jede Funktion liefert null, wenn WASM nicht
// passt (abgeschaltet, leere Ziffer, keine Ganzzahlvektoren) - ocr.js rechnet dann in JS.
const { exports: wasm } = new WebAssembly.Instance(
  new WebAssembly.Module(fs.readFileSync(path.join(__dirname, 'search.wasm'))),
);

const state = { enabled: process.env.OCR_WASM !== '0' };
const align = (ptr) => (ptr + 15) & ~15;
let top = align(wasm.heapBase());
const alloc = (bytes) => {
  const ptr = top;
  top = align(top + bytes);
  const missing = Math.ceil(top / 65536) - wasm.memory.buffer.byteLength / 65536;
  if (missing > 0) wasm.memory.grow(missing);
  return ptr;
};
const i32 = (ptr, length) => new Int32Array(wasm.memory.buffer, ptr, length);
const f64 = (ptr, length) => new Float64Array(wasm.memory.buffer, ptr, length);

// Feste Arbeitsbereiche fuer Anfrage, Fenstergrenzen und Zwischenergebnisse (Raster <= 256 Zellen).
const MAX_CELLS = 256;
const QUERY = alloc(4 * MAX_CELLS);
const QUERY_SMOOTH = alloc(8 * MAX_CELLS);
const BOUNDS = [0, 1, 2, 3].map(() => alloc(4 * MAX_CELLS));
const BEST = alloc(4 * MAX_CELLS);
const scratch = { idx: 0, capacity: 0, dist: 0, distCapacity: 0 };
const indexBuffer = (count) => {
  if (count > scratch.capacity) Object.assign(scratch, { idx: alloc(4 * count), capacity: count });
  return scratch.idx;
};
const distBuffer = (count) => {
  if (count > scratch.distCapacity) Object.assign(scratch, { dist: alloc(4 * count), distCapacity: count });
  return scratch.dist;
};

const isIntVector = (vec) => vec.length <= MAX_CELLS && vec.every((x) => Number.isInteger(x) && Math.abs(x) < 1e6);

const entries = new WeakMap(); // Trainingsbilder einer Ziffer -> Lage im WASM-Speicher
const positions = new WeakMap(); // einzelnes Trainingsbild -> { entry, index }
const entryFor = (samples, n) => {
  const cached = entries.get(samples);
  if (cached !== undefined) return cached && cached.n === n && cached.count === samples.length ? cached : null;
  const usable = samples.length > 0 && samples.every((s) => s.imgvec.length === n && isIntVector(s.imgvec));
  const entry = usable ? { ptr: alloc(4 * n * samples.length), n, count: samples.length, samples } : null;
  if (entry) {
    const view = i32(entry.ptr, n * samples.length);
    samples.forEach((sample, index) => {
      view.set(sample.imgvec, index * n);
      if (!positions.has(sample)) positions.set(sample, { entry, index });
    });
  }
  entries.set(samples, entry);
  return entry;
};

const prepare = (query, samples) => {
  if (!state.enabled || !samples.length || !isIntVector(query)) return null;
  const entry = entryFor(samples, query.length);
  if (entry) i32(QUERY, query.length).set(query);
  return entry;
};

// Teilmenge (shortlist/Priorisierung) als Indexliste in die flach gespeicherte Ziffer.
const subsetFor = (query, samples) => {
  if (!state.enabled || !samples.length || !isIntVector(query)) return null;
  // Nur bereits hochgeladene Ziffern direkt nutzen: Teilmengen sind je Anfrage neue Arrays und
  // wuerden sonst bei jedem Aufruf erneut in den WASM-Speicher kopiert.
  const direct = entries.get(samples);
  const first = direct || (positions.get(samples[0]) || {}).entry;
  if (!first || first.n !== query.length) return null;
  i32(QUERY, query.length).set(query);
  if (direct) {
    if (!direct.identity)
      i32((direct.identity = alloc(4 * direct.count)), direct.count).set(Int32Array.from(samples.keys()));
    return { entry: direct, idx: direct.identity, count: direct.count };
  }
  const indices = samples.map((sample) => positions.get(sample));
  if (indices.some((position) => !position || position.entry !== first)) return null;
  const idx = indexBuffer(samples.length);
  i32(idx, samples.length).set(indices.map((position) => position.index));
  return { entry: first, idx, count: samples.length };
};

const nearest = (query, samples) => {
  const entry = prepare(query, samples);
  if (!entry) return null;
  const index = wasm.nearest(QUERY, entry.ptr, entry.count, entry.n);
  return { index, dist: wasm.lastDist() };
};

const topK = (query, samples, limit) => {
  const entry = prepare(query, samples);
  if (!entry || limit < 1) return null;
  const idx = indexBuffer(limit);
  const len = wasm.topK(QUERY, entry.ptr, entry.count, entry.n, limit, idx, distBuffer(limit));
  return Array.from(i32(idx, len), (index) => samples[index]);
};

const based = (query, querySmooth, samples, smoothVec) => {
  const entry = prepare(query, samples);
  if (!entry) return null;
  if (!entry.smooth) {
    entry.smooth = alloc(8 * entry.n * entry.count);
    const view = f64(entry.smooth, entry.n * entry.count);
    samples.forEach((sample, index) => view.set(smoothVec(sample.imgvec), index * entry.n));
  }
  f64(QUERY_SMOOTH, query.length).set(querySmooth);
  const index = wasm.based(QUERY, QUERY_SMOOTH, entry.ptr, entry.smooth, entry.count, entry.n);
  return { index, dist: wasm.lastDist() };
};

const writeBounds = (arrays) => arrays.forEach((values, k) => i32(BOUNDS[k], values.length).set(values));

const rows = (query, samples, dimr, dimc, starts, ends) => {
  const subset = subsetFor(query, samples);
  if (!subset) return null;
  writeBounds([starts, ends]);
  return wasm.rows(QUERY, subset.entry.ptr, subset.idx, subset.count, dimr, dimc, BOUNDS[0], BOUNDS[1], BEST);
};

const cols = (query, samples, dimr, dimc, starts, ends) => {
  const subset = subsetFor(query, samples);
  if (!subset) return null;
  writeBounds([starts, ends]);
  return wasm.cols(QUERY, subset.entry.ptr, subset.idx, subset.count, dimr, dimc, BOUNDS[0], BOUNDS[1], BEST);
};

const quad = (query, samples, dimr, dimc, rowStarts, rowEnds, colStarts, colEnds) => {
  const subset = subsetFor(query, samples);
  if (!subset) return null;
  writeBounds([rowStarts, rowEnds, colStarts, colEnds]);
  const [rs, re, cs, ce] = BOUNDS;
  return wasm.quad(QUERY, subset.entry.ptr, subset.idx, subset.count, dimr, dimc, rs, re, cs, ce, BEST);
};

module.exports = { based, cols, nearest, quad, rows, state, topK };
