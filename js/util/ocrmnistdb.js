const ocrmnistdb = function (prefix) {

   const fs = require('fs');
   const _ = require('underscore');
   const ocrimg = require('../ocr/ocrimg');

   const DIM = 28;
   const DIMSQR = DIM * DIM;
   const mnistpath = "data/mnist/";

   const labels = fs.readFileSync(mnistpath + prefix + "-labels.idx1-ubyte").slice(8); // cf. structur of mnist
   const images = fs.readFileSync(mnistpath + prefix + "-images.idx3-ubyte").slice(16); // cf. structur of mnist

   const db = _.range(10).reduce((acc, i) => ((acc[i] = []), acc), {});

   const getMnistImage = i => images.slice(i * DIMSQR, (i + 1) * DIMSQR);
   
   const generateDBFromMnist = (dimr, dimc) => {

      labels.forEach( (label,idx)  => {
         const image = ocrimg
                 .init(getMnistImage(idx), DIM, DIM)
                 .cropGlyph()
                 .scaleDown(dimr, dimc);
         
         db[label].push({img: image.getImageArray(), idxmnist: idx});
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
