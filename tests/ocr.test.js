const _ = require('underscore');
const dim = '6x4';
const db2verify = require('../data/dbjs/dbverify' + dim);
const db = require('../data/dbjs/dbm' + dim);
const ocr = require('../ocr')(db);

const run = (n,counter) => {
   db2verify[n].forEach(checkDigit => {
      const guessOk = ocr.findNearestDigit(checkDigit).digit === n
      counter.all++;
      counter.ok += guessOk;
      counter.nok += !guessOk;
   });
}

test('first test', () => {
   expect(1 + 2).toBe(3);
});

test('first ocr', () => {
   const counter = {ok: 0, nok: 0, all: 0};
   
   _.range(10).forEach(n =>run(n,counter) )
   
   const quot = counter.ok / counter.all;
   console.log(counter, quot);
   expect(quot).toBeGreaterThan(0.97);
});

