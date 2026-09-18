const range = n => [...Array(n).keys()];
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const img = require('../img');

const projectPath = path.resolve(__dirname, '../..');
const dataPath = path.join(projectPath, 'data');
const dbPath = path.join(dataPath, 'dbs');

const isPNG = fname => fname.endsWith('.png')

const genEBDB = (dir, dimr, dimc, computeImage) => {
  const ebdb = { dimr, dimc, dir: path.relative(projectPath, dir) };

  range(10).forEach(digit => {
    const xdir = path.join(dir, `img${digit}`);
    console.log('working on ' + xdir + ' ...');
    ebdb[digit] = fs.readdirSync(xdir)
      .filter(isPNG)
      .map(name => ({ imgvec: computeImage(xdir, name, dimr, dimc).imgdata, name }));
  });
  return ebdb;
};

const generateDBsForEBData = (dimr, dimc, traindata, testdata, prefix) => {
  const dimstr = `${dimr}x${dimc}`;
  console.log('generateDBs: ', prefix, dimstr, '...');

  // generate training db
  const computeImage = (xdir, name, dimr, dimc) =>
    img().frompng(PNG.sync.read(fs.readFileSync(path.join(xdir, name)))).prepare(dimr, dimc);
  fs.writeFileSync(
    path.join(dbPath, `${prefix}-train-${dimstr}.js`),
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc, computeImage))
  );

  // generate test db
  fs.writeFileSync(
    path.join(dbPath, `${prefix}-test-${dimstr}.js`),
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc, computeImage))
  );
};

{
  const traindata = path.join(dataPath, 'imgs', 'eb', 'train');
  const testdata = path.join(dataPath, 'imgs', 'eb', 'test');
  generateDBsForEBData(6, 4, traindata, testdata, 'eb-db');
  generateDBsForEBData(7, 5, traindata, testdata, 'eb-db');
  generateDBsForEBData(8, 6, traindata, testdata, 'eb-db');
}

{
  const traindata = path.join(dataPath, 'imgs', 'mnist', 'train');
  const testdata = path.join(dataPath, 'imgs', 'mnist', 'test');
  generateDBsForEBData(6, 4, traindata, testdata, 'mnist-db');
  generateDBsForEBData(7, 5, traindata, testdata, 'mnist-db');
  generateDBsForEBData(8, 6, traindata, testdata, 'mnist-db');
}
