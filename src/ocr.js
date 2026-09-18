const ocr = () => {
  const PRIMARY_WEIGHT = 0.25
  const SECURE_CONFIDENCE = 2.4
  const fs = require('fs')
  const PNG = require('pngjs').PNG
  const img = require('./img')

  const range = n => [...Array(n).keys()]
  const sqr = x => x * x
  // const zip = (xs, ys, f) => xs.map((x, i) => f ? f(xs[i], ys[i]) : [xs[i], ys[i]])
  // const sum = (xs) => xs.reduce((acc, x) => acc + x, 0)
  //const distFct = (v1, v2) => sum(zip(v1, v2, (x, y) => sqr(x - y)))
  const distFct = (v1, v2) => {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      sum += sqr(v1[i] - v2[i]);
    }
    return sum;
  }

  const findNearestDigit = (imgvec, db, limit = 3) => range(10)
    .map(digit => ({ digit, dist: Number.MAX_SAFE_INTEGER }))
    .map(x => db[x.digit].reduce((acc, dbi) => {
      const dist = distFct(imgvec, dbi.imgvec);
      if (dist < x.dist) {
        x.dist = dist;
        acc = {
          digit: x.digit,
          dist,
          ...dbi,
        };
      }
      return acc;
    }, {})
    ).sort((a, b) => a.dist - b.dist)
    .slice(0, limit);

  const confidence = res => res[0] && res[1] ? (res[0].dist ? res[1].dist / res[0].dist : 99) : 0;
  const relativeDistance = (candidate, best) => best.dist ? candidate.dist / best.dist : candidate.dist ? Number.MAX_SAFE_INTEGER : 1;
  const combineResults = (primary, cleaned) => {
    const primaryByDigit = Object.fromEntries(primary.map(candidate => [candidate.digit, candidate]));
    const cleanedByDigit = Object.fromEntries(cleaned.map(candidate => [candidate.digit, candidate]));
    return range(10)
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
  const recImg = (pngfile, db) => {
    const source = png(pngfile);
    const primary = findNearestDigit(img().frompng(source).prepare(db.dimr, db.dimc).imgdata, db, 10);
    if (confidence(primary) >= SECURE_CONFIDENCE) return primary.slice(0, 3);
    const cleaned = findNearestDigit(
      img().frompng(source).prepare(db.dimr, db.dimc, { cleanGlyph: true }).imgdata,
      db,
      10
    );
    return combineResults(primary, cleaned);
  };
  const recImage = (pngfile, dbs) => dbs.map(db => recImg(pngfile, db));
  const recognizeImage = (pngfile, dbs) => recImage(pngfile, dbs).sort((a, b) => confidence(b) - confidence(a))[0];

  return {
    findNearestDigit,
    recognizeImage,
  };
}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ocr;
}
