module.exports = function ebocrimg(imgdata, w, h) {
   const _ = require("underscore");

   const BLACK = 1;
   const WHITE = 0;

   const size = () => w * h;
   const inrange = (r, c) => r >= 0 && c >= 0 && r < h && c < w;
   const coord = idx => ({r: Math.floor(idx / w), c: idx % w});
   const getPix = (c, r) => imgdata[c + r * w];
   const setPix = (c, r, val) => (imgdata[c + r * w] = val);
   const isInverted = () => imgdata.reduce((acc, pix) => acc + (pix === BLACK), 0) > size() / 2;
   const remark = (v1, v2) => (imgdata = imgdata.map(x => (x === v1 ? v2 : x)));
   const invert = () => (imgdata = imgdata.map(x => (x === WHITE ? BLACK : WHITE)));
   const adjustBW = () => (isInverted() && invert(), api);

   const frompng = function (png) {
      let [img, w, h, sz] = [[], png.width, png.height, png.width * png.height];
      for (var x = 0; x < sz * 4; x += 4) {
         img.push(png.data[x] > 128 ? 1 : 0);
      }
      return ebocrimg(img, w, h);
   };


   const dump = opts => {
      opts = opts || {values: false};
      const imgarr = imgdata; //.img ? imgdata.img : imgdata;
      console.log(`(h,w)=(${h},${w})`);
      for (r = 0; r < h; r++) {
         let line = "";
         for (c = 0; c < w; c++) {
            const x = imgarr[r * w + c];
            line += x ? opts.values ? ("   " + x).substr(-3) : "*" : opts.values ? "   " : " ";
         }
         console.log(r, line);
      }
      return api;
   };

   const scaleDown = function (nh, nw) {
      const [rh, rw] = [nh / h, nw / w];
      let scaledImgData = _.range(nh * nw).map(() => 0);
      for (let r = 0; r < h; r++) {
         let sr = Math.floor(r * rh) * nw;
         let rr = w * r;
         for (let c = 0; c < w; c++) {
            if (imgdata[c + rr]) {
               scaledImgData[Math.floor(sr + c * rw)]++;
            }
         }
      }

      const MM = Math.max(1, (h * w) / (nh * nw));
      const NN = 128;
      for (let n = 0; n < nh * nw; n++) {
         if (scaledImgData[n]) {
            scaledImgData[n] = Math.floor((scaledImgData[n] * NN) / MM);
         }
      }

      return ebocrimg(scaledImgData, nw, nh);
   };

   const scaleUp = function (nh, nw) {
      let scaledImgData = _.range(nh * nw).map(() => 0);
      const rh = h / nh;
      const rw = w / nw;
      for (let r = 0; r < nh; r++) {
         const rr = r * nw;
         for (let c = 0; c < nw; c++) {
            scaledImgData[c + rr] = imgdata[ Math.floor(c * rw) + w * Math.floor(r * rh)] ? 1 : 0;
         }
      }
      return ebocrimg(scaledImgData, nw, nh);
   };

   const cropglyph = function () {
      let [minr, minc, maxr, maxc] = [h - 1, w - 1, 0, 0];
      imgdata.forEach((x, idx) => {
         if (x) {
            const c = coord(idx, w);
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
         const rr2 = (minr + r) * w;
         for (let c = 0; c < nw; c++) {
            img[rr1 + c] = imgdata[rr2 + minc + c];
         }
      }
      return ebocrimg(img, nw, nh);
   };

   const despeckle = function () {
      const despeckle2 = COLOR => { // Flecken <= N Pixel werden entfernt
         const N = 2;
         const newImgdata = [...imgdata];
         for (let r = 1; r < h - 1; r++) {
            const rr = r * w;
            for (let c = 1; c < w - 1; c++) {
               if (imgdata[rr + c] !== COLOR)
                  continue;
               let cnt = 0;
               for (let i = -1; i <= 1; i++) {
                  for (let j = -1; j <= 1; j++) {
                     if (imgdata[(r + i) * w + c + j] === COLOR) {
                        cnt++;
                     }
                  }
               }
               if (cnt <= N) {
                  newImgdata[rr + c] = COLOR === BLACK ? WHITE : BLACK;
               }
            }
         }
         imgdata = newImgdata;
      };
      despeckle2(BLACK);
      despeckle2(WHITE);
      return api;
   };
   // ######################

   const box = val => { // Berechne umschreibendes Rechteck von Glyph
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
      return {rmin, rmax, cmin, cmax};
   };

   const expandbox = rect => {
      const randr = Math.floor(h / 15);
      const randc = Math.floor(w / 15);
      return {
         rmin: Math.max(rect.rmin - randr, 0),
         rmax: Math.min(rect.rmax + randr, h),
         cmin: Math.max(rect.cmin - randc, 0),
         cmax: Math.min(rect.cmax + randc, w)
      };
   };

   const inrect = (rect, r, c) => {
      return r >= rect.rmin && r < rect.rmax && c >= rect.cmin && c < rect.cmax;
   };

   const cntarea = (rect, val) => { // Count the number of pixels having value 'val' in RECT
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
      return 1
              + mark8(r + 1, c + 1, val)
              + mark8(r + 1, c + 0, val)
              + mark8(r + 1, c - 1, val)
              + mark8(r + 0, c + 1, val)
              + mark8(r + 0, c - 1, val)
              + mark8(r - 1, c + 1, val)
              + mark8(r - 1, c + 0, val)
              + mark8(r - 1, c - 1, val);
   };

   const region8 = (rect, val) => {     // Locate a black region and mark it with val. 8-connected
      for (let i = 0; i < size(); i++) {
         const x = coord(i);
         if (imgdata[i] === BLACK ){
            const x = coord(i);
            if( inrect(rect, x.r, x.c ))  {
               return mark8(x.r, x.c, val);
            }
         }
      }
      return 0;
   };

   const extglyph = () => {      // Extract a glyph

      const GLYPHPART_MINSIZE = 3;
      const irect = {rmin: 0, rmax: h, cmin: 0, cmax: w};
      const parts = [];

      let cnt_area = 0;
      let mark = 15;

      while ((cnt_area = region8(irect, 9)) > 0) { 
         if (cnt_area <= GLYPHPART_MINSIZE) {
            remark(9, WHITE); // So kleine Flecken werden getilgt!
         } else {
            remark(9, mark);
            parts.push({cnt_area, mark});
            mark++;
         }
      }

      if (parts.length === 1) {
         remark(10, BLACK);
         return api;
      }

      let totalcnt = parts.reduce((acc, part) => acc + part.cnt_area, 0);

      parts.forEach(part => {
         if (part.cnt_area > totalcnt / parts.length / 2) {
            remark(part.mark, 10);
         }
      });

      const rect = expandbox(box(10));

      parts.forEach(part => {
         const cnt = cntarea(rect,part.mark);
         remark(part.mark, cnt > 0 ? 10 : 0);
      });

      remark(10, BLACK);
      return api;
   };

   const api = {
      despeckle,
      adjustBW,
      cropglyph,
      extglyph,
      scaleDown,
      scaleUp,
      imgdata,
      dump,
      frompng
   };

   return api;
};