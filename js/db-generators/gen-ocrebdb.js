const genEBDB = function(dir, dimr, dimc) {
  const _ = require('underscore');
  const fs = require('fs');
  const pngjs = require('pngjs');

  const ocrimg = require('../ocr/ocrimg');

  const ebdb = _.extend(
    { dimr, dimc },
    _.range(10).reduce((acc, i) => ((acc[i] = []), acc), {})
  );

  _.range(10).forEach(digit => {
    const xdir = dir + '/img' + digit + '/';
    console.log('working on ' + xdir + '...');

    fs.readdirSync(xdir)
      .filter(fname => fname.includes('.png'))
      .forEach((imgfile, idx) => {
        if (idx < 100000) {
          //console.log('working on ' + imgfile + '...');
          const png = pngjs.PNG.sync.read(fs.readFileSync(xdir + imgfile));
          const img = ocrimg()
            .frompng(png)
            .adjustBW()
            .despeckle()
            .cropglyph()
            .extglyph()
            .cropglyph()
            .scaleDown(dimr, dimc).imgdata;
          // const img = ocrimg().frompng(png).adjustBW().despeckle().cropglyph().extglyph().cropglyph().scaleDown(20, 20).dump( {values:true});
          ebdb[digit].push({ img: img, name: imgfile });
        }
      });
  });
  return ebdb;
};

const generateDBsForEBData = function(dimr, dimc) {
  const fs = require('fs');
  const dimstr = `${dimr}x${dimc}`;
  const traindata =
    'C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/01 - Trainingsdaten';
  const testdata =
    'C:/Users/a403163/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/02 - Validierungsdaten';

  console.log('generateEBDBs: ', dimstr, '...');

  fs.writeFileSync(
    `data/dbjs/ebdb-train-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(traindata, dimr, dimc))
  );
  fs.writeFileSync(
    `data/dbjs/ebdb-test-${dimstr}.js`,
    'module.exports = ' + JSON.stringify(genEBDB(testdata, dimr, dimc))
  );
};

generateDBsForEBData(6, 4);
generateDBsForEBData(7, 5);
generateDBsForEBData(8, 6);
