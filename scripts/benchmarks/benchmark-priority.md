# Bevorzugte Kandidaten, weiterhin vollstaendige Suche

Aufruf: `node scripts/benchmarks/benchmark-priority.js`.
Rohdaten: `benchmark-priority-results.json` (wird bei Wiederholung ersetzt).

Der bestehende Zellvergleich merkt optional die besten 32 Trainingsbilder pro Ziffer.
Rows/Cols/Quad besuchen zuerst diese Bilder, danach alle verbleibenden Bilder.
Based und die Abbruchschwellen bleiben unveraendert. Auswahl und Umordnung sind
in der Laufzeit enthalten; Original und bereinigte Sicht erhalten eigene Kandidaten.

Vollstaendige PNG-Testbestaende mit passender Trainingsdatenbank, vier frische Worker
je Lauf, Zeit inklusive Start und Datenbankladen. Einzelmessung, keine parallel vom
Benchmark gestarteten Tests. Reihenfolge je Datensatz: Standard, dann Priorisierung.

| Datensatz | Standard | Beste 32 zuerst | Fehler in beiden | Abweichende Ergebnisse |
| --- | ---: | ---: | ---: | ---: |
| EB (13.990) | 51,4 s | 52,5 s | 44 | 0 |
| MNIST (9.784) | 91,9 s | 116,4 s | 173 | 0 |

Verglichen wurde das vollstaendige analyzeImage-Ergebnis per JSON, einschliesslich
Kandidaten, Namen, Distanzen, Konfidenz und gewaehlter Dimension.

Kein Laufzeitgewinn in diesem Versuch: EB etwa +2 %, MNIST etwa +27 %.
Die geringe EB-Differenz kann Messrauschen sein. Das Sammeln von 32 Kandidaten
benoetigt eine lockerere Schranke im ersten Zellvergleich und zusaetzliche Verwaltung.
Das ist eine plausible Kostenquelle, wurde hier aber nicht separat profiliert.

Standard bleibt unveraendert. Optional: `createRecognizer(file, { priorityCount: 32 })`
oder sechstes Argument von analyzeImage. Nicht mit candidateLimit kombinierbar.
