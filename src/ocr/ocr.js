const ocr = (distfct) => {
  const fs = require('fs');
  const PNG = require('pngjs').PNG;
  const ocrimg = require('./ocrimg');
  const range = n => [...Array(n).keys()];
  const sqr = x => x * x;
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

  const prepareImg = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().despeckle().extractGlyph().cropGlyph().scaleDown(dimr, dimc);

  const prepares = [prepareImg]

  const png = (pngfile) => PNG.sync.read(fs.readFileSync(pngfile));

  const recImg = (png, db, prepares) => prepares.reduce((acc, prepare) => {
    const res = findNearestDigit(prepare(png, db.dimr, db.dimc).imgdata, db);
    return isSecure(res) ? [res] : [...acc, res]
  }, []);

  const recImgs = (png, db) => recImg(png, db, prepares)[0];
  const recImage = (pngfile, dbs) => dbs.reduce((acc, db) => {
    const res = recImgs(png(pngfile), db);
    return isSecure(res) ? [res] : [...acc, res]
  }, []);
  const recognizeImage = (pngfile, dbs) => recImage(pngfile, dbs).sort((r1, r2) => confidence(r2) - confidence(r1))[0];

  return {
    findNearestDigit,
    recognizeImage,
  };
}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ocr;
}
