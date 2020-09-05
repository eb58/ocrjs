module.exports = (() => {
  const headers = {
    PNG: [137, 80, 78, 71, 13, 10, 26, 10],
    JPG: [0xff, 0xd8, 0xff],
    pHYs: [112, 72, 89, 115],
    IDAT: [73, 68, 65, 84]
  };

  const matchHeader = (data, hdr, offSet) => hdr.every((v, i) => v === data[i + offSet]);

  const changeDpiJpg = (data, dpi) => {
    data[13] = 1; // 1: pixel per inch /  2: pixel per cm
    data[14] = dpi >> 8; // dpiX high byte
    data[15] = dpi & 0xff; // dpiX low byte
    data[16] = dpi >> 8; // dpiY high byte
    data[17] = dpi & 0xff; // dpiY low byte
    return data;
  };

  const changeDpiPng = (data, dpi) => {
    const calcCrc = (() => {
      const pngDataTable = (() => {
        // Table of CRCs of all 8-bit messages.
        const crcTable = Array(256);
        for (let n = 0; n < 256; n++) {
          let c = n;
          for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
          }
          crcTable[n] = c;
        }
        return crcTable;
      })();

      return buf => {
        let c = -1;
        for (let n = 0; n < buf.length; n++) {
          c = pngDataTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
        }
        return c ^ -1;
      };
    })();

    const searchStartOf= (data, header) => {
      for (let i = 0, len = data.length - 5; i < len; i++) {
        if (matchHeader(data, header, i)) return i;
      }
    }

    const dpm = (dpi * 100.0) / 2.54; //  dpi per meter.
    const physChunk = [
      112,
      72,
      89,
      115, // 'pHYs'
      dpm >>> 24,
      dpm >>> 16,
      dpm >>> 8,
      dpm & 0xff, // dpmX
      dpm >>> 24,
      dpm >>> 16,
      dpm >>> 8,
      dpm & 0xff, // dpmY
      1 // unit is the meter
    ];

    const crc = calcCrc(physChunk);
    const crcChunk = [crc >>> 24, crc >>> 16, crc >>> 8, crc & 0xff];

    const startingIndexOfPhys = searchStartOf(data, headers.pHYs);
    if (!startingIndexOfPhys) {
      const sizeArray = [0, 0, 0, 9]; // size of pHYs chunk
      const lenOfSizeArr = sizeArray.length;
      const startingIndexOfIDAT = searchStartOf(data, headers.IDAT) - lenOfSizeArr; // 4 Byte for size of IDAT

      const newData = Buffer.concat([data, Buffer.alloc(lenOfSizeArr + physChunk.length + crcChunk.length)]);
      const oldData = data.slice(startingIndexOfIDAT);

      newData.set(sizeArray, startingIndexOfIDAT);
      newData.set(physChunk, startingIndexOfIDAT + lenOfSizeArr);
      newData.set(crcChunk, startingIndexOfIDAT + lenOfSizeArr + physChunk.length);
      newData.set(oldData, startingIndexOfIDAT + lenOfSizeArr + physChunk.length + crcChunk.length);
      return newData;
    } else {
      data.set(physChunk, startingIndexOfPhys);
      data.set(crcChunk, startingIndexOfPhys + physChunk.length);
    }

    return data;
  };

  const detectFormat = data => {
    if (matchHeader(data, headers.PNG, 0)) return 'png';
    if (matchHeader(data, headers.JPG, 0)) return 'jpg';
    return 'unknown';
  };

  return (data, dpi) => {
    const changers = {
      jpg: changeDpiJpg,
      png: changeDpiPng,
      unknown: data => data
    };
    const format = detectFormat(data);
    return changers[format](data, dpi);
  };
})();