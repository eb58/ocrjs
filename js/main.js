const fs = require('fs');
const PNGImage = require('pngjs-image');

const sharp = require('sharp');

const ocrimg = require("./ocr/ocrimg");
const ocr = require("./ocr/ocr");
const ocrebdb = require("./util/ocrebdb");
const firsttest = require("./firsttest");

//firsttest('dbm', 6, 4);
//firsttest('ebdb-mnist', 6, 4);
//firsttest('ebdb', 6, 4);

// ##################################################################################
const traindata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten/";
const testdata = "C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten/";
//const imgdata = "C:/temp/01 -Trainingsdaten/";

// ocrebdb().generateEBDB( traindata, 6, 4, (db) => fs.writeFileSync(`data/dbjs/ebdb-train-6x4.js`, 'module.exports = ' + JSON.stringify(db)) );
// ocrebdb().generateEBDB( testdata, 6, 4, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-6x4.js`, 'module.exports = ' + JSON.stringify(db)) );
// ocrebdb().generateEBDB( traindata, 8, 6, (db) => fs.writeFileSync(`data/dbjs/ebdb-train-8x6.js`, 'module.exports = ' + JSON.stringify(db)) );
// ocrebdb().generateEBDB( testdata, 8, 6, (db) => fs.writeFileSync(`data/dbjs/ebdb-test-8x6.js`, 'module.exports = ' + JSON.stringify(db)) );

const getOcrimg = function (image) {
   let [img, w, h, sz] = [[], image.getWidth(), image.getHeight(), image.getWidth() * image.getHeight()];
   for (let r = 0; r < sz; r++) {
      img.push(image.getGrayScaleAtIndex(r) > 50 ? 1 : 0);
   }
   return ocrimg(img, w, h);
};

0 && PNGImage.readImage(testdata + 'img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_7_3042147h_1.tif.png', (err, image) => {
   err && console.log(err);

   getOcrimg(image).adjustBW().despeckle().extglyph().cropglyph().scaleDown(6, 4).dump({values: true});
});

PNGImage.readImage(testdata + 'img0/0_0_0__aliste_TestListenH_Neu_rechserv_region1_04_29_101_8_3042038h_1.tif.png', (err, image) => {
   err && console.log(err);

   getOcrimg(image).adjustBW().despeckle().cropglyph().dump().extglyph().scaleDown(6, 4).dump({values: true});
});

0 && PNGImage.readImage(testdata + 'img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_7_3042147h_1.tif.png', (err, image) => {
   err && console.log(err);

   const img = getOcrimg(image).adjustBW().despeckle().extglyph().cropglyph().dump().scaleDown(6, 4).dump({values: true});

   const dbtrain = require(`../data/dbjs/ebdb-train-6x4.js`);
   const res = ocr(dbtrain).findNearestDigitSqrDist(img.getImgdata());

   console.log('RES', JSON.stringify(res));
});

// ##########################################################################

0 && sharp('./data/mnist/imgs/img-0-10.png')
        .resize({height: 160, width: 120})
        .toFile('c:/temp/scale.png');

0 && sharp('c:/temp/scale.tif')
        //.resize({fit: sharp.fit.fill, height: 80, width: 60})
        .toBuffer()
        .then(buf => PNGImage.loadImage(buf, (err, image) => {
              err && console.log(err)
              const img = ocrimg.initFromPNGImage(image).adjustBW().cropglyph().scaleDown(8, 6).dump();
           })
        );
0 && sharp('c:/temp/scale.tif').toFile('c:/temp/scale.png');

0 && sharp(imagedir + '0_~_60957761.tif').toFile('c:/temp/scale.png');

0 && sharp(imagedir + '0_~_60957761.tif').toBuffer()
        .then(buf => PNGImage.loadImage(buf, (err, image) => {
              err && console.log(err, image);
              let img = ocrimg.initFromPNGImage(image);
              //img = img.isInverted() ? img.invert() : img;
              img.cropglyph().scaleDown(8, 6).dump();
           })
        )



// sharp('./public_html/data/mnist/imgs/img-0-10.png')
//         .resize({fit: sharp.fit.fill, height: 8, width: 6})
//         .toColourspace('b-w')
//         .toFile('/temp/output.png', (err, info) => console.log(info));

// sharp('./public_html/data/mnist/imgs/img-0-10.png')
//        .resize({fit: sharp.fit.fill, height: 160, width: 120})
//        .toColourspace('b-w')
//        .toBuffer()
//        .then(x => dumpMatrix([...x], 120));
