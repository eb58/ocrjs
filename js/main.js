const fs = require('fs');
const pngjs = require('pngjs');

const ocrimg = require('./ocr/ocrimg');
const ocr = require('./ocr/ocr');
const imgtest = require('./imgtest');
const dbtrain = require(`../data/dbjs/ebdb-train-6x4.js`);
//const dbtrain = require(`../data/dbjs/ebdb-mnist-train-6x4.js`);
const ocrengine = ocr(dbtrain);

// ##################################################################################

(() => {
  const images_investigate = [];

  const images = images_investigate;

  images.forEach(image => {
    const png = pngjs.PNG.sync.read(fs.readFileSync(image.img));
    const img = ocrimg()
      .frompng(png)
      .adjustBW()
      .extglyph()
      .cropglyph()
      .dump()
      .scaleDown(6, 4)
      .dump({ values: true });
    const res = ocrengine.findNearestDigitSqrDist(img.imgdata);
    console.log(
      res[0].digit === image.res ? '   ' : '???',
      'RES',
      image.res,
      JSON.stringify(res)
    );
  });
})();

const dimr = 8;
const dimc = 6;

const opts1 = {
  nImages2Test: 100,
  dimr: dimr,
  dimc: dimc,
  dbtrain: require(`../data/dbjs/ebdb-train-${dimr}x${dimc}.js`),
  path2Traindata:
    'C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten',
  path2Testdata:
    'C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten',
  outFile: 'c:/temp/t.html'
};

const opts2 = {
  nImages2Test: 100,
  dimr: dimr,
  dimc: dimc,
  dbtrain: require(`../data/dbjs/ebdb-mnist-train-${dimr}x${dimc}.js`),
  path2Traindata: 'C:/temp/mnist-test-train',
  path2Testdata: 'C:/temp/mnist-test-imgs',
  outFile: 'c:/temp/xt.html'
};

imgtest(opts1);
imgtest(opts2);
