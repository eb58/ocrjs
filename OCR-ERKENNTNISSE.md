# OCRJS: Erkenntnisse und Arbeitsstand

Diese Datei sammelt die wichtigsten technischen Erkenntnisse und Messwerte, damit spätere Änderungen nicht dieselben Untersuchungen wiederholen müssen.

## Aktueller Stand

Der relevante Stand ist Commit `aceb0f2` (`Speed up OCR with adaptive candidate search`). Der Prüfstand läuft unter `http://localhost:4173/` und wird mit `npm run visual-test` im Node-Watch-Modus gestartet.

Vor jedem neuen Commit `git status` prüfen. Fremde Arbeitsbaumänderungen, insbesondere in `src/img.js` und `tests/img.test.js`, dürfen nicht überschrieben werden.

## Erkennungsalgorithmus

`src/ocr.js` verwendet pro Rasterdimension (6×4, 7×5, 8×6) mehrere Metriken: einfachen quadratischen Zellabstand, geglättete Zellenmetrik sowie zeilenweise, spaltenweise und zweidimensionale lokale Fensterabstände.

Unsichere Metriken werden über `vote()` kombiniert. Die bereinigte Bildansicht (`extractGlyph`) wird als zweite Sicht verwendet, wenn die primäre Sicht nicht sicher ist.

Eine wichtige Korrektur: Eine hohe Konfidenz, die erst durch die Abstimmung mehrerer unsicherer Metriken entsteht, darf nicht automatisch wie ein sicheres Einzelmetrik-Ergebnis behandelt werden. Sonst kann ein grobes 6×4-Raster eine falsche `1 → 7` mit hoher Konfidenz festschreiben. Der Hard Case liegt unter `tests/fixtures/hard-cases/1-vs-7-coarse-grid-coincidence.png`.

## Aktives Performanceverfahren

Der einfache Zellvergleich läuft weiterhin über die gesamte Datenbank und merkt die besten 128 Trainingsbilder je Ziffer. Diese werden bei den teuren Row-/Column-/Quad-Metriken zuerst geprüft; danach werden alle übrigen Bilder ebenfalls geprüft. Das Endergebnis bleibt so exakt gleich wie bei vollständiger Suche.

Eine reine Beschränkung auf 128 Bilder ist schneller, verändert aber Ergebnisse. `createRecognizer(file, { candidateLimit: 128 })` aktiviert sie. `analyzeImage(..., { candidateLimit: 128, fallbackConfidence: 1.5 })` kann bei geringer Konfidenz die vollständige Suche wiederholen. Der vollständige Pfad ist `searchMode: 'full'` im Prüfstand.

Im Prüfstand ist standardmäßig die optimierte Suche aktiv:

- EB: `candidateLimit: 128`, Vollsuche unter Konfidenz `1.5`
- MNIST: `candidateLimit: 128`, Vollsuche unter Konfidenz `1.25`
- Vergleichsmodus: `search=full`

Die Auswahl ist in der Oberfläche unter „Suche“ verfügbar und wird mit Reset/LocalStorage behandelt.

## Messwerte

Die Zahlen stammen aus den vollständigen Testbeständen. Laufzeiten sind Einzelmessungen und hängen von Workerzahl und Systemlast ab.

| Datenbank/Test | Suche | Fehler | Laufzeit |
|---|---|---:|---:|
| EB / EB | vollständig | 44 / 13.990 | ca. 48 s |
| EB / EB | 128 Kandidaten | 54 / 13.990 | ca. 27 s |
| EB / EB | 128 + Rückfall < 1,5 | 48 / 13.990 | nahe am schnellen Lauf |
| MNIST / MNIST | vollständig | 173 / 9.784 | ca. 90 s |
| MNIST / MNIST | 128 Kandidaten | 162 / 9.784 | ca. 48 s |
| MNIST / MNIST | 128 + Rückfall < 1,25 | 161 / 9.784 | wenige Rückfälle |

Fünf der zusätzlichen EB-Fehler des 128er-Pfads sind trotz hoher scheinbarer Konfidenz falsch; ein Konfidenz-Rückfall kann diese Fälle nicht erkennen.

## Kreuztests und Datenbanken

MNIST-Training auf EB-Testbildern erreichte 85,50 % (11.961/13.990). EB-Training auf MNIST erreichte 97,16 % (9.506/9.784). MNIST hat zwar etwa 59.676 Trainingsbilder gegenüber 15.972 EB-Bildern, ist aber stilistisch sauberer und anders aufbereitet. Die MNIST-Erzeugung binarisiert 28×28-Bilder und skaliert sie hoch; das erklärt den starken Domain-Shift.

Eine einfach zusammengeklebte Datenbank würde die Laufzeit grob vervier- bis verfünffachen. Ein Prototypenexperiment mit etwa 200 MNIST-Prototypen je Ziffer ergab EB 99,63 % statt 99,69 % und MNIST 97,69 % statt 97,16 %. Diese Mischdatenbank wurde nicht aktiviert.

## Tests und Benchmarks

- `npm test`: zuletzt 7 Suiten, 139 Tests plus 1 übersprungener Test.
- `npm run lint`: sauber.
- `scripts/benchmarks/benchmark-shortlist.md`: Kandidatenvorauswahl 16/32/64/128.
- `scripts/benchmarks/benchmark-shortlist-fallback.js`: Konfidenz-Rückfallmessungen.
- `scripts/benchmarks/benchmark-priority.md`: beste Kandidaten zuerst, danach alle; Ergebnisse waren gleich, aber nicht schneller.

Der MNIST-Kaskadentest ist in `tests/ocr-cascade.test.js` standardmäßig übersprungen, weil er die Laufzeit stark verlängert. Für belastbare Änderungen sollte er gezielt aktiviert oder über einen Benchmark ausgeführt werden.

## Bewährte nächste Schritte

1. Die 16 EB-Bilder untersuchen, die bei reiner 128er-Vorauswahl neu falsch wurden.
2. Für die fünf hochkonfidenten Fehler ein zusätzliches Signal testen, etwa Dimensionskonflikt oder Abstand zwischen den besten Kandidaten.
3. Jede Änderung gegen EB und MNIST sowie gegen den Vollsuche-Modus messen.
4. Laufzeit und Fehler gemeinsam bewerten; reine Kandidatenbegrenzung ist schnell, aber nicht ergebnisgleich.

## Randbedingungen

- JavaScript-Stil: Arrow Functions bevorzugen, `const` statt `let`, kompakte Schreibweise.
- Fremde Arbeitsbaumänderungen nicht überschreiben.
- Bei Änderungen am Prüfstand den Watch-Server neu laden lassen und API-, UI- und relevante Jest-Tests ausführen.
