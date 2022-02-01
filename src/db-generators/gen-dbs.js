const range = n => [...Array(n).keys()];
const fs = require('fs');
const PNG = require('pngjs').PNG;
const ocrimg = require('../ocrimg');

const isPNG = fname => fname.endsWith('.png')

const genEBDB = (dir, dimr, dimc, computeImage) => {
  const ebdb = { dimr, dimc, dir };

  range(10).forEach(digit => {
    const xdir = dir + '/img' + digit + '/';
    console.log('working on ' + xdir + ' ...');
    ebdb[digit] = fs.readdirSync(xdir)
      .filter(isPNG)
      .map((name) => ({ imgvec: computeImage(xdir, name, dimr, dimc).imgdata, name }));
  });
  return ebdb;
};

const generateDBsForEBData = (dimr, dimc, traindata, testdata, prefix) => {
  const dimstr = `${dimr}x${dimc}`;
  console.log('generateDBs: ', prefix, dimstr, '...');

  // generate training db
  const prepareImgTrain = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().despeckle().cropGlyph().scaleDown(dimr, dimc);
  const computeImageTrain = (xdir, name, dimr, dimc) => prepareImgTrain(PNG.sync.read(fs.readFileSync(xdir + name)), dimr, dimc);
  fs.writeFileSync(
    `data/dbs/${prefix}-train-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc, computeImageTrain))
  );


  // generate test db
  const prepareImgTest = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().extractGlyph().cropGlyph().scaleDown(dimr, dimc);
  const computeImageTest = (xdir, name, dimr, dimc) => prepareImgTest(PNG.sync.read(fs.readFileSync(xdir + name)), dimr, dimc);
  fs.writeFileSync(
    `data/dbs/${prefix}-test-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc, computeImageTest))
  );
};

if (1) {
  const traindata = 'data/imgs/eb/train';
  const testdata = 'data/imgs/eb/test';
  generateDBsForEBData(6, 4, traindata, testdata, 'eb-db');
  generateDBsForEBData(7, 5, traindata, testdata, 'eb-db');
  generateDBsForEBData(8, 6, traindata, testdata, 'eb-db');
}

if (1) {
  const traindata = 'data/imgs/mnist/train';
  const testdata = 'data/imgs/mnist/test';
  generateDBsForEBData(6, 4, traindata, testdata, 'mnist-db');
  generateDBsForEBData(7, 5, traindata, testdata, 'mnist-db');
  generateDBsForEBData(8, 6, traindata, testdata, 'mnist-db');
}
