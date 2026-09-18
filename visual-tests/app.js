const PAGE_SIZE = 200;
const SETTINGS_KEY = 'ocrjs.visual-test.settings.v1';
const state = { results: [], status: 'all', visible: PAGE_SIZE };
const $ = (selector) => document.querySelector(selector);
const elements = {
  accuracy: $('#accuracy'),
  dataset: $('#dataset'),
  details: $('#details'),
  detailContent: $('#detailContent'),
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

const showDetails = (result) => {
  const candidates = result.candidates
    .map(
      (candidate, index) => `
        <article class="candidate ${index === 0 ? 'winner' : ''}">
          <img src="${candidate.image}" alt="Trainingsbild für Ziffer ${candidate.digit}">
          <div><small>Kandidat ${index + 1}</small><strong>${candidate.digit}</strong><span>Distanz ${
        candidate.distance
      }</span></div>
        </article>`
    )
    .join('');
  elements.detailContent.innerHTML = `
    <div class="detail-head">
      <div class="detail-image"><img src="${result.image}" alt="Testbild, erwartet ${result.expected}"></div>
      <div><p class="eyebrow">${result.dimension} · KONFIDENZ ${result.confidence.toFixed(2)}</p>
      <h2>${result.expected} <span>→</span> ${result.prediction}</h2>
      <p class="detail-status ${result.correct ? 'ok' : 'bad'}">${
    result.correct ? 'Richtig erkannt' : 'Falsch erkannt'
  }</p>
      <p class="filename">${result.filename}</p></div>
    </div>
    <h3>Ähnlichste Trainingsbilder</h3><div class="candidates">${candidates}</div>`;
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

const renderSummary = (durationMs) => {
  const correct = state.results.filter((result) => result.correct).length;
  const errors = state.results.length - correct;
  const uncertain = state.results.filter(isUncertainMatch).length;
  const falseSecure = state.results.filter((result) => !result.correct && !isUncertain(result)).length;
  elements.total.textContent = state.results.length;
  elements.accuracy.textContent = state.results.length ? percent(correct / state.results.length) : '—';
  elements.errors.textContent = errors;
  elements.uncertain.textContent = uncertain;
  elements.falseSecure.textContent = falseSecure;
  elements.total.title = `Laufzeit ${(durationMs / 1000).toFixed(1)} Sekunden`;
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
  elements.run.querySelector('span').textContent = 'OCR läuft …';
  elements.gallery.innerHTML = '<div class="loading"><span></span><p>Bilder werden ausgewertet</p></div>';
  elements.empty.hidden = true;
  try {
    const params = new URLSearchParams({
      dataset: elements.dataset.value,
      limit: elements.limit.value,
      mode: elements.mode.value,
      offset: elements.offset.value,
      threshold: elements.threshold.value,
    });
    const response = await fetch(`/api/run?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Auswertung fehlgeschlagen');
    state.results = payload.results;
    state.visible = PAGE_SIZE;
    elements.export.disabled = false;
    renderSummary(payload.durationMs);
    renderCards();
  } catch (error) {
    elements.gallery.innerHTML = `<div class="error-message"><strong>Auswertung nicht möglich</strong><p>${error.message}</p></div>`;
  } finally {
    elements.run.disabled = false;
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
  renderSummary(0);
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
