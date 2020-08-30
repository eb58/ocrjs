const imgtest = function (opts) {

  const fs = require('fs');
  const pngjs = require('pngjs');
  const range = n => [...Array(n).keys()];
  const ocr = require('../src/ocr/ocr');
  const ocrimg = require('../src/ocr/ocrimg');

  const ocrengine = ocr();
  const dateStart = new Date();
  const badResults = [];
  const statistics = {
    dimr: opts.dimr,
    dimc: opts.dimc,
    cnt: 0,
    ok: 0,
    nok: 0,
    procent: 0,
    secure: 0,
    secureprocent: 0,
    falsesecure: 0
  };

  const prepareImg = (png, dimr, dimc) => ocrimg()
    .frompng(png)
    .adjustBW()
    .extractGlyph()
    .cropGlyph()
    .scaleDown(dimr, dimc);

  const recognizeImage = (imgfile) => {
    const png = pngjs.PNG.sync.read(fs.readFileSync(imgfile));
    const img = prepareImg(png, opts.dimr, opts.dimc);
    const res = ocrengine.findNearestDigit(img.imgdata, opts.db);
    return { res, img };
  }

  const updateStatistics = (digit, res, imgfile, img) => {
    statistics.cnt++;
    statistics.ok += digit === res[0].digit;
    statistics.nok += digit !== res[0].digit;
    statistics.secure += digit === res[0].digit && res[1].dist / res[0].dist > 2.0;
    statistics.falsesecure += digit !== res[0].digit && res[1].dist / res[0].dist > 2.0;
    if (digit !== res[0].digit) {
      badResults.push({ digit, res, imgfile });
      console.log(digit, (res[1].dist / res[0].dist).toFixed(2), imgfile, JSON.stringify(res));
      img.dump({ values: true });
    }
  }

  const generateHtmlOverviewOfResults = () => {
    statistics.procent = ((statistics.ok * 100) / statistics.cnt).toFixed(2);
    statistics.secureprocent = ((statistics.secure * 100) / statistics.cnt).toFixed(2);
    statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';
    console.log(statistics);
    const htmlRows = badResults.reduce((acc, badResult) => acc +
      `<tr>
          <td>${badResult.digit}</td>
          <td>${res[0].digit}</td>
          <td>${(res[1].dist / res[0].dist).toFixed(2)}</td>
          <td><img src="${badResult.imgfile}" style="height:50px"></td>
          <td><img src="${opts.path2Traindata}/img${res[0].digit}/${res[0].name}" style="height:50px"></td>
          <td><img src="${opts.path2Traindata}/img${res[1].digit}/${res[1].name}" style="height:50px"></td>
          <td><img src="${opts.path2Traindata}/img${res[2].digit}/${res[2].name}" style="height:50px"></td>
        </tr>`
      , `<pre>${JSON.stringify(statistics)}</pre>`);
    fs.writeFileSync(opts.outFile || 'c:/temp/t.html', `<table border=1>${htmlRows}</table>`);
  }

  range(10).forEach(digit => {
    const dir = opts.path2Testdata + '/img' + digit + '/';
    fs.readdirSync(dir)
      .filter((fname,idx) => idx < opts.nImages2Test && fname.includes('.png'))
      .forEach((fname, idx) => {
          const { res, img } = recognizeImage(fname);
          updateStatistics(digit, res, fname, img);
      });
  });

  generateHtmlOverviewOfResults(statistics, dateStart, badResults, opts, fs);
};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = imgtest;
}


