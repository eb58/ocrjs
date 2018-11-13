const fs = require('fs');
const _ = require('underscore');
const PNGImage = require('pngjs-image');

const DIM = 28;
const DIMSQR = DIM * DIM;



const readMnistDB = function () {

   const lbl = fs.readFileSync('public_html/data/mnist/t10k-labels.idx1-ubyte').slice(8);
   const imgs = fs.readFileSync('public_html/data/mnist/t10k-images.idx3-ubyte').slice(16);

   const creImg = (arr) => {
      var img = PNGImage.createImage(DIM, DIM);
      for (let i = 0; i < arr.length; i++) {
         const pix = 255 - arr[i]
         const [r, c] = [i % DIM, Math.floor(i / DIM)];
         img.setAt(r, c, {red: pix, green: pix, blue: pix, alpha: 255});
      }
      return img;
   };

   function f(imgarr, n) {
      if (n >= imgarr.length)
         return;

      const path = 'public_html/data/mnist/imgs/img-' + lbl[n] + '-' + n + '.png'
      console.log('PATH', path)

      imgarr[n].writeImage('public_html/data/mnist/imgs/img-' + lbl[n] + '-' + n + '.png', (err) => {
         err && console.log('Not written to the file' + err);
         console.log('AAAAAA', n)
         f(imgarr, n + 1);
      });
   }

   const imgarr = [];
   for (let x = 0; x < lbl.length; x++) {
      imgarr.push(creImg(imgs.slice(x * DIMSQR, (x + 1) * DIMSQR)));
   }
   console.log(imgarr.length, imgarr[0]);

   f(imgarr, 0);

}

//readMnistDB(0,5000);
readMnistDB();

