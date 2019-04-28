const ocrMnistImageGenerator = function(prefix) {
  const fs = require('fs');
  const _ = require('underscore');
  const mkdirp = require('mkdirp');
  const PNG = require('pngjs').PNG;

  const DIM = 28;
  const DIMSQR = DIM * DIM;
  const mnistpath = 'data/mnist/';

  _.range(10).forEach(x => mkdirp.sync('/tmp/' + prefix + '/' + x));

  const labels = fs
    .readFileSync(mnistpath + prefix + '-labels.idx1-ubyte')
    .slice(8); // cf. structure of mnist
  const images = fs
    .readFileSync(mnistpath + prefix + '-images.idx3-ubyte')
    .slice(16); // cf. structure of mnist

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

  labels.forEach((label, idx) => {
    const data = getMnistImage(idx);
    const png = createPng(data);
    const buffer = PNG.sync.write(png);
    fs.writeFileSync(
      '/tmp/' + prefix + '/' + label + '/' + label + '-' + idx + '.png',
      buffer
    );
  });
};
ocrMnistImageGenerator('t10k');
ocrMnistImageGenerator('train');
