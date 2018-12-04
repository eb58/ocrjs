
const firstTest = function (prefix, dimr, dimc) {

   const _ = require('underscore');
   const ocr = require("./ocr/ocr");
   const ocrimg = require("./ocr/ocrimg");
   const dbtest = require(`../data/dbjs/${prefix}-test-${dimr}x${dimc}.js`);
   const dbtrain = require(`../data/dbjs/${prefix}-train-${dimr}x${dimc}.js`);
   
   const statistics = {dimr, dimc, ok: 0, nok: 0, cnt: 0, secure: 0};
   const ocrengine = ocr(dbtrain);

   _.range(10).forEach(n => {
      dbtest[n].forEach((img, idx) => {
         if (idx < 100) {
            const res = ocrengine.findNearestDigitSqrDist(img.img);
            const ratio = res.secbest.dist / res.best.dist;

            if (n !== res.best.digit) {
               console.log('RES', n, JSON.stringify(res), ratio.toFixed(2), n !== res.best.digit ? '*****' : '', img.name);
               ocrimg(img.img, dimc, dimr).dump({values:true});
               //ocrimg.init(myocrdbt10k.getMnistImage(imgarr.idxmnist), 28, 28).cropglyph().dump();
               //ocrimg.init(myocrdbtrain.getMnistImage(res.best.idxmnist), 28, 28).cropglyph().dump();
            }
            statistics.cnt++;
            statistics.ok += n === res.best.digit;
            statistics.nok += n !== res.best.digit;
            statistics.secure += ((n === res.best.digit) && (ratio > 1.5));
         }
      });
   });

   statistics.procent = (statistics.ok * 100 / statistics.cnt).toFixed(2);
   statistics.secureprocent = (statistics.secure * 100 / statistics.cnt).toFixed(2);
   console.log(JSON.stringify(statistics));
};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = firstTest;
}

