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
      vector.push([getRandomInt(0, 100)]);
   }

   return [m, v];
}

const x = genData();

const matrix = x[0];
const vector = x[1];

//console.log('Matrix:', matrix, 'Vector:',  vector);

function multiply(row, vector) {
   let result = 0;
   for (let i = 0; i < row.length; i++) {
      result += row[i] * vector[i][0];
   }
   return result;
}

const start = Date.now();

const result = [];

for (let i = 0; i < size; i++) {
   const x = multiply(matrix[i], vector);
   result.push([x]);
}

const end = Date.now();
console.log('Result:', result, 'Runtime: ' + (end - start) + 'ms');

