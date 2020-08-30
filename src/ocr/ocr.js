const ocr = (distfct) => {
  const fs = require('fs');
  const PNG = require('pngjs').PNG;
  const ocrimg = require('./ocrimg');

  const range = n => [...Array(n).keys()];
  const sqr = x => x * x;
  const vdist = distfct || ((v1, v2) => v1.reduce((d, _, i) => d + sqr(v1[i] - v2[i]), 0));

  const findNearestDigit = (imgvec, db) => {
    const res = range(10)
      .map(n => ({ digit: n, dist: Number.MAX_SAFE_INTEGER }))
      .map(x => db[x.digit].reduce((acc, dbi) => {
        const dist = vdist(imgvec, dbi.imgvec);
        if (dist < x.dist) {
          x.dist = dist;
          acc = {
            digit: x.digit,
            dist,
            ...dbi
          };
        }
        return acc;
      }, {})
      );
    res.sort((a, b) => a.dist - b.dist);
    return res.slice(0, 3);
  };

  const confidence = res => res[1].dist / res[0].dist;
  const isSecure = res => confidence(res) > 2.5;

  const prepareImg = (png, dimr, dimc) => ocrimg()
    .frompng(png)
    .adjustBW()
    .extractGlyph()
    .cropGlyph()
    .scaleDown(dimr, dimc);

  const preparePngFile = (pngfile, dimr, dimc) => {
    const png = PNG.sync.read(fs.readFileSync(pngfile));
    return prepareImg(png, dimr, dimc);
  }


  const recognizeImage = (imgfile, db1, db2) => {
    const png = PNG.sync.read(fs.readFileSync(imgfile));
    const img1 = prepareImg(png, db1.dimr, db1.dimc);
    const res = findNearestDigit(img1.imgdata, db1);
    if (confidence(res) > 2.5) {
      return res;
    }
    if (!db2) {
      return res;
    }
    else {
      const img2 = prepareImg(png, db2.dimr, db2.dimc);
      return findNearestDigit(img2.imgdata, db2);
    }
  }


  return {
    findNearestDigit,
    prepareImg,
    recognizeImage,
  };
}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ocr;
}
