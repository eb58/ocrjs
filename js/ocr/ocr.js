const ocr = db => {
   const _ = require('underscore');

   const sqr = x => x * x;
   const abs = x => x > 0 ? x : -x;

   const distance = f => {
      return (v1, v2, minDist) => {
         let res = 0;
         for (let i = 0; i < v1.length; i++) {
            res += f(v1[i] - v2[i]);
            if (res >= 3 * minDist)
               break;
         }
         return res;
      };
   };

   const findNearestDigit = (v, distfct) => {
      let mindist = Number.MAX_SAFE_INTEGER;
      const res = _.range(10).map((n) => ({digit: n, dist: mindist}));

      _.range(10).forEach(digit => {
         digit = Number(digit);
         const dbi = db[digit];
         for (let j = 0; j < dbi.length; j++) {
            const dist = distfct(v, dbi[j].img, mindist);
            mindist = dist < mindist ? dist : mindist;
            if (dist < res[digit].dist) {
               res[digit].dist = dist;
               res[digit].img = dbi[j].img;
               res[digit].name = dbi[j].name;
            }
         }
      });
      res.sort((a, b) => a.dist - b.dist);
      return res.slice(0, 2);
   };

   const findNearestDigitSqrDist = v => findNearestDigit(v, distance(sqr));
   const findNearestDigitAbsDist = v => findNearestDigit(v, distance(abs));

   return {
      findNearestDigitSqrDist,
      findNearestDigitAbsDist
   };

};

if (typeof module === "object" && typeof module.exports === "object") {
   module.exports = ocr;
}
