const range = n => [...Array(n).keys()];
const ocrengine = require('../src/ocr/ocr')()
const sqr = x => x * x;
const vdist = ((v1, v2) => v1.reduce((d, _, i) => d + sqr(v1[i] - v2[i]), 0));

const run = (dim, dbtrainprefix, dbtestprefix) => {
  dbtestprefix = dbtestprefix || dbtrainprefix;
  const dbtrain = require(`../data/dbjs/train/${dbtrainprefix}-train-${dim}`);
  const dbtest = require(`../data/dbjs/test/${dbtestprefix}-test-${dim}`);
  const counter = { ok: 0, all: 0 }

  range(10).forEach(n => {
    dbtest[n].forEach(checkDigit => {
      counter.all++;
      const guessOk = ocrengine.findNearestDigit(checkDigit.imgvec, dbtrain)[0].digit === n;
      counter.ok += guessOk;
    })
  })
  return counter.ok / counter.all
};

test('ocr 6x4', () => expect(run('6x4', 'ebdb')).toBeGreaterThan(0.965))

xtest('ocr 7x5', () => expect(run('7x5', 'ebdb')).toBeGreaterThan(0.975))
test('ocr 8x6', () => expect(run('8x6', 'ebdb')).toBeGreaterThan(0.975))