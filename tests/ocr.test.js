const range = n => [...Array(n).keys()];
const ocr = require('../src/ocr/ocr')

const run = (dim, dbname) => {
  const counter = { ok: 0, nok: 0, all: 0 };
  const dbtrain = require(`../data/dbjs/${dbname}-train-${dim}`);
  const dbtest = require(`../data/dbjs/${dbname}-test-${dim}`);
  const ocrx = ocr(dbtrain);
  range(10).forEach(n => {
    dbtest[n].forEach(checkDigit => {
      const guessOk = ocrx.findNearestDigit(checkDigit.imgvec)[0].digit === n;
      counter.all++;
      counter.ok += guessOk;
      counter.nok += !guessOk;
    })
  })
  return counter;
};

test('ocr 6x4', () => {
  const counter = run('6x4', 'ebdb');
  const quot = counter.ok / counter.all;
  console.log(counter, quot);
  expect(quot).toBeGreaterThan(0.975);
});

xtest('ocr 8x6', () => {
  const counter = run('8x6', 'ebdb');
  const quot = counter.ok / counter.all;
  console.log(counter, quot);
  expect(quot).toBeGreaterThan(0.975);
});
