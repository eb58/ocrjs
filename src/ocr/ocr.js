const ocr = (distfct) => {
  const fs = require('fs');
  const PNG = require('pngjs').PNG;
  const ocrimg = require('./ocrimg');
  const range = n => [...Array(n).keys()];
  const sqr = x => x * x;
  const feed = (x, f) => f(x);
  const vdist = distfct || ((v1, v2) => v1.reduce((d, _, i) => d + sqr(v1[i] - v2[i]), 0));

  const findNearestDigit = (imgvec, db) => range(10)
    .map(digit => ({ digit, dist: Number.MAX_SAFE_INTEGER }))
    .map(x => db[x.digit].reduce((acc, dbi) => {
      const dist = vdist(imgvec, dbi.imgvec);
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
  const isSecure = res => confidence(res) > 2.4;
  const png = (pngfile) => PNG.sync.read(fs.readFileSync(pngfile));
  const prepareImg = (pngfile, dimr, dimc) => ocrimg().frompng(png(pngfile)).adjustBW().despeckle().extractGlyph().cropGlyph().scaleDown(dimr, dimc);
  const recImg = (pngfile, db) => findNearestDigit(prepareImg(pngfile, db.dimr, db.dimc).imgdata, db);
  const recImage = (pngfile, dbs) => dbs.reduce((acc, db) => feed(recImg(pngfile, db), (res) => isSecure(res) ? [res] : [...acc, res]), []);
  const recognizeImage = (pngfile, dbs) => recImage(pngfile, dbs).sort((r1, r2) => confidence(r2) - confidence(r1))[0];

  return {
    findNearestDigit,
    recognizeImage,
  };
}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ocr;
}
