const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const os = require('os');
const { PNG } = require('pngjs');
const { performance } = require('perf_hooks');

const source = fs.readFileSync(path.join(__dirname, '../src/img.js'), 'utf8');
const earlyExit = '                if (cnt > N) continue pixels;';
assert.equal(source.split(earlyExit).length, 2, 'Expected exactly one early exit');
const compile = code => {
  const module = { exports: {} };
  new Function('module', code)(module);
  return module.exports;
};
const variants = {
  before: compile(source.replace(earlyExit, '').replace('pixels: for', 'for')),
  after: compile(source),
};
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
const report = {
  created: new Date().toISOString(), node: process.version, cpu: os.cpus()[0].model,
  methodology: 'All test PNGs decoded and adjusted to black/white before timing. Two warm-up passes per variant, ten measured passes in alternating order. Timing includes pixel-array copy and image object creation; excludes PNG IO/decode and equality checks. Single process, default N=3.',
  results: [],
};

for (const dataset of ['eb', 'mnist']) {
  const images = Array.from({ length: 10 }, (_, digit) => {
    const directory = path.join(__dirname, '../data/imgs', dataset, 'test', `img${digit}`);
    return fs.readdirSync(directory).filter(name => name.toLowerCase().endsWith('.png')).sort().map(name => {
      const png = PNG.sync.read(fs.readFileSync(path.join(directory, name)));
      return { pixels: variants.after().frompng(png).adjustBW().imgdata, w: png.width, h: png.height };
    });
  }).flat();
  const processImage = (create, { pixels, w, h }) => create(pixels.slice(), w, h).despeckle().imgdata;
  images.forEach(image => assert.deepEqual(processImage(variants.before, image), processImage(variants.after, image)));
  console.log(`${dataset}: ${images.length} images, all outputs identical`);
  const measure = create => {
    const start = performance.now();
    images.forEach(image => processImage(create, image));
    return performance.now() - start;
  };
  Array.from({ length: 2 }).forEach(() => Object.values(variants).forEach(measure));
  const times = { before: [], after: [] };
  Array.from({ length: 10 }, (_, round) => round).forEach(round => {
    const order = round % 2 ? ['after', 'before'] : ['before', 'after'];
    order.forEach(name => times[name].push(measure(variants[name])));
  });
  const beforeMs = median(times.before);
  const afterMs = median(times.after);
  const result = { dataset, images: images.length, changed: 0, beforeMs, afterMs,
    reductionPercent: 100 * (1 - afterMs / beforeMs), speedup: beforeMs / afterMs, times };
  report.results.push(result);
  fs.writeFileSync(path.join(__dirname, 'benchmark-despeckle-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
