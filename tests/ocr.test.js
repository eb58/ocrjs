const range = n => [...Array(n).keys()];
const ocrengine = require('../src/ocr')()
const sqr = x => x * x;
const vdist = ((v1, v2) => v1.reduce((d, _, i) => d + sqr(v1[i] - v2[i]), 0));

const run = (dim, dbtrainprefix, dbtestprefix) => {
  dbtestprefix = dbtestprefix || dbtrainprefix;
  const dbtrain = require(`../data/dbs/${dbtrainprefix}-db-train-${dim}`);
  const dbtest = require(`../data/dbs/${dbtestprefix}-db-test-${dim}`);
  const counter = { ok: 0, all: 0 }

  range(10).forEach(n => {
    dbtest[n].forEach((checkDigit,i) => { 
      console.log( "N", n,i)
      counter.all++;
      counter.ok += ocrengine.findNearestDigit(checkDigit.imgvec, dbtrain)[0].digit === n;;
    })
  })
  return counter.ok / counter.all
};

console.log(run('6x4', 'mnist', 'eb'))
// test('ocr 6x4', () => expect(run('6x4', 'mnist')).toBeGreaterThan(0.965))
//test('ocr 7x5', () => expect(run('7x5', 'eb-db')).toBeGreaterThan(0.97))
// test('ocr 8x6', () => expect(run('8x6', 'eb-db')).toBeGreaterThan(0.97))