const _ = require('underscore');

const dim = '6x4'
const chars2Verify = require("../data/dbjs/dbverify" + dim);
const db = require("../data/dbjs/dbm" + dim);
const ocr = require("../ocr")(db);


test('first test', () => {
    expect(1 + 2).toBe(3);
})

test('first ocr', () => {
    const counter = { ok: 0, nok: 0 };
    _.range(10).forEach(n => {
        chars2Verify[n].forEach(checkDigit => {
            const guessOk = ocr.findNearestDigit(checkDigit).digit === n;
            counter.ok += guessOk;
            counter.nok += !guessOk;
        });
    })
    const quot = counter.ok / (counter.ok + counter.nok);
    console.log(counter, quot);
    expect(quot).toBeGreaterThan(0.95);
})

