/* global expect */

const _ = require('underscore');
const dim = '6x4';
const dbtrain = require('../data/dbjs/dbm-train-' + dim);
const dbtest  = require('../data/dbjs/dbm-test-' + dim);
const ocr = require('../js/ocr')(dbtrain);


const run = (n,counter) => {
   dbtest[n].forEach(checkDigit => {
      const guessOk = ocr.findNearestDigitSqrDist(checkDigit).best.digit === n;
      counter.all++;
      counter.ok +=guessOk;
      counter.nok += !guessOk;
   });
};

test('first test', () => {
   expect(1 + 2).toBe(3);
});

test('first ocr', () => {
   const counter = {ok: 0, nok: 0, all: 0};
   
   _.range(10).forEach(n => run(n,counter) );
   
   const quot = counter.ok / counter.all;
   console.log(counter, quot); 
   //expect(quot).toBeGreaterThan(0.97); 
});

