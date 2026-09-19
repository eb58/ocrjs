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

test.each(fixtures)('names a training image for every candidate of %s', (filename) => {
  // Rows/Cols/Quad summieren pro Zeile/Spalte/Zelle ueber alle Trainingsproben und tragen
  // deshalb selbst keinen Namen; gewinnt einer davon die Abstimmung, muss vote() trotzdem
  // ein anzeigbares Trainingsbild nachreichen (sonst zeigt der Pruefstand "undefined").
  const result = ocrengine.recognizeImage(path.join(fixtureDir, filename), [database]);

  result.forEach((candidate) => expect(candidate.name).toEqual(expect.stringMatching(/\.png$/)));
});
