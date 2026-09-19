const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const { Worker } = require('worker_threads');
const { PNG } = require('pngjs');
const img = require('./img');
const { analyzeImage, dataPath, dimensions, listTasks, recognitionOptionsFor, validate } = require('./analysis');

const projectPath = path.resolve(__dirname, '..');
const publicPath = path.join(projectPath, 'visual-tests');
const port = Number(process.env.PORT || 4173);
const workerCount = Math.max(1, Number(process.env.OCR_WORKERS) || Math.min(8, os.availableParallelism() - 1));
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

const toPngBuffer = (imgdata, width, height) => {
  const png = new PNG({ width, height });
  imgdata.forEach((pixel, idx) => {
    const value = pixel ? 0 : 255;
    const offset = idx * 4;
    png.data[offset] = value;
    png.data[offset + 1] = value;
    png.data[offset + 2] = value;
    png.data[offset + 3] = 255;
  });
  return PNG.sync.write(png);
};

const normalizePng = (buffer) => {
  const source = PNG.sync.read(buffer);
  const normalized = img().frompng(source).adjustBW();
  return toPngBuffer(normalized.imgdata, source.width, source.height);
};

const sendNormalizedImage = (response, file) => {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Cache-Control': 'no-cache', 'Content-Type': 'image/png' });
  response.end(normalizePng(fs.readFileSync(file)));
};

// Rendert das tatsaechlich mit der DB verglichene Raster (die auf dimr x dimc
// herunterskalierten Fuellstaende je Zelle, 0-100%) als vergroessertes Graustufenbild -
// zeigt, was die Suche wirklich sieht, nicht nur das Originalbild.
const CELL_SIZE = 16;
const gridToPngBuffer = (imgdata, dimr, dimc) => {
  const png = new PNG({ width: dimc * CELL_SIZE, height: dimr * CELL_SIZE });
  for (let r = 0; r < dimr; r++) {
    for (let c = 0; c < dimc; c++) {
      const value = 255 - Math.round((imgdata[r * dimc + c] / 100) * 255);
      for (let y = 0; y < CELL_SIZE; y++) {
        for (let x = 0; x < CELL_SIZE; x++) {
          const offset = (((r * CELL_SIZE + y) * png.width + (c * CELL_SIZE + x)) * 4);
          png.data[offset] = value;
          png.data[offset + 1] = value;
          png.data[offset + 2] = value;
          png.data[offset + 3] = 255;
        }
      }
    }
  }
  return PNG.sync.write(png);
};

const sendQueryGrid = (response, file, dimension) => {
  const [dimr, dimc] = dimension.split('x').map(Number);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile() || !dimensions.includes(dimension)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const source = PNG.sync.read(fs.readFileSync(file));
  const imgdata = img().frompng(source).adjustBW().despeckle().cropGlyph().scaleDown(dimr, dimc).imgdata;
  response.writeHead(200, { 'Cache-Control': 'no-cache', 'Content-Type': 'image/png' });
  response.end(gridToPngBuffer(imgdata, dimr, dimc));
};

// Worker-Pool: Die Erkennung pro Bild ist unabhaengig, aber jeder Worker muss die
// Trainingsdatenbanken selbst laden (~170ms). Der Pool bleibt daher ueber Requests
// hinweg bestehen, statt pro Request neu zu starten.
const workerFile = path.join(__dirname, 'analysis-worker.js');
const poolWorkers = [];
const chunkQueue = [];
const pendingChunks = new Map();
let nextChunkId = 0;

const dispatch = () => {
  while (chunkQueue.length) {
    const entry = poolWorkers.find((candidate) => !candidate.busy);
    if (!entry) return;
    const chunk = chunkQueue.shift();
    entry.busy = true;
    entry.worker.ref();
    pendingChunks.set(chunk.id, { ...chunk, entry });
    entry.worker.postMessage({
      id: chunk.id,
      tasks: chunk.tasks,
      dataset: chunk.dataset,
      mode: chunk.mode,
      searchMode: chunk.searchMode,
      secureThreshold: chunk.secureThreshold,
    });
  }
};

const settle = (entry, id, settleChunk) => {
  const pending = pendingChunks.get(id);
  if (!pending) return;
  pendingChunks.delete(id);
  entry.busy = false;
  entry.worker.unref();
  settleChunk(pending);
  dispatch();
};

const ensurePool = () => {
  if (poolWorkers.length) return;
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(workerFile);
    const entry = { worker, busy: false };
    worker.unref();
    worker.on('message', ({ id, results, error }) =>
      settle(entry, id, (pending) => (error ? pending.reject(new Error(error)) : pending.resolve(results)))
    );
    worker.on('error', (error) => {
      // Abgestuerzten Worker aussortieren, sonst bekaeme er weiter Chunks zugeteilt.
      // Stirbt der letzte, legt ensurePool() beim naechsten Request einen neuen Pool an.
      poolWorkers.splice(poolWorkers.indexOf(entry), 1);
      [...pendingChunks].forEach(([id, pending]) => pending.entry === entry && settle(entry, id, (p) => p.reject(error)));
    });
    poolWorkers.push(entry);
  }
};

