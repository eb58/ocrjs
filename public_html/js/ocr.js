const ocr = (db) => {

   const nDigits = Object.keys(db).length;

   const sqr = x => x * x;

   const distance = (v1, v2, minDist) => {
      let res = 0;
      for (let i = 0; i < v1.length; i++) {
         res += sqr(v1[i] - v2[i]);
         if (res >= 3 * minDist)
            break;
      }
      return res;
   };

   const updateResult = (res, digit, dist) => {
      if (dist >= res.secbest.dist)
         return;

      if (dist < res.best.dist) {
         if (digit === res.best.digit)
            res.best.dist = dist;
         else {
            res.secbest.digit = res.best.digit;
            res.secbest.dist = res.best.dist;
            res.best.digit = digit;
            res.best.dist = dist;
         }
      } else if (digit !== res.best.digit) {
         res.secbest.dist = dist;
         res.secbest.digit = digit;
      }
   }

   const findNearestDigit = (v) => {
      const res = {
         best: {digit: -1, dist: 10000000},
         secbest: {digit: -1, dist: 10000000}
      };

      for (let digit = 0; digit < nDigits; digit++) {
         const dbi = db[digit];
         for (let j = 0; j < dbi.length; j++) {
            updateResult(res, digit, distance(v, dbi[j], res.best.dist));
         }
      }
      return res;
   };

   const dumpDigit = (v) => {
      const dimY = v.length === 24 ? 6 : 8;
      const dimX = v.length === 24 ? 4 : 6;
      const res = [];
      for (let i = 0; i < dimY; i++) {
         res.push(v.slice(i * dimX, (i + 1) * dimX).map(n => n ? ' O ' : '   ').join(''));
      }
      return res;
   };

   return {
      dumpDigit,
      findNearestDigit
   };

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocr;
}
