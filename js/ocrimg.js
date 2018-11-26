module.exports = (function () {
   const _ = require('underscore');

   let img;
   let h;
   let w;

   const init = function (img, h, w ) {
      this.img = img;
      this.h = h;
      this.w = w;
      return this;
   };

   const initFromPNGImage = function (image) {
      let [img, w, h] = [[], image.getWidth(), image.getHeight()];
      for (let r = 0; r < w * h; r++) {
         img.push(255 - image.getGrayScaleAtIndex(r));
      }
      this.img = img;
      this.h = h;
      this.w = w;
      return this;
   };

   const dump = function () {
      const res = [];
      const img = this.img.img ? this.img.img : this.img;
      for (i = 0; i < this.h; i++) {
         const line = [...img.slice(i * this.w, (i + 1) * this.w)];
         const val = res.push(line.map(x => x ? ('   ' + x).substr(-3) : '   '));
         //const val = res.push(line.map(x => x ? '**' : '  '));
      }
      console.log(`(h,w)=(${this.h},${this.w})`);
      res.map(line => console.log([...line].join(' ')));
      return this;
   };

   const scaleDown = function (h2, w2) {
      const rh =  h2/this.h;
      const rw =  w2/this.w;

      let scaledImgData = _.range(h2 * w2).map(() => 0);
      for (let r = 0; r < this.h; r++) {
         let sr = Math.floor(r * rh )* w2;
         let rr = this.w * r;
         for (let c = 0; c < this.w; c++) {
            if (this.img[c + rr] > 10) {
               scaledImgData[Math.floor(sr + c * rw)]++;
            }
         }
      }

      const MM = Math.max(1, this.h * this.w / (h2*w2));
      const NN = 128;
      for (let n = 0; n < h2*w2; n++)
         if (scaledImgData[n] )
            scaledImgData[n] = Math.floor(scaledImgData[n] * NN / MM);
      //scaledImgData = scaledImgData.map((x, idx) => nimg[idx] === 0 ? x : Math.floor(x / nimg[idx]/2));
      this.h = h2;
      this.w = w2;
      this.img = scaledImgData;
      return this;
   };

   const scaleUp = function (h2, w2) {
      let scaledImgData = _.range(h2 * w2).map(() => 0);

      const rh = this.h / h2;
      const rw = this.w / w2;

      for (let r = 0; r < h2; r++) {
         const rr = r*w2;
         for (let c = 0; c < w2; c++) {
            scaledImgData[c + rr] = this.img[Math.floor(c * rw) + this.w * Math.floor(r * rh)] ? 1 : 0;
         }
      }
      this.h = h2;
      this.w = w2;
      this.img = scaledImgData;
      return this;

   };

   const cropGlyph = function () {
      const coord = (idx, w) => ({r: Math.floor(idx / w), c: idx % w});
      let [minr, minc, maxr, maxc] = [this.h - 1, this.w - 1, 0, 0];
      this.img.forEach((x, idx) => {
         if (x>100) {
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

   const getImageArray = function () {
      return this.img;
   };

   return {
      init,
      initFromPNGImage,
      dump,
      scaleDown,
      scaleUp,
      cropGlyph,
      getImageArray
   };

})();
