const fs = require('fs');
const _ = require('underscore');

const genDB = function( name )   {
    const db = {};

    _.range(10).forEach(n => {
       
        const content = fs.readFileSync('./data/DB/' +name +'/' + n + '.db', 'utf8');

        db[n] = content
       .split('\n') // split into lines
       .filter( line => line.length> 0 ) // filter empty lines 
       .map((line) => line.trim().replace(/[ ]+/g, ',').split(',').map(n => Number(n) )); // make array from string 

    });
    
    fs.writeFileSync( './data/dbjs/db' + name + '.js', 'module.exports =  ' + JSON.stringify(db) )
    
}

genDB( 'm6x4' );
genDB( 'm8x6' );
genDB( 'verify6x4' );
genDB( 'verify8x6' );
