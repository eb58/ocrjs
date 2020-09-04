const range = n => [...Array(n).keys()];
const ocr = require('../src/ocr/ocr')

const run = (dim, dbtrainprefix, dbtestprefix) => {
  dbtestprefix = dbtestprefix || dbtrainprefix;
  const counter = { ok: 0, nok: 0, all: 0 };
  const dbtrain = require(`../data/dbjs/${dbtrainprefix}-train-${dim}`);
  const dbtest = require(`../data/dbjs/${dbtestprefix}-test-${dim}`);
  const ocrx = ocr();
  range(10).forEach(n => {
    dbtest[n].forEach(checkDigit => {
      const guessOk = ocrx.findNearestDigit(checkDigit.imgvec, dbtrain)[0].digit === n;
      counter.all++;
      counter.ok += guessOk;
      counter.nok += !guessOk;
    })
  })
  return counter;
};

xrun = () => {
  const ebdb_train_6x4 = require(`../data/dbjs/ebdb-train-6x4`);
  const ebdb_train_8x6 = require(`../data/dbjs/ebdb-train-8x6`);
  const ocrengine = ocr();
  const dir = 'C:/Users/erich/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/';
}

xtest('ocr 6x4', () => {
  const counter = run('6x4', 'ebdb');
  const quot = counter.ok / counter.all;
  console.log(counter, quot);
  expect(quot).toBeGreaterThan(0.975);
});


test('ocr 8x6', () => {
  const counter = run('8x6', 'ebdb');
  const quot = counter.ok / counter.all;
  console.log(counter, quot);
  expect(quot).toBeGreaterThan(0.975);
});

xtest('ocr 6x4', () => {
  const counter = run('7x5', 'mnist-db');
  const quot = counter.ok / counter.all;
  console.log(counter, quot);
  expect(quot).toBeGreaterThan(0.93);
});
  

