const range = n => [...Array(n).keys()];
const dim = '6x4';
const dbtrain = require('../data/dbjs/ebdb-train-' + dim);
const dbtest = require('../data/dbjs/ebdb-test-' + dim);
const ocr = require('../src/ocr/ocr')(dbtrain);

const counter = { ok: 0, nok: 0, all: 0 };
const run = n => dbtest[n].forEach(checkDigit => {
  const guessOk = ocr.findNearestDigit(checkDigit.imgvec)[0].digit === n;
  counter.all++;
  counter.ok += guessOk;
  counter.nok += !guessOk;
});

test('first ocr', () => {
  range(10).forEach(n => run(n));
  const quot = counter.ok / counter.all;
  expect(quot).toBeGreaterThan(0.975);
});
