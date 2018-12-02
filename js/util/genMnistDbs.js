const fs = require('fs');

const ocrmnistdb = require("./ocrmnistdb");

const myocrmnistdbtrain = ocrmnistdb('train');
const myocrmnistdbt10k = ocrmnistdb('t10k');

function generateDBsForMnist(dimr, dimc) {
   const dimstr = `${dimr}x${dimc}`;
   console.log('generateDBs', dimstr);
   fs.writeFileSync(`data/dbjs/ebdb-mnist-train-${dimstr}.js`, 'module.exports = ' + JSON.stringify(myocrmnistdbtrain.generateDBFromMnist(dimr, dimc)));
   fs.writeFileSync(`data/dbjs/ebdb-mnist-test-${dimstr}.js`, ' module.exports = ' + JSON.stringify(myocrmnistdbt10k.generateDBFromMnist(dimr, dimc)));
}

generateDBsForMnist(6, 4);
generateDBsForMnist(7, 5);
generateDBsForMnist(8, 6);

