const ocrMnistDbGenerator = function (prefix) {
   const fs = require('fs');
   const _ = require('underscore');
   const ocrimg = require('../ocr/ocrimg');

   const DIM = 28;
   const DIMSQR = DIM * DIM;
   const mnistpath = "data/mnist/";

   const labels = fs.readFileSync(mnistpath + prefix + "-labels.idx1-ubyte").slice(8); // cf. structure of mnist
   const images = fs.readFileSync(mnistpath + prefix + "-images.idx3-ubyte").slice(16); // cf. structure of mnist


   const getMnistImage = i => images.slice(i * DIMSQR, (i + 1) * DIMSQR).map(p => p > 50);

   const generate = (dimr, dimc) => {
      const db = _.range(10).reduce((acc, i) => ((acc[i] = []), acc), {});
      labels.forEach((label, idx) => {
         const image = ocrimg(getMnistImage(idx), DIM, DIM).adjustBW().despeckle().cropglyph().scaleDown(dimr, dimc);
         db[label].push({img: [...image.imgdata], idxmnist: idx});
      });
      return db;
   };

   return {
      generate
   };

};


function generateDBsForMnist(dimr, dimc) {
   const fs = require('fs');
   const dimstr = `${dimr}x${dimc}`;
   console.log('generateDBs', dimstr);
   fs.writeFileSync(`data/dbjs/ebdb-mnist-train-${dimstr}.js`, 'module.exports = ' + JSON.stringify(ocrMnistDbGenerator('train').generate(dimr, dimc)));
   fs.writeFileSync(`data/dbjs/ebdb-mnist-test-${dimstr}.js`, ' module.exports = ' + JSON.stringify(ocrMnistDbGenerator('t10k').generate(dimr, dimc)));
   
}

generateDBsForMnist(6, 4);
//generateDBsForMnist(7, 5);
//generateDBsForMnist(8, 6);
