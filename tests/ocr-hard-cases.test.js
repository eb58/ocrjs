const path = require('path');
const { analyzeImage, loadDatabases } = require('../src/analysis');

const fixtureDir = path.join(__dirname, 'fixtures', 'hard-cases');
const databases = loadDatabases('eb', 'auto');

// Reale Testbilder, an denen konkrete Schwaechen der Erkennungs-Kaskade gefunden und
// behoben wurden. Jeder Fall dokumentiert, warum er frueher schiefging - damit eine
// kuenftige Aenderung, die ihn wieder kaputt macht, hier sofort auffaellt.

test('1-vs-5-correlated-raw-metrics: eine klare "1", bei der die Rohsichten sich faelschlich auf "5" einigten', () => {
  // Fuenf der sechs Sichten (SQR, Based, Rows, Cols, Quad) sahen alle dasselbe
  // unbereinigte Bild und einigten sich schwach, aber uebereinstimmend auf "5" - nur die
  // bereinigte Sicht (extractGlyph) erkannte richtig "1". Da die Abstimmung ueber alle
  // versuchten Sichten lief statt nur ueber primaer+bereinigt zu blenden, gewann "5" knapp
  // (Distanz 0.5873 vs. 0.5878). Seit die bereinigte Sicht ihre EIGENE Metrik-Kaskade
  // durchlaeuft (nicht nur die einfache Distanz), traegt sie mehr Gewicht bei und gewinnt.
  const result = analyzeImage(path.join(fixtureDir, '1-vs-5-correlated-raw-metrics.png'), 1, 'eb', databases);

  expect(result.prediction).toBe(1);
  expect(result.correct).toBe(true);
});

test('1-vs-7-coarse-grid-coincidence: bekannte, akzeptierte Grenze der Dimensions-Kaskade', () => {
  // Im groebsten Raster (6x4, nur 24 Zellen) liegt zufaellig eine MNIST-"7"
  // (mnist-7-92-1599384239833.png) extrem nah - Distanz 2243 gegenueber 26149 im feinsten
  // Raster (8x6). Bei 6x4 allein ist die Verwechslung mit Konfidenz ~6.46 "sicher", aber
  // falsch, und die Kaskade bricht dort ab, bevor 7x5/8x6 - die dieses Bild richtig
  // erkennen wuerden - je probiert werden.
  //
  // "Feinstes zuerst" probiert (analysis.js) loest genau diesen Fall, kostet aber
  // insgesamt mehr Faelle (77 statt 62 Fehler auf dem vollen Testset) und ist spuerbar
  // langsamer, weil die meisten Bilder schon bei der ersten probierten Dimension sicher
  // werden - "teuerstes zuerst" zahlt diesen Preis dann fuer die Mehrheit der Bilder statt
  // nur fuer die schwierigen. Deshalb bleibt die Reihenfolge grob-zu-fein, und dieser Fall
  // bleibt ein bekannter Restfehler. Dieser Test haelt das aktuelle (falsche) Verhalten
  // fest, damit eine kuenftige Aenderung, die daran etwas aendert - in welche Richtung
  // auch immer -, hier auffaellt statt stillschweigend durchzurutschen.
  const result = analyzeImage(path.join(fixtureDir, '1-vs-7-coarse-grid-coincidence.png'), 1, 'eb', databases);

  expect(result.dimension).toBe('6x4');
  expect(result.prediction).toBe(7);
  expect(result.correct).toBe(false);
});
