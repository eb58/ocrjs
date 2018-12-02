module.exports = (function () {
   const _ = require('underscore');
   const BLACK = 1;
   const WHITE = 0;

   let img;
   let h;
   let w;

   const init = function (img, h, w) {
      this.img = img;
      this.h = h;
      this.w = w;
      return this;
   };

   const initFromPNGImage = function (image) {
      let [img, w, h, sz ] = [[], image.getWidth(), image.getHeight(), image.getWidth() * image.getHeight()];
      for (let r = 0; r < sz; r++) {
         img.push(image.getGrayScaleAtIndex(r) > 50 ? BLACK : WHITE);
      }
      return this.init(img,h,w);
   };

   const dump = function (opts) {
      opts = opts || {values: false};
      const res = [];
      const image = this.img.img ? this.img.img : this.img;
      for (i = 0; i < this.h; i++) {
         const line = [...image.slice(i * this.w, (i + 1) * this.w)];
         const val = res.push(line.map(x => x ? (opts.values ? ('   ' + x).substr(-3) : '*') : (opts.values ? '   ' : ' ')));
      }
      console.log(`(h,w)=(${this.h},${this.w})`);
      res.map(line => console.log([...line].join(' ')));
      return this;
   };

   const scaleDown = function (h2, w2) {
      const rh = h2 / this.h;
      const rw = w2 / this.w;

      let scaledImgData = _.range(h2 * w2).map(() => 0);
      for (let r = 0; r < this.h; r++) {
         let sr = Math.floor(r * rh) * w2;
         let rr = this.w * r;
         for (let c = 0; c < this.w; c++) {
            if (this.img[c + rr]) {
               scaledImgData[Math.floor(sr + c * rw)]++;
            }
         }
      }

      const MM = Math.max(1, this.h * this.w / (h2 * w2));
      const NN = 128;

      for (let n = 0; n < h2 * w2; n++) {
         if (scaledImgData[n]) {
            scaledImgData[n] = Math.floor(scaledImgData[n] * NN / MM);
         }
      }

      return this.init( scaledImgData, h2, w2);
   };

   const scaleUp = function (h2, w2) {
      let scaledImgData = _.range(h2 * w2).map(() => 0);

      const rh = this.h / h2;
      const rw = this.w / w2;

      for (let r = 0; r < h2; r++) {
         const rr = r * w2;
         for (let c = 0; c < w2; c++) {
            scaledImgData[c + rr] = this.img[Math.floor(c * rw) + this.w * Math.floor(r * rh)] ? 1 : 0;
         }
      }
      return this.init( scaledImgData, h2, w2);
   };

   const cropGlyph = function () {
      const coord = (idx, w) => ({r: Math.floor(idx / w), c: idx % w});
      let [minr, minc, maxr, maxc] = [this.h - 1, this.w - 1, 0, 0];
      this.img.forEach((x, idx) => {
         if (x) {
            const  c = coord(idx, this.w);
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
         const rr2 = (minr + r) * this.w
         for (let c = 0; c < nw; c++) {
            img[rr1 + c] = this.img[rr2 + minc + c];
         }
      }
      return this.init( img, nh, nw);
   };

   invert = function () {
      this.img = this.img.map(x => x === WHITE ? BLACK : WHITE);
      return this;
   };

   isInverted = function () {
      return this.img.reduce((acc, pix) => acc + (pix === BLACK), 0) > this.w * this.h / 2;
   };

   adjustBW = function () {
      return this.isInverted() ? this.invert() : this;
   };

   despeckle = function (N) {  // Flecken <= N Pixel werden entfernt
      N = N || 1;
      N = Math.min(5, N);
      for (let r = 2; r < this.h - 2; r++) {
         const rr = r * this.w;
         for (let c = 2; c < this.w - 2; c++) {
            if (this.img[rr + c] === 0)
               continue;
            let cnt = 0;
            for (let i = -2; i <= 2; i++) {
               for (let  j = -2; j <= 2; j++) {
                  if (this.img[(r + i) * this.w + c + j]  === BLACK ) {
                     cnt++;

                  }
               }
            }
            if (cnt <= N) {
               for (let i = -1; i <= 1; i++) {
                  for (let j = -1; j <= 1; j++) {
                     this.img[(r + i) * this.w + c + j] = 0;
                  }
               }
            }
         }
      }
      return this;
   };

   const getImageArray = function () {
      return this.img;
   };

   return {
      init,
      initFromPNGImage,
      dump,
      scaleDown,
      scaleUp,
      isInverted,
      invert,
      adjustBW,
      despeckle,
      cropGlyph,
      getImageArray
   };

})();
