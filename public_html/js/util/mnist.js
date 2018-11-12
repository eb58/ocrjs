const fs = require('fs');
const _ = require('underscore');

const readMnistDB = function () {

   const lbl = fs.readFileSync('public_html/data/mnist/t10k-labels.idx1-ubyte').slice(8)
   const img = fs.readFileSync('public_html/data/mnist/t10k-images.idx3-ubyte').slice(16)

   const db = {};
   _.range(10).forEach(n => db[n] = []);
   
   for (let i = 0; i < lbl.length; i++) {
      const DIM = 28*28;
      const buf = [];
      for( const v of img.slice(i*DIM, (i+1)*DIM).values() ) buf.push(v);
      db[lbl[i]].push(buf);
   }
   
   return db;
}

console.log(JSON.stringify(readMnistDB()[0][0]))