const PAGE_SIZE = 200;
const SETTINGS_KEY = 'ocrjs.visual-test.settings.v1';
const DEFAULT_SETTINGS = {
  dataset: 'eb',
  testSet: 'standard',
  digit: 'all',
  limit: '20',
  mode: 'auto',
  offset: '0',
  searchMode: 'optimized',
  sort: 'confidence',
  threshold: '2.4',
};
const state = { durationMs: 0, results: [], runConfig: null, status: 'all', traceTimer: null, visible: PAGE_SIZE };
const MISSING_TRAINING_IMAGE = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
    <rect width="150" height="150" fill="#20262f"/>
    <path d="M48 61h54v42H48z M55 54h20l7 7" fill="none" stroke="#7f8998" stroke-width="5"/>
    <path d="m59 91 13-14 10 10 8-8 12 12" fill="none" stroke="#7f8998" stroke-width="5"/>
    <text x="75" y="124" fill="#aab2bf" font-family="sans-serif" font-size="11" text-anchor="middle">Kein Trainingsbild</text>
  </svg>
`)}`;
const $ = (selector) => document.querySelector(selector);
const elements = {
  accuracy: $('#accuracy'),
  dataset: $('#dataset'),
  testSet: $('#testSet'),
  details: $('#details'),
  detailContent: $('#detailContent'),
  duration: $('#duration'),
  digit: $('#digitFilter'),
  distribution: $('#distribution'),
  empty: $('#emptyState'),
  errors: $('#errors'),
  export: $('#exportButton'),
  falseSecure: $('#falseSecure'),
  gallery: $('#gallery'),
  limit: $('#limit'),
  mode: $('#mode'),
  more: $('#moreButton'),
  offset: $('#offset'),
  resultCount: $('#resultCount'),
  run: $('#runButton'),
  reset: $('#resetButton'),
  searchMode: $('#searchMode'),
  sort: $('#sort'),
  threshold: $('#threshold'),
  total: $('#total'),
  uncertain: $('#uncertain'),
};

const storedSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
};

const restoreControl = (element, value) => {
  if (typeof value !== 'string') return;
  if (element.matches('select') && [...element.options].some((option) => option.value === value)) {
    element.value = value;
    return;
  }
  if (!element.matches('input')) return;
  const fallback = element.value;
  element.value = value;
  if (!value || !element.checkValidity()) element.value = fallback;
};

const restoreSettings = () => {
  const settings = storedSettings();
  ['dataset', 'testSet', 'mode', 'searchMode', 'limit', 'offset', 'threshold', 'digit', 'sort'].forEach((name) =>
    restoreControl(elements[name], settings[name]),
  );
  const statusTiles = [...document.querySelectorAll('.summary article[data-status]')];
  const statusTile = statusTiles.find((tile) => tile.dataset.status === settings.status);
  if (!statusTile) return;
  state.status = settings.status;
  statusTiles.forEach((tile) => tile.classList.toggle('active', tile === statusTile));
};

const saveSettings = () => {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        dataset: elements.dataset.value,
        testSet: elements.testSet.value,
        digit: elements.digit.value,
        limit: elements.limit.value,
        mode: elements.mode.value,
        offset: elements.offset.value,
        searchMode: elements.searchMode.value,
        sort: elements.sort.value,
        status: state.status,
        threshold: elements.threshold.value,
      }),
    );
  } catch {
    // Der Prüfstand bleibt auch bei deaktiviertem localStorage benutzbar.
  }
};

const resetSettings = () => {
  Object.entries(DEFAULT_SETTINGS).forEach(([name, value]) => {
    elements[name].value = value;
  });
  state.status = 'all';
  state.results = [];
  state.visible = PAGE_SIZE;
  document.querySelectorAll('.summary article[data-status]').forEach((tile) => {
    tile.classList.toggle('active', tile.dataset.status === state.status);
  });
  elements.export.disabled = true;
  saveSettings();
  renderSummary();
  renderCards();
};

// Die zusaetzlichen Testmengen gibt es nur fuer EB.
const syncTestSets = () => {
  const ebOnly = elements.dataset.value !== 'eb';
  elements.testSet.querySelectorAll('option:not([value="standard"])').forEach((option) => (option.hidden = ebOnly));
  if (ebOnly) elements.testSet.value = 'standard';
};

restoreSettings();
syncTestSets();

const threshold = () => Number(elements.threshold.value);
const isUncertain = (result) => result.confidence < threshold();
const isUncertainMatch = (result) => result.correct && isUncertain(result);
const isSecureMatch = (result) => result.correct && !isUncertain(result);
const percent = (value) => `${(value * 100).toFixed(1)}%`;

