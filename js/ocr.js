const ocr = db => {
   
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
   };

   const updateResult = (res, digit, idxmnist, dist) => {
      if (dist < res.best.dist) {
         res.secbest = Object.assign({}, res.best);
         res.best = {digit, dist, idxmnist};
      } else if (dist < res.secbest.dist) {
         res.secbest = {digit, dist, idxmnist};
      }
   };

   const findNearestDigit = (v, distfct) => {
      const res = {
         best: {digit: -1, dist: 10000000, idxmmist: -1},
         secbest: {digit: -1, dist: 10000000, idxmmist: -1}
      };

      Object.keys(db).forEach(digit => {
         digit = Number(digit);
         const dbi = db[digit];
         for (let j = 0; j < dbi.length; j++) {
            updateResult(res, digit, dbi[j].idxmnist, distfct(v.img, dbi[j].img, res.best.dist));
         }
      })
      return res;
   };
   
   const findNearestDigitSqrDist = v => findNearestDigit(v, distFcts.squaredDistance);
   const findNearestDigitAbsDist = v => findNearestDigit(v, distFcts.absDistance);

   return {
      findNearestDigitSqrDist,
      findNearestDigitAbsDist
   };

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocr;
}
