module.exports = (db) => {

    const nDigits = Object.keys(db).length;

    const sqr = x => x * x;

    const squaredDistance = (v1, v2, minDist) => {
        let res = 0;
        for (let i = 0; i < v1.length; i++) {
            res += sqr(v1[i] - v2[i]);
            if (res >= minDist) return res;
        }
        return res;
    };

    const findNearestDigit = (v) => {
        const res = { digit: '?', minDist: 10000000 };
        for (let i = 0; i < nDigits; i++) {
            const dbi = db[i];
            for (let j = 0; j < dbi.length; j++) {
                const dist = squaredDistance(v, dbi[j], res.minDist);
                if (dist < res.minDist) {
                    res.minDist = dist;
                    res.digit = i;
                }
            }
        };
        return res;
    }

    const dumpDigit = (v) => {
        const dimY = v.length == 24 ? 6 : 8;
        const dimX = v.length == 24 ? 4 : 6;
        const res = [];
        for (let i = 0; i < dimY; i++) {
            res.push(v.slice(i * dimX, (i + 1) * dimX).map(n => n == 0 ? '   ' : ' O ').join(''));
        }
        return res;
    }

    return {
        dumpDigit,
        findNearestDigit
    }

}