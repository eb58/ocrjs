const imgtest = function (dimr, dimc) {

   var glob = require("glob")
   const fs = require('fs');
   const _ = require('underscore');
   const pngjs = require('pngjs');
   const ocr = require("./ocr/ocr");
   const ocrimg = require("./ocr/ocrimg");
   const dbtrain = require(`../data/dbjs/ebdb-train-${dimr}x${dimc}.js`);

   const ocrengine = ocr(dbtrain);

   const traindata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten";
   const testdata1 = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten";
   const testdata2 = "C:/temp/test-imgs";

   //const traindata = "./public/01 - Ziffern/01 - Trainingsdaten";
   //const testdata = "./public/01 - Ziffern/02 - Validierungsdaten";

   const  dateStart = new Date();

   const badResults = [];
   const statistics = {procent: 0, dimr, dimc, ok: 0, nok: 0, cnt: 0, secure: 0, falsesecure: 0};

   function handleImage(imgfile, digit, statistics) {
      const png = pngjs.PNG.sync.read(fs.readFileSync(imgfile));
      const img = ocrimg().frompng(png).adjustBW().extglyph().cropglyph().scaleDown(dimr, dimc);
      const res = ocrengine.findNearestDigitSqrDist(img.imgdata);

      statistics.cnt++;
      statistics.ok += digit === res[0].digit;
      statistics.nok += digit !== res[0].digit;
      statistics.secure += ((digit === res[0].digit) && (res[1].dist / res[0].dist > 2.0));
      statistics.falsesecure += ((digit !== res[0].digit) && (res[1].dist / res[0].dist > 2.0));

      if ((digit !== res[0].digit) && res[1].dist / res[0].dist > 2.0) {
         ocrimg().frompng(png).adjustBW().extglyph().cropglyph().scaleDown(20, 20).dump()
      }

      if (digit !== res[0].digit) {
         badResults.push({digit, res, imgfile});
         console.log(digit, (res[1].dist / res[0].dist).toFixed(2), imgfile, JSON.stringify(res));
         //ocrimg().frompng(png).adjustBW().extglyph().cropglyph().scaleDown(10, 10).dump()
      }

   }


   0 && _.range(10).forEach(digit => {
      const dir = testdata1 + '/img' + digit + '/';
      fs.readdirSync(dir).filter(fname => fname.includes('.png')).forEach((imgfile, idx) => {
         if (idx > 3000 && idx < 5000) {
            handleImage(imgfile, digit, statistics);
         }
      });
   });

   fs.readdirSync(testdata2).filter(fname => fname.includes('.png')).forEach((imgfile, idx) => {
      const digit = Number(imgfile.split('-')[1]);
         if (idx > 3000 && idx < 5000) {
         handleImage(testdata2 + '/' + imgfile, digit, statistics);
      }
   });


   statistics.procent = (statistics.ok * 100 / statistics.cnt).toFixed(2);
   statistics.secureprocent = (statistics.secure * 100 / statistics.cnt).toFixed(2);
   statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';

   const x = badResults.reduce((acc, badResult) => {
      const res = badResult.res;
      console.log(badResult.digit, badResult.imgfile, res[0].name, res[1].name);
      return acc + `
         <tr>
            <td>${badResult.digit}</td>
            <td>${res[0].digit}</td>
            <td>${(res[1].dist / res[0].dist).toFixed(2)}</td>
            <td><img src="${badResult.imgfile}" style="height:50px"></td>
            <td><img src="${traindata}/img${res[0].digit}/${res[0].name}" style="height:50px"></td>
            <td><img src="${traindata}/img${res[1].digit}/${res[1].name}" style="height:50px"></td>
         </tr>`;
   }, '');

   console.log(JSON.stringify(statistics));
   fs.writeFileSync('c:/temp/t.html', `<table border=1>${x}</table>`);

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = imgtest;
}

