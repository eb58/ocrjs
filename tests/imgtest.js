const imgtest = function(opts) {
  const range = n => [...Array(n).keys()];

  const fs = require('fs');
  const pngjs = require('pngjs');
  const ocr = require('../src/ocr/ocr');
  const ocrimg = require('../src/ocr/ocrimg');

  const ocrengine = ocr(opts.dbtrain);

  const dateStart = new Date();

  const badResults = [];
  const statistics = {
    procent: 0,
    dimr: opts.dimr,
    dimc: opts.dimc,
    ok: 0,
    nok: 0,
    cnt: 0,
    secure: 0,
    secureprocent: 0,
    falsesecure: 0
  };

  function handleImage(imgfile, digit, statistics) {
    const png = pngjs.PNG.sync.read(fs.readFileSync(imgfile));
    const img = ocrimg()
      .frompng(png)
      .adjustBW()
      .extractGlyph()
      .cropGlyph()
      .scaleDown(opts.dimr, opts.dimc);
    const res = ocrengine.findNearestDigit(img.imgdata);

    statistics.cnt++;
    statistics.ok += digit === res[0].digit;
    statistics.nok += digit !== res[0].digit;
    statistics.secure += digit === res[0].digit && res[1].dist / res[0].dist > 2.0;
    statistics.falsesecure += digit !== res[0].digit && res[1].dist / res[0].dist > 2.0;

    if (digit !== res[0].digit && res[1].dist / res[0].dist > 2.0) {
      //ocrimg().frompng(png).adjustBW().extractGlyph().cropGlyph().scaleDown(10, 10).dump();
    }

    if (digit !== res[0].digit) {
      badResults.push({ digit, res, imgfile });
      console.log(digit, (res[1].dist / res[0].dist).toFixed(2), imgfile, JSON.stringify(res));
      ocrimg()
        .frompng(png)
        .adjustBW()
        .extractGlyph()
        .cropGlyph()
        .scaleDown(opts.dimr, opts.dimc)
        .dump({ values: true });
    }
  }

  range(10).forEach(digit => {
    const dir = opts.path2Testdata + '/img' + digit + '/';
    fs.readdirSync(dir)
      .filter(fname => fname.includes('.png'))
      .forEach((imgfile, idx) => {
        if (idx < opts.nImages2Test) {
          handleImage(dir + imgfile, digit, statistics);
        }
      });
  });

  //   fs.readdirSync(testdata1).filter(fname => fname.includes('.png')).forEach((imgfile, idx) => {
  //      const digit = Number(imgfile.split('-')[1]);
  //      if (idx < 10000) {
  //         handleImage(testdata1 + '/' + imgfile, digit, statistics);
  //      }
  //   });

  statistics.procent = ((statistics.ok * 100) / statistics.cnt).toFixed(2);
  statistics.secureprocent = ((statistics.secure * 100) / statistics.cnt).toFixed(2);
  statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';

  const x = badResults.reduce((acc, badResult) => {
    const res = badResult.res;
    console.log(badResult.digit, badResult.imgfile, res[0].name, res[1].name);
    return (
      acc +
      `
         <tr>
            <td>${badResult.digit}</td>
            <td>${res[0].digit}</td>
            <td>${(res[1].dist / res[0].dist).toFixed(2)}</td>
            <td><img src="${badResult.imgfile}" style="height:50px"></td>
            <td><img src="${opts.path2Traindata}/img${res[0].digit}/${res[0].name}" style="height:50px"></td>
            <td><img src="${opts.path2Traindata}/img${res[1].digit}/${res[1].name}" style="height:50px"></td>
            <td><img src="${opts.path2Traindata}/img${res[2].digit}/${res[2].name}" style="height:50px"></td>
         </tr>
         `
    );
  }, `<pre>${JSON.stringify(statistics)}</pre>`);

  console.log(JSON.stringify(statistics));
  fs.writeFileSync(opts.outFile || 'c:/temp/t.html', `<table border=1>${x}</table>`);
};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = imgtest;
}
