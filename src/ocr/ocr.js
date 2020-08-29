const ocr = (db, distfct) => {
  const range = n => [...Array(n).keys()];
  const sqr = x => x * x;
  const vdist = distfct || ((v1, v2) => v1.reduce((d, _, i) => d + sqr(v1[i] - v2[i]), 0));

  const findNearestDigit = v => {
    const res = range(10)
      .map(n => ({ digit: n, dist: Number.MAX_SAFE_INTEGER }))
      .map(x => db[x.digit].reduce((acc, dbi) => {
        const dist = vdist(v, dbi.imgvec);
        if (dist < x.dist) {
          x.dist = dist;
          acc = {
            digit: x.digit,
            dist,
            ...dbi
          };
        }
        return acc;
      }, {})
      );
    res.sort((a, b) => a.dist - b.dist);
    return res.slice(0, 3);
  };

  return {
    findNearestDigit
  };
};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ocr;
}
