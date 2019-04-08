const btoa = require('btoa');
const atob = require('atob');
const fs = require('fs');
const Jimp = require('jimp');
const changeDpiBlob = require("changeDpi").changeDpiBlob;

const FileReader = function () {};
FileReader.prototype.readAsArrayBuffer = function (buffer) {
   this.result = buffer;
   this.onload();
};

const Blob = function (arrays, options) {
   const a = Buffer.from(arrays[0]);
   const b = Buffer.from(arrays[1]);
   const newbuff = Buffer.concat([a, b]);
   newbuff.type = options.type;
   return newbuff;
};

global.Blob = Blob;
global.FileReader = FileReader;
global.btoa = btoa;
global.atob = atob;

Jimp.read('/tmp/2.png', (err, img) => {
   if (err)
      throw err;

   img.resize(500, Jimp.AUTO)
           .getBufferAsync(Jimp.AUTO)
           .then(a => {
              a.type = 'image/png';
              changeDpiBlob(a, 200)
                      .then(b => fs.writeFileSync('/tmp/200.png', b));
           });
});

//const blob = fs.readFileSync('/tmp/small-bw1.jpg');
//console.log(blob, blob.length);
//blob.type = 'image/jpeg';
//changeDpiBlob(blob, 456).then((b) => {
//   console.log(b);
//   fs.writeFileSync('/tmp/small-bw2.jpg', b);
//});
//});