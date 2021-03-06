const ocrMnistImageGenerator = (prefix) => {
  const range = n => [...Array(n).keys()];

  const fs = require('fs');
  const mkdirp = require('mkdirp');
  const PNG = require('pngjs').PNG;
  const ocrimg = require('../ocr/ocrimg');

  const DIM = 28;
  const DIMSQR = DIM * DIM;
  const mnistpath = 'data/mnist/';

  range(10).forEach(digit => mkdirp.sync('/temp/' + prefix + '/img' + digit));

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
        const n = png.width * y + x;
        const idx = n * 4;
        png.data[idx + 0] = png.data[idx + 1] = png.data[idx + 2] = imageData[n] ? 255 : 0;
        png.data[idx + 3] = 255;
      }
    }
    return png;
  };

  labels.forEach((label, idx) => {
    const fname = '/temp/' + prefix + '/img' + label + '/' + label + '-' + idx + '.png';
    if (!fs.existsSync(fname)) {
      console.log(idx, fname);
      const data = getMnistImage(idx);
      const png = createPng(data);
      const img = ocrimg().frompng(png).scaleUp(150, 150);
      const png2 = createPng2(img.imgdata, 150, 150);
      fs.writeFileSync(fname, PNG.sync.write(png2));
    }
  });
};
ocrMnistImageGenerator('t10k');
ocrMnistImageGenerator('train');
