const createImage = (imgdata = [], w = 0, h = 0) => {
  const BLACK = 1;
  const WHITE = 0;

  const size = () => w * h;
  const getPix = (c, r) => imgdata[c + r * w];
  const adjustBW = () => (isInverted() && invert(), api);
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

  const cropTo = (rect) => {
    if (!rect) return createImage([WHITE], 1, 1);
    const [nh, nw] = [rect.rmax - rect.rmin + 1, rect.cmax - rect.cmin + 1];
    const newImgdata = Array(nh * nw);
    for (let r = 0; r < nh; r++) {
      const rr1 = r * nw;
      const rr2 = (rect.rmin + r) * w;
      for (let c = 0; c < nw; c++) newImgdata[rr1 + c] = imgdata[rr2 + rect.cmin + c];
    }
    return createImage(newImgdata, nw, nh);
  };
  const cropGlyph = () => cropTo(box(BLACK));
  const cropGlyphInner = () => cropTo(innerbox());

  const despeckle = (N = 3) => {
    const despeckle2 = (COLOR) => {
      // Flecken <= N Pixel werden entfernt - auch auf der Bildkante, wo Nachbarn
      // ausserhalb des Bildes einfach nicht mitzaehlen (statt die Kante ganz
      // auszusparen: ein Fleck exakt auf der letzten Zeile/Spalte war sonst
      // unantastbar und konnte cropGlyph()'s Rechteck unbemerkt aufblaehen).
      for (let r = 0; r < h; r++) {
        const rr = r * w;
        pixels: for (let c = 0; c < w; c++) {
          if (imgdata[rr + c] !== COLOR) continue;
          let cnt = 0;
          for (let i = -1; i <= 1; i++) {
            const nr = r + i;
            if (nr < 0 || nr >= h) continue;
            const rri = nr * w;
            for (let j = -1; j <= 1; j++) {
              const nc = c + j;
              if (nc < 0 || nc >= w) continue;
              if (imgdata[rri + nc] === COLOR) {
                cnt++;
                if (cnt > N) continue pixels;
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
    // rect.rmax/cmax from box() are inclusive; the scan in extractGlyph() consumes them as an
    // exclusive upper bound, so +1 before adding the margin.
    const marginr = Math.floor(h / 15);
    const marginc = Math.floor(w / 15);
    return {
      rmin: Math.max(rect.rmin - marginr, 0),
      rmax: Math.min(rect.rmax + 1 + marginr, h),
      cmin: Math.max(rect.cmin - marginc, 0),
      cmax: Math.min(rect.cmax + 1 + marginc, w),
    };
  };

  // Nummeriert alle 8-zusammenhaengenden schwarzen Teile in einer eigenen Label-Map (die
  // Bildpixel bleiben dabei unberuehrt) und liefert Flaeche und Umschreibungsrechteck je Teil.
  // Iterativ statt rekursiv: vermeidet Stack-Overflow bei grossen Flecken.
  const labelParts = () => {
    const labels = new Int32Array(w * h);
    const parts = [];
    for (let start = 0; start < w * h; start++) {
      if (imgdata[start] !== BLACK || labels[start]) continue;
      const label = parts.length + 1;
      const [r0, c0] = [Math.floor(start / w), start % w];
      const part = { label, area: 0, rect: { rmin: r0, rmax: r0, cmin: c0, cmax: c0 } };
      const stack = [start];
      labels[start] = label;
      while (stack.length) {
        const idx = stack.pop();
        const [r, c] = [Math.floor(idx / w), idx % w];
        const { rect } = part;
        part.area++;
        rect.rmin = Math.min(rect.rmin, r);
        rect.rmax = Math.max(rect.rmax, r);
        rect.cmin = Math.min(rect.cmin, c);
        rect.cmax = Math.max(rect.cmax, c);
        for (let nr = Math.max(0, r - 1); nr <= Math.min(h - 1, r + 1); nr++) {
          for (let nc = Math.max(0, c - 1); nc <= Math.min(w - 1, c + 1); nc++) {
            const n = nr * w + nc;
            if (imgdata[n] === BLACK && !labels[n]) ((labels[n] = label), stack.push(n));
          }
        }
      }
      parts.push(part);
    }
    return { labels, parts };
  };

  // Ein Durchlauf: schwarze Pixel bleiben nur stehen, wenn ihr Teil in `kept` liegt.
  const keepParts = (labels, kept) => {
    const keep = new Uint8Array(labels.length + 1);
    kept.forEach((part) => (keep[part.label] = 1));
    for (let i = 0; i < labels.length; i++) if (labels[i]) imgdata[i] = keep[labels[i]] ? BLACK : WHITE;
    return api;
  };

  const GLYPHPART_MINSIZE = 3; // kleinere Teile werden immer getilgt
  const significantParts = () => {
    const { labels, parts } = labelParts();
    return { labels, parts: parts.filter((part) => part.area > GLYPHPART_MINSIZE) };
  };
  const biggestPart = (parts) =>
    parts.reduce((current, part) => (!current || part.area > current.area ? part : current), undefined);
  const unionRect = (rects) =>
    rects.reduce((a, b) => ({
      rmin: Math.min(a.rmin, b.rmin),
      rmax: Math.max(a.rmax, b.rmax),
      cmin: Math.min(a.cmin, b.cmin),
      cmax: Math.max(a.cmax, b.cmax),
    }));
  const gap = (a, b) => Math.max(0, a.rmin - b.rmax, b.rmin - a.rmax, a.cmin - b.cmax, b.cmin - a.cmax);

  // Behaelt die grossen Teile (ueber der halben Durchschnittsflaeche) und alle Teile, die
  // mit mindestens einem Pixel in deren um einen Rand erweitertes Rechteck hineinragen.
  const extractGlyph = () => {
    const { labels, parts } = significantParts();
    if (parts.length <= 1) return keepParts(labels, parts);
    const totalcnt = parts.reduce((acc, part) => acc + part.area, 0);
    const big = parts.filter((part) => part.area > totalcnt / parts.length / 2);
    const rect = expandbox(unionRect(big.map((part) => part.rect)));
    const significant = new Set(parts.map((part) => part.label));
    const inside = new Set();
    for (let r = rect.rmin; r < rect.rmax; r++) {
      for (let c = rect.cmin; c < rect.cmax; c++) {
        const label = labels[r * w + c];
        if (significant.has(label)) inside.add(label);
      }
    }
    return keepParts(
      labels,
      parts.filter((part) => inside.has(part.label)),
    );
  };

  // Verwirft Teile, die weiter als maxGap (Chebyshev-Abstand der Umschreibungsrechtecke)
  // vom groessten Teil entfernt liegen - unabhaengig von ihrer eigenen Groesse. Anders als
  // extractGlyph() (Groesse ODER Position im margenerweiterten Rechteck) zaehlt hier nur
  // der tatsaechliche Abstand zum Hauptstrich.
  const extractGlyphFarFromBiggest = (maxGap) => {
    const { labels, parts } = significantParts();
    const biggest = biggestPart(parts);
    return keepParts(
      labels,
      parts.filter((part) => gap(biggest.rect, part.rect) <= maxGap),
    );
  };

  const extractBiggestGlyph = () => {
    const { labels, parts } = labelParts();
    return keepParts(labels, parts.length ? [biggestPart(parts)] : []);
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
    extractGlyphFarFromBiggest,
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