const filteredResults = () => {
  const digit = elements.digit.value;
  const filtered = state.results.filter((result) => {
    const matchesDigit = digit === 'all' || result.expected === Number(digit);
    const matchesStatus =
      state.status === 'all' ||
      (state.status === 'error' && !result.correct) ||
      (state.status === 'uncertain' && isUncertainMatch(result)) ||
      (state.status === 'false-secure' && !result.correct && !isUncertain(result)) ||
      (state.status === 'correct' && isSecureMatch(result));
    return matchesDigit && matchesStatus;
  });
  const sorters = {
    confidence: (a, b) => a.confidence - b.confidence,
    digit: (a, b) => a.expected - b.expected || a.confidence - b.confidence,
    errors: (a, b) => Number(a.correct) - Number(b.correct) || a.confidence - b.confidence,
  };
  return filtered.sort(sorters[elements.sort.value]);
};

const el = (tag, props, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const buildCandidate = (candidate, index) => {
  const article = el('article', { className: `candidate ${index === 0 ? 'winner' : ''}` });
  const image = el('img', {
    src: candidate.image || MISSING_TRAINING_IMAGE,
    alt: candidate.image ? `Trainingsbild für Ziffer ${candidate.digit}` : 'Kein Trainingsbild vorhanden',
  });
  image.addEventListener(
    'error',
    () => {
      image.src = MISSING_TRAINING_IMAGE;
      image.alt = 'Kein Trainingsbild vorhanden';
    },
    { once: true },
  );
  article.append(
    image,
    el(
      'div',
      {},
      el('small', { textContent: `Kandidat ${index + 1}` }),
      el('strong', { textContent: candidate.digit }),
      el('span', { textContent: `Distanz ${candidate.distance}` }),
    ),
  );
  return article;
};

const currentConfig = () => state.runConfig || { dataset: elements.dataset.value, testSet: elements.testSet.value };

// URLs zeigen auf .../<ziffer>/<datei>; nach dem Verschieben liegt das Bild unter der neuen Ziffer.
const withDigit = (url, digit) => url.replace(/\/\d\/([^/]+)$/, `/${digit}/$1`);

// Verschiebt ein falsch einsortiertes Testbild (target: Ziffer oder 'removed') und passt das
// Ergebnis im Pruefstand an, ohne neu auszuwerten.
const relabel = async (result, target, status) => {
  const { dataset, testSet } = currentConfig();
  status.textContent = 'Wird verschoben …';
  status.className = 'relabel-status';
  const params = new URLSearchParams({ dataset, testSet, digit: result.expected, file: result.filename, target });
  const response = await fetch(`/api/relabel?${params}`, { method: 'POST' });
  const payload = await response.json();
  if (!response.ok) {
    status.textContent = payload.error || 'Verschieben fehlgeschlagen';
    status.className = 'relabel-status bad';
    return;
  }
  if (target === 'removed') state.results = state.results.filter((other) => other !== result);
  else
    Object.assign(result, {
      expected: target,
      correct: result.prediction === target,
      image: withDigit(result.image, target),
      queryImage: withDigit(result.queryImage, target),
    });
  elements.details.close();
  renderSummary();
  renderCards();
};

const buildRelabel = (result) => {
  const status = el('span', { className: 'relabel-status' });
  const button = (textContent, className, target) => {
    const node = el('button', { className: `secondary ${className}`, textContent, type: 'button' });
    node.addEventListener('click', () => relabel(result, target(), status));
    return node;
  };
  const quick = button(`Nach ${result.prediction} verschieben`, 'relabel-quick', () => result.prediction);
  quick.hidden = result.correct;
  const choice = el(
    'select',
    { className: 'relabel-choice', title: 'Zielordner' },
    ...Array.from({ length: 10 }, (_, digit) => digit)
      .filter((digit) => digit !== result.expected)
      .map((digit) => el('option', { value: digit, textContent: `Ordner ${digit}` })),
  );
  if (!result.correct) choice.value = String(result.prediction);
  return el(
    'div',
    { className: 'relabel' },
    quick,
    button('Aussortieren', 'relabel-remove', () => 'removed'),
    choice,
    button('Verschieben', '', () => Number(choice.value)),
    status,
  );
};

const showDetails = (result) => {
  clearTimeout(state.traceTimer);
  const head = el(
    'div',
    { className: 'detail-head' },
    el(
      'div',
      { className: 'detail-image' },
      el(
        'figure',
        {},
        el('img', { src: result.image, alt: `Testbild, erwartet ${result.expected}` }),
        el('figcaption', { textContent: 'Original' }),
      ),
      el(
        'figure',
        { className: 'query-grid' },
        el('img', { src: result.queryImage, alt: `Verglichenes Raster, ${result.dimension}` }),
        el('figcaption', { textContent: `Raster ${result.dimension}` }),
      ),
    ),
    el(
      'div',
      {},
      el('p', { className: 'eyebrow', textContent: `${result.dimension} · KONFIDENZ ${result.confidence.toFixed(2)}` }),
      el(
        'h2',
        {},
        document.createTextNode(`${result.expected} `),
        el('span', { textContent: '→' }),
        document.createTextNode(` ${result.prediction}`),
      ),
      el('p', {
        className: `detail-status ${result.correct ? 'ok' : 'bad'}`,
        textContent: result.correct ? 'Richtig erkannt' : 'Falsch erkannt',
      }),
      el('p', { className: 'filename', textContent: result.filename }),
    ),
  );
  const candidates = el('div', { className: 'candidates' }, ...result.candidates.map(buildCandidate));
  const animation = el('section', { className: 'recognition-animation', hidden: true });
  const animateButton = el('button', {
    className: 'secondary animate-button',
    textContent: 'Erkennung animieren',
    type: 'button',
  });
  animateButton.addEventListener('click', () => animateRecognition(result, animation, animateButton));
  elements.detailContent.replaceChildren(
    head,
    el('div', { className: 'detail-actions' }, buildRelabel(result), animateButton),
    animation,
    el('h3', { textContent: 'Ähnlichste Trainingsbilder' }),
    candidates,
  );
  elements.details.showModal();
};

const traceTitle = (step) => {
  if (step.type === 'fallback') return 'Unsicher – vollständige Suche';
  if (step.type === 'vote') return 'Abstimmung der Rastergrößen';
  return `Raster ${step.dimension}`;
};

const renderTraceStep = (container, step, result, index, total) => {
  const progress = el(
    'div',
    { className: 'trace-progress', 'aria-label': `Schritt ${index + 1} von ${total}` },
    ...Array.from({ length: total }, (_, position) => el('i', { className: position <= index ? 'active' : '' })),
  );
  const copy =
    step.type === 'fallback'
      ? `Konfidenz unter ${step.threshold.toFixed(2)}: Die Vorauswahl wird verworfen und alle Trainingsbilder werden geprüft.`
      : step.type === 'vote'
        ? `Kein Raster war sicher genug. Die Einzelergebnisse stimmen gemeinsam für Ziffer ${step.prediction}.`
        : `Konfidenz ${step.confidence.toFixed(2)} · Schwelle ${step.threshold.toFixed(2)} · ${
            step.accepted ? 'Ergebnis akzeptiert' : 'weiter zum nächsten Raster'
          }`;
  const image = el('img', {
    src: step.queryImage || result.queryImage,
    alt: step.dimension ? `Verglichenes Raster ${step.dimension}` : 'Verglichenes Raster',
  });
  const candidateList =
    step.type === 'vote'
      ? el(
          'div',
          { className: 'trace-votes' },
          el('strong', { textContent: 'Abstimmung je Raster' }),
          ...step.votes.map((vote) =>
            el(
              'span',
              {},
              el('b', { textContent: vote.dimension }),
              el('b', { textContent: vote.digit === undefined ? '–' : `Ziffer ${vote.digit}` }),
              el('small', { textContent: `Konfidenz ${vote.confidence.toFixed(2)}` }),
            ),
          ),
          el('strong', { textContent: `Ergebnis: Ziffer ${step.prediction}` }),
        )
      : step.candidates?.length
        ? el('div', { className: 'trace-candidates' }, ...step.candidates.map(buildCandidate))
        : el('div', { className: 'trace-fallback-icon', textContent: '128 → alle' });
  container.replaceChildren(
    progress,
    el(
      'div',
      { className: `trace-stage trace-${step.type}` },
      el('figure', {}, image, el('figcaption', { textContent: traceTitle(step) })),
      el(
        'div',
        { className: 'trace-explanation' },
        el('h3', { textContent: traceTitle(step) }),
        el('p', { textContent: copy }),
      ),
    ),
    candidateList,
  );
};

const animateRecognition = async (result, container, button) => {
  clearTimeout(state.traceTimer);
  container.hidden = false;
  container.replaceChildren(el('p', { className: 'trace-loading', textContent: 'Erkennung wird nachvollzogen …' }));
  button.disabled = true;
  button.textContent = 'Trace wird geladen …';
  const config = state.runConfig || {
    dataset: elements.dataset.value,
    testSet: elements.testSet.value,
    mode: elements.mode.value,
    searchMode: elements.searchMode.value,
    threshold: elements.threshold.value,
  };
  try {
    const params = new URLSearchParams({
      dataset: config.dataset,
      testSet: config.testSet,
      digit: result.expected,
      file: result.filename,
      mode: config.mode,
      search: config.searchMode,
      threshold: config.threshold,
    });
    const response = await fetch(`/api/trace?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Trace konnte nicht geladen werden');
    const show = (index) => {
      renderTraceStep(container, payload.steps[index], payload.result, index, payload.steps.length);
      if (index < payload.steps.length - 1) {
        state.traceTimer = setTimeout(() => show(index + 1), 1700);
      } else {
        button.disabled = false;
        button.textContent = 'Animation wiederholen';
      }
    };
    show(0);
  } catch (error) {
    container.replaceChildren(el('p', { className: 'error-message', textContent: error.message }));
    button.disabled = false;
    button.textContent = 'Erneut versuchen';
  }
};

const renderCards = () => {
  const results = filteredResults();
  const visibleResults = results.slice(0, state.visible);
  elements.gallery.replaceChildren();
  visibleResults.forEach((result) => {
    const card = $('#cardTemplate').content.firstElementChild.cloneNode(true);
    const uncertain = isUncertain(result);
    card.classList.add(result.correct ? 'is-correct' : 'is-error');
    if (uncertain) card.classList.add('is-uncertain');
    card.querySelector('img').src = result.image;
    card.querySelector('img').alt = `Testbild für Ziffer ${result.expected}`;
    card.querySelector('.expected').textContent = result.expected;
    card.querySelector('.prediction').textContent = result.prediction;
    card.querySelector('.status').textContent = result.correct ? (uncertain ? 'Unsicher' : 'Korrekt') : 'Fehler';
    card.querySelector('.confidence').textContent = result.confidence.toFixed(2);
    card.querySelector('.meter span').style.width = `${Math.min(result.confidence / 5, 1) * 100}%`;
    card.querySelector('.dimension').textContent = `Modell ${result.dimension}`;
    card.addEventListener('click', () => showDetails(result));
    elements.gallery.append(card);
  });
  elements.resultCount.textContent = `${visibleResults.length} von ${results.length} gefilterten Ergebnissen`;
  elements.more.hidden = visibleResults.length === results.length;
  elements.empty.hidden = state.results.length > 0;
};

const formatDuration = (ms) =>
  ms < 60000
    ? `${(ms / 1000).toFixed(1)} s`
    : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')} min`;

const renderSummary = () => {
  const correct = state.results.filter((result) => result.correct).length;
  const errors = state.results.length - correct;
  const uncertain = state.results.filter(isUncertainMatch).length;
  const falseSecure = state.results.filter((result) => !result.correct && !isUncertain(result)).length;
  elements.total.textContent = state.results.length;
  elements.accuracy.textContent = state.results.length ? percent(correct / state.results.length) : '—';
  elements.errors.textContent = errors;
  elements.uncertain.textContent = uncertain;
  elements.falseSecure.textContent = falseSecure;
  elements.duration.textContent = state.results.length ? formatDuration(state.durationMs) : '—';
  elements.duration.title = state.results.length
    ? `${Math.round(state.results.length / (state.durationMs / 1000 || 1))} Bilder/s`
    : '';
  elements.distribution.innerHTML = Array.from({ length: 10 }, (_, digit) => {
    const results = state.results.filter((result) => result.expected === digit);
    const rate = results.length ? results.filter((result) => result.correct).length / results.length : 0;
    return `<div title="Ziffer ${digit}: ${percent(rate)}"><span>${digit}</span><i><b style="height:${
      rate * 100
    }%"></b></i><small>${Math.round(rate * 100)}</small></div>`;
  }).join('');
};

const run = async () => {
  saveSettings();
  state.runConfig = {
    dataset: elements.dataset.value,
    testSet: elements.testSet.value,
    mode: elements.mode.value,
    searchMode: elements.searchMode.value,
    threshold: elements.threshold.value,
  };
  elements.run.disabled = true;
  elements.reset.disabled = true;
  elements.run.querySelector('span').textContent = 'OCR läuft …';
  elements.gallery.innerHTML =
    '<div class="loading"><progress max="1" value="0"></progress><p>Bilder werden gezählt …</p></div>';
  elements.empty.hidden = true;
  const startedAt = performance.now();
  const progress = { results: [], processedPerDigit: 0, total: 0 };
  const bar = elements.gallery.querySelector('progress');
  const loading = elements.gallery.querySelector('p');
  const showProgress = () => {
    const elapsed = performance.now() - startedAt;
    const done = progress.results.length;
    const eta =
      done && progress.total > done ? ` · noch ca. ${formatDuration((elapsed / done) * (progress.total - done))}` : '';
    loading.textContent = `${done} von ${progress.total} Bildern · ${formatDuration(elapsed)}${eta}`;
  };
  const timer = setInterval(showProgress, 100);
  try {
    const params = new URLSearchParams({
      dataset: elements.dataset.value,
      testSet: elements.testSet.value,
      limit: elements.limit.value,
      mode: elements.mode.value,
      search: elements.searchMode.value,
      offset: elements.offset.value,
      threshold: elements.threshold.value,
    });
    const batchSize = 20;
    const limit = Number(params.get('limit'));
    const offset = Number(params.get('offset'));
    const planResponse = await fetch(`/api/plan?${params}`);
    const plan = await planResponse.json();
    if (!planResponse.ok) throw new Error(plan.error || 'Auswertung fehlgeschlagen');
    progress.total = bar.max = plan.total;
    showProgress();
    while (!limit || progress.processedPerDigit < limit) {
      const count = limit ? Math.min(batchSize, limit - progress.processedPerDigit) : batchSize;
      params.set('limit', String(count));
      params.set('offset', String(offset + progress.processedPerDigit));
      const response = await fetch(`/api/run?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Auswertung fehlgeschlagen');
      progress.results.push(...payload.results);
      progress.processedPerDigit += count;
      bar.value = progress.results.length;
      state.results = progress.results;
      state.durationMs = performance.now() - startedAt;
      renderSummary();
      showProgress();
      if (!payload.results.length) break;
    }
    // Restore the server's digit-first ordering across batch boundaries.
    state.results = progress.results.sort((a, b) => a.expected - b.expected);
    state.durationMs = performance.now() - startedAt;
    state.visible = PAGE_SIZE;
    elements.export.disabled = false;
    renderSummary();
    renderCards();
  } catch (error) {
    elements.gallery.innerHTML = `<div class="error-message"><strong>Auswertung nicht möglich</strong><p>${error.message}</p></div>`;
  } finally {
    clearInterval(timer);
    elements.run.disabled = false;
    elements.reset.disabled = false;
    elements.run.querySelector('span').textContent = 'Erneut auswerten';
  }
};

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
const exportCsv = () => {
  const headings = [
    'Soll',
    'Erkannt',
    'Korrekt',
    'Konfidenz',
    'Modell',
    'Datei',
    'Kandidat 1',
    'Kandidat 2',
    'Kandidat 3',
  ];
  const rows = state.results.map((result) => [
    result.expected,
    result.prediction,
    result.correct,
    result.confidence.toFixed(4),
    result.dimension,
    result.filename,
    ...result.candidates.map((candidate) => `${candidate.digit} (${candidate.distance})`),
  ]);
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  link.download = `ocr-auswertung-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const resetAndRender = () => {
  state.visible = PAGE_SIZE;
  renderCards();
};

elements.run.addEventListener('click', run);
elements.reset.addEventListener('click', resetSettings);
elements.export.addEventListener('click', exportCsv);
elements.more.addEventListener('click', () => {
  state.visible += PAGE_SIZE;
  renderCards();
});
elements.dataset.addEventListener('change', () => {
  syncTestSets();
  saveSettings();
});
elements.testSet.addEventListener('change', saveSettings);
['limit', 'mode', 'offset', 'searchMode'].forEach((name) => elements[name].addEventListener('change', saveSettings));
elements.digit.addEventListener('change', () => {
  saveSettings();
  resetAndRender();
});
elements.sort.addEventListener('change', () => {
  saveSettings();
  resetAndRender();
});
elements.threshold.addEventListener('input', () => {
  saveSettings();
  renderSummary();
  resetAndRender();
});
const applyStatus = (status) => {
  state.status = status;
  state.visible = PAGE_SIZE;
  document
    .querySelectorAll('.summary article[data-status]')
    .forEach((tile) => tile.classList.toggle('active', tile.dataset.status === status));
  saveSettings();
  renderCards();
};
document.querySelectorAll('.summary article[data-status]').forEach((tile) => {
  const select = () => {
    applyStatus(tile.dataset.status);
    elements.gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  tile.addEventListener('click', select);
  tile.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select();
    }
  });
});
$('.dialog-close').addEventListener('click', () => elements.details.close());
elements.details.addEventListener('close', () => clearTimeout(state.traceTimer));
elements.details.addEventListener('click', (event) => {
  if (event.target === elements.details) elements.details.close();
});
