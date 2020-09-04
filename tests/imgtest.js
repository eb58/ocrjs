const imgtest = function (opts) {
  const fs = require('fs');
  const range = n => [...Array(n).keys()];
  const ocr = require('../src/ocr/ocr');
  const ebdb_train_6x4 = require(`../data/dbjs/ebdb-train-6x4`);
  const ebdb_train_8x6 = require(`../data/dbjs/ebdb-train-8x6`);


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

  const updateStatistics = (digit, res, imgfile) => {
    statistics.cnt++;
    statistics.ok += digit === res[0].digit;
    statistics.nok += digit !== res[0].digit;
    statistics.secure += digit === res[0].digit && res[1].dist / res[0].dist > 2.0;
    statistics.falsesecure += digit !== res[0].digit && res[1].dist / res[0].dist > 2.0;
    if (digit !== res[0].digit) {
      badResults.push({ digit, res, imgfile });
      console.log(digit, (res[1].dist / res[0].dist).toFixed(2), imgfile, JSON.stringify(res));
    }
  }

  const generateHtmlOverviewOfBadResults = () => {
    statistics.procent = ((statistics.ok * 100) / statistics.cnt).toFixed(2);
    statistics.secureprocent = ((statistics.secure * 100) / statistics.cnt).toFixed(2);
    statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';
    console.log(statistics);
    const tableHeader = `
      <tr>
        <td>Korrekt</td>
        <td>Erkannt</td>
        <td>Konfidenz</td>
        <td>Zu erkennen</td>
        <td>Kandidat1</td>
        <td>Kandidat2</td>
        <td>Kandidat3</td>
      </tr>`
    const tableRows = badResults.reduce((acc, badResult) => acc +
      `<tr>
          <td>${badResult.digit}</td>
          <td>${badResult.res[0].digit}</td>
          <td>${(badResult.res[1].dist / badResult.res[0].dist).toFixed(2)}</td>
          <td><img src="${opts.path2Testdata}/img${badResult.digit}/${badResult.imgfile}" style="height:50px"></td>
          <td><img src="${opts.path2Traindata}/img${badResult.res[0].digit}/${badResult.res[0].name}" style="height:50px"></td>
          <td><img src="${opts.path2Traindata}/img${badResult.res[1].digit}/${badResult.res[1].name}" style="height:50px"></td>
          <td><img src="${opts.path2Traindata}/img${badResult.res[2].digit}/${badResult.res[2].name}" style="height:50px"></td>
       </tr>`
      , '');
    fs.writeFileSync(opts.outFile || 'c:/temp/t.html', `
    <pre>${JSON.stringify(statistics)}</pre>
    <table border=1>
        ${tableHeader}
        ${tableRows}
    </table>`);
  }

  range(10).forEach(digit => {
    const dir = opts.path2Testdata + '/img' + digit + '/';
    fs.readdirSync(dir)
      .filter((fname, idx) => idx < opts.nImages2Test && fname.includes('.png'))
      .forEach((fname, idx) => {
        const res = ocrengine.recognizeImage(dir + fname, ebdb_train_6x4, ebdb_train_8x6);
        updateStatistics(digit, res, fname);
      });
  });

  generateHtmlOverviewOfBadResults(statistics, dateStart, badResults, opts, fs);
};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = imgtest;
}


