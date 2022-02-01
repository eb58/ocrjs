const fs = require('fs');
const range = n => [...Array(n).keys()];
const ocrengine = require('../src/ocr')();

const ebdb_train_6x4 = require(`../data/dbs/eb-db-train-6x4`);
const ebdb_train_7x5 = require(`../data/dbs/eb-db-train-7x5`);
const ebdb_train_8x6 = require(`../data/dbs/eb-db-train-8x6`);

const mnistdb_train_6x4 = require(`../data/dbs/mnist-db-train-6x4`);
const mnistdb_train_7x5 = require(`../data/dbs/mnist-db-train-7x5`);
const mnistdb_train_8x6 = require(`../data/dbs/mnist-db-train-8x6`);

const ebdbs = [ebdb_train_6x4,ebdb_train_7x5,ebdb_train_8x6]
const mnistdbs = [mnistdb_train_6x4, mnistdb_train_7x5, mnistdb_train_8x6]
const dbs = ebdbs

const opts = {
  dbs,
  nImages2TestBegin: 0,
  nImages2Test: 100,
  path2Testdata: 'data/imgs/eb/test',
};


if (0) {
  const imgFile = "c:/temp/mnist-0-1197.png"
  const res = ocrengine.recognizeImage(imgFile, ebdbs);
  console.log(res);
}


const imgtest = (opts) => {
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
    statistics.secure += digit === res[0].digit && res[1].dist / res[0].dist > 2.4;
    statistics.falsesecure += digit !== res[0].digit && res[1].dist / res[0].dist > 2.4;
    if (digit !== res[0].digit) {
      const name = imgfile.split('/').reverse()[0];
      badResults.push({ digit, res, imgfile });
      console.log(digit, (res[1].dist / res[0].dist).toFixed(2), JSON.stringify(res));
      console.log(imgfile);
      fs.copyFileSync(imgfile, `/temp/mnist-${name}`);
    }
  }

  const generateHtmlReportOfBadResults = () => { 
    const path2Traindata = mnistdb_train_6x4.dir;
    statistics.procent = ((statistics.ok * 100) / statistics.cnt).toFixed(2);
    statistics.secureprocent = ((statistics.secure * 100) / statistics.cnt).toFixed(2);
    statistics.time = ((new Date() - dateStart) / 1000).toFixed(2) + ' sec';
    console.log(statistics);
    const tableHeader = `
      <tr>
        <td>Zu erkennen</td>
        <td>Soll</td>
        <td>Ist</td>
        <td>Konfidenz</td>
        <td>Kandidat1</td>
        <td>Kandidat2</td>
        <td>Kandidat3</td>
      </tr>`
    const tableRows = badResults.reduce((acc, badResult) => acc + `
      <tr>
        <td><img src="${badResult.imgfile}" style="height:50px"></td>
        <td>${badResult.digit}</td>
        <td>${badResult.res[0].digit}</td>
        <td>${(badResult.res[1].dist / badResult.res[0].dist).toFixed(2)} </td>
        <td><div>Digit:${badResult.res[0].digit} Dist:${badResult.res[0].dist}</div><img src="${path2Traindata}/img${badResult.res[0].digit}/${badResult.res[0].name}" style="height:50px"></td>
        <td><div>Digit:${badResult.res[0].digit} Dist:${badResult.res[1].dist}</div><img src="${path2Traindata}/img${badResult.res[1].digit}/${badResult.res[1].name}" style="height:50px"></td>
        <td><div>Digit:${badResult.res[0].digit} Dist:${badResult.res[2].dist}</div><img src="${path2Traindata}/img${badResult.res[2].digit}/${badResult.res[2].name}" style="height:50px"></td>
      </tr>`
      , '');
    fs.writeFileSync(opts.outFile || 'c:/temp/t.html', `
    <pre>${JSON.stringify(statistics)}</pre>
    <table border=1>
        ${tableHeader}
        ${tableRows}
    </table>`);
  }

  const processFile = (path, digit) => {
    // console.log("working on ", path)
    const res = ocrengine.recognizeImage(path, opts.dbs)
    updateStatistics(res, digit, path)
  }

  const handleDigit = (digit) => fs.readdirSync(opts.path2Testdata + '/img' + digit + '/')
    .filter((fname, idx) => idx >= (opts.nImages2TestBegin || 0) && idx < opts.nImages2Test && fname.includes('.png'))
    .forEach((fname) => processFile(opts.path2Testdata + '/img' + digit + '/' + fname, digit));

  range(10).forEach(digit => handleDigit(digit));
  generateHtmlReportOfBadResults();
};

imgtest(opts);
