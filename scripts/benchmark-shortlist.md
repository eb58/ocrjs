# Kandidatenvorauswahl (2026-09-19)

Reproduktion: `node scripts/benchmark-shortlist.js` im Projektverzeichnis.
Ergebnisse inklusive reparierter und neu falscher Bilder stehen in
`benchmark-shortlist-results.json` (wird beim erneuten Lauf ersetzt).

Vollstaendige PNG-Testbestaende, passende EB-/MNIST-Trainingsdatenbanken,
aktuelle Dimensionskaskade, sichere Konfidenz 2.4 mit bestehender Rasteranpassung.
Je Variante vier frische Worker; Zeit inklusive Workerstart und Datenbankladen.
Ein Durchlauf, keine statistisch abgesicherte Laufzeitmessung. Waehrend des
MNIST-Referenzlaufs liefen kurzzeitig auch Funktionstests; dessen Laufzeit kann
dadurch erhoeht sein. Fuer belastbare Speedup-Faktoren isoliert wiederholen.

Der normale Zellvergleich und Based bleiben vollstaendig. Erst danach werden
pro Ziffer die k naechsten Trainingsbilder nach quadrierter Zelldistanz ausgewaehlt;
Rows, Cols und Quad nutzen diese Auswahl. Original und bereinigte Ansicht waehlen
jeweils ihre eigenen Kandidaten. Auch der Aufwand der Vorauswahl wird mitgemessen.

| DB/Test | k | Richtig / Gesamt | Fehler | Repariert | Neu falsch | Sekunden |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| EB | voll | 13946 / 13990 | 44 | 0 | 0 | 72.0 |
| EB | 16 | 13912 / 13990 | 78 | 10 | 44 | 26.9 |
| EB | 32 | 13929 / 13990 | 61 | 9 | 26 | 31.0 |
| EB | 64 | 13934 / 13990 | 56 | 10 | 22 | 31.8 |
| MNIST | voll | 9611 / 9784 | 173 | 0 | 0 | 104.4 |
| MNIST | 16 | 9612 / 9784 | 172 | 26 | 25 | 38.5 |
| MNIST | 32 | 9625 / 9784 | 159 | 31 | 17 | 40.9 |
| MNIST | 64 | 9628 / 9784 | 156 | 29 | 12 | 43.3 |

Keine automatische Aktivierung: Alle Varianten verschlechtern EB. MNIST profitiert
in diesem Versuch, am meisten bei 64 Kandidaten. Die Ergebnisse gelten fuer die
bestehenden Testbestaende, nicht fuer einen neuen unabhaengigen Holdout.

Optional im Code: `createRecognizer(file, { candidateLimit: 64 })` oder als
sechstes Argument von `analyzeImage`: `{ candidateLimit: 64 }`.
Standard `0` bedeutet unveraenderte Vollsuche. Der Pruefstand verwendet den Standard.

## Nachmessung mit 128 Kandidaten

Aufruf: `node scripts/benchmark-shortlist.js 128`. Weitere positive Kandidatenzahlen
koennen als Argumente folgen; die Vollsuche wird immer als Referenz vorangestellt.
Rohdaten dieses Laufs: `benchmark-shortlist-128-results.json`.

| DB/Test | k | Richtig / Gesamt | Fehler | Repariert | Neu falsch | Sekunden |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| EB | voll | 13946 / 13990 | 44 | 0 | 0 | 47.7 |
| EB | 128 | 13936 / 13990 | 54 | 6 | 16 | 27.0 |
| MNIST | voll | 9611 / 9784 | 173 | 0 | 0 | 90.4 |
| MNIST | 128 | 9622 / 9784 | 162 | 20 | 9 | 48.3 |

Einzelmessung mit vier frischen Workern je Variante, keine parallel gestarteten Tests.
Gegen die Referenz dieses Laufs etwa 43 % weniger Laufzeit auf EB und 47 % auf MNIST.
Die absoluten Zeiten frueherer Laeufe sind nicht direkt vergleichbar.
EB hat zwei Fehler weniger als beim frueheren 64er-Lauf, MNIST sechs mehr.
Die Vollsuche bleibt Standard; auch 128 verursacht auf EB netto zehn weitere Fehler.

## Gezielte Vollsuche bei geringer Konfidenz

Aufruf: `node scripts/benchmark-shortlist-fallback.js`. Rohdaten:
`benchmark-shortlist-fallback-results.json`. Ausgangspunkt sind 128 Kandidaten.
Nur Ergebnisse unter der jeweiligen Konfidenz werden mit der Vollsuche wiederholt.

| Datensatz | Schwelle | Vollsuchen | Fehler | Repariert | Neu falsch |
| --- | ---: | ---: | ---: | ---: | ---: |
| EB | 1.10 | 11 | 49 | 5 | 0 |
| EB | 1.25 | 20 | 49 | 7 | 2 |
| EB | 1.50 | 32 | 48 | 8 | 2 |
| EB | 2.00 | 54 | 48 | 11 | 5 |
| EB | 2.40 | 68 | 48 | 11 | 5 |
| MNIST | 1.10 | 11 | 161 | 2 | 1 |
| MNIST | 1.25 | 24 | 161 | 4 | 3 |
| MNIST | 1.50 | 47 | 163 | 4 | 5 |
| MNIST | 2.00 | 71 | 168 | 5 | 11 |
| MNIST | 2.40 | 85 | 169 | 5 | 12 |

Die Analyse lief fuer beide Datensaetze gleichzeitig und ist keine belastbare
Laufzeitmessung. Relevant sind Fehlerzahl und Anzahl der ausgeloesten Vollsuchen.
Die Option lautet `{ candidateLimit: 128, fallbackConfidence: 1.5 }`.
