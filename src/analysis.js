const fs = require('fs');
const path = require('path');
const ocrengine = require('./ocr')();

const { confidence, vote } = ocrengine;
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
const queryImageUrl = (dimension, type, dataset, digit, name) =>
  `/image/query/${dimension}/${type}/${dataset}/${digit}/${encodeURIComponent(name)}`;

// Je groeber das Raster, desto eher wirkt ein Treffer zufaellig "sicher": mit wenigen
// Zellen gibt es weniger Moeglichkeiten, sich von einer anderen Ziffer zu unterscheiden,
// also kann ein Distanzverhaeltnis von z.B. 2.5 dort blosser Zufall sein, wo es bei einem
// feinen Raster echte Aehnlichkeit bedeuten wuerde. Die Schwelle wird deshalb relativ zur
// Zellenzahl der feinsten Dimension hochskaliert, statt ueberall gleich streng zu sein.
const finestCellCount = Math.max(...dimensions.map((dim) => dim.split('x').reduce((a, b) => a * Number(b), 1)));
const secureThresholdFor = (dimr, dimc, secureThreshold) => secureThreshold * Math.sqrt(finestCellCount / (dimr * dimc));

const analyzeImage = (file, expected, dataset, databases, secureThreshold = 2.4) => {
  const recognize = ocrengine.createRecognizer(file);
  const attempts = [];
  let secure;
  for (const { dimension, data } of databases) {
    const candidates = recognize(data);
    attempts.push(candidates);
    if (confidence(candidates) >= secureThresholdFor(data.dimr, data.dimc, secureThreshold)) {
      secure = { candidates, dimension };
      break;
    }
  }
  // Keine Dimension war sicher: statt blind der letzten (feinsten) zu vertrauen, werden
  // alle versuchten Dimensionen wie die Sichten/Abstandsmasse in ocr.js gewichtet
  // kombiniert. Fuer Anzeige/Rasterbild wird trotzdem die feinste Dimension genannt.
  const best = secure || {
    candidates: vote(attempts).slice(0, 3),
    dimension: databases[databases.length - 1].dimension,
  };
  const prediction = best.candidates[0].digit;
  const candidates = best.candidates.map((candidate) => ({
    digit: candidate.digit,
    distance: candidate.dist,
    image: imageUrl('train', dataset, candidate.digit, candidate.name),
    name: candidate.name,
  }));

  const filename = path.basename(file);
  return {
    candidates,
    confidence: confidence(best.candidates),
    correct: prediction === expected,
    dimension: best.dimension,
    expected,
    filename,
    image: imageUrl('test', dataset, expected, filename),
    queryImage: queryImageUrl(best.dimension, 'test', dataset, expected, filename),
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

module.exports = {
  analyzeImage,
  dataPath,
  datasets,
  dimensions,
  imageUrl,
  listTasks,
  loadDatabases,
  modes,
  queryImageUrl,
  validate,
};
