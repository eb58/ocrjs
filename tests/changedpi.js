const fs = require('fs');
const path = require('path');
const changeDpi = require('../src/img/changedpi');

const indir = '/tmp/indata/ohnePhys';
const outdir = '/tmp/outdata';

!fs.existsSync(outdir) && fs.mkdirSync(outdir);

//const fname = "Example.png";
//const data = fs.readFileSync(indir + '/' + fname);
//const newData = changeDpi(data, 300);
//fs.writeFileSync(outdir + '/' + fname, newData);

fs.readdirSync(indir)
  .filter(fname => !fs.statSync(indir + '/' + fname).isDirectory())
  .forEach(fname => {
    const ext = path.extname(fname).replace('.', '');
    console.log('working on ', indir, fname, ext);
    const data = fs.readFileSync(indir + '/' + fname);
    const newData = changeDpi(data, 200, ext);
    fs.writeFileSync(outdir + '/' + fname, newData);
  });
