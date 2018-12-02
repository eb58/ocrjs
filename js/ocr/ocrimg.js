module.exports = function ebocrimg(imgdata, w, h) {
   const _ = require('underscore');
   const BLACK = 1;
   const WHITE = 0;

   const inrange = function (r, c) {
      return r >= 0 && c >= 0 && r < h && c < w;
   };

   const size = function () {
      return w * h;
   };

   const getPix = function (c, r) {
      return imgdata[c + r * w];
   };

   const setPix = function (c, r, val) {
      imgdata[c + r * w] = val;
   };



   const dump = function (opts) {
      opts = opts || {values: false};
      const res = [];
      const image = imgdata.img ? imgdata.img : imgdata;
      for (i = 0; i < h; i++) {
         const line = [...image.slice(i * w, (i + 1) * w)];
         const val = res.push(line.map(x => x ? (opts.values ? ('   ' + x).substr(-3) : '*') : (opts.values ? '   ' : ' ')));
      }
      console.log(`(h,w)=(${h},${w})`);
      res.map(line => console.log([...line].join(' ')));
      return this;
   };

   const scaleDown = function (h2, w2) {
      const rh = h2 / h;
      const rw = w2 / w;

      let scaledImgData = _.range(h2 * w2).map(() => 0);
      for (let r = 0; r < h; r++) {
         let sr = Math.floor(r * rh) * w2;
         let rr = w * r;
         for (let c = 0; c < w; c++) {
            if (imgdata[c + rr]) {
               scaledImgData[Math.floor(sr + c * rw)]++;
            }
         }
      }

      const MM = Math.max(1, h * w / (h2 * w2));
      const NN = 128;

      for (let n = 0; n < h2 * w2; n++) {
         if (scaledImgData[n]) {
            scaledImgData[n] = Math.floor(scaledImgData[n] * NN / MM);
         }
      }

      return ebocrimg(scaledImgData, w2, h2);
   };

   const scaleUp = function (h2, w2) {
      let scaledImgData = _.range(h2 * w2).map(() => 0);

      const rh = h / h2;
      const rw = w / w2;

      for (let r = 0; r < h2; r++) {
         const rr = r * w2;
         for (let c = 0; c < w2; c++) {
            scaledImgData[c + rr] = imgdata[Math.floor(c * rw) + w * Math.floor(r * rh)] ? 1 : 0;
         }
      }
      return ebocrimg(scaledImgData, w2, h2);
   };

   const cropglyph = function () {
      const coord = (idx, w) => ({r: Math.floor(idx / w), c: idx % w});
      let [minr, minc, maxr, maxc] = [h - 1, w - 1, 0, 0];
      imgdata.forEach((x, idx) => {
         if (x) {
            const  c = coord(idx, w);
            maxc = c.c > maxc ? c.c : maxc;
            minc = c.c < minc ? c.c : minc;
            maxr = c.r > maxr ? c.r : maxr;
            minr = c.r < minr ? c.r : minr;
         }
      });
      const [nh, nw] = [maxr - minr + 1, maxc - minc + 1];
      const img = Array(nh * nw);
      for (let r = 0; r < nh; r++) {
         const rr1 = r * nw;
         const rr2 = (minr + r) * w
         for (let c = 0; c < nw; c++) {
            img[rr1 + c] = imgdata[rr2 + minc + c];
         }
      }
      return ebocrimg(img, nw, nh);
   };

   invert = function () {
      imgdata = imgdata.map(x => x === WHITE ? BLACK : WHITE);
   };

   isInverted = function () {
      return imgdata.reduce((acc, pix) => acc + (pix === BLACK), 0) > w * h / 2;
   };

   adjustBW = function () {
      isInverted() && invert();
      return this;
   };

   const despeckle = function (N) {
      despeckle2 = function (COLOR) {  // Flecken <= N Pixel werden entfernt
         const N = 2;
         for (let r = 1; r < h - 1; r++) {
            const rr = r * w;
            for (let c = 1; c < w - 1; c++) {
               if (imgdata[rr + c] !== COLOR)
                  continue;
               let cnt = 0;
               for (let i = -1; i <= 1; i++) {
                  for (let  j = -1; j <= 1; j++) {
                     if (imgdata[(r + i) * w + c + j] === COLOR) {
                        cnt++;
                     }
                  }
               }
               if (cnt <= N) {
                  imgdata[rr + c] =  COLOR === BLACK ? WHITE : BLACK;
               }
            }
         }
      };
      despeckle2(BLACK, N);
      despeckle2(WHITE, N);
      return this;
   };

   const getImgdata = function () {
      return imgdata;
   };

   // ######################

   const box = function (val) {  // Berechne umschreibendes Rechteck von Glyph
      let  [rmin, rmax, cmin, cmax] = [h - 1, 0, w - 1, 0];
      for (let r = 0; r < h; r++) {
         const rr = r * w;
         for (let  c = 0; c < w; c++) {
            if (imgdata[c + rr] === val) {
               rmin = r < rmin ? r : rmin;
               rmax = r > rmax ? r : rmax;
               cmin = c < cmin ? c : cmin;
               cmax = c > cmax ? c : cmax;
            }
         }
      }
      return {y: cmin, x: rmin, h: cmax - cmin, w: rmax - rmin};
   };

   const cntarea = function (rmin, rmax, cmin, cmax, val) {   // Count the number of pixels having value 'val' in RECT
      const rdr = Math.floor(h / 10); // ~15
      const rdc = Math.floor(w / 10); // ~10
      const stepr = Math.floor(h / 7);
      const stepc = Math.floor(w / 10);
      rmin = rmin - stepr;
      cmin = cmin - stepc;
      rmax = rmax + stepr;
      cmax = cmax + stepc;
      let cnt = 0;
      const ra = Math.max(rdr, rmin);
      const ca = Math.max(rdc, cmin);
      const re = Math.min(rmax, h - rdr);
      const ce = Math.min(cmax, w - rdc);
      for (let  r = ra; r < re; r++) {
         const  rr = r * w;
         for (let c = ca; c < ce; c++) {
            if (imgdata[c + rr] === val) {
               cnt++;
            }
         }
      }
      return cnt;
   }

   const cntarea2 = function (r, val) { // Count the number of pixels having value 'val' in r!
      return cntarea(r.x, r.x + r.h, r.y, r.y + r.w, val);
   }

   const remark = function (v1, v2) { // Change all pixels with value v1 to value v2.
      imgdata = imgdata.map(x => x === v1 ? v2 : x);
   }


   const mark8 = function mark8(r, c, val, cnt) {
      if (!inrange(r, c) || getPix(c, r) !== BLACK || cnt.n > 3000) { // // >3000 to avoid Stack Overflow
         return;
      }

      setPix(c, r, val);

      cnt.n++;

      mark8(r + 1, c + 1, val, cnt);
      mark8(r + 1, c + 0, val, cnt);
      mark8(r + 1, c - 1, val, cnt);
      mark8(r + 0, c + 1, val, cnt);
      mark8(r + 0, c - 1, val, cnt);
      mark8(r - 1, c + 1, val, cnt);
      mark8(r - 1, c + 0, val, cnt);
      mark8(r - 1, c - 1, val, cnt);
   };

   const region8 = function (val) {  // Locate a black region and mark it with val. 8-connected
      for (let r = 0; r < h; r++) {
         const rr = r * w;
         for (let  c = 0; c < w; c++) {
            if (imgdata[c + rr] === BLACK) {
               const cnt = {n: 0};
               mark8(r, c, val, cnt);
               return cnt.n;
            }
         }
      }
      return 0;
   };

   const extglyph = function () { // Extract a glyph
      const GLYPHPART_MINSIZE = 3;
      let  [max, na, cntparts] = [0, 0, 0];

      // Find biggest region
      while ((na = region8(9)) > 0) {
         if (na <= GLYPHPART_MINSIZE) {
            remark(9, 0); // So kleine Flecken werden ignoriert!
         } else {
            cntparts++;
            if (na > max) {
               if (max > 0) {
                  remark(10, 11);
               }
               max = na;
               remark(9, 10);
            } else {
               remark(9, 11);
            }
         }
      }

      if (cntparts === 1) {
         remark(10, BLACK);
         return;
      }

      let cnt = max;
      remark(11, BLACK);
      while ((na = region8(9)) > 0) {
         if (na > max / 6) {
            cnt += na;
            remark(9, 10);
         } else {
            let rec = box(10);
            const  n = cntarea2(rec, 9);
            if (cntparts > 2 && n > GLYPHPART_MINSIZE) {
               cnt += na;
               remark(9, 10);
            } else {
               remark(9, 12);
            }
         }
      }
      let q = cnt / size();
      if (q < 0.005) {
         return null; // das kann kein Zeichen sein!
      }
      remark(10, BLACK);
      remark(12, WHITE);
      return this;
   };


   return {
      dump,
      scaleDown,
      scaleUp,
      adjustBW,
      despeckle,
      cropglyph,
      extglyph,
      getImgdata
   };
};
