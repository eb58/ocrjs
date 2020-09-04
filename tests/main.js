const ocrimg = require('../src/ocr/ocrimg');
const ocrengine = require('../src/ocr/ocr')();
const imgtest = require('./imgtest');

const ebdb_train_6x4 = require(`../data/dbjs/ebdb-train-6x4`);
const ebdb_train_7x5 = require(`../data/dbjs/ebdb-train-7x5`);
const ebdb_train_8x6 = require(`../data/dbjs/ebdb-train-8x6`);

const mnistdb_train_6x4 = require(`../data/dbjs/mnist-db-train-6x4`);
const mnistdb_train_7x5 = require(`../data/dbjs/mnist-db-train-7x5`);
const mnistdb_train_8x6 = require(`../data/dbjs/mnist-db-train-8x6`);

const ebdbDir = 'C:/Users/erich/Google Drive/ATOS/Projekte/OCR/Data/01 - Handgeschriebene Zeichen/01 - Ziffern/';
const mnistDir = 'C:/Users/erich/Documents/JavascriptProjekte/ocrjs/data/mnist/'

dump = (imgdata,h,w) => {
  for (let r = 0; r < h; r++) {
    let line = '';
    for (let c = 0; c < w; c++) {
      const x = imgdata[r * w + c];
      line += x ? ('     ' + x).substr(-5) : '     ' ;
    }
    console.log(r, line);
  }
};


const ydb = { 
  dimr: 6, 
  dimc:4, 
  "0" :  [...ebdb_train_6x4["0"],...mnistdb_train_6x4["0"]],
  "1" :  [...ebdb_train_6x4["1"],...mnistdb_train_6x4["1"]],
  "2" :  [...ebdb_train_6x4["2"],...mnistdb_train_6x4["2"]],
  "3" :  [...ebdb_train_6x4["3"],...mnistdb_train_6x4["3"]],
  "4" :  [...ebdb_train_6x4["4"],...mnistdb_train_6x4["4"]],
  "5" :  [...ebdb_train_6x4["5"],...mnistdb_train_6x4["5"]],
  "6" :  [...ebdb_train_6x4["6"],...mnistdb_train_6x4["6"]],
  "7" :  [...ebdb_train_6x4["7"],...mnistdb_train_6x4["7"]],
  "8" :  [...ebdb_train_6x4["8"],...mnistdb_train_6x4["8"]],
  "9" :  [...ebdb_train_6x4["9"],...mnistdb_train_6x4["9"]]
}


const xdb = { 
  dimr: 8, 
  dimc:6, 
  "0" :  [...ebdb_train_8x6["0"],...mnistdb_train_8x6["0"]],
  "1" :  [...ebdb_train_8x6["1"],...mnistdb_train_8x6["1"]],
  "2" :  [...ebdb_train_8x6["2"],...mnistdb_train_8x6["2"]],
  "3" :  [...ebdb_train_8x6["3"],...mnistdb_train_8x6["3"]],
  "4" :  [...ebdb_train_8x6["4"],...mnistdb_train_8x6["4"]],
  "5" :  [...ebdb_train_8x6["5"],...mnistdb_train_8x6["5"]],
  "6" :  [...ebdb_train_8x6["6"],...mnistdb_train_8x6["6"]],
  "7" :  [...ebdb_train_8x6["7"],...mnistdb_train_8x6["7"]],
  "8" :  [...ebdb_train_8x6["8"],...mnistdb_train_8x6["8"]],
  "9" :  [...ebdb_train_8x6["9"],...mnistdb_train_8x6["9"]]
}

{
  [ebdbDir + "02 - Validierungsdaten/img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_1_3042191h_1.tif.png"]
    .map(image => ocrengine.recognizeImage(image, [ebdb_train_6x4, ebdb_train_7x5, ebdb_train_8x6]))
    .forEach(res => res.forEach(x=> {
      console.log( x);
    }));
}

const opts_ebdb = {
  dbs: [ebdb_train_6x4, ebdb_train_7x5, ebdb_train_8x6],
  nImages2Test: 100,
  path2Testdata: ebdbDir + '02 - Validierungsdaten/',
  path2Traindata: ebdbDir + '01 - Trainingsdaten',
  outFile: 'c:/temp/t.html'
};

const opts_mnistdb = {
  dbs: [mnistdb_train_6x4, mnistdb_train_7x5, mnistdb_train_8x6],
  nImages2Test: 100,
  path2Testdata: mnistDir + 't10k',
  path2Traindata: ebdbDir + '01 - Trainingsdaten',
  outFile: 'c:/temp/xt.html'
};

imgtest(opts_ebdb);
