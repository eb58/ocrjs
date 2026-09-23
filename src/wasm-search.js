const fs = require('fs');
const path = require('path');

// Bindet die WASM-Kerne aus assembly/search.ts an (Build: npm run build:wasm). Die Trainingsbilder
// einer Ziffer werden beim ersten Gebrauch einmal flach in den WASM-Speicher kopiert; jede Suche
// bekommt danach nur eine Indexliste. Jede Funktion liefert null, wenn WASM nicht passt
// (abgeschaltet, leere Liste, keine Ganzzahlvektoren) - ocr.js rechnet dann in JS.
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
// Wachsende Arbeitspuffer: Indexliste der Eingabe sowie Positionen und Distanzen von topK.
const buffers = {};
const buffer = (name, count) => {
  const current = buffers[name];
  if (current && current.count >= count) return current.ptr;
  buffers[name] = { ptr: alloc(4 * count), count };
  return buffers[name].ptr;
};

const isIntVector = (vec) => vec.length <= MAX_CELLS && vec.every((x) => Number.isInteger(x) && Math.abs(x) < 1e6);

const entries = new WeakMap(); // hochgeladene Bildliste -> { ptr, n, count, identity, smooth } oder null
const positions = new WeakMap(); // einzelnes Trainingsbild -> { entry, index }
const upload = (samples, n) => {
  const usable = samples.every((s) => s.imgvec.length === n && isIntVector(s.imgvec));
  const entry = usable ? { ptr: alloc(4 * n * samples.length), n, count: samples.length } : null;
  if (entry) {
    const view = i32(entry.ptr, n * samples.length);
    samples.forEach((sample, index) => {
      view.set(sample.imgvec, index * n);
      if (!positions.has(sample)) positions.set(sample, { entry, index });
    });
    i32((entry.identity = alloc(4 * entry.count)), entry.count).set(Int32Array.from(samples.keys()));
  }
  entries.set(samples, entry);
  return entry;
};

// Liefert Speicherblock und Indexliste fuer die Bilder `samples`. Neue Arrays aus bereits
// hochgeladenen Bildern (gefiltert, umsortiert, Vorauswahl) laufen ueber eine Indexliste statt
// einer weiteren Kopie - sonst wuechse der WASM-Speicher mit jedem Aufruf. Nur wirklich neue
// Bilder werden hochgeladen.
const resolve = (query, samples) => {
  if (!state.enabled || !samples.length || !isIntVector(query)) return null;
  const n = query.length;
  const cached = entries.get(samples);
  const known = cached === undefined ? samples.map((sample) => positions.get(sample)) : undefined;
  const shared = known && known[0] && known.every((position) => position && position.entry === known[0].entry);
  const entry = cached !== undefined ? cached : shared ? known[0].entry : upload(samples, n);
  if (!entry || entry.n !== n || (entry === cached && entry.count !== samples.length)) return null;
  i32(QUERY, n).set(query);
  if (!shared) return { entry, idx: entry.identity, count: entry.count };
  const idx = buffer('input', samples.length);
  i32(idx, samples.length).set(known.map((position) => position.index));
  return { entry, idx, count: samples.length };
};

const nearest = (query, samples) => {
  const r = resolve(query, samples);
  if (!r) return null;
  const index = wasm.nearest(QUERY, r.entry.ptr, r.idx, r.count, r.entry.n);
  return { index, dist: wasm.lastDist() };
};

const topK = (query, samples, limit) => {
  const r = limit >= 1 && resolve(query, samples);
  if (!r) return null;
  const out = buffer('topK', limit);
  const len = wasm.topK(QUERY, r.entry.ptr, r.idx, r.count, r.entry.n, limit, out, buffer('topKDist', limit));
  return Array.from(i32(out, len), (index) => samples[index]);
};

// Die geglaetteten Vektoren liegen je hochgeladenem Block in dessen Reihenfolge.
const based = (query, querySmooth, samples, smoothVec) => {
  const r = resolve(query, samples);
  if (!r) return null;
  const { entry } = r;
  if (!entry.smooth) {
    const vectors = i32(entry.ptr, entry.n * entry.count).slice();
    const smooth = Array.from({ length: entry.count }, (_, k) =>
      smoothVec(Array.from(vectors.subarray(k * entry.n, (k + 1) * entry.n))),
    );
    entry.smooth = alloc(8 * entry.n * entry.count);
    const view = f64(entry.smooth, entry.n * entry.count);
    smooth.forEach((vec, k) => view.set(vec, k * entry.n));
  }
  f64(QUERY_SMOOTH, query.length).set(querySmooth);
  const index = wasm.based(QUERY, QUERY_SMOOTH, entry.ptr, entry.smooth, r.idx, r.count, entry.n);
  return { index, dist: wasm.lastDist() };
};

const writeBounds = (arrays) => arrays.forEach((values, k) => i32(BOUNDS[k], values.length).set(values));

const rows = (query, samples, dimr, dimc, starts, ends) => {
  const r = resolve(query, samples);
  if (!r) return null;
  writeBounds([starts, ends]);
  return wasm.rows(QUERY, r.entry.ptr, r.idx, r.count, dimr, dimc, BOUNDS[0], BOUNDS[1], BEST);
};

const cols = (query, samples, dimr, dimc, starts, ends) => {
  const r = resolve(query, samples);
  if (!r) return null;
  writeBounds([starts, ends]);
  return wasm.cols(QUERY, r.entry.ptr, r.idx, r.count, dimr, dimc, BOUNDS[0], BOUNDS[1], BEST);
};

const quad = (query, samples, dimr, dimc, rowStarts, rowEnds, colStarts, colEnds) => {
  const r = resolve(query, samples);
  if (!r) return null;
  writeBounds([rowStarts, rowEnds, colStarts, colEnds]);
  const [rs, re, cs, ce] = BOUNDS;
  return wasm.quad(QUERY, r.entry.ptr, r.idx, r.count, dimr, dimc, rs, re, cs, ce, BEST);
};

const memoryBytes = () => wasm.memory.buffer.byteLength;

module.exports = { based, cols, memoryBytes, nearest, quad, rows, state, topK };
