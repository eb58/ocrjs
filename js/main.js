const _ = require('underscore');
const fs = require('fs');
const PNGImage = require('pngjs-image');
const sharp = require('sharp');

const ebimg = require("./ebimg");
const ocr = require("./ocr");
const ocrdb = require("./ocrdb");




if (1) { // generateDBs
   // mnist-train-data
   ocrdb.generateDBFromMnist('data/mnist/', 'train', 6, 4, (ebdb) => fs.writeFileSync('data/mnist/ebdb-train-6x4.js', 'module.exports=' + JSON.stringify(ebdb)));
   ocrdb.generateDBFromMnist('data/mnist/', 'train', 7, 5, (ebdb) => fs.writeFileSync('data/mnist/ebdb-train-7x5.js', 'module.exports=' + JSON.stringify(ebdb)));
   ocrdb.generateDBFromMnist('data/mnist/', 'train', 8, 6, (ebdb) => fs.writeFileSync('data/mnist/ebdb-train-8x6.js', 'module.exports=' + JSON.stringify(ebdb)));

   ocrdb.generateDBFromMnist('data/mnist/', 't10k', 6, 4, (ebdb) => fs.writeFileSync('data/mnist/ebdb-test-6x4.js', 'module.exports=' + JSON.stringify(ebdb)));
   ocrdb.generateDBFromMnist('data/mnist/', 't10k', 7, 5, (ebdb) => fs.writeFileSync('data/mnist/ebdb-test-7x5.js', 'module.exports=' + JSON.stringify(ebdb)));
   ocrdb.generateDBFromMnist('data/mnist/', 't10k', 8, 6, (ebdb) => fs.writeFileSync('data/mnist/ebdb-test-8x6.js', 'module.exports=' + JSON.stringify(ebdb)));
}



0 && PNGImage.readImage('/temp/images/img-9-980.png', (err, image) => {
   err && console.log(err)
   const dbtest = require(`../data/mnist/ebdb-test-8x6.js`);
   const img = ebimg.initFromPNGImage(image).cropGlyph().dump().scale(6, 4).dump()
   const res = ocr(dbtest).findNearestDigit(img.getImg());
   console.log('RES', JSON.stringify(res))
});


const test = function (dimr, dimc) {
   const dbtest = require(`../data/mnist/ebdb-test-${dimr}x${dimc}.js`);
   const dbtrain = require(`../data/mnist/ebdb-train-${dimr}x${dimc}.js`);
   const statistics = {ok: 0, nok: 0, cnt: 0};

   _.range(10).forEach(n => {

      dbtrain[n].forEach((imgarr, idx) => {
         if (idx < 100) {
            const img = ebimg.init(imgarr, dimr, dimr);//.dump()
            const res = ocr(dbtest).findNearestDigit(img.getImg());
            n !== res.best.digit && console.log('RES', n, JSON.stringify(res), n !== res.best.digit ? '????????????????' : '');
            statistics.cnt++;
            statistics.ok += n === res.best.digit;
            statistics.nok += n !== res.best.digit;
         }
      });
   });

   statistics.procent = statistics.ok / statistics.cnt;
   console.log(statistics);
};


test(7, 5);


0 && sharp('./data/mnist/imgs/img-0-10.png')
        .resize({height: 160, width: 120})
        .toFile('c:/temp/scale.png');

0 && sharp('./data/mnist/imgs/img-0-10.png')
        .resize({fit: sharp.fit.fill, height: 80, width: 60})
        .toBuffer()
        .then(buf => PNGImage.loadImage(buf, (err, image) => {
              const img = ebimg.init(image).cropGlyph().scale(8, 6).dump();
              console.log(ocr(db).findNearestDigit(img.getImg()))
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
