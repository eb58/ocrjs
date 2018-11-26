const _ = require('underscore');
const fs = require('fs');
const PNGImage = require('pngjs-image');
const sharp = require('sharp');

const ocrimg = require("./ocrimg");
const ocr = require("./ocr");
const ocrdb = require("./ocrdb");

const myocrdbtrain = ocrdb('train');
const myocrdbt10k = ocrdb('t10k');

function generateDBs(dimr, dimc) {
   const dimstr = `${dimr}x${dimc}`;
   console.log('generateDBs', dimstr);
   myocrdbtrain.generateDBFromMnist(dimr, dimc, (ebdb) => fs.writeFileSync(`data/dbjs/ebdb-train-${dimstr}.js`, 'module.exports=' + JSON.stringify(ebdb)));
   myocrdbt10k.generateDBFromMnist(dimr, dimc, (ebdb) => fs.writeFileSync(`data/dbjs/ebdb-test-${dimstr}.js`, 'module.exports=' + JSON.stringify(ebdb)));
}

const test = function (prefix,dimr, dimc) {
   const dbtest = require(`../data/dbjs/${prefix}-test-${dimr}x${dimc}.js`);
   const dbtrain = require(`../data/dbjs/${prefix}-train-${dimr}x${dimc}.js`);
   const statistics = {dimr, dimc, ok: 0, nok: 0, cnt: 0, secure: 0};
   const ocrengine = ocr(dbtrain);

   _.range(10).forEach(n => {
      dbtest[n].forEach((imgarr, idx) => {
         if (idx < 10000) {
            const img = ocrimg.init(imgarr, dimr, dimc);
            const res = ocrengine.findNearestDigitSqrDist(img.getImageArray());
            const ratio = res.secbest.dist / res.best.dist;


            if (n !== res.best.digit) {
               //console.log('RES', n, JSON.stringify(res), ratio.toFixed(2), n !== res.best.digit ? '*****' : '');
               //img.dump( );
               //ocrimg.init(myocrdbt10k.getMnistImage(imgarr.idxmnist), 28, 28).cropGlyph().dump();
               //ocrimg.init(myocrdbtrain.getMnistImage(res.best.idxmnist), 28, 28).cropGlyph().dump();
            }
            statistics.cnt++;
            statistics.ok += n === res.best.digit;
            statistics.nok += n !== res.best.digit;
            statistics.secure += ((n === res.best.digit) && (ratio > 1.5));
         }
      });
   });

   statistics.procent = (statistics.ok*100 / statistics.cnt).toFixed(2) ;
   statistics.secureprocent = statistics.secure*100 / statistics.cnt ;
   console.log(JSON.stringify(statistics));
};

if (0) {
   generateDBs(6, 4);
   generateDBs(7, 5);
   generateDBs(8, 6);
}


test('dbm', 6, 4);

// ##################################################################################

0 && PNGImage.readImage('/temp/test-imgs/img-0-0.png', (err, image) => {
   err && console.log(err);
   const img = ocrimg.initFromPNGImage(image).cropGlyph().dump().scaleUp(160, 120).scaleDown(8, 6).dump();
   //ocrimg.initFromPNGImage(image).cropGlyph().dump()
});

0 && PNGImage.readImage('/temp/images/img-9-980.png', (err, image) => {
   err && console.log(err);
   const img = ocrimg.initFromPNGImage(image).cropGlyph().dump().scaleUp(160, 120).scaleDown(8, 6).dump();
   //ocrimg.initFromPNGImage(image).cropGlyph().dump()
});


0 && PNGImage.readImage('/temp/images/img-9-980.png', (err, image) => {
   err && console.log(err)
   const dbtest = require(`../data/dbjs/ebdb-test-8x6.js`);
   const img = ocrimg.initFromPNGImage(image).cropGlyph().dump().scaleDown(6, 4).dump()
   const res = ocr(dbtest).findNearestDigit(img.getImageArray());
   console.log('RES', JSON.stringify(res))
});


0 && sharp('./data/mnist/imgs/img-0-10.png')
        .resize({height: 160, width: 120})
        .toFile('c:/temp/scale.png');

0 && sharp('./data/mnist/imgs/img-0-10.png')
        .resize({fit: sharp.fit.fill, height: 80, width: 60})
        .toBuffer()
        .then(buf => PNGImage.loadImage(buf, (err, image) => {
              const img = ocrimg.init(image, 8, 6).cropGlyph().scaleDown(8, 6).dump();
              console.log(ocr(db).findNearestDigit(img.getImageArray()))
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
