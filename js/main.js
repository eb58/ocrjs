const fs = require('fs');
const pngjs = require('pngjs');

const ocrimg = require("./ocr/ocrimg");
const ocr = require("./ocr/ocr");
const imgtest = require("./imgtest");
const dbtrain = require(`../data/dbjs/ebdb-train-6x4.js`);
//const dbtrain = require(`../data/dbjs/ebdb-mnist-train-6x4.js`);
const ocrengine = ocr(dbtrain);

// ##################################################################################
const testdata1 = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";
const testdata2 = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/06 - Problematic/";



(() => {
   const images_problematic = [
      {res: '2', img: testdata2 + '0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_7_3042247h_1.tif.png'},
      {res: '2', img: testdata2 + '0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_9_3042229h_1.tif.png'},
      {res: '2', img: testdata2 + '0_0_0__aliste_TestListenH_Neu_rechserv_region1_17_23_053_5_3042255h_1.tif.png'},
      {res: '2', img: testdata2 + '0_0_0__aliste_TestListenH_Neu_rechserv_region1_17_23_053_6_3042586h_1.tif.png'},
      {res: '3', img: testdata2 + '0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_9_3042029h_1.tif.png'},
      {res: '3', img: testdata2 + '0_0_2__aliste_TestListenH_Neu_rechserv_region1_04_29_101_1_3042571h_1.tif.png'}

   ];
   const images_shouldWork = [
      {res: '0', img: testdata1 + 'img0/0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_8_3042038h_1.tif.png'},
      {res: '0', img: testdata1 + 'img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_2_3042252h_1.tif.png'},
      {res: '3', img: testdata1 + 'img3/0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_2_3042222h_1.tif.png'},
      {res: '5', img: testdata1 + 'img5/0_0_0__aliste_TestListenH_Neu_rechserv_region1_17_23_053_9_3042019h_1.tif.png'},
      {res: '2', img: testdata1 + 'img2/0_0_0__aliste_TestListenH_Neu_rechserv_region1_17_23_056_5_3043325h_1.tif.png'}
   ];
   const images_investigate = [
   ];

   const images = images_investigate;


   images.forEach(image => {
      const png = pngjs.PNG.sync.read(fs.readFileSync(image.img));
      const img = ocrimg().frompng(png).adjustBW().extglyph().cropglyph().dump().scaleDown(6, 4).dump({values: true});
      const res = ocrengine.findNearestDigitSqrDist(img.imgdata);
      console.log(res[0].digit === image.res ? '   ' : '???', 'RES', image.res, JSON.stringify(res));

   });
})();


const dimr = 8;
const dimc = 6;

const opts1 = {
   nImages2Test: 100,
   dimr: dimr,
   dimc: dimc,
   dbtrain: require(`../data/dbjs/ebdb-train-${dimr}x${dimc}.js`),
   path2Traindata:"C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten",
   path2Testdata:"C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten"
}

const opts2 = {
   dimr: dimr,
   dimc: dimc,
   dbtrain: require(`../data/dbjs/ebdb-mnist-train-${dimr}x${dimc}.js`),
   path2Traindata: "C:/temp/mnist-test-train",
   path2Testdata: "C:/temp/mnist-test-imgs"
}

imgtest(opts1);
