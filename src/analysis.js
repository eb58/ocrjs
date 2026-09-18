const fs = require('fs');
const path = require('path');
const ocrengine = require('./ocr')();

const { confidence } = ocrengine;
const dataPath = path.join(path.resolve(__dirname, '..'), 'data');
const datasets = new Set(['eb', 'mnist']);
const dimensions = ['6x4', '7x5', '8x6'];
const modes = new Set(['auto', ...dimensions]);

const loadDatabases = (dataset, mode) =>
  dimensions
    .filter((dimension) => mode === 'auto' || dimension === mode)
    .map((dimension) => ({
      dimension,
      data: require(path.join(dataPath, 'dbs', `${dataset}-db-train-${dimension}`)),
    }));

const imageUrl = (type, dataset, digit, name) => `/image/${type}/${dataset}/${digit}/${encodeURIComponent(name)}`;

const analyzeImage = (file, expected, dataset, databases, secureThreshold = 2.4) => {
  const recognize = ocrengine.createRecognizer(file);
  const best = databases.reduce((selected, { dimension, data }) => {
    if (selected && selected.confidence >= secureThreshold) return selected;
    const candidates = recognize(data);
    return { candidates, confidence: confidence(candidates), dimension, trainingPath: data.dir };
  }, undefined);
  const prediction = best.candidates[0].digit;
  const candidates = best.candidates.map((candidate) => ({
    digit: candidate.digit,
    distance: candidate.dist,
    image: imageUrl('train', dataset, candidate.digit, candidate.name),
    name: candidate.name,
  }));

  return {
    candidates,
    confidence: best.confidence,
    correct: prediction === expected,
    dimension: best.dimension,
    expected,
    filename: path.basename(file),
    image: imageUrl('test', dataset, expected, path.basename(file)),
    prediction,
  };
};

const listTasks = ({ dataset, limit, offset }) =>
  Array.from({ length: 10 }, (_, digit) => {
    const directory = path.join(dataPath, 'imgs', dataset, 'test', `img${digit}`);
    return fs
      .readdirSync(directory)
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .sort()
      .slice(offset, limit ? offset + limit : undefined)
      .map((name) => ({ file: path.join(directory, name), expected: digit }));
  }).flat();

const validate = ({ dataset, mode }) => {
  if (!datasets.has(dataset)) throw new Error('Unbekannter Datensatz');
  if (!modes.has(mode)) throw new Error('Unbekannter Erkennungsmodus');
};

module.exports = { analyzeImage, dataPath, datasets, dimensions, imageUrl, listTasks, loadDatabases, modes, validate };
