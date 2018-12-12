const fs = require('fs');
const _ = require('underscore');

const ocrebdb = function () {

   const ocrimg = require('../ocr/ocrimg');
   const _ = require('underscore');
   const pngjs = require('pngjs');

   const generateEBDB = (dir, dimr, dimc) => {
      const ebdb = _.extend( {dimr, dimc}, _.range(10).reduce((acc, i) => (acc[i] = [], acc), {}));

      _.range(10).forEach(digit => {
         const xdir = dir + '/img' + digit + '/';
         console.log('working on ' + xdir + '...');

         fs.readdirSync(xdir).filter(fname => fname.includes('.png')).forEach((imgfile, idx) => {
            if (idx < 10000) {
               console.log('working on ' + imgfile + '...');
               const png = pngjs.PNG.sync.read(fs.readFileSync(xdir + imgfile));
               const img = ocrimg().frompng(png).adjustBW().despeckle().cropglyph().extglyph().cropglyph().scaleDown(dimr, dimc).imgdata;
               //ocrimg().frompng(png).adjustBW().despeckle().cropglyph().extglyph().cropglyph().scaleDown(20, 20).dump( {values:true});
               ebdb[digit].push({img: img, name: imgfile});
            }
         });
      });
      return ebdb;
   };

   return {
      generateEBDB
   };

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocrebdb;
}

const traindata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten/";
//fs.writeFileSync(`data/dbjs/ebdb-train-6x4.js`, 'module.exports = ' + JSON.stringify(ocrebdb().generateEBDB(traindata, 6, 4)));
fs.writeFileSync(`data/dbjs/ebdb-train-7x5.js`, 'module.exports = ' + JSON.stringify(ocrebdb().generateEBDB(traindata, 7, 5)));
fs.writeFileSync(`data/dbjs/ebdb-train-8x6.js`, 'module.exports = ' + JSON.stringify(ocrebdb().generateEBDB(traindata, 8, 6)));

//
//
//const testdata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";
//ocrebdb().generateEBDB(testdata, 6, 4, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-6x4.js`, 'module.exports = ' + JSON.stringify(db)));
//ocrebdb().generateEBDB(testdata, 7, 5, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-6x4.js`, 'module.exports = ' + JSON.stringify(db)));
//ocrebdb().generateEBDB(testdata, 8, 6, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-8x6.js`, 'module.exports = ' + JSON.stringify(db)));

