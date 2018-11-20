module.exports = (function () {
   const _ = require('underscore');

   let img;
   let h;
   let w;

   let init = function (image) {
      let [img, w, h] = [[], image.getWidth(), image.getHeight()];
      for (let r = 0; r < w * h; r++) {
         img.push(255 - image.getGrayScaleAtIndex(r));
      }
      this.img = img;
      this.h = h;
      this.w = w;
      return this;
   };

   let dump = function () {
      const res = [];
      for (i = 0; i < this.h; i++) {
         const line = this.img.slice(i * this.w, (i + 1) * this.w);
         const val = res.push(line.map(x => x ? ('   ' + x).substr(-3) : '   '));
      }
      res.map(line => console.log(line.join(' ')));
      return this;
   };

   let scale = function (h2, w2) {
      const MM = h2 * w2 / this.img.length;
      let ximg = _.range(h2 * w2).map(() => 0);
      let nimg = _.range(h2 * w2).map(() => 0);
      for (let r = 0; r < this.h; r++) {
         let sr = Math.floor(r * h2 / this.h) * w2;
         let rr = this.w * r;
         for (let c = 0; c < this.w; c++) {
            if (this.img[c + rr] > 0) {
               const x = Math.floor(sr + c * w2 / this.w);
               nimg[x] = nimg[x] ? nimg[x] + 1 : 1;
               ximg[x] += this.img[c + rr];
            }
         }
      }
      ximg = ximg.map((x, idx) => nimg[idx] === 0 ? x : Math.floor(x / nimg[idx]));
      this.h = h2;
      this.w = w2;
      this.img = ximg;
      return this;
   };

   cropGlyph = function () {
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
         for (let c = 0; c < nw; c++) {
            img[r * nw + c] = this.img[(minr + r) * this.w + minc + c];
         }
      }
      this.h = nh;
      this.w = nw;
      this.img = img;
      return this;
   };

   return {
      init,
      dump,
      scale,
      cropGlyph,
      getImg: function () {
         return this.img;
      }
   };

})();
