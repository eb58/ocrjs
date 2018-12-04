
const imgtest = function (dimr, dimc) {
   const testdata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";

   const fs = require('fs');
   const _ = require('underscore');
   const pngjs = require('pngjs');
   const ocr = require("./ocr/ocr");
   const ocrimg = require("./ocr/ocrimg");
   const dbtrain = require(`../data/dbjs/ebdb-train-${dimr}x${dimc}.js`);

   const statistics = {dimr, dimc, ok: 0, nok: 0, cnt: 0, secure: 0};
   const ocrengine = ocr(dbtrain);


   const getOcrimg = function (png) {
      let [img, w, h, sz ] = [[], png.width, png.height, png.width * png.height];
      for (var x = 0; x < sz * 4; x += 4) {
         img.push( png.data[x] > 128 ? 1 : 0);
      }
      return ocrimg(img, w, h);
   };


   _.range(10).forEach(n => {
      const dir = testdata + 'img' + n + '/';
      if (fs.existsSync(dir)) {
         //console.log(dir);
         const listOfFiles = fs.readdirSync(dir).filter(fname => fname.includes('.png'));

         listOfFiles.forEach((imgfile, idx) => {
            if (idx < 1000) {
               var data = fs.readFileSync(dir + imgfile);
               var png = pngjs.PNG.sync.read(data);
               //getOcrimg(png).adjustBW().despeckle().cropglyph().scaleDown(50, 50).dump();

                  const img = getOcrimg(png).adjustBW().despeckle().extglyph().cropglyph().scaleDown(6, 4);

                  const res = ocr(dbtrain).findNearestDigitSqrDist(img.getImgdata());
                  if (n !== res.best.digit) {
                     console.log('RES', n, JSON.stringify(res), n !== res.best.digit ? '*****' : '', imgfile);
                     img.dump({values: true});
                     //ocrimg.init(myocrdbt10k.getMnistImage(imgarr.idxmnist), 28, 28).cropglyph().dump();
                     //ocrimg.init(myocrdbtrain.getMnistImage(res.best.idxmnist), 28, 28).cropglyph().dump();
                   }
                  const ratio = res.secbest.dist / res.best.dist;
                  statistics.cnt++;
                  statistics.ok += n === res.best.digit;
                  statistics.nok += n !== res.best.digit;
                  statistics.secure += ((n === res.best.digit) && (ratio > 1.5));
               };
////               const res = ocrengine.findNearestDigitSqrDist(img.img);
//               const ratio = res.secbest.dist / res.best.dist;
//
//               if (n !== res.best.digit) {
//                  console.log('RES', n, JSON.stringify(res), ratio.toFixed(2), n !== res.best.digit ? '*****' : '', img.name);
//                  ocrimg(img.img, dimc, dimr).dump({values: true});
//                  //ocrimg.init(myocrdbt10k.getMnistImage(imgarr.idxmnist), 28, 28).cropglyph().dump();
//                  //ocrimg.init(myocrdbtrain.getMnistImage(res.best.idxmnist), 28, 28).cropglyph().dump();
//               }
         });
      }
   });

   statistics.procent = (statistics.ok * 100 / statistics.cnt).toFixed(2);
   statistics.secureprocent = (statistics.secure * 100 / statistics.cnt).toFixed(2);
   console.log(JSON.stringify(statistics));
};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = imgtest;
}

