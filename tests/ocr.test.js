const range = n => [...Array(n).keys()];
const dim = '6x4';
const dbtrain = require('../data/dbjs/ebdb-train-' + dim);
const dbtest = require('../data/dbjs/ebdb-test-' + dim);
const ocr = require('../src/ocr/ocr')(dbtrain);

const run = n => {
  dbtest[n].reduce(
    (counter, checkDigit) => {
      const guessOk = ocr.findNearestDigit(checkDigit)[0].digit === n;
      counter.all++;
      counter.ok += guessOk;
      counter.nok += !guessOk;
      return counter;
    },
    { ok: 0, nok: 0, all: 0 }
  );
};

test('first test', () => {
  expect(1 + 2).toBe(3);
});

test('first ocr', () => {
  range(10).forEach(n => run(n));
  const quot = counter.ok / counter.all;
  console.log(counter, quot);
  //expect(quot).toBeGreaterThan(0.97);
});
