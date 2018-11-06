const _ = require('underscore');

const db = require("./data/dbjs/dbm6x4");
const chars2Verify = require("./data/dbjs/dbverify6x4");


_.range(10).forEach(n => {
   console.log(n, "=>" , chars2Verify[n].slice(1));

});

