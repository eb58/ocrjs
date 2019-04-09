const fs = require('fs');
const path = require('path');
const changeDpi = require("./changedpi").changeDpi;

const indir = '/tmp/indata';
const outdir = '/tmp/outdata';

!fs.existsSync(outdir) && fs.mkdirSync(outdir);

//const fname = "Example.png";
//const data = fs.readFileSync(indir + '/' + fname);
//const newData = changeDpi(data, 300);
//fs.writeFileSync(outdir + '/' + fname, newData);


fs.readdir(indir, (err, fnames) => {
   if (err)
      throw err;

   fnames.forEach(fname => {
      const ext = path.extname(fname).replace('.', '');
      console.log("working on ", fname, ext);
      const data = fs.readFileSync(indir + '/' + fname);
      const newData = changeDpi(data, 200, ext);
      fs.writeFileSync(outdir + '/' + fname, newData);
   });
});

