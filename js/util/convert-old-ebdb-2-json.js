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
               }); 

   });

   fs.writeFileSync('./data/dbjs/db' + name + '.js', 'module.exports =  ' + JSON.stringify(db));

};

convertOldDb2Json('dbm-train-6x4');
convertOldDb2Json('dbm-train-8x6');
convertOldDb2Json('dbm-test-6x4');
convertOldDb2Json('dbm-test-8x6');
