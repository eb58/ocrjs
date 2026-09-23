const fs = require('fs');
const path = require('path');
const ocrengine = require('./ocr')();

const { confidence, vote } = ocrengine;
const dataPath = path.join(path.resolve(__dirname, '..'), 'data');
const datasets = new Set(['eb', 'mnist']);
const testSets = {
  eb: { standard: 'test', '2026-09-21': 'test-2026-09-21' },
  mnist: { standard: 'test' },
};
const dimensions = ['6x4', '7x5', '8x6'];
const modes = new Set(['auto', ...dimensions]);
const searchModes = new Set(['optimized', 'full']);

const recognitionOptionsFor = (dataset, searchMode = 'optimized') => {
  if (!datasets.has(dataset)) throw new Error('Unbekannter Datensatz');
  if (!searchModes.has(searchMode)) throw new Error('Unbekannter Suchmodus');
  if (searchMode === 'full') return {};
  return { candidateLimit: 128, fallbackConfidence: dataset === 'eb' ? 2 : 1.25 };
};

const loadDatabases = (dataset, mode) =>
  dimensions
    .filter((dimension) => mode === 'auto' || dimension === mode)
    .map((dimension) => ({
      dimension,
      data: require(path.join(dataPath, 'dbs', `${dataset}-db-train-${dimension}`)),
    }));

const testDirectory = (dataset, testSet = 'standard') => {
  const directoryName = testSets[dataset] && testSets[dataset][testSet];
  if (!directoryName) throw new Error('Unbekanntes Testset');
  return path.join(dataPath, 'imgs', dataset, directoryName);
};

const imageUrl = (type, dataset, digit, name) => `/image/${type}/${dataset}/${digit}/${encodeURIComponent(name)}`;
const queryImageUrl = (dimension, type, dataset, digit, name) =>
  `/image/query/${dimension}/${type}/${dataset}/${digit}/${encodeURIComponent(name)}`;
const candidateResults = (candidates, dataset) =>
  candidates.map((candidate) => ({
    digit: candidate.digit,
    distance: candidate.dist,
    image: candidate.name ? imageUrl('train', dataset, candidate.digit, candidate.name) : null,
    name: candidate.name,
  }));

// Je groeber das Raster, desto eher wirkt ein Treffer zufaellig "sicher": mit wenigen
// Zellen gibt es weniger Moeglichkeiten, sich von einer anderen Ziffer zu unterscheiden,
// also kann ein Distanzverhaeltnis von z.B. 2.5 dort blosser Zufall sein, wo es bei einem
// feinen Raster echte Aehnlichkeit bedeuten wuerde. Die Schwelle wird deshalb relativ zur
// Zellenzahl der feinsten Dimension hochskaliert, statt ueberall gleich streng zu sein.
const finestCellCount = Math.max(...dimensions.map((dim) => dim.split('x').reduce((a, b) => a * Number(b), 1)));
const secureThresholdFor = (dimr, dimc, secureThreshold) =>
  secureThreshold * Math.sqrt(finestCellCount / (dimr * dimc));

const analyzeImage = (file, expected, dataset, databases, secureThreshold = 2.4, options = {}, trace) => {
  const recognize = ocrengine.createRecognizer(file, options);
  const attempts = [];
  const filename = path.basename(file);
  let secure;
  for (const { dimension, data } of databases) {
    const candidates = recognize(data);
    const candidateConfidence = confidence(candidates);
    const threshold = secureThresholdFor(data.dimr, data.dimc, secureThreshold);
    attempts.push(candidates);
    if (trace)
      trace.push({
        accepted: candidateConfidence >= threshold,
        candidates: candidateResults(candidates.slice(0, 3), dataset),
        confidence: candidateConfidence,
        dimension,
        queryImage: queryImageUrl(dimension, 'test', dataset, expected, filename),
        search: options.candidateLimit ? 'optimized' : 'full',
        threshold,
        type: 'dimension',
      });
    if (candidateConfidence >= threshold) {
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
  if (
    options.candidateLimit &&
    options.fallbackConfidence &&
    confidence(best.candidates) < options.fallbackConfidence
  ) {
    if (trace) trace.push({ type: 'fallback', threshold: options.fallbackConfidence });
    return analyzeImage(file, expected, dataset, databases, secureThreshold, {}, trace);
  }
  const prediction = best.candidates[0].digit;
  const candidates = candidateResults(best.candidates, dataset);

  const result = {
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
  if (!secure && attempts.length > 1) {
    if (trace)
      trace.push({
        candidates,
        confidence: result.confidence,
        dimension: result.dimension,
        prediction,
        votes: attempts.map((attempt, index) => ({
          confidence: confidence(attempt),
          digit: attempt[0] && attempt[0].digit,
          dimension: databases[index] && databases[index].dimension,
        })),
        type: 'vote',
      });
  }
  return result;
};

const traceImage = (file, expected, dataset, databases, secureThreshold = 2.4, options = {}) => {
  const steps = [];
  const result = analyzeImage(file, expected, dataset, databases, secureThreshold, options, steps);
  return { result, steps };
};

const listTasks = ({ dataset, limit, offset, testSet = 'standard' }) =>
  Array.from({ length: 10 }, (_, digit) => {
    const directory = path.join(testDirectory(dataset, testSet), `img${digit}`);
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
  recognitionOptionsFor,
  searchModes,
  testDirectory,
  testSets,
  traceImage,
  validate,
};
