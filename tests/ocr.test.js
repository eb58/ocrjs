const range = n => [...Array(n).keys()];
const ocrengine = require('../src/ocr/ocr')()

const run = (dim, dbtrainprefix, dbtestprefix) => {
  dbtestprefix = dbtestprefix || dbtrainprefix;
  const counter = { ok: 0, nok: 0, all: 0 };
  const dbtrain = require(`../data/dbjs/train/${dbtrainprefix}-train-${dim}`);
  const dbtest = require(`../data/dbjs/test/${dbtestprefix}-test-${dim}`);
  range(10).forEach(n => {
    dbtest[n].forEach(checkDigit => {
      const guessOk = ocrengine.findNearestDigit(checkDigit.imgvec, dbtrain)[0].digit === n;
      counter.all++;
      counter.ok += guessOk;
      counter.nok += !guessOk;
    })
  })
  return counter;
};


test('ocr 6x4', () => {
  const counter = run('6x4', 'ebdb');
  console.log(counter, counter.ok / counter.all);
  expect(quot).toBeGreaterThan(0.97);
});

test('ocr 7x5', () => {
  const counter = run('7x5', 'ebdb');
  console.log(counter, counter.ok / counter.all);
  expect(quot).toBeGreaterThan(0.977);
});

test('ocr 8x6', () => {
  const counter = run('8x6', 'ebdb');
  console.log(counter, counter.ok / counter.all);
  expect(quot).toBeGreaterThan(0.975);
});
