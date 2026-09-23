const fs = require('fs');
const path = require('path');
const ocrengine = require('../src/ocr');
const { analyzeImage, loadDatabases, recognitionOptionsFor } = require('../src/analysis');

const fixtureDir = path.join(__dirname, 'fixtures');
const database = require('../data/dbs/eb-db-train-7x5');
const fixtures = fs
  .readdirSync(fixtureDir)
  .filter((name) => name.endsWith('.png'))
  .map((name) => [name, Number(name.match(/^digit-(\d)/)[1])]);

test.each(fixtures)('priority ordering preserves every candidate field for %s', (filename) => {
  const file = path.join(fixtureDir, filename);
  expect(ocrengine.createRecognizer(file, { priorityCount: 32 })(database)).toEqual(
    ocrengine.createRecognizer(file)(database),
  );
});

test('a shortlist covering the database preserves the full fallback result', () => {
  const recognize = ocrengine.createRecognizer(path.join(fixtureDir, 'digit-5-a.png'));
  const limited = ocrengine.createRecognizer(path.join(fixtureDir, 'digit-5-a.png'), {
    candidateLimit: Math.max(...Array.from({ length: 10 }, (_, digit) => database[digit].length)),
  });
  expect(limited(database)).toEqual(recognize(database));
});

test('an uncertain shortlist result can fall back to the full search', () => {
  const file = path.join(fixtureDir, 'digit-5-a.png');
  const full = analyzeImage(file, 5, 'eb', loadDatabases('eb', 'auto'));
  const fallback = analyzeImage(file, 5, 'eb', loadDatabases('eb', 'auto'), 2.4, {
    candidateLimit: 1,
    fallbackConfidence: Infinity,
  });
  expect(fallback).toEqual(full);
});

test('does not create an undefined image URL for an unnamed candidate', () => {
  const file = path.join(fixtureDir, 'digit-5-a.png');
  const databases = loadDatabases('eb', 'auto').map(({ dimension, data }) => ({
    dimension,
    data: { ...data, 0: [] },
  }));
  const result = analyzeImage(file, 5, 'eb', databases);
  const unnamed = result.candidates.filter((candidate) => !candidate.name);

  expect(unnamed.length).toBeGreaterThan(0);
  unnamed.forEach((candidate) => expect(candidate.image).toBeNull());
});

test('falls back to the complete EB search when raster votes remain ambiguous', () => {
  const filename = '0_1_1__aliste_TestListenH_Neu_rechserv_region1_17_23_056_6_3042876h_1.png';
  const file = path.join(__dirname, '../data/imgs/eb/test/img9', filename);
  const result = analyzeImage(file, 9, 'eb', loadDatabases('eb', 'auto'), 2.4, recognitionOptionsFor('eb'));

  expect(result.prediction).toBe(9);
});

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
