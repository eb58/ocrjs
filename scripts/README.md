# Skriptuebersicht

Die Skripte sind keine Teile des laufenden OCR-Servers. Sie erzeugen Daten,
bereiten Quelldaten auf oder reproduzieren Messungen.

## Regelmaessig verwendete Generatoren

- `npm run gen-images-from-mnist` wandelt rohe MNIST-Dateien mit
  `generate/gen-images-from-mnist.js` in PNGs im temporaeren
  Systemverzeichnis um.
- `npm run gen-dbs` baut mit `generate/gen-dbs.js` die
  JavaScript-Datenbanken aus `data/imgs` neu auf.

## Datenpflege und Import

- `import/fix-train-background.js` invertiert Trainingsbilder mit dunklem
  Hintergrund. Verzeichnisse werden relativ zu `data/imgs` uebergeben.
- `import/flatten-postlisten.js` zieht tief verschachtelte Postlisten-Datensaetze in
  eine flache Ordnerstruktur. Es veraendert den uebergebenen Quellordner; zuerst
  mit `--dry-run` ausfuehren.
- `import/flatten-postlisten-files.js` zieht danach `.tif`- und `.att`-Dateien aus den
  Datensatzordnern eine Ebene nach oben. Auch hier zuerst `--dry-run` verwenden.
- `import/extract-postlisten-digits.js` schneidet Ziffern aus Postlisten aus
  und ordnet sie per OCR dem Testbestand oder dem manuellen Review zu.
- `import/extract-kadmos-digits.js` extrahiert Ziffern aus speziellen
  Kadmos-Formularen anhand ihrer `.att`-Ground-Truth.
- `import/extract-ground-truth-digits.js` ist die allgemeinere Variante
  fuer Handlisten mit `.att`-Ground-Truth und ergaenzt dort ein `K=`-Feld.

Die Extraktionsskripte akzeptieren `--dry-run`; ihre Argumente stehen jeweils
am Dateianfang. Fuer TIFF-Dateien erwarten sie ein installiertes `ffmpeg`.

## Reproduzierbare Benchmarks

- `benchmarks/benchmark-shortlist.js` untersucht begrenzte Kandidatenlisten.
- `benchmarks/benchmark-shortlist-fallback.js` untersucht den Rueckfall von einer kurzen
  Kandidatenliste auf die vollstaendige Suche.
- `benchmarks/benchmark-priority.js` misst eine priorisierte, aber vollstaendige Suche.

Die Markdown-Dateien beschreiben Aufbau und Ergebnis. Die
`*-results.json`-Dateien enthalten die Rohdaten und werden bei Wiederholung
ueberschrieben. Skript, Dokumentation und Rohdaten gehoeren jeweils zusammen.
