module.exports = ebocrimg = (imgdata, w, h) => {
  const BLACK = 1;
  const WHITE = 0;

  const size = () => w * h;
  const range = n => [...Array(n).keys()];
  const inrange = (r, c) => r >= 0 && c >= 0 && r < h && c < w;
  const coord = idx => ({ r: Math.floor(idx / w), c: idx % w });
  const getPix = (c, r) => imgdata[c + r * w];
  const setPix = (c, r, val) => (imgdata[c + r * w] = val);
  const adjustBW = () => (isInverted() && invert(), api);
  const inrect = (rect, r, c) => r >= rect.rmin && r < rect.rmax && c >= rect.cmin && c < rect.cmax;
  const remark = (v1, v2) => imgdata = imgdata.map(pix => pix === v1 ? v2 : pix);
  const invert = () => (imgdata = imgdata.map(pix => BLACK - pix),api);
  // const isInverted = () => imgdata.filter((_, idx) => idx % 23 === 0).reduce((acc, pix) => acc + (pix === BLACK), 0) > imagedata.length / 23 / 2
  const frompng = png => ebocrimg(png.data.map((x, idx) => png.data[4 * idx] > 128), png.width, png.height);

  const isInverted = () => {
    let cnt = 0;
    const sz = size();
    for (let i = 0; i < sz; i += 23) cnt += (imgdata[i] === BLACK);
    return cnt > sz / 23 / 2;
  };


  const dump = opts => {
    opts = opts || { values: false };
    const imgarr = imgdata; //.img ? imgdata.img : imgdata;
    console.log(`(h,w)=(${h},${w})`);
    for (let r = 0; r < h; r++) {
      let line = '';
      for (let c = 0; c < w; c++) {
        const x = imgarr[r * w + c];
        line += x ? (opts.values ? ('     ' + x).substr(-5) : '*') : opts.values ? '     ' : ' ';
      }
      console.log(r, line);
    }
    return api;
  };

  const scaleUp =  (nh, nw) => {
    const scaledImgData = range(nh * nw).map(() => 0);
    const rh = h / nh;
    const rw = w / nw;
    for (let r = 0; r < nh; r++) {
      const rr = r * nw;
      for (let c = 0; c < nw; c++) {
        scaledImgData[c + rr] = imgdata[Math.floor(c * rw) + w * Math.floor(r * rh)] ? 1 : 0;
      }
    }
    return ebocrimg(scaledImgData, nw, nh);
  };

  const scaleDown = (nh, nw) => {
    const [rh, rw, nsz] = [nh / h, nw / w, nh * nw];
    const scaledImgData = range(nsz).map(() => 0);
    for (let r = 0; r < h; r++) {
      let sr = Math.floor(r * rh) * nw;
      const rr = w * r;
      for (let c = 0; c < w; c++) {
        if (imgdata[c + rr]) {
          scaledImgData[Math.floor(sr + c * rw)]++;
        }
      }
    }
    const factor = (nh / h) * (nw / w);
    const newImgdata  = scaledImgData.map(pix => Math.floor(pix * factor * 1000));
    return ebocrimg(newImgdata, nw, nh);
  };

  const computeHalfstepImage = (nh, nw) => {
    const [nh2, nw2] = [nh + 1, nw + 1];
    const tmpImage = scaleDown(nh2, nw2);
    // tmpImage.dump({values: true});
    const tdata = tmpImage.imgdata;

    const img = range(nh * nw).map(() => 0);
    for (let r = 0; r < nh; r++) {
      for (let c = 0; c < nw; c++) {
        img[r * nw + c] =
          tdata[(r + 0) * nw2 + (c + 0)] +
          tdata[(r + 1) * nw2 + (c + 0)] +
          tdata[(r + 0) * nw2 + (c + 1)] +
          tdata[(r + 1) * nw2 + (c + 1)];
      }
    }
    return ebocrimg(img, nw, nh);
  };

  const cropGlyph = function () {
    const rect = box(BLACK);
    const [nh, nw] = [rect.rmax - rect.rmin + 1, rect.cmax - rect.cmin + 1];

    const img = Array(nh * nw);
    for (let r = 0; r < nh; r++) {
      const rr1 = r * nw;
      const rr2 = (rect.rmin + r) * w;
      for (let c = 0; c < nw; c++) {
        img[rr1 + c] = imgdata[rr2 + rect.cmin + c];
      }
    }
    return ebocrimg(img, nw, nh);
  };

  const despeckle = function () {
    const despeckle2 = COLOR => {
      // Flecken <= N Pixel werden entfernt
      const N = 2;
      for (let r = 1; r < h - 1; r++) {
        const rr = r * w;
        for (let c = 1; c < w - 1; c++) {
          if (imgdata[rr + c] !== COLOR) continue;
          let cnt = 0;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (imgdata[(r + i) * w + c + j] === COLOR) {
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

  const box = val => {
    // Berechne umschreibendes Rechteck von Glyph
    let [rmin, rmax, cmin, cmax] = [h - 1, 0, w - 1, 0];
    for (let r = 0; r < h; r++) {
      const rr = r * w;
      for (let c = 0; c < w; c++) {
        if (imgdata[c + rr] === val) {
          rmin = r < rmin ? r : rmin;
          rmax = r > rmax ? r : rmax;
          cmin = c < cmin ? c : cmin;
          cmax = c > cmax ? c : cmax;
        }
      }
    }
    return { rmin, rmax, cmin, cmax };
  };

  const expandbox = rect => {
    const marginr = Math.floor(h / 15);
    const marginc = Math.floor(w / 15);
    return {
      rmin: Math.max(rect.rmin - marginr, 0),
      rmax: Math.min(rect.rmax + marginr, h),
      cmin: Math.max(rect.cmin - marginc, 0),
      cmax: Math.min(rect.cmax + marginc, w)
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

  const mark8 = (r, c, val) => {
    if (!inrange(r, c) || getPix(c, r) !== BLACK) {
      return 0;
    }

    setPix(c, r, val);
    return (
      1 +
      mark8(r + 1, c + 1, val) +
      mark8(r + 1, c + 0, val) +
      mark8(r + 1, c - 1, val) +
      mark8(r + 0, c + 1, val) +
      mark8(r + 0, c - 1, val) +
      mark8(r - 1, c + 1, val) +
      mark8(r - 1, c + 0, val) +
      mark8(r - 1, c - 1, val)
    );
  };

  const region8 = (rect, val) => {
    // Locate a black region and mark it with val. 8-connected
    for (let i = 0; i < size(); i++) {
      if (imgdata[i] === BLACK) {
        const x = coord(i);
        if (inrect(rect, x.r, x.c)) {
          return mark8(x.r, x.c, val);
        }
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

    if (parts.length === 1) {
      remark(parts[0].mark, BLACK);
      return api;
    }

    const totalcnt = parts.reduce((acc, part) => acc + part.cnt_area, 0);

    parts.forEach(part => {
      if (part.cnt_area > totalcnt / parts.length / 2) {
        remark(part.mark, 10);
      }
    });

    const rect = expandbox(box(10));

    parts.forEach(part => remark(part.mark, cntarea(rect, part.mark) > 0 ? 10 : 0));

    remark(10, BLACK);
    return api;
  };

  const api = {
    frompng,
    despeckle,
    invert,
    adjustBW,
    cropGlyph,
    extractGlyph,
    scaleUp,
    scaleDown,
    computeHalfstepImage,
    dump,
    getPix,
    imgdata,
  };

  return api;
};
