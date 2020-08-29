const genEBDB = function (dir, dimr, dimc) {
  const range = n => [...Array(n).keys()];
  const fs = require('fs');
  const pngjs = require('pngjs');
  const ocrimg = require('../ocr/ocrimg');

  const ebdb = Object.assign({ dimr, dimc }, range(10).reduce((acc, i) => ((acc[i] = []), acc), {}));

  range(10).forEach(digit => {
    const xdir = dir + '/img' + digit + '/';
    console.log('working on ' + xdir + '...');

    fs.readdirSync(xdir)
      .filter(fname => fname.includes('.png'))
      .forEach((name, idx) => {
        if (idx < 100000) {
          //console.log('working on ' + imgfile + '...');
          const png = pngjs.PNG.sync.read(fs.readFileSync(xdir + name));
          const imgvec = ocrimg()
            .frompng(png)
            .adjustBW()
            .despeckle()
            .cropGlyph()
            .extractGlyph()
            .cropGlyph()
            .scaleDown(dimr, dimc).imgdata;
          // const img = ocrimg().frompng(png).adjustBW().despeckle().cropGlyph().extractGlyph().cropGlyph().scaleDown(20, 20).dump( {values:true});
          ebdb[digit].push({ imgvec, name });
        }
      });
  });
  return ebdb;
};

const generateDBsForEBData = function (dimr, dimc) {
  const dimstr = `${dimr}x${dimc}`;
  const dir = 'C:/Users/erich/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/';
  const traindata = dir + '/01 - Trainingsdaten';
  const testdata = dir + '/02 - Validierungsdaten';

  console.log('generateEBDBs: ', dimstr, '...');

  fs.writeFileSync(
    `data/dbjs/ebdb-train-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc))
  );
  fs.writeFileSync(
    `data/dbjs/ebdb-test-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc))
  );
};

generateDBsForEBData(6, 4);
generateDBsForEBData(7, 5);
generateDBsForEBData(8, 6);
