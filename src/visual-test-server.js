const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const ocrengine = require('./ocr')();

const projectPath = path.resolve(__dirname, '..');
const publicPath = path.join(projectPath, 'visual-tests');
const dataPath = path.join(projectPath, 'data');
const port = Number(process.env.PORT || 4173);
const datasets = new Set(['eb', 'mnist']);
const dimensions = ['6x4', '7x5', '8x6'];
const modes = new Set(['auto', ...dimensions]);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const confidence = (result) => (result[0] && result[1] && result[0].dist > 0 ? result[1].dist / result[0].dist : 99);

const loadDatabases = (dataset, mode) =>
  dimensions
    .filter((dimension) => mode === 'auto' || dimension === mode)
    .map((dimension) => ({
      dimension,
      data: require(path.join(dataPath, 'dbs', `${dataset}-db-train-${dimension}`)),
    }));

const safeFile = (root, ...parts) => {
  const file = path.resolve(root, ...parts);
  return file.startsWith(`${path.resolve(root)}${path.sep}`) ? file : undefined;
};

const sendFile = (response, file) => {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
  });
  fs.createReadStream(file).pipe(response);
};

const imageUrl = (type, dataset, digit, name) => `/image/${type}/${dataset}/${digit}/${encodeURIComponent(name)}`;

const analyzeImage = (file, expected, dataset, databases, secureThreshold = 2.4) => {
  const best = databases.reduce((selected, { dimension, data }) => {
    if (selected && selected.confidence >= secureThreshold) return selected;
    const candidates = ocrengine.recognizeImage(file, [data]);
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

const runAnalysis = ({ dataset, limit, offset, mode = 'auto', secureThreshold = 2.4 }) => {
  if (!datasets.has(dataset)) throw new Error('Unbekannter Datensatz');
  if (!modes.has(mode)) throw new Error('Unbekannter Erkennungsmodus');
  const databases = loadDatabases(dataset, mode);
  const startedAt = Date.now();
  const results = Array.from({ length: 10 }, (_, digit) => {
    const directory = path.join(dataPath, 'imgs', dataset, 'test', `img${digit}`);
    return fs
      .readdirSync(directory)
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .sort()
      .slice(offset, limit ? offset + limit : undefined)
      .map((name) => analyzeImage(path.join(directory, name), digit, dataset, databases, secureThreshold));
  }).flat();

  return {
    durationMs: Date.now() - startedAt,
    results,
    total: results.length,
  };
};

const serveImage = (response, pathname) => {
  const match = pathname.match(/^\/image\/(test|train)\/(eb|mnist)\/(\d)\/(.+)$/);
  if (!match) return sendFile(response);
  const [, type, dataset, digit, encodedName] = match;
  const group = type === 'test' ? 'test' : 'train';
  const file = safeFile(
    path.join(dataPath, 'imgs', dataset, group, `img${digit}`),
    path.basename(decodeURIComponent(encodedName))
  );
  sendFile(response, file);
};

const handleRequest = (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/run') {
    try {
      const dataset = url.searchParams.get('dataset') || 'eb';
      const mode = url.searchParams.get('mode') || 'auto';
      const requestedThreshold = Number(url.searchParams.get('threshold'));
      const secureThreshold = Number.isFinite(requestedThreshold)
        ? Math.min(Math.max(requestedThreshold, 1), 100)
        : 2.4;
      const requestedLimit = Number(url.searchParams.get('limit'));
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 0), 5000) : 20;
      const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
      json(response, 200, runAnalysis({ dataset, limit, offset, mode, secureThreshold }));
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return;
  }
  if (url.pathname.startsWith('/image/')) {
    serveImage(response, url.pathname);
    return;
  }
  const relativePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  sendFile(response, safeFile(publicPath, relativePath));
};

const createServer = () => http.createServer(handleRequest);

if (require.main === module) {
  createServer().listen(port, () => console.log(`OCR-Prüfstand: http://localhost:${port}`));
}

module.exports = { analyzeImage, createServer, runAnalysis };
