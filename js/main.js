const _ = require('underscore');
var PNGImage = require('pngjs-image');
const sharp = require('sharp');

const db = require("../data/dbjs/dbm6x4");
const ebimg = require("./ebimg");
const ocr = require("./ocr");


0 && PNGImage.readImage('./data/mnist/imgs/img-0-1001.png', (err, image) => {

   const img = ebimg.init(image).cropGlyph().dump().scale(6, 4).dump()
   console.log(ocr(db).findNearestDigit(img.getImg()))
});

sharp('./data/mnist/imgs/img-0-10.png')
        .resize({height: 6, width: 4})
        .toFile('c:/temp/scale.png');

sharp('./data/mnist/imgs/img-0-10.png')
        .resize({height: 6, width: 4})
        .toBuffer()
        .then(buf => PNGImage.loadImage(buf, (err, image) => {
              const img = ebimg.init(image).cropGlyph().dump();
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

