const path = require('path');
const { execFileSync } = require('child_process');

// Die WASM-Kerne muessen exakt dieselben Ergebnisse liefern wie die JS-Fassung in ocr.js. Neben
// normalen Testbildern laufen die schweren Faelle durch die ganze Kaskade (Based, Rows, Cols,
// Quad, Abstimmung). Gerechnet wird in einem eigenen Node-Prozess (siehe helpers/wasm-compare.js).
const cases = [
  ['eb', 'optimized', 5],
  ['eb', 'full', 5],
  ['eb', 'priority', 0],
  ['mnist', 'optimized', 5],
  ['mnist', 'full', 0],
];
let results;
beforeAll(() => {
  const script = path.join(__dirname, 'helpers', 'wasm-compare.js');
  results = JSON.parse(execFileSync(process.execPath, [script, JSON.stringify(cases)], { maxBuffer: 1 << 26 }));
}, 120000);

test.each(cases.map((c, index) => [...c, index]))('WASM search matches the JS search on %s (%s)', (...args) => {
  const { wasm, js } = results[args[3]];
  expect(wasm.length).toBeGreaterThan(10);
  expect(wasm).toEqual(js);
});

test('fresh arrays of already uploaded samples reuse WASM memory instead of copying', () => {
  const wasmSearch = require('../src/wasm-search');
  const samples = Array.from({ length: 1000 }, (_, i) => ({
    imgvec: Array.from({ length: 48 }, (_, j) => (i * 7 + j * 13) % 101),
    name: `${i}`,
  }));
  const query = samples[0].imgvec;
  const bruteForce = (list) =>
    list.reduce(
      (best, s, index) => {
        const dist = s.imgvec.reduce((sum, x, j) => sum + (x - query[j]) ** 2, 0);
        return dist < best.dist ? { index, dist } : best;
      },
      { index: -1, dist: Infinity },
    );
  wasmSearch.nearest(query, samples);
  const before = wasmSearch.memoryBytes();
  for (let k = 0; k < 2000; k++) {
    const subset = samples.filter((_, i) => i !== k % 1000);
    expect(wasmSearch.nearest(query, subset)).toEqual(bruteForce(subset));
  }
  expect(wasmSearch.memoryBytes()).toBe(before);
});
