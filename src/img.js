const createImage = (imgdata = [], w = 0, h = 0) => {
  const BLACK = 1;
  const WHITE = 0;

  const size = () => w * h;
  const inrange = (r, c) => r >= 0 && c >= 0 && r < h && c < w;
  const getPix = (c, r) => imgdata[c + r * w];
  const setPix = (c, r, val) => (imgdata[c + r * w] = val);
  const adjustBW = () => (isInverted() && invert(), api);
  const remark = (v1, v2) => imgdata.forEach((pix, idx) => pix === v1 && (imgdata[idx] = v2));
  const invert = () => (imgdata.forEach((pix, idx) => (imgdata[idx] = BLACK - pix)), api);
  const frompng = (png) => {
    const n = png.width * png.height;
    const data = new Array(n);
    for (let idx = 0; idx < n; idx++) data[idx] = png.data[4 * idx] > 128 ? 1 : 0;
    return createImage(data, png.width, png.height);
  };
  const isInverted = () => {
    const n = Math.floor(size() / 13);
    let cnt = 0;
    for (let idx = 0; idx < n; idx++) if (imgdata[idx * 13] === BLACK) cnt++;
    return cnt > size() / 26;
  };

  const dump = (showValues) => {
    console.log(`(h,w)=(${h},${w})`);
    for (let r = 0; r < h; r++) {
      let line = '';
      for (let c = 0; c < w; c++) {
        const x = imgdata[r * w + c];
        line += x ? (showValues ? ('     ' + x).substr(-5) : '*') : showValues ? '     ' : ' ';
      }
      console.log(r, line);
    }
    return api;
  };

  const scaleUp = (nh, nw) => {
    const scaledImgData = new Array(nh * nw).fill(0);
    const rh = h / nh;
    const rw = w / nw;
    for (let r = 0; r < nh; r++) {
      const rr = r * nw;
      for (let c = 0; c < nw; c++) {
        scaledImgData[c + rr] = imgdata[Math.floor(c * rw) + w * Math.floor(r * rh)] ? 1 : 0;
      }
    }
    return createImage(scaledImgData, nw, nh);
  };

  const scaleDown = (nh, nw) => {
    const [rh, rw, nsz] = [nh / h, nw / w, nh * nw];
    const scaledImgData = new Array(nsz).fill(0);
    for (let r = 0; r < h; r++) {
      let sr = Math.floor(r * rh) * nw;
      const rr = w * r;
      for (let c = 0; c < w; c++) {
        if (imgdata[c + rr]) {
          scaledImgData[Math.floor(sr + c * rw)]++;
        }
      }
    }
    const normFactor = 100 * (nh / h) * (nw / w);
    const newImgdata = scaledImgData.map((pix) => Math.floor(pix * normFactor));
    return createImage(newImgdata, nw, nh);
  };

  const createImageWithMargin = () => {
    const MAXRATIO = 4;
    const ratio = w / h;
    if (ratio < MAXRATIO && ratio > 1 / MAXRATIO) return api;

    const [nw, nh] = ratio >= MAXRATIO ? [w, Math.ceil((w * 8) / 6)] : [Math.ceil((h * 6) / 8), h];
    const [offsetC, offsetR] = [Math.floor((nw - w) / 2), Math.floor((nh - h) / 2)];
    const newImgdata = Array(nw * nh).fill(WHITE);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        newImgdata[offsetC + c + (offsetR + r) * nw] = getPix(c, r);
      }
    }
    return createImage(newImgdata, nw, nh);
  };

  const cropGlyph = () => {
    const rect = box(BLACK);
    if (!rect) return createImage([WHITE], 1, 1);
    const [nh, nw] = [rect.rmax - rect.rmin + 1, rect.cmax - rect.cmin + 1];

    const newImgdata = Array(nh * nw);
    for (let r = 0; r < nh; r++) {
      const rr1 = r * nw;
      const rr2 = (rect.rmin + r) * w;
      for (let c = 0; c < nw; c++) {
        newImgdata[rr1 + c] = imgdata[rr2 + rect.cmin + c];
      }
    }
    return createImage(newImgdata, nw, nh);
  };
  const cropGlyphInner = () => {
    const rect = innerbox(BLACK);
    if (!rect) return createImage([WHITE], 1, 1);
    const [nh, nw] = [rect.rmax - rect.rmin + 1, rect.cmax - rect.cmin + 1];

    const newImgdata = Array(nh * nw);
    for (let r = 0; r < nh; r++) {
      const rr1 = r * nw;
      const rr2 = (rect.rmin + r) * w;
      for (let c = 0; c < nw; c++) {
        newImgdata[rr1 + c] = imgdata[rr2 + rect.cmin + c];
      }
    }
    return createImage(newImgdata, nw, nh);
  };

  const despeckle = (N) => {
    N = N || 3;
    const despeckle2 = (COLOR) => {
      // Flecken <= N Pixel werden entfernt
      for (let r = 1; r < h - 1; r++) {
        const rr = r * w;
        for (let c = 1; c < w - 1; c++) {
          if (imgdata[rr + c] !== COLOR) continue;
          let cnt = 0;
          for (let i = -1; i <= 1; i++) {
            const rri = (r + i) * w + c;
            for (let j = -1; j <= 1; j++) {
              if (imgdata[rri + j] === COLOR) {
                cnt++;
              }
            }
          }
          if (cnt <= N) {
            imgdata[rr + c] = COLOR === BLACK ? WHITE : BLACK;
          }
        }
      }
    };
    despeckle2(BLACK);
    despeckle2(WHITE);
    return api;
  };
  // ######################

  const box = (val) => {
    // Berechne umschreibendes Rechteck von Glyph
    let [rmin, rmax, cmin, cmax] = [h - 1, 0, w - 1, 0];
    let found = false;
    for (let r = 0; r < h; r++) {
      const rr = r * w;
      for (let c = 0; c < w; c++) {
        if (imgdata[c + rr] === val) {
          found = true;
          rmin = r < rmin ? r : rmin;
          rmax = r > rmax ? r : rmax;
          cmin = c < cmin ? c : cmin;
          cmax = c > cmax ? c : cmax;
        }
      }
    }
    return found ? { rmin, rmax, cmin, cmax } : undefined;
  };
  const innerbox = () => {
    const findInRow = (r) => {
      const rr = r * w;
      let foundInRow = false;
      for (let c = 0; c < w && !foundInRow; c++) {
        if (imgdata[c + rr] === BLACK) foundInRow = true;
      }
      return foundInRow;
    };
    const findInCol = (c) => {
      let foundInCol = false;
      for (let r = 0; r < h && !foundInCol; r++) {
        if (imgdata[r * w + c] === BLACK) foundInCol = true;
      }
      return foundInCol;
    };
    const [hm, wm] = [Math.floor(h / 2), Math.floor(w / 2)];
    let [rmin, rmax, cmin, cmax] = [hm, hm, wm, wm];

    let foundInRow = true;
    for (let r = hm; r >= 0 && foundInRow; r--) {
      foundInRow = findInRow(r);
      rmin = foundInRow ? r : rmin;
    }
    foundInRow = true;
    for (let r = hm; r < h && foundInRow; r++) {
      foundInRow = findInRow(r);
      rmax = foundInRow ? r : rmax;
    }
    let foundInCol = true;
    for (let c = wm; c >= 0 && foundInCol; c--) {
      foundInCol = findInCol(c);
      cmin = foundInCol ? c : cmin;
    }
    foundInCol = true;
    for (let c = wm; c < w && foundInCol; c++) {
      foundInCol = findInCol(c);
      cmax = foundInCol ? c : cmax;
    }
    return box(BLACK) ? { rmin, rmax, cmin, cmax } : undefined;
  };

  const expandbox = (rect) => {
    const marginr = Math.floor(h / 15);
    const marginc = Math.floor(w / 15);
    return {
      rmin: Math.max(rect.rmin - marginr, 0),
      rmax: Math.min(rect.rmax + marginr, h),
      cmin: Math.max(rect.cmin - marginc, 0),
      cmax: Math.min(rect.cmax + marginc, w),
    };
  };

  const cntarea = (rect, val) => {
    // Count the number of pixels having value 'val' in RECT
    let cnt = 0;
    for (let r = rect.rmin; r < rect.rmax; r++) {
      const rr = r * w;
      for (let c = rect.cmin; c < rect.cmax; c++) {
        cnt += imgdata[c + rr] === val ? 1 : 0;
      }
    }
    return cnt;
  };

  const mark8 = (startR, startC, val) => {
    // Iterativ statt rekursiv: vermeidet Stack-Overflow bei großen Flecken
    if (!inrange(startR, startC) || getPix(startC, startR) !== BLACK) return 0;
    const stack = [[startR, startC]];
    setPix(startC, startR, val);
    let cnt = 0;
    while (stack.length) {
      const [r, c] = stack.pop();
      cnt++;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          const [nr, nc] = [r + i, c + j];
          if (inrange(nr, nc) && getPix(nc, nr) === BLACK) {
            setPix(nc, nr, val);
            stack.push([nr, nc]);
          }
        }
      }
    }
    return cnt;
  };

  const region8 = (rect, val) => {
    // Locate a black region and mark it with val. 8-connected
    for (let r = rect.rmin; r < rect.rmax; r++) {
      const rr = r * w;
      for (let c = rect.cmin; c < rect.cmax; c++) {
        if (imgdata[c + rr] === BLACK) return mark8(r, c, val);
      }
    }
    return 0;
  };

  const extractGlyph = () => {
    const GLYPHPART_MINSIZE = 3;
    const irect = { rmin: 0, rmax: h, cmin: 0, cmax: w };
    const parts = [];

    let cnt_area = 0;
    let mark = 15;

    while ((cnt_area = region8(irect, 9)) > 0) {
      if (cnt_area <= GLYPHPART_MINSIZE) {
        remark(9, WHITE); // So kleine Flecken werden getilgt!
      } else {
        remark(9, mark);
        parts.push({ cnt_area, mark });
        mark++;
      }
    }

    if (parts.length === 0) return api;

    if (parts.length === 1) {
      remark(parts[0].mark, BLACK);
      return api;
    }

    const totalcnt = parts.reduce((acc, part) => acc + part.cnt_area, 0);

    parts.forEach((part) => {
      if (part.cnt_area > totalcnt / parts.length / 2) {
        remark(part.mark, 10);
      }
    });

    const rect = expandbox(box(10));

    parts.forEach((part) => remark(part.mark, cntarea(rect, part.mark) > 0 ? 10 : 0));

    remark(10, BLACK);
    return api;
  };

  const extractBiggestGlyph = () => {
    const irect = { rmin: 0, rmax: h, cmin: 0, cmax: w };
    const parts = [];
    let mark = 2;
    let area = 0;
    while ((area = region8(irect, mark)) > 0) parts.push({ area, mark: mark++ });
    const biggest = parts.reduce((current, part) => (!current || part.area > current.area ? part : current), undefined);
    parts.forEach((part) => remark(part.mark, part === biggest ? BLACK : WHITE));
    return api;
  };

  const prepare = (nh, nw, { cleanGlyph = false } = {}) => {
    adjustBW();
    despeckle();
    if (cleanGlyph) extractGlyph();
    return cropGlyph().scaleDown(nh, nw);
  };

  const api = {
    clone: () => createImage(imgdata.slice(), w, h),
    frompng,
    despeckle,
    isInverted,
    invert,
    adjustBW,
    cropGlyph,
    cropGlyphInner,
    createImageWithMargin,
    extractGlyph,
    extractBiggestGlyph,
    prepare,
    scaleUp,
    scaleDown,
    dump,
    getPix,
    imgdata,
  };

  return api;
};

module.exports = createImage;
