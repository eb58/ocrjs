const fs = require('fs');
const pngjs = require('pngjs');

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

const prepareImg = (png, dimr, dimc) => ocrimg().frompng(png).adjustBW().extractGlyph().cropGlyph().scaleDown(dimr, dimc);
// ##################################################################################

{
  [ebdbDir + "02 - Validierungsdaten/img0/0_0_1__aliste_TestListenH_Neu_rechserv_region1_04_29_101_1_3042191h_1.tif.png"]
    .forEach(image => console.log(ocrengine.recognizeImage(image, [ebdb_train_6x4, ebdb_train_7x5, ebdb_train_8x6])));
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

// imgtest(opts_ebdb);
