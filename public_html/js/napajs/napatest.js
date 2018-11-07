const napa = require('napajs');
const NUMBER_OF_WORKERS = 4;
const zone = napa.zone.create('zone', {workers: NUMBER_OF_WORKERS});
let size;
if (process.argv[2]) {
   size = parseInt(process.argv[2]);
   if (size !== size) {
      console.log('size should be an integer');
      process.exit(1);
   }
} else {
   console.log('size should be provided');
   process.exit(1);
}

function getRandomInt(min, max) {
   return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genData() {
   const m = [];
   for (let i = 0; i < size; i++) {
      m.push([]);
      for (let j = 0; j < size; j++) {
         m[i].push(getRandomInt(0, 100));
      }
   }

   const v = [];
   for (let i = 0; i < size; i++) {
      v.push(getRandomInt(0, 100));
   }

   return [m, v];
}

const [matrix,vector] = genData();

//console.log('Matrix:', matrix, 'Vector:',  vector);

function multiply(row, vector) {
   let result = 0;
   for (let i = 0; i < row.length; i++) {
      result += row[i] * vector[i];
   }
   return result;
}

const start = Date.now();

const result = [];

for (let i = 0; i < size; i++) {
   const x = multiply(matrix[i], vector);
   result.push(x);
}

const end = Date.now();
//console.log( 'Result1:', result, 'Runtime: ' + (end - start) + 'ms');
console.log( 'Runtime: ' + (end - start) + 'ms');


var promises = [];

for (let i = 0; i < size; i++) {
   promises[i] = zone.execute(multiply, [matrix[i], vector]);
}

Promise.all(promises).then((results) => {
   const result = results.map(res => parseInt(res._payload));
   const end = Date.now();
   console.log( 'Runtime: ' + (end - start) + 'ms');
});
