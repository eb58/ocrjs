const fs = require('fs');
const pngjs = require('pngjs');

const ocrimg = require("./ocr/ocrimg");
const ocr = require("./ocr/ocr");
const ocrebdb = require("./util/ocrebdb");
const firsttest = require("./firsttest");
const imgtest = require("./imgtest");
const dbtrain = require(`../data/dbjs/ebdb-train-6x4.js`);
const ocrengine = ocr(dbtrain);

//firsttest('dbm', 6, 4);
//firsttest('ebdb-mnist', 6, 4);
//firsttest('ebdb', 6, 4);

//imgtest(6, 4)

// ##################################################################################
const traindata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten/";
const testdata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";
//const imgdata = "C:/temp/01 -Trainingsdaten/";

// ocrebdb().generateEBDB( traindata, 6, 4, (db) => fs.writeFileSync(`data/dbjs/ebdb-train-6x4.js`, 'module.exports = ' + JSON.stringify(db)) );
// ocrebdb().generateEBDB( testdata, 6, 4, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-6x4.js`, 'module.exports = ' + JSON.stringify(db)) );
// ocrebdb().generateEBDB( traindata, 8, 6, (db) => fs.writeFileSync(`data/dbjs/ebdb-train-8x6.js`, 'module.exports = ' + JSON.stringify(db)) );
// ocrebdb().generateEBDB( testdata, 8, 6, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-8x6.js`, 'module.exports = ' + JSON.stringify(db)) );


const f = () => {
   //const imgfile = testdata + 'img0/0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_8_3042038h_1.tif.png';
   const imgfile = testdata + 'img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_2_3042252h_1.tif.png';
   
   const png = pngjs.PNG.sync.read(fs.readFileSync(imgfile));
   const img = ocrimg().frompng(png).adjustBW().despeckle().cropglyph().dump().extglyph().dump().scaleDown(6, 4).dump({values: true});
   const res = ocrengine.findNearestDigitSqrDist(img.imgdata);
   console.log('RES', JSON.stringify(res));
}
f()



//PNGImage.readImage(testdata + 'img0/0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_8_3042038h_1.tif.png', (err, image) => {
//   err && console.log(err);
//
//   getOcrimg(image).adjustBW().despeckle().extglyph().cropglyph().scaleDown(6, 4).dump({values: true});
//});
//
//
//0 && PNGImage.readImage(testdata + 'img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_2_3042252h_1.tif.png', (err, image) => {
//   err && console.log(err);
//
//   getOcrimg(image).adjustBW().despeckle().cropglyph().extglyph().scaleDown(6, 4).dump({values: true});
//});
//
//0 && PNGImage.readImage(testdata + 'img0/0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_8_3042038h_1.tif.png', (err, image) => {
//   err && console.log(err);
//
//   getOcrimg(image).adjustBW().despeckle().cropglyph().extglyph().scaleDown(6, 4).dump({values: true});
//});
//
//

