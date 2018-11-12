const ocr = (db) => {

   const DIMS = {
      24: {rows: 6, cols: 4},
      48: {rows: 8, cols: 6}
   };

   const DIM = DIMS[db[0][0].length]
   const NDIGITS = Object.keys(db).length;

   const sqr = x => x * x;
   const abs = x => x > 0 ? x : -x;

   const squaredDistance = (v1, v2, minDist) => {
      let res = 0;
      for (let i = 0; i < v1.length; i++) {
         res += sqr(v1[i] - v2[i]);
         if (res >= 3 * minDist)
            break;
      }
      return res;
   };

   const absDistance = (v1, v2, minDist) => {
      let res = 0;
      for (let i = 0; i < v1.length; i++) {
         res += abs(v1[i] - v2[i]);
         if (res >= 3 * minDist)
            break;
      }
      return res;
   };

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

   const computeBasedLocal = (v, r, c) => {
      let minr = Math.max(0, r );
      let minc = Math.max(0, c );
      let maxr = Math.min(DIM.rows, r + 1);
      let maxc = Math.min(DIM.cols, c + 1);

      let sum = 0;
      let cnt = 0;
      for (let r = minr; r < maxr; r++) {
         let rr = r * DIM.cols;
         for (let c = minc; c < maxc; c++) {
            sum += v[rr + c];
            cnt++;
         }
      }
      return sum / cnt;
   };

   const transformDigit = (v) => {
      const res = [];
      for (let r = 0; r < DIM.rows; r++) {
         for (let c = 0; c < DIM.cols; c++) {
            res[ r * DIM.cols + c] = computeBasedLocal(v, r, c);
         }
      }
      return res;
   };

   const dumpDigit = (v) => {

      const res = [];
      for (let r = 0; r < DIM.rows; r++) {
         res.push(v.slice(r * DIM.cols, (r + 1) * DIM.cols).map(n => n ? ' O ' : '   ').join(''));
      }
      return res.join('\n');
   };

   const findNearestDigit = (v) => {
      const res = {
         best: {digit: -1, dist: 10000000},
         secbest: {digit: -1, dist: 10000000}
      };

      for (let digit = 0; digit < NDIGITS; digit++) {
         const dbi = db[digit];
         for (let j = 0; j < dbi.length; j++) {
            updateResult(res, digit, squaredDistance(v, dbi[j], res.best.dist));
         }
      }
      return res;
   };

   const findNearestDigit2 = (v) => {
      const res = {
         best: {digit: -1, dist: 10000000},
         secbest: {digit: -1, dist: 10000000}
      };

      for (let digit = 0; digit < NDIGITS; digit++) {
         const dbi = db[digit];
         for (let j = 0; j < dbi.length; j++) {
            updateResult(res, digit, absDistance(transformDigit(v), transformDigit(dbi[j]), res.best.dist));
         }
      }
      return res;
   };



   return {
      dumpDigit,
      findNearestDigit: findNearestDigit
   };

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocr;
}
