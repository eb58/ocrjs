const PAGE_SIZE = 200;
const SETTINGS_KEY = 'ocrjs.visual-test.settings.v1';
const DEFAULT_SETTINGS = {
  dataset: 'eb',
  digit: 'all',
  limit: '20',
  mode: 'auto',
  offset: '0',
  sort: 'confidence',
  threshold: '2.4',
};
const state = { durationMs: 0, results: [], status: 'all', visible: PAGE_SIZE };
const $ = (selector) => document.querySelector(selector);
const elements = {
  accuracy: $('#accuracy'),
  dataset: $('#dataset'),
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
  sort: $('#sort'),
  statusFilter: $('#statusFilter'),
  threshold: $('#threshold'),
  total: $('#total'),
  uncertain: $('#uncertain'),
};

const storedSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch (error) {
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
  ['dataset', 'mode', 'limit', 'offset', 'threshold', 'digit', 'sort'].forEach((name) =>
    restoreControl(elements[name], settings[name])
  );
  const statusButtons = [...elements.statusFilter.querySelectorAll('button')];
  const statusButton = statusButtons.find((button) => button.dataset.status === settings.status);
  if (!statusButton) return;
  state.status = settings.status;
  statusButtons.forEach((button) => button.classList.toggle('active', button === statusButton));
};

const saveSettings = () => {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        dataset: elements.dataset.value,
        digit: elements.digit.value,
        limit: elements.limit.value,
        mode: elements.mode.value,
        offset: elements.offset.value,
        sort: elements.sort.value,
        status: state.status,
        threshold: elements.threshold.value,
      })
    );
  } catch (error) {
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
  elements.statusFilter.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.status === state.status);
  });
  elements.export.disabled = true;
  saveSettings();
  renderSummary();
  renderCards();
};

restoreSettings();

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
  article.append(
    el('img', { src: candidate.image, alt: `Trainingsbild für Ziffer ${candidate.digit}` }),
    el(
      'div',
      {},
      el('small', { textContent: `Kandidat ${index + 1}` }),
      el('strong', { textContent: candidate.digit }),
      el('span', { textContent: `Distanz ${candidate.distance}` })
    )
  );
  return article;
};

const showDetails = (result) => {
  const head = el(
    'div',
    { className: 'detail-head' },
    el('div', { className: 'detail-image' }, el('img', { src: result.image, alt: `Testbild, erwartet ${result.expected}` })),
    el(
      'div',
      {},
      el('p', { className: 'eyebrow', textContent: `${result.dimension} · KONFIDENZ ${result.confidence.toFixed(2)}` }),
      el('h2', {}, document.createTextNode(`${result.expected} `), el('span', { textContent: '→' }), document.createTextNode(` ${result.prediction}`)),
      el('p', {
        className: `detail-status ${result.correct ? 'ok' : 'bad'}`,
        textContent: result.correct ? 'Richtig erkannt' : 'Falsch erkannt',
      }),
      el('p', { className: 'filename', textContent: result.filename })
    )
  );
  const candidates = el('div', { className: 'candidates' }, ...result.candidates.map(buildCandidate));
  elements.detailContent.replaceChildren(head, el('h3', { textContent: 'Ähnlichste Trainingsbilder' }), candidates);
  elements.details.showModal();
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

const formatDuration = (ms) => (ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')} min`);

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
  elements.duration.title = state.results.length ? `${Math.round(state.results.length / (state.durationMs / 1000 || 1))} Bilder/s` : '';
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
    const eta = done && progress.total > done ? ` · noch ca. ${formatDuration((elapsed / done) * (progress.total - done))}` : '';
    loading.textContent = `${done} von ${progress.total} Bildern · ${formatDuration(elapsed)}${eta}`;
  };
  const timer = setInterval(showProgress, 100);
  try {
    const params = new URLSearchParams({
      dataset: elements.dataset.value,
      limit: elements.limit.value,
      mode: elements.mode.value,
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
['dataset', 'limit', 'mode', 'offset'].forEach((name) => elements[name].addEventListener('change', saveSettings));
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
elements.statusFilter.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  state.status = button.dataset.status;
  state.visible = PAGE_SIZE;
  document.querySelectorAll('#statusFilter button').forEach((item) => item.classList.toggle('active', item === button));
  saveSettings();
  renderCards();
});
$('.dialog-close').addEventListener('click', () => elements.details.close());
elements.details.addEventListener('click', (event) => {
  if (event.target === elements.details) elements.details.close();
});