const runChunk = (payload) =>
  new Promise((resolve, reject) => {
    chunkQueue.push({ id: nextChunkId++, ...payload, resolve, reject });
    dispatch();
  });

// unref() allein laesst den Prozess nicht enden, solange Worker-Threads leben,
// daher muss der Pool beim Herunterfahren explizit beendet werden.
const stopWorkers = () => {
  const stopped = new Error('Worker-Pool beendet');
  chunkQueue.splice(0).forEach((chunk) => chunk.reject(stopped));
  [...pendingChunks].forEach(([id, pending]) => (pendingChunks.delete(id), pending.reject(stopped)));
  return Promise.all(poolWorkers.splice(0).map(({ worker }) => worker.terminate()));
};

const runAnalysis = async ({ dataset, limit, offset, mode = 'auto', searchMode = 'optimized', secureThreshold = 2.4 }) => {
  validate({ dataset, mode });
  recognitionOptionsFor(dataset, searchMode);
  const tasks = listTasks({ dataset, limit, offset }).map((task, index) => ({ ...task, index }));
  if (!tasks.length) return { durationMs: 0, results: [], total: 0 };

  const startedAt = Date.now();
  ensurePool();
  const chunkSize = Math.max(4, Math.ceil(tasks.length / (poolWorkers.length * 4)));
  const chunks = Array.from({ length: Math.ceil(tasks.length / chunkSize) }, (_, i) =>
    tasks.slice(i * chunkSize, (i + 1) * chunkSize)
  );
  const answers = await Promise.all(
    chunks.map((chunkTasks) => runChunk({ tasks: chunkTasks, dataset, mode, searchMode, secureThreshold }))
  );

  const results = new Array(tasks.length);
  answers.flat().forEach(({ index, result }) => (results[index] = result));
  return { durationMs: Date.now() - startedAt, results, total: results.length };
};

// Liefert vorab die Gesamtzahl, damit der Client trotz Batches einen Fortschritt anzeigen kann.
const planAnalysis = ({ dataset, limit, offset }) => (
  validate({ dataset, mode: 'auto' }), { total: listTasks({ dataset, limit, offset }).length }
);

const serveImage =(response, pathname) => {
  const queryMatch = pathname.match(/^\/image\/query\/([^/]+)\/(test|train)\/(eb|mnist)\/(\d)\/(.+)$/);
  if (queryMatch) {
    const [, dimension, type, dataset, digit, encodedName] = queryMatch;
    const file = safeFile(
      path.join(dataPath, 'imgs', dataset, type, `img${digit}`),
      path.basename(decodeURIComponent(encodedName))
    );
    sendQueryGrid(response, file, dimension);
    return;
  }
  const match = pathname.match(/^\/image\/(test|train)\/(eb|mnist)\/(\d)\/(.+)$/);
  if (!match) return sendFile(response);
  const [, type, dataset, digit, encodedName] = match;
  const group = type === 'test' ? 'test' : 'train';
  const file = safeFile(
    path.join(dataPath, 'imgs', dataset, group, `img${digit}`),
    path.basename(decodeURIComponent(encodedName))
  );
  sendNormalizedImage(response, file);
};

const handleRequest = (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const dataset = url.searchParams.get('dataset') || 'eb';
  const requestedLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 0), 5000) : 20;
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  if (url.pathname === '/api/plan') {
    try {
      json(response, 200, planAnalysis({ dataset, limit, offset }));
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return;
  }
  if (url.pathname === '/api/run') {
    const mode = url.searchParams.get('mode') || 'auto';
    const searchMode = url.searchParams.get('search') || 'optimized';
    const requestedThreshold = Number(url.searchParams.get('threshold'));
    const secureThreshold = Number.isFinite(requestedThreshold) ? Math.min(Math.max(requestedThreshold, 1), 100) : 2.4;
    runAnalysis({ dataset, limit, offset, mode, searchMode, secureThreshold })
      .then((payload) => json(response, 200, payload))
      .catch((error) => json(response, 500, { error: error.message }));
    return;
  }
  if (url.pathname.startsWith('/image/')) {
    serveImage(response, url.pathname);
    return;
  }
  const relativePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  sendFile(response, safeFile(publicPath, relativePath));
};

const createServer = () => http.createServer(handleRequest).on('close', stopWorkers);

if (require.main === module) {
  createServer().listen(port, () => console.log(`OCR-Prüfstand: http://localhost:${port}`));
}

module.exports = { analyzeImage, createServer, normalizePng, planAnalysis, runAnalysis, stopWorkers };
