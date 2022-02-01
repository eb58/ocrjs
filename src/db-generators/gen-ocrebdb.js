const range = n => [...Array(n).keys()];
const fs = require('fs');
const PNG = require('pngjs').PNG;
const ocrimg = require('../ocr/ocrimg');

const genEBDB = (dir, dimr, dimc, computeImage) => {
  const ebdb = Object.assign({ dimr, dimc, dir }, range(10).reduce((acc, i) => ((acc[i] = []), acc), {}));

  range(10).forEach(digit => {
    const xdir = dir + '/img' + digit + '/';
    console.log('working on ' + xdir + ' ...');
    fs.readdirSync(xdir)
      .filter(fname => fname.includes('.png'))
      .forEach((name) => {
        ebdb[digit].push({ imgvec: computeImage(xdir, name, dimr, dimc).imgdata, name });
      })
  });
  return ebdb;
};

const generateDBsForEBData = (dimr, dimc, traindata, testdata, prefix) => {
  const dimstr = `${dimr}x${dimc}`;
  console.log('generateDBs: ', prefix, dimstr, '...');

  const prepareImgTrain = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().despeckle().cropGlyph().scaleDown(dimr, dimc);
  const computeImageTrain = (xdir, name, dimr, dimc) => prepareImgTrain(PNG.sync.read(fs.readFileSync(xdir + name)), dimr, dimc);
    fs.writeFileSync(
    `data/dbjs/train/${prefix}-train-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc, computeImageTrain))
  );
  const prepareImgTest = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().extractGlyph().cropGlyph().scaleDown(dimr, dimc);
  const computeImageTest = (xdir, name, dimr, dimc) => prepareImgTest(PNG.sync.read(fs.readFileSync(xdir + name)), dimr, dimc);
  fs.writeFileSync(
    `data/dbjs/test/${prefix}-test-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc, computeImageTest))
  );
};

const imgsdir = 'C:/Users/erich/Documents/JavascriptProjekte/ocrjs/data/imgs/';

if (1) {
  const ebdbDir = imgsdir + 'ebdb/';
  const traindata = ebdbDir + 'train';
  const testdata = ebdbDir + 'test';

  generateDBsForEBData(6, 4, traindata, testdata, 'ebdb');
  generateDBsForEBData(7, 5, traindata, testdata, 'ebdb');
  generateDBsForEBData(8, 6, traindata, testdata, 'ebdb');
}

if (0) {
  const mnistDir = imgsdir + 'mnist/';
  const traindata = mnistDir + '/train';
  const testdata = mnistDir + '/t10k';

  generateDBsForEBData(6, 4, traindata, testdata, 'mnist-db');
  generateDBsForEBData(7, 5, traindata, testdata, 'mnist-db');
  generateDBsForEBData(8, 6, traindata, testdata, 'mnist-db');
}
