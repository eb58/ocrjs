const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const isPNG = (name) => name.endsWith('.png');

const invertIfDarkBackground = (file) => {
  const png = PNG.sync.read(fs.readFileSync(file));
  let sum = 0;
  const n = png.width * png.height;
  for (let i = 0; i < n; i++) sum += png.data[i * 4];
  const mean = sum / n;
  if (mean >= 128) return false;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    png.data[idx] = 255 - png.data[idx];
    png.data[idx + 1] = 255 - png.data[idx + 1];
    png.data[idx + 2] = 255 - png.data[idx + 2];
  }
  fs.writeFileSync(file, PNG.sync.write(png));
  return true;
};

const fixDir = (baseDir) => {
  let inverted = 0;
  let unchanged = 0;
  fs.readdirSync(baseDir)
    .filter((digit) => fs.statSync(path.join(baseDir, digit)).isDirectory())
    .forEach((digit) => {
      const dir = path.join(baseDir, digit);
      fs.readdirSync(dir)
        .filter(isPNG)
        .forEach((name) => {
          if (invertIfDarkBackground(path.join(dir, name))) inverted++;
          else unchanged++;
        });
      console.log(digit, 'fertig');
    });
  console.log(baseDir, '- invertiert:', inverted, 'unveraendert:', unchanged);
};

const dataPath = path.join(__dirname, '..', '..', 'data', 'imgs');
process.argv.slice(2).forEach((rel) => fixDir(path.join(dataPath, rel)));
