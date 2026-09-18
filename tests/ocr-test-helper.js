const ocrengine = require('../src/ocr')();

const accuracy = (dim, trainingSet, testSet = trainingSet) => {
  const dbtrain = require(`../data/dbs/${trainingSet}-db-train-${dim}`);
  const dbtest = require(`../data/dbs/${testSet}-db-test-${dim}`);
  const counter = { correct: 0, total: 0 };

  Object.keys(dbtest)
    .filter(key => /^\d$/.test(key))
    .forEach(digit => {
      dbtest[digit].forEach(({ imgvec }) => {
        counter.total++;
        counter.correct += ocrengine.findNearestDigit(imgvec, dbtrain)[0].digit === Number(digit);
      });
    });

  return counter.correct / counter.total;
};

module.exports = { accuracy };
