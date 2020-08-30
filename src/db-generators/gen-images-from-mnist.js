const ocrMnistImageGenerator = function (prefix) {
  const range = n => [...Array(n).keys()];

  const fs = require('fs');
  const mkdirp = require('mkdirp');
  const PNG = require('pngjs').PNG;
  const ocrimg = require('../ocr/ocrimg');

  const DIM = 28;
  const DIMSQR = DIM * DIM;
  const mnistpath = 'data/mnist/';

  range(10).forEach(x => mkdirp.sync('/temp/' + prefix + '/' + x));

  const labels = fs.readFileSync(mnistpath + prefix + '-labels.idx1-ubyte').slice(8); // cf. structure of mnist
  const images = fs.readFileSync(mnistpath + prefix + '-images.idx3-ubyte').slice(16); // cf. structure of mnist

  const getMnistImage = i => images.slice(i * DIMSQR, (i + 1) * DIMSQR);

  const createPng = imageData => {
    const png = new PNG({ width: 28, height: 28, filterType: -1 });
    for (var y = 0; y < png.height; y++) {
      for (var x = 0; x < png.width; x++) {
        var n = png.width * y + x;
        var idx = n * 4;
        const val = imageData[n] > 100 ? 0 : 255;
        png.data[idx + 0] = png.data[idx + 1] = png.data[idx + 2] = val;
        png.data[idx + 3] = 255;
      }
    }
    return png;
  };

  const createPng2 = (imageData, width, height) => {
    const png = new PNG({ width, height, filterType: -1 });
    for (var y = 0; y < png.width; y++) {
      for (var x = 0; x < png.height; x++) {
        var n = png.width * y + x;
        var idx = n * 4;
        const val = imageData[n] ? 255 : 0;
        png.data[idx + 0] = png.data[idx + 1] = png.data[idx + 2] = val;
        png.data[idx + 3] = 255;
      }
    }
    return png;
  };

  labels.forEach((label, idx) => {
    const data = getMnistImage(idx);
    const png = createPng(data);
    const img = ocrimg().frompng(png).scaleUp(150, 150).adjustBW();
    const png2 = createPng2(img.imgdata, 150, 150);

    const buffer = PNG.sync.write(png2);
    fs.writeFileSync(
      '/temp/' + prefix + '/' + label + '/' + label + '-' + idx + '.png',
      buffer
    );
  });
};
ocrMnistImageGenerator('t10k');
ocrMnistImageGenerator('train');
