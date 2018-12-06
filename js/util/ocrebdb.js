const ocrebdb = function () {

   const fs = require('fs');
   const _ = require('underscore');
   const ocrimg = require('../ocr/ocrimg');



   const generateEBDB = (path, dimr, dimc, cb) => {
      let ebdb = {dimr, dimc};
      ebdb = _.extend({}, ebdb, _.range(10).reduce((acc, i) => (acc[i] = [], acc), {}));

      function extractImages(digit, path, listOfFiles, n) {
         if (n < listOfFiles.length) {
            PNGImage.readImage(path + '/' + listOfFiles[n], (err, image) => {
               err && console.log('error', err, listOfFiles[n] );
               ebdb[digit].push({img: ocrimg.initFromPNGImage(image).adjustBW().despeckle().cropglyph().scaleDown(dimr, dimc).getImageArray(), name: listOfFiles[n]});
               extractImages(digit, path, listOfFiles, n + 1);
            });
         } else {
            if( digit === 9 ) cb(ebdb);
         }
      }

      _.range(10).forEach(n => {
         const dir = path + 'img' + n + '/';
         if (fs.existsSync(dir)) {
            console.log(dir);
            const listOfFiles = fs.readdirSync(dir).filter(fname => fname.includes('.png'));
            extractImages(n, dir, listOfFiles, 0);
         }
      });


   };

   return {
      generateEBDB
   };

};
if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocrebdb;
}
