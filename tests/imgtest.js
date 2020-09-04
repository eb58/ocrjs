const imgtest = function (opts) {
  const fs = require('fs');
  const range = n => [...Array(n).keys()];
  const ocrengine = require('../src/ocr/ocr')();
  const dateStart = new Date();
  const badResults = [];
  const statistics = {
    cnt: 0,
    ok: 0,
    nok: 0,
    procent: 0,
    secure: 0,
    secureprocent: 0,
    falsesecure: 0
  };


  const updateStatistics = (res, digit, imgfile) => {
    statistics.cnt++;
    statistics.ok += digit === res[0].digit;
    statistics.nok += digit !== res[0].digit;
    statistics.secure += digit === res[0].digit && res[1].dist / res[0].dist > 2.0;
    statistics.falsesecure += digit !== res[0].digit && res[1].dist / res[0].dist > 2.0;
    if (digit !== res[0].digit) {
      badResults.push({ digit, res, imgfile });
      console.log(digit, (res[1].dist / res[0].dist).toFixed(2), JSON.stringify(res), imgfile);
    }
  }

  const generateHtmlOverviewOfBadResults = () => {
    statistics.procent = ((statistics.ok * 100) / statistics.cnt).toFixed(2);
    statistics.secureprocent = ((statistics.secure * 100) / statistics.cnt).toFixed(2);
    statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';
    console.log(statistics);
    const tableHeader = `
      <tr>
        <td>Zu erkennen</td>
        <td>Korrekt</td>
        <td>Erkannt</td>
        <td>Konfidenz</td>
        <td>Kandidat1</td>
        <td>Kandidat2</td>
        <td>Kandidat3</td>
      </tr>`
    const tableRows = badResults.reduce((acc, badResult) => acc + `
      <tr>
        <td><img src="${opts.path2Testdata}/img${badResult.digit}/${badResult.imgfile}" style="height:50px"></td>
        <td>${badResult.digit}</td>
        <td>${badResult.res[0].digit}</td>
        <td>${(badResult.res[1].dist / badResult.res[0].dist).toFixed(2)} </td>
        <td><div>${badResult.res[0].dist}</div><img src="${opts.path2Traindata}/img${badResult.res[0].digit}/${badResult.res[0].name}" style="height:50px"></td>
        <td><div>${badResult.res[1].dist}</div><img src="${opts.path2Traindata}/img${badResult.res[1].digit}/${badResult.res[1].name}" style="height:50px"></td>
        <td><div>${badResult.res[2].dist}</div><img src="${opts.path2Traindata}/img${badResult.res[2].digit}/${badResult.res[2].name}" style="height:50px"></td>
      </tr>`
      , '');
    fs.writeFileSync(opts.outFile || 'c:/temp/t.html', `
    <pre>${JSON.stringify(statistics)}</pre>
    <table border=1>
        ${tableHeader}
        ${tableRows}
    </table>`);
  }

  const handleDigit = (digit) => fs.readdirSync(opts.path2Testdata + '/img' + digit + '/')
    .filter((fname, idx) => idx < opts.nImages2Test && fname.includes('.png'))
    .forEach((fname) => updateStatistics(ocrengine.recognizeImage(opts.path2Testdata + '/img' + digit + '/' + fname, opts.dbs), digit, fname));

  range(10).forEach(handleDigit);

  generateHtmlOverviewOfBadResults();

};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = imgtest;
}




