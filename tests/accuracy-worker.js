const { parentPort, workerData } = require('worker_threads');
const ocrengine = require('../src/ocr')();

const { dim, trainingSet, testSet, stride, offset } = workerData;
const dbtrain = require(`../data/dbs/${trainingSet}-db-train-${dim}`);
const dbtest = require(`../data/dbs/${testSet}-db-test-${dim}`);

const counter = { correct: 0, total: 0 };
let index = 0;

Object.keys(dbtest)
  .filter((key) => /^\d$/.test(key))
  .forEach((digit) => {
    dbtest[digit].forEach(({ imgvec }) => {
      if (index++ % stride !== offset) return;
      counter.total++;
      counter.correct += ocrengine.findNearestDigit(imgvec, dbtrain)[0].digit === Number(digit);
    });
  });

parentPort.postMessage(counter);
