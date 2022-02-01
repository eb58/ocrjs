const range = n => [...Array(n).keys()];
const ocrengine = require('../src/ocr')()

const run = (dim, train, test) => {
  test = test || train;
  const dbtrain = require(`../data/dbs/${train}-db-train-${dim}`);
  const dbtest = require(`../data/dbs/${test}-db-test-${dim}`);
  const counter = { ok: 0, all: 0 }

  range(10).forEach(n => dbtest[n].forEach((checkDigit, i) => {
    counter.all++;
    counter.ok += ocrengine.findNearestDigit(checkDigit.imgvec, dbtrain)[0].digit === n;;
  })
  )
  return counter.ok / counter.all
};

console.log(run('7x5', 'eb'))
// test('ocr 6x4', expect(run('6x4', 'mnist')).toBeGreaterThan(0.965))
// test('ocr 7x5', () => expect(run('7x5', 'eb')).toBeGreaterThan(0.97))
// test('ocr 8x6', () => expect(run('8x6', 'eb')).toBeGreaterThan(0.97))