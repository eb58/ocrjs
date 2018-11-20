const _ = require('underscore');
const fs = require('fs');
const PNGImage = require('pngjs-image');
const sharp = require('sharp');

const db = require("../data/dbjs/dbm8x6");
const ebimg = require("./ebimg");
const ocr = require("./ocr");
const ocrdb = require("./ocrdb");

//const mnistdbtrain = ocrdb.generateDBFromMnist('data/mnist/', 'train' );
const mnistdbt10k = ocrdb.generateDBFromMnist('data/mnist/', 't10k');

//console.log(mnistdbtrain.dimr, mnistdbtrain.dimc )

//ocrdb.generateEBDB('/temp/imgs/', 6, 4, (ebdb) => fs.writeFileSync('data/mnist/ebdb6x4.js', JSON.stringify(ebdb)));
//ocrdb.generateEBDB('/temp/imgs/', 7, 5, (ebdb) => fs.writeFileSync('data/mnist/ebdb7x5.js', JSON.stringify(ebdb)));
//ocrdb.generateEBDB('/temp/imgs/', 8, 6, (ebdb) => fs.writeFileSync('data/mnist/ebdb8x6.js', JSON.stringify(ebdb)));


//fs.writeFileSync(mnist)

//_.range(10).forEach(n => console.log(n, mnistdbtrain[n].length))


//ocrdb.writeImagesToFilesytem('/temp/')


PNGImage.readImage('./data/mnist/imgs/img-0-1001.png', (err, image) => {
   const img = ebimg.init(image).cropGlyph().dump().scale(6, 4).dump()
   //console.log(ocr(db).findNearestDigit(img.getImg()))
});

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

//        sharp('./public_html/data/mnist/imgs/img-0-10.png')
//                .resize({fit: sharp.fit.fill, height: 8, width: 6})
//                .toColourspace('b-w')
//                
//                .toFile('/temp/output.png', (err, info) => console.log(info));

//sharp('./public_html/data/mnist/imgs/img-0-10.png')
//        .resize({fit: sharp.fit.fill, height: 160, width: 120})
//        .toColourspace('b-w')
//        .toBuffer()
//        .then(x => dumpMatrix([...x], 120));

