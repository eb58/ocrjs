const ocrdb = (function () {

   const fs = require('fs');
   const _ = require('underscore');
   const sharp = require('sharp');
   const PNGImage = require('pngjs-image');
   const ebimg = require('./ebimg');

   const DIM = 28;
   const DIMSQR = DIM * DIM;


   const getAsImage = (arr) => {
      var img = PNGImage.createImage(DIM, DIM);
      for (let i = 0; i < arr.length; i++) {
         const pix = 255 - arr[i];
         const [r, c] = [i % DIM, Math.floor(i / DIM)];
         img.setAt(r, c, {red: pix, green: pix, blue: pix, alpha: 255});
      }
      return img;
   };

   const generateDBFromMnist = (mnistpath, prefix, dimr, dimc, cb) => {
      mnistpath = mnistpath || 'data/mnist/';

      const labels = fs.readFileSync(mnistpath + prefix + '-labels.idx1-ubyte').slice(8); // cf. structur of mnist
      const images = fs.readFileSync(mnistpath + prefix + '-images.idx3-ubyte').slice(16); // cf. structur of mnist

      this.db = _.range(10).reduce((acc, i) => (acc[i] = [], acc), {});
      for (let i = 0; i < labels.length; i++) {
         const imagearr = images.slice(i * DIMSQR, (i + 1) * DIMSQR);//.map(b => 255-b);
         const image = ebimg.init(imagearr, DIM, DIM).cropGlyph().scale(dimr, dimc);
         // console.log('Digit', labels[i]);  image.dump()
         this.db[labels[i]].push( image.getImg());
         // i === 0 && console.log('A', i, labels[i], [...this.db[labels[i]][0]].join(' '))
      }
      cb(this.db);
      return this;
   };

   const writeImagesToFilesytem = (path) => {
      require('mkdirp').sync(path)

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
               ebdb[digit].push({arr: ebimg.initFromPNGImage(image).cropGlyph().scale(dimr, dimc).getImg(), name: listOfFiles[n]});
               extractImages(path, listOfFiles, n + 1);
            });
         } else {
            cb(ebdb);
         }
      }
      extractImages(path, fs.readdirSync(path), 0);
   };


   return {
      generateDBFromMnist,
      writeImagesToFilesytem,
      generateEBDB
   };

})();
if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocrdb;
}
