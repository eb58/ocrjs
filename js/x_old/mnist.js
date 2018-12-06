const fs = require('fs');
const _ = require('underscore');

const DIM = 28;
const DIMSQR = DIM * DIM;
const mnistpath = '../../data/mnist/'

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


      function extractImages(imgarr, c, n) {
         n < imgarr.length && getAsImage(imgarr[n]).writeImage(path + '/img-' + c + '-' + n + '.png', (err) => {
            err && console.log('Not written to the file' + err);
            extractImages(imgarr, c, n + 1);
         });
      }

      Object.keys(this.db).forEach(n => extractImages(this.db[n], n, 0));
   };

const readMnistDBx = function () {

   const lbls = fs.readFileSync(mnistpath + 't10k-labels.idx1-ubyte').slice(8);
   const imgs = fs.readFileSync(mnistpath + 't10k-images.idx3-ubyte').slice(16);

   const creImg = (arr) => {
      var img = PNGImage.createImage(DIM, DIM);
      for (let i = 0; i < arr.length; i++) {
         const pix = 255 - arr[i]
         const [r, c] = [i % DIM, Math.floor(i / DIM)];
         img.setAt(r, c, {red: pix, green: pix, blue: pix, alpha: 255});
      }
      return img;
   };

   function extractImages(imgarr, n) {
      if (n >= imgarr.length)
         return;

      imgarr[n].writeImage(mnistpath + 'imgs/img-' + lbls[n] + '-' + n + '.png', (err) => {
         err && console.log('Not written to the file' + err);
         extractImages(imgarr, n + 1);
      });
   }

   const imgarr = [];
   for (let x = 0; x < lbls.length; x++) {
      imgarr.push(creImg(imgs.slice(x * DIMSQR, (x + 1) * DIMSQR)));
   }
   console.log(imgarr.length, imgarr[0]);

   extractImages(imgarr, 0);

}

const readMnistDB = function () {

   const lbls = fs.readFileSync(mnistpath + 't10k-labels.idx1-ubyte').slice(8);
   const imgs = fs.readFileSync(mnistpath + 't10k-images.idx3-ubyte').slice(16);
   const db = _.range(10).reduce( (acc,i) => {acc[i] = []; return acc; }, {});
   
   for( let i = 0; i<lbls; i++ ){
      db[lbls[i]].push(imgs.slice(i * DIMSQR, (i + 1) * DIMSQR));
   }
   return db;

};

readMnistDB();

