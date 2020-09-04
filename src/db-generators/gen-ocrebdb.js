const range = n => [...Array(n).keys()];
const fs = require('fs');
const PNG = require('pngjs').PNG;
const ocrimg = require('../ocr/ocrimg');

const prepareImgTest = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().extractGlyph().cropGlyph().scaleDown(dimr, dimc);
const prepareImgTrain = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().despeckle().cropGlyph().scaleDown(dimr, dimc);
const computeImageTest = (xdir, name, dimr, dimc) => prepareImgTest(PNG.sync.read(fs.readFileSync(xdir + name)), dimr, dimc);
const computeImageTrain = (xdir, name, dimr, dimc) => prepareImgTrain(PNG.sync.read(fs.readFileSync(xdir + name)), dimr, dimc);

const genEBDB = function (dir, dimr, dimc, computeImage) {
  const ebdb = Object.assign({ dimr, dimc }, range(10).reduce((acc, i) => ((acc[i] = []), acc), {}));

  range(10).forEach(digit => {
    const xdir = dir + '/img' + digit + '/';
    console.log('working on ' + xdir + '...');
    fs.readdirSync(xdir)
      .filter(fname => fname.includes('.png'))
      .forEach((name) => ebdb[digit].push({ imgvec: computeImage(xdir, name, dimr, dimc).imgdata, name }))
  });
  return ebdb;
};

const generateDBsForEBData = function (dimr, dimc, traindata, testdata, prefix) {
  const dimstr = `${dimr}x${dimc}`;
  console.log('generateDBs: ', prefix, dimstr, '...');

  fs.writeFileSync(
    `data/dbjs/${prefix}-train-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc, computeImageTrain))
  );
  fs.writeFileSync(
    `data/dbjs/${prefix}-test-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc, computeImageTest))
  );
};

if (1) {
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
