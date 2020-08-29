const ocrMnistDbGenerator = function (prefix) {
  const range = n => [...Array(n).keys()];

  const fs = require('fs');
  const ocrimg = require('../ocr/ocrimg');

  const DIM = 28;
  const DIMSQR = DIM * DIM;
  const mnistpath = 'data/mnist/';

  const labels = fs.readFileSync(mnistpath + prefix + '-labels.idx1-ubyte').slice(8); // cf. structure of mnist
  const images = fs.readFileSync(mnistpath + prefix + '-images.idx3-ubyte').slice(16); // cf. structure of mnist

  const getMnistImage = i => images.slice(i * DIMSQR, (i + 1) * DIMSQR).map(p => p > 50);

  const generate = (dimr, dimc) => {
    const db = range(10).reduce((acc, i) => ((acc[i] = []), acc), {});
    labels.forEach((label, idx) => {
      const image = ocrimg(getMnistImage(idx), DIM, DIM)
        .adjustBW()
        .despeckle()
        .cropglyph()
        .scaleDown(dimr, dimc);
      db[label].push({ img: [...image.imgdata], idxmnist: idx });
    });
    return db;
  };

  return {
    generate
  };
};

function generateDBsForMnist(dimr, dimc) {
  console.log('generateDBs', `${dimr}x${dimc}`);
  fs.writeFileSync(`data/dbjs/ebdb-mnist-train-${dimr}x${dimc}.js`, 'module.exports = ' + JSON.stringify(ocrMnistDbGenerator('train').generate(dimr, dimc)));
  fs.writeFileSync(`data/dbjs/ebdb-mnist-test-${dimr}x${dimc}.js`, ' module.exports = ' + JSON.stringify(ocrMnistDbGenerator('t10k').generate(dimr, dimc)));
}

generateDBsForMnist(6, 4);
//generateDBsForMnist(7, 5);
//generateDBsForMnist(8, 6);
