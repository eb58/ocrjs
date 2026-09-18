const ocr = () => {
  const PRIMARY_WEIGHT = 0.25
  const SECURE_CONFIDENCE = 2.4
  const fs = require('fs')
  const PNG = require('pngjs').PNG
  const img = require('./img')

  const range = n => [...Array(n).keys()]
  const DIGITS = range(10)
  // const zip = (xs, ys, f) => xs.map((x, i) => f ? f(xs[i], ys[i]) : [xs[i], ys[i]])
  // const sum = (xs) => xs.reduce((acc, x) => acc + x, 0)
  //const distFct = (v1, v2) => sum(zip(v1, v2, (x, y) => sqr(x - y)))
  const distFct = (v1, v2, bestDistance) => {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
      if (sum >= bestDistance) return sum;
    }
    return sum;
  }

  const findNearestDigit = (imgvec, db, limit = 3) => DIGITS
    .map(digit => ({ digit, dist: Number.MAX_SAFE_INTEGER }))
    .map(x => db[x.digit].reduce((acc, dbi) => {
      const dist = distFct(imgvec, dbi.imgvec, x.dist);
      if (dist < x.dist) {
        x.dist = dist;
        acc = {
          digit: x.digit,
          dist,
          ...dbi,
        };
      }
      return acc;
    }, { digit: x.digit, dist: x.dist })
    ).sort((a, b) => a.dist - b.dist)
    .slice(0, limit);

  const confidence = res => res[0] && res[1] ? (res[0].dist ? res[1].dist / res[0].dist : 99) : 0;
  const relativeDistance = (candidate, best) => best.dist ? candidate.dist / best.dist : candidate.dist ? Number.MAX_SAFE_INTEGER : 1;
  const combineResults = (primary, cleaned) => {
    const primaryByDigit = Object.fromEntries(primary.map(candidate => [candidate.digit, candidate]));
    const cleanedByDigit = Object.fromEntries(cleaned.map(candidate => [candidate.digit, candidate]));
    return DIGITS
      .map(digit => {
        const primaryCandidate = primaryByDigit[digit];
        const cleanedCandidate = cleanedByDigit[digit];
        const primaryDistance = relativeDistance(primaryCandidate, primary[0]);
        const cleanedDistance = relativeDistance(cleanedCandidate, cleaned[0]);
        const source = primaryDistance <= cleanedDistance ? primaryCandidate : cleanedCandidate;
        return {
          ...source,
          dist: primaryDistance ** PRIMARY_WEIGHT * cleanedDistance ** (1 - PRIMARY_WEIGHT),
        };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
  };
  const png = (pngfile) => PNG.sync.read(fs.readFileSync(pngfile));
  const createRecognizer = (pngfile) => {
    const base = img().frompng(png(pngfile)).adjustBW().despeckle();
    const primaryGlyph = base.cropGlyph();
    const cache = new Map();
    return db => {
      const primaryVector = primaryGlyph.scaleDown(db.dimr, db.dimc).imgdata;
      const primary = findNearestDigit(primaryVector, db, 10);
      if (confidence(primary) >= SECURE_CONFIDENCE) return primary.slice(0, 3);
      if (!cache.has('cleaned')) cache.set('cleaned', base.clone().extractGlyph().cropGlyph());
      const cleanedVector = cache.get('cleaned').scaleDown(db.dimr, db.dimc).imgdata;
      const identical = primaryVector.every((value, index) => value === cleanedVector[index]);
      const cleaned = identical ? primary : findNearestDigit(cleanedVector, db, 10);
      // Keep the ensemble's normalized scores even when both views are identical.
      return combineResults(primary, cleaned);
    };
  };
  const recImage = (pngfile, dbs) => dbs.length ? dbs.map(createRecognizer(pngfile)) : [];
  const recognizeImage = (pngfile, dbs) => recImage(pngfile, dbs).sort((a, b) => confidence(b) - confidence(a))[0];

  return {
    confidence,
    createRecognizer,
    findNearestDigit,
    recognizeImage,
  };
}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ocr;
}
