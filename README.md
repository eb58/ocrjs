# ocrjs

OCR für handgeschriebene Ziffern mit einem lokalen visuellen Prüfstand.

## Visuelle Tests

Der Prüfstand wertet Bilder aus dem lokalen, nicht versionierten Verzeichnis `data` aus und zeigt Fehler sowie unsichere Erkennungen als Galerie.

```sh
npm run visual-test
```

Danach ist die Oberfläche unter [http://localhost:4173](http://localhost:4173) erreichbar.

In der Oberfläche lassen sich Datensatz, Erkennungsmodus (`6×4`, `7×5`, `8×6` oder Kaskade), Anzahl und Startpunkt der Bilder einstellen. Die Kaskade beginnt mit `6×4` und akzeptiert ein Ergebnis, sobald die eingestellte sichere Konfidenz erreicht ist. Andernfalls folgen `7×5` und zuletzt `8×6`. `0` Bilder je Ziffer führt einen vollständigen Batch-Lauf aus. Ergebnisse können nach Fehlern, sicheren Fehlklassifikationen, unsicheren Treffern und Ziffern gefiltert sowie als CSV exportiert werden. Ein Klick auf ein Bild zeigt die drei ähnlichsten Trainingsbilder.

## Trainingsdatenbanken erzeugen

```sh
npm run gen-images-from-mnist   # schreibt PNGs nach os.tmpdir()/ocrjs/{train,test}
npm run gen-dbs                 # liest Trainingsbilder aus data/imgs/{eb,mnist}/{train,test}
```

`gen-images-from-mnist` und `gen-dbs` sind nicht automatisch verbunden: Die erzeugten MNIST-PNGs müssen von `os.tmpdir()/ocrjs/<train|test>` manuell nach `data/imgs/mnist/<train|test>` kopiert werden, bevor `gen-dbs` sie einliest.

## Automatische Tests

```sh
npm test
```

Die kleinen PNG-Fixtures unter `tests/fixtures` sind versioniert. Der vollständige Datenbestand unter `data` bleibt über `.gitignore` ausgeschlossen.
