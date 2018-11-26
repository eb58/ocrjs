const ocrdb = function (prefix) {

   const fs = require('fs');
   const _ = require('underscore');
   const sharp = require('sharp');
   const PNGImage = require('pngjs-image');
   const ocrimg = require('./ocrimg');
   const DIM = 28;
   const DIMSQR = DIM * DIM;
   const mnistpath = "data/mnist/";

   const labels = fs.readFileSync(mnistpath + prefix + "-labels.idx1-ubyte").slice(8); // cf. structur of mnist
   const images = fs.readFileSync(mnistpath + prefix + "-images.idx3-ubyte").slice(16); // cf. structur of mnist


   const getMnistImage = i =>  images.slice(i * DIMSQR, (i + 1) * DIMSQR)

   const generateDBFromMnist = (dimr, dimc, cb) => {


      this.db = _.range(10).reduce((acc, i) => ((acc[i] = []), acc), {});
      for (let i = 0; i < labels.length; i++) {

         const image = ocrimg.init(getMnistImage(i), DIM, DIM).cropGlyph().scaleDown(dimr, dimc);
         //console.log('Digit', labels[i]);  image.dump()
         this.db[labels[i]].push({img: image.getImageArray(), idxmnist: i});
         // i === 0 && console.log('A', i, labels[i], [...this.db[labels[i]][0]].join(' '))
      }
      cb(this.db);
      return this;
   };

   const writeImagesToFilesytem = (path) => {
      require('mkdirp').sync(path);

      function getAsImage(arr) {
         var img = PNGImage.createImage(DIM, DIM);
         for (let i = 0; i < arr.length; i++) {
            const pix = 255 - arr[i];
            const [r, c] = [i % DIM, Math.floor(i / DIM)];
            img.setAt(r, c, {red: pix, green: pix, blue: pix, alpha: 255});
         }
         return img;
      }
      ;


      function extractImages(imgarr, c, n) {
         n < imgarr.length && getAsImage(imgarr[n]).writeImage(path + '/img-' + c + '-' + n + '.png', (err) => {
            err && console.log('Not written to the file' + err);
            extractImages(imgarr, c, n + 1);
         });
      }

      Object.keys(this.db).forEach(n => extractImages(this.db[n], n, 0));
   };

   const generateEBDB = (path, dimr, dimc, cb) => {
      let ebdb = {dimr, dimc};
      ebdb = _.extend({}, ebdb, _.range(10).reduce((acc, i) => (acc[i] = [], acc), {}));

      function extractImages(path, listOfFiles, n) {
         if (n < listOfFiles.length) {
            PNGImage.readImage(path + '/' + listOfFiles[n], (err, image) => {
               err && console.log('error', err);
               const digit = listOfFiles[n].split('-')[1];
               ebdb[digit].push({arr: ocrimg.initFromPNGImage(image).cropGlyph().scaleDown(dimr, dimc).getImageArray(), name: listOfFiles[n]});
               extractImages(path, listOfFiles, n + 1);
            });
         } else {
            cb(ebdb);
         }
      }
      extractImages(path, fs.readdirSync(path), 0);
   };


   return {
      getMnistImage,
      generateDBFromMnist,
      writeImagesToFilesytem,
      generateEBDB
   };

};
if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocrdb;
}
