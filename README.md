# ocrjs

OCR für handgeschriebene Ziffern mit einem lokalen visuellen Prüfstand.

## Visuelle Tests

Der Prüfstand wertet Bilder aus dem lokalen, nicht versionierten Verzeichnis `data` aus und zeigt Fehler sowie unsichere Erkennungen als Galerie.

```sh
npm run visual-test
```

Danach ist die Oberfläche unter [http://localhost:4173](http://localhost:4173) erreichbar.

Die Auswertung läuft über einen Worker-Pool, der die Bilder auf mehrere Kerne verteilt. Die Anzahl der Worker lässt sich über `OCR_WORKERS` setzen (Standard: ein Worker je Kern, maximal 8). Jeder Worker hält eine eigene Kopie der Trainingsdatenbanken im Speicher — bei knappem RAM lohnt sich ein kleinerer Wert.

In der Oberfläche lassen sich Datensatz, Erkennungsmodus (`6×4`, `7×5`, `8×6` oder Kaskade), Anzahl und Startpunkt der Bilder einstellen. Die Kaskade beginnt mit `6×4` und akzeptiert ein Ergebnis, sobald die eingestellte sichere Konfidenz erreicht ist. Andernfalls folgen `7×5` und zuletzt `8×6`. `0` Bilder je Ziffer führt einen vollständigen Batch-Lauf aus. Ergebnisse können nach Fehlern, sicheren Fehlklassifikationen, unsicheren Treffern und Ziffern gefiltert sowie als CSV exportiert werden. Ein Klick auf ein Bild zeigt die drei ähnlichsten Trainingsbilder.

## Trainingsdatenbanken erzeugen

```sh
npm run gen-images-from-mnist   # schreibt PNGs nach os.tmpdir()/ocrjs/{train,test}
npm run gen-dbs                 # liest Trainingsbilder aus data/imgs/{eb,mnist}/train
```

`gen-images-from-mnist` und `gen-dbs` sind nicht automatisch verbunden: Die erzeugten MNIST-PNGs müssen von `os.tmpdir()/ocrjs/<train|test>` manuell nach `data/imgs/mnist/<train|test>` kopiert werden, bevor `gen-dbs` sie einliest.

`gen-dbs` verteilt die Bilder auf alle Kerne (etwa 16 s für EB und MNIST zusammen). Mit `npm run gen-dbs -- eb` wird nur ein Datensatz neu erzeugt.

Im Prüfstand lässt sich neben dem EB-Bestand auch die am 21.09.2026
hinzugekommene EB-Testmenge auswählen. Sie liegt getrennt unter
`data/imgs/eb/test-2026-09-21`.

## WASM-Suche

Die Distanzsuchen aus `src/ocr.js` laufen als WebAssembly-Kerne (`assembly/search.ts`, AssemblyScript). Das übersetzte `src/search.wasm` ist eingecheckt; neu bauen ist nur nach Änderungen an `assembly/search.ts` nötig:

```sh
npm run build:wasm
```

Die Kerne liefern bitgleiche Ergebnisse zur JS-Fassung, die als Rückfall erhalten bleibt (etwa für Nicht-Ganzzahlvektoren). `OCR_WASM=0` schaltet WASM zum Vergleichen ab; `tests/wasm-search.test.js` prüft die Gleichheit.

## Hilfsskripte

Eine Einordnung der Generatoren, Importwerkzeuge und historischen Benchmarks
steht in [`scripts/README.md`](scripts/README.md).

## Automatische Tests

```sh
npm test          # Standard, läuft auch im Pre-commit-Hook
npm run test:full # zusätzlich EB 21.09. und MNIST (dauert gut eine Minute länger)
```

Neben den Einzeltests prüft `tests/ocr-cascade.test.js` die Trefferquote der Kaskade auf ganzen Testmengen: EB-Bestand (> 99,5 %) immer und MNIST (> 97 %) nur mit `test:full`. Bei Review (> 94,5 %) misst der Test lediglich die Übereinstimmung mit vorläufigen, per OCR vergebenen Ordnerlabels. Die Menge vom 21.09. (> 99 %, nur mit `test:full`) enthält ebenfalls OCR-zugeordnete Bilder. Für diese beiden Mengen ist der Gesamtwert keine unabhängige Trefferquote.

Beim Import der Postlisten hält ein konservativer Ausschussdetektor Bilder zurück, deren absolute 8x6-Distanz zur EB-Trainingsmenge über 35000 liegt. Solche Bilder landen unabhängig von der relativen OCR-Konfidenz in `review`; sie werden nicht automatisch gelöscht. `npm run benchmark:reject` misst Fehlalarme auf dem regulären EB-Testbestand und die Fangquote unter den manuell aussortierten Bildern.

Die kleinen PNG-Fixtures unter `tests/fixtures` sind versioniert. Der vollständige Datenbestand unter `data` bleibt über `.gitignore` ausgeschlossen.
