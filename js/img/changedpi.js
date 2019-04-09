module.exports = function () {

   const headers = {
      PNG: [137, 80, 78, 71, 13, 10, 26, 10],
      JPG: [0xFF, 0xD8, 0xFF],
      pHYs:  [9, 112, 72, 89, 115] // 9 + 'pHYs', 9 at pHYs[0] being length of Data      
   };

   const matchHeader = (data, hdr, offSet) => hdr.every((v, i) => v === data[i + (offSet || 0)]);

   const calcCrc = (() => {

      const  pngDataTable = function () { // Table of CRCs of all 8-bit messages.
         const crcTable = new Int32Array(256);
         for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
               c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            }
            crcTable[n] = c;
         }
         return crcTable;
      }();


      const calc = buf => {
         let c = -1;
         for (let n = 0; n < buf.length; n++) {
            c = pngDataTable[(c ^ buf[n]) & 0xFF] ^ (c >>> 8);
         }
         return c ^ -1;
      };

      return calc;
   })();


   function changeDpiJpg(data, dpi) {
      data[13] = 1; // 1: pixel per inch /  2: pixel per cm
      data[14] = dpi >> 8; // dpiX high byte
      data[15] = dpi & 0xff; // dpiX low byte
      data[16] = dpi >> 8; // dpiY high byte
      data[17] = dpi & 0xff; // dpiY low byte
      return data;
   }


   function changeDpiPng(data, dpi) {

      function searchStartOfPhys(data) {
         for (let i = 0, len = data.length - 5; i < len; i++) {
            if (matchHeader(data, headers.pHYs, i))
               return i + 1;
         }
      }

      const startingIndex = searchStartOfPhys(data);
      if (!startingIndex) {
         console.log('No Phys!');
         return data;
      }

      dpi *= 39.3701; // this multiplication is because the standard is dpi per meter.
      const physChunk = [112, 72, 89, 115, // pHYs
         dpi >>> 24, dpi >>> 16, dpi >>> 8, dpi & 0xff, // dpiX
         dpi >>> 24, dpi >>> 16, dpi >>> 8, dpi & 0xff, // dpiY
         1  // dot per meter....
      ];
      
      const crc = calcCrc(physChunk);
      const crcChunk = [crc >>> 24, crc >>> 16, crc >>> 8, crc & 0xff];
      
      data.set(physChunk, startingIndex);
      data.set(crcChunk, startingIndex + physChunk.length); 
      
      return data;
   }

   function detectFormat(data) {

      if (matchHeader(data, headers.PNG))
         return 'png';

      if (matchHeader(data, headers.JPG) && String.fromCodePoint(data.slice(6, 10) === 'JFIF'))
         return 'jpg';

      if (matchHeader(data, headers.JPG) && String.fromCodePoint(data.slice(6, 10) === 'Exif'))
         return 'jpg';

      console.log("<<<<< unknown format >>>>> ");

      return 'unknown';
   }

   function changeDpi(data, dpi) {
      const changers = {
         'jpg': changeDpiJpg,
         'png': changeDpiPng,
         'unknown': data => data
      };
      const format = detectFormat(data);
      return changers[format](data, dpi);
   }

   return {
      changeDpi
   };
}();
