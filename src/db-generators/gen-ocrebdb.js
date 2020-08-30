const range = n => [...Array(n).keys()];
const fs = require('fs');
const pngjs = require('pngjs');
const ocrimg = require('../ocr/ocrimg');

const prepareImg = (png, dimr, dimc) => ocrimg()
  .frompng(png)
  .adjustBW()
  .extractGlyph()
  .cropGlyph()
  .scaleDown(dimr, dimc);

const computeImage = (xdir, name, dimr, dimc) => {
  // console.log('working on ' + xdir + name + '...');
  const png = pngjs.PNG.sync.read(fs.readFileSync(xdir + name));
  return prepareImg(png, dimr, dimc);
}

const genEBDB = function (dir, dimr, dimc) {
  const ebdb = Object.assign({ dimr, dimc }, range(10).reduce((acc, i) => ((acc[i] = []), acc), {}));

  range(10).forEach(digit => {
    const xdir = dir + '/img' + digit + '/';
    console.log('working on ' + xdir + '...');

    fs.readdirSync(xdir)
      .filter(fname => fname.includes('.png'))
      .forEach((name, idx) => {
        if (idx < 100000) {
          const imgvec = computeImage(xdir, name, dimr, dimc).imgdata;
          // const img = ocrimg().frompng(png).adjustBW().despeckle().cropGlyph().extractGlyph().cropGlyph().scaleDown(20, 20).dump( {values:true});
          ebdb[digit].push({ imgvec, name });
        }
      });
  });
  return ebdb;
};

const generateDBsForEBData = function (dimr, dimc, traindata, testdata, prefix) {
  const dimstr = `${dimr}x${dimc}`;
  console.log('generateDBs: ', prefix, dimstr, '...');

  fs.writeFileSync(
    `data/dbjs/${prefix}-train-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc))
  );
  fs.writeFileSync(
    `data/dbjs/${prefix}-test-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc))
  );
};

if (0) {
  const dir = 'C:/Users/erich/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/';
  const traindata = dir + '/01 - Trainingsdaten';
  const testdata = dir + '/02 - Validierungsdaten';

  generateDBsForEBData(6, 4, traindata, testdata, 'ebdb');
  generateDBsForEBData(7, 5, traindata, testdata, 'ebdb');
  generateDBsForEBData(8, 6, traindata, testdata, 'ebdb');
}

if (1) {
  const dir = 'C:/Users/erich/Documents/JavascriptProjekte/ocrjs/data/mnist/';
  const traindata = dir + '/train';
  const testdata = dir + '/t10k';

  generateDBsForEBData(6, 4, traindata, testdata, 'mnist-db');
  generateDBsForEBData(7, 5, traindata, testdata, 'mnist-db');
  generateDBsForEBData(8, 6, traindata, testdata, 'mnist-db');
}

computeImage('C:/Users/erich/Documents/JavascriptProjekte/ocrjs/data/mnist/train/img0/', '0-10245.png', 6, 4);
