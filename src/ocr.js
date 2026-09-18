const ocr = () => {
  const fs = require('fs')
  const PNG = require('pngjs').PNG
  const ocrimg = require('./ocrimg')

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

  const mdist = () => {
    let minDist = Number.MAX_SAFE_INTEGER;
    return (v1, v2) => {
      let sum = 0;
      for (let i = 0; i < v1.length; i++) {
        sum += sqr(v1[i] - v2[i]);
        if (sum > minDist) return sum;
      }
      minDist = sum < minDist ? sum : minDist;
      return sum;
    };
  };

  const findNearestDigit = (imgvec, db) => range(10)
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
    .slice(0, 3);

  const confidence = res => res[0] && res[1] ? res[1].dist / res[0].dist : 0;
  const png = (pngfile) => PNG.sync.read(fs.readFileSync(pngfile));
  const prepareImg = (pngfile, dimr, dimc) => ocrimg().frompng(png(pngfile)).adjustBW().despeckle().cropGlyph().scaleDown(dimr, dimc);
  const recImg = (pngfile, db) => findNearestDigit(prepareImg(pngfile, db.dimr, db.dimc).imgdata, db, mdist());
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
