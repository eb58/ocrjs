# ocrjs

OCR für handgeschriebene Ziffern mit einem lokalen visuellen Prüfstand.

## Visuelle Tests

Der Prüfstand wertet Bilder aus dem lokalen, nicht versionierten Verzeichnis `data` aus und zeigt Fehler sowie unsichere Erkennungen als Galerie.

```sh
npm run visual-test
```

Danach ist die Oberfläche unter [http://localhost:4173](http://localhost:4173) erreichbar.

In der Oberfläche lassen sich Datensatz, Anzahl und Startpunkt der Bilder einstellen. `0` Bilder je Ziffer führt einen vollständigen Batch-Lauf aus. Ergebnisse können nach Fehlern, sicheren Fehlklassifikationen, unsicheren Treffern und Ziffern gefiltert sowie als CSV exportiert werden. Ein Klick auf ein Bild zeigt die drei ähnlichsten Trainingsbilder.

## Automatische Tests

```sh
npm test
```

Die kleinen PNG-Fixtures unter `tests/fixtures` sind versioniert. Der vollständige Datenbestand unter `data` bleibt über `.gitignore` ausgeschlossen.
