const imgtest = function (dimr, dimc) {

   const fs = require('fs');
   const _ = require('underscore');
   const pngjs = require('pngjs');
   const ocr = require("./ocr/ocr");
   const ocrimg = require("./ocr/ocrimg");
   const dbtrain = require(`../data/dbjs/ebdb-train-${dimr}x${dimc}.js`);

   const ocrengine = ocr(dbtrain);

   const testdata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";
   const statistics = {dimr, dimc, ok: 0, nok: 0, cnt: 0, secure: 0};

   _.range(10).forEach(n => {
      const dir = testdata + 'img' + n + '/';
      if (fs.existsSync(dir)) {
         const listOfFiles = fs.readdirSync(dir).filter(fname => fname.includes('.png'));

         listOfFiles.forEach((imgfile, idx) => {
            if (idx < 30) {
               
               const png = pngjs.PNG.sync.read(fs.readFileSync(dir + imgfile));
               const img = ocrimg().frompng(png).adjustBW().despeckle().cropglyph().extglyph().scaleDown(6, 4);
               const res = ocrengine.findNearestDigitSqrDist(img.imgdata);

               statistics.cnt++;
               statistics.ok += n === res.best.digit;
               statistics.nok += n !== res.best.digit;
               statistics.secure += ((n === res.best.digit) && (res.secbest.dist / res.best.dist > 1.5));

               if (n !== res.best.digit) {
                  console.log('RES', n, JSON.stringify(res), n !== res.best.digit ? '*****' : '', imgfile);
                  //img.dump({values: true});
               }
            }
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

