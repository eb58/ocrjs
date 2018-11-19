const ocr = (db) => {

   const DIMS = {
      24: {rows: 6, cols: 4},
      48: {rows: 8, cols: 6}
   };

   const DIM = DIMS[db[0][0].length]
   const NDIGITS = Object.keys(db).length;

   const sqr = x => x * x;
   const abs = x => x > 0 ? x : -x;

   const distFcts = {
      squaredDistance: (v1, v2, minDist) => {
         let res = 0;
         for (let i = 0; i < v1.length; i++) {
            res += sqr(v1[i] - v2[i]);
            if (res >= 3 * minDist)
               break;
         }
         return res;
      },
      absDistance: (v1, v2, minDist) => {
         let res = 0;
         for (let i = 0; i < v1.length; i++) {
            res += abs(v1[i] - v2[i]);
            if (res >= 3 * minDist)
               break;
         }
         return res;
      }
   }

   const updateResult = (res, digit, dist) => {
      if (dist >= res.secbest.dist)
         return;

      if (dist < res.best.dist) {
         if (digit === res.best.digit) {
            res.best.dist = dist;
         } else {
            res.secbest = res.best;
            res.best = {digit, dist};
         }
      }
      if (digit !== res.best.digit) {
         res.secbest = {digit, dist};
      }
   }


   const findNearestDigit = (v) => {
      const res = {
         best: {digit: -1, dist: 10000000},
         secbest: {digit: -1, dist: 10000000}
      };

      for (let digit = 0; digit < NDIGITS; digit++) {
         const dbi = db[digit];
         for (let j = 0; j < dbi.length; j++) {
            updateResult(res, digit, distFcts.squaredDistance(v, dbi[j], res.best.dist));
         }
      }
      return res;
   };


   return {
      findNearestDigit
   };

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocr;
}
