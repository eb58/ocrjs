const imgtest = function (dimr, dimc) {

   const fs = require('fs');
   const _ = require('underscore');
   const pngjs = require('pngjs');
   const ocr = require("./ocr/ocr");
   const ocrimg = require("./ocr/ocrimg");
   const dbtrain = require(`../data/dbjs/ebdb-train-${dimr}x${dimc}.js`);

   const ocrengine = ocr(dbtrain);

   const traindata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten/";
   const testdata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";

   const  dateStart = new Date();

   const badResults =  [];
   const statistics = {procent: 0, dimr, dimc, ok: 0, nok: 0, cnt: 0, secure: 0, falsesecure: 0};

   _.range(10).forEach(n => {
      const dir = testdata + 'img' + n + '/';

      fs.readdirSync(dir).filter(fname => fname.includes('.png')).forEach((imgfile, idx) => {
         if (idx < 30) {
            //console.log(n,imgfile)
            const png = pngjs.PNG.sync.read(fs.readFileSync(dir + imgfile));
            const img = ocrimg().frompng(png).adjustBW().extglyph().cropglyph().scaleDown(dimr, dimc);
            const res = ocrengine.findNearestDigitSqrDist(img.imgdata);

            statistics.cnt++;
            statistics.ok += n === res[0].digit;
            statistics.nok += n !== res[0].digit;
            statistics.secure += ((n === res[0].digit) && (res[1].dist / res[0].dist > 2.0));
            statistics.falsesecure += ((n !== res[0].digit) && (res[1].dist / res[0].dist > 2.0));


//            if ((n !== res[0].digit) && res[1].dist / res[0].dist > 2.0) {
//               ocrimg().frompng(png).adjustBW().extglyph().cropglyph().scaleDown(20, 20).dump()
//            }

            if (n !== res[0].digit) {
               badResults.push({n, res, imgfile});
               console.log(n, (res[1].dist / res[0].dist).toFixed(2), imgfile, JSON.stringify(res));
               //ocrimg().frompng(png).adjustBW().extglyph().cropglyph().scaleDown(20, 20).dump()
            }
//          console.log('RES', n, imgfile, JSON.stringify(res));
         }
      });
   });

   statistics.procent = (statistics.ok * 100 / statistics.cnt).toFixed(2);
   statistics.secureprocent = (statistics.secure * 100 / statistics.cnt).toFixed(2);
   statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';
   //console.log(JSON.stringify(badResults));


   const x = badResults.map((badResult, n) => {
      console.log(badResult.n,'imgfile', badResult.imgfile, 'aaa', badResult.res[0].name, badResult.res[1].name);
      return `<tr>\n 
         <td>${badResult.n}</td>\n
         <td><img src="${testdata}/img${badResult.n}/${badResult.imgfile}"></td>\n
         <td><img src="${traindata}/img${badResult.n}/${badResult.res[0].name}"></td>\n
         <td><img src="${traindata}/img${badResult.n}/${badResult.res[1].name}"></td>\n
       </tr>\n`;
   });

   console.log(JSON.stringify(statistics));
   console.log(JSON.stringify(x));

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = imgtest;
}

