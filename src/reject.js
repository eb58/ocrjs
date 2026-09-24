const fs = require('fs');
const { PNG } = require('pngjs');
const createImage = require('./img');
const wasmSearch = require('./wasm-search');

// Conservative Grenze fuer das 8x6-Raster. Der Detektor ist als Review-Filter gedacht:
// `rejected` darf nie als Beweis verwendet werden, dass ein Bild keine Ziffer enthaelt.
const MAX_DISTANCE = 35000;
const DIGITS = [...Array(10).keys()];

const vectorize = (file, dimr = 8, dimc = 6) =>
  createImage()
    .frompng(PNG.sync.read(fs.readFileSync(file)))
    .adjustBW()
    .despeckle()
    .extractGlyphFarFromBiggest(15)
    .cropGlyph()
    .scaleDown(dimr, dimc).imgdata;

const squaredDistance = (a, b) => a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0);
const nearest = (query, samples) => {
  const fast = wasmSearch.nearest(query, samples);
  if (fast) return fast;
  return samples.reduce(
    (best, sample, index) => {
      const dist = squaredDistance(query, sample.imgvec);
      return dist < best.dist ? { dist, index } : best;
    },
    { dist: Infinity, index: -1 },
  );
};

const scoreVector = (query, db, maxDistance = MAX_DISTANCE) => {
  if (query.length !== db.dimr * db.dimc) throw new RangeError('Vector and database dimensions do not match');
  const best = DIGITS.map((digit) => ({ digit, ...nearest(query, db[digit]) })).sort((a, b) => a.dist - b.dist)[0];
  return { ...best, maxDistance, rejected: best.dist > maxDistance };
};

const createRejectDetector = (db, maxDistance = MAX_DISTANCE) => {
  if (db.dimr !== 8 || db.dimc !== 6) throw new RangeError('Reject detector requires the 8x6 database');
  return (file) => scoreVector(vectorize(file, db.dimr, db.dimc), db, maxDistance);
};

module.exports = { MAX_DISTANCE, createRejectDetector, scoreVector, vectorize };
