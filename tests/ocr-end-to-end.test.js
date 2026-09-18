const fs = require('fs');
const path = require('path');
const ocrengine = require('../src/ocr')();

const fixtureDir = path.join(__dirname, 'fixtures');
const database = require('../data/dbs/eb-db-train-7x5');
const fixtures = fs
  .readdirSync(fixtureDir)
  .filter((name) => name.endsWith('.png'))
  .map((name) => [name, Number(name.match(/^digit-(\d)/)[1])]);

test.each(fixtures)('recognizes %s through the complete PNG pipeline', (filename, expected) => {
  const result = ocrengine.recognizeImage(path.join(fixtureDir, filename), [database]);

  expect(result[0].digit).toBe(expected);
});
