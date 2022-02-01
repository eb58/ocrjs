const fs = require('fs');
const ebdb_train_6x4 = require('../../data/dbjs/train/ebdb-train-6x4');
const ebdb_train_7x5 = require('../../data/dbjs/train/ebdb-train-7x5');
const ebdb_train_8x6 = require('../../data/dbjs/train/ebdb-train-8x6');

const range = n => [...Array(n).keys()];

const genHSDB = (db) => {
    const res = {
        dir: db.dir,
        dimc: db.dimc - 1,
        dimr: db.dimr - 1,
    };

    range(10).forEach(digit => {
        res[digit] = db[digit].map(x => {
            const imgvec = range(res.dimc * res.dimr)
                .map(n => x.imgvec[n] + x.imgvec[n + 1] + x.imgvec[n + db.dimr] + x.imgvec[n + db.dimr + 1])
                .map(n => Math.floor(n / 4));
            return { name: x.name, imgvec }
        })
    })
    return res;
}

fs.writeFileSync(`data/dbjs/train/ebhs-train-5x3.js`, 'module.exports = ' + JSON.stringify(genHSDB(ebdb_train_6x4)));
fs.writeFileSync(`data/dbjs/train/ebhs-train-6x4.js`, 'module.exports = ' + JSON.stringify(genHSDB(ebdb_train_7x5)));
fs.writeFileSync(`data/dbjs/train/ebhs-train-7x5.js`, 'module.exports = ' + JSON.stringify(genHSDB(ebdb_train_8x6)));
fs.writeFileSync(`data/dbjs/train/ebhs-train-8x6.js`, 'module.exports = ' + JSON.stringify(genHSDB(ebdb_train_9x7)));
fs.writeFileSync(`data/dbjs/train/ebhs-train-10x7.js`, 'module.exports = ' + JSON.stringify(genHSDB(ebdb_train_11x8)));