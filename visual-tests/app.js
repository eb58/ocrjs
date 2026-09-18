const state = { results: [], status: 'all' };
const $ = (selector) => document.querySelector(selector);
const elements = {
  accuracy: $('#accuracy'),
  details: $('#details'),
  detailContent: $('#detailContent'),
  digit: $('#digitFilter'),
  distribution: $('#distribution'),
  empty: $('#emptyState'),
  errors: $('#errors'),
  gallery: $('#gallery'),
  resultCount: $('#resultCount'),
  run: $('#runButton'),
  sort: $('#sort'),
  threshold: $('#threshold'),
  total: $('#total'),
  uncertain: $('#uncertain'),
};

const threshold = () => Number(elements.threshold.value);
const isUncertain = (result) => result.confidence < threshold();
const percent = (value) => `${(value * 100).toFixed(1)}%`;

const filteredResults = () => {
  const digit = elements.digit.value;
  const filtered = state.results.filter((result) => {
    const matchesDigit = digit === 'all' || result.expected === Number(digit);
    const matchesStatus =
      state.status === 'all' ||
      (state.status === 'error' && !result.correct) ||
      (state.status === 'uncertain' && isUncertain(result)) ||
      (state.status === 'correct' && result.correct);
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
  elements.gallery.replaceChildren();
  results.forEach((result) => {
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
  elements.resultCount.textContent = `${results.length} von ${state.results.length}`;
  elements.empty.hidden = state.results.length > 0;
};

const renderSummary = (durationMs) => {
  const correct = state.results.filter((result) => result.correct).length;
  const errors = state.results.length - correct;
  const uncertain = state.results.filter(isUncertain).length;
  elements.total.textContent = state.results.length;
  elements.accuracy.textContent = state.results.length ? percent(correct / state.results.length) : '—';
  elements.errors.textContent = errors;
  elements.uncertain.textContent = uncertain;
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
  elements.run.disabled = true;
  elements.run.querySelector('span').textContent = 'OCR läuft …';
  elements.gallery.innerHTML = '<div class="loading"><span></span><p>Bilder werden ausgewertet</p></div>';
  elements.empty.hidden = true;
  try {
    const params = new URLSearchParams({
      dataset: $('#dataset').value,
      limit: $('#limit').value,
      offset: $('#offset').value,
    });
    const response = await fetch(`/api/run?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Auswertung fehlgeschlagen');
    state.results = payload.results;
    renderSummary(payload.durationMs);
    renderCards();
  } catch (error) {
    elements.gallery.innerHTML = `<div class="error-message"><strong>Auswertung nicht möglich</strong><p>${error.message}</p></div>`;
  } finally {
    elements.run.disabled = false;
    elements.run.querySelector('span').textContent = 'Erneut auswerten';
  }
};

elements.run.addEventListener('click', run);
elements.digit.addEventListener('change', renderCards);
elements.sort.addEventListener('change', renderCards);
elements.threshold.addEventListener('input', () => {
  renderSummary(0);
  renderCards();
});
$('#statusFilter').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  state.status = button.dataset.status;
  document.querySelectorAll('#statusFilter button').forEach((item) => item.classList.toggle('active', item === button));
  renderCards();
});
$('.dialog-close').addEventListener('click', () => elements.details.close());
elements.details.addEventListener('click', (event) => {
  if (event.target === elements.details) elements.details.close();
});
