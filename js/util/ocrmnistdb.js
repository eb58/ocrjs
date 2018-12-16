const fs = require('fs');

const ocrmnistdb = function (prefix) {

   const _ = require('underscore');
   const ocrimg = require('../ocr/ocrimg');

   const DIM = 28;
   const DIMSQR = DIM * DIM;
   const mnistpath = "data/mnist/";

   const labels = fs.readFileSync(mnistpath + prefix + "-labels.idx1-ubyte").slice(8); // cf. structur of mnist
   const images = fs.readFileSync(mnistpath + prefix + "-images.idx3-ubyte").slice(16); // cf. structur of mnist

   const db = _.range(10).reduce((acc, i) => ((acc[i] = []), acc), {});

   const getMnistImage = i => images.slice(i * DIMSQR, (i + 1) * DIMSQR).map(p =>p >50);

   const generateDBFromMnist = (dimr, dimc) => {

      labels.forEach((label, idx) => {
         const image = ocrimg(getMnistImage(idx), DIM, DIM).cropglyph().scaleDown(dimr, dimc);
         db[label].push({img: [...image.imgdata], idxmnist: idx});
      });
      return db;
   };

   return {
      getMnistImage,
      generateDBFromMnist
   };

};
if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocrmnistdb;
}


const myocrmnistdbtrain = ocrmnistdb('train');
const myocrmnistdbt10k = ocrmnistdb('t10k');


function generateDBsForMnist(dimr, dimc) {
   const dimstr = `${dimr}x${dimc}`;
   console.log('generateDBs', dimstr);
   fs.writeFileSync(`data/dbjs/ebdb-mnist-train-${dimstr}.js`, 'module.exports = ' + JSON.stringify(myocrmnistdbtrain.generateDBFromMnist(dimr, dimc)));
   fs.writeFileSync(`data/dbjs/ebdb-mnist-test-${dimstr}.js`, ' module.exports = ' + JSON.stringify(myocrmnistdbt10k.generateDBFromMnist(dimr, dimc)));
}

generateDBsForMnist(6, 4);
generateDBsForMnist(7, 5);
generateDBsForMnist(8, 6);
