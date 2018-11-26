const fs = require('fs');
const _ = require('underscore');

const convertOldDb2Json = function (name, dimr, dimc) {
   const db = {dimr, dimc};

   _.range(10).forEach(n => {

      const content = fs.readFileSync('./data/ebdb/' + name + '/' + n + '.db', 'utf8');

      db[n] = content
              .split('\n') // split into lines
              .filter(line => line.length > 0) // filter empty lines 
              .map(line => { 
                 return { img: line.trim().replace(/[ ]+/g, ',').split(',').map(n => Number(n)), idxmnist:0 }; 
               }); // make array from string 

   });

   fs.writeFileSync('./data/dbjs/db' + name + '.js', 'module.exports =  ' + JSON.stringify(db));

};

convertOldDb2Json('m6x4');
convertOldDb2Json('m8x6');
convertOldDb2Json('verify6x4');
convertOldDb2Json('verify8x6');
