// Generates a proper Windows ICO file using BMP format (not PNG-in-ICO)
// rcedit requires BMP-format ICO — PNG-in-ICO is rejected
// Run: node _gen_icon.js

const fs = require('fs');
const path = require('path');

function buildBMPIcon(size) {
  const w = size, h = size;
  // BMP inside ICO uses BITMAPINFOHEADER (40 bytes)
  // Pixel data is 32-bit BGRA, bottom-up
  // ICO BMPs include an AND mask after the pixel data

  const rowSize = w * 4; // 32-bit BGRA, no padding needed for multiples of 4
  const pixelDataSize = rowSize * h;
  const maskRowSize = Math.ceil(w / 32) * 4; // AND mask, 1-bit per pixel, padded to DWORD
  const maskSize = maskRowSize * h;
  const headerSize = 40;
  const totalSize = headerSize + pixelDataSize + maskSize;

  const buf = Buffer.alloc(totalSize, 0);
  let pos = 0;

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, pos); pos += 4;       // biSize
  buf.writeInt32LE(w, pos); pos += 4;          // biWidth
  buf.writeInt32LE(h * 2, pos); pos += 4;      // biHeight (doubled for ICO — includes mask)
  buf.writeUInt16LE(1, pos); pos += 2;          // biPlanes
  buf.writeUInt16LE(32, pos); pos += 2;         // biBitCount
  buf.writeUInt32LE(0, pos); pos += 4;          // biCompression (BI_RGB)
  buf.writeUInt32LE(pixelDataSize, pos); pos += 4;
  buf.writeInt32LE(0, pos); pos += 4;           // biXPelsPerMeter
  buf.writeInt32LE(0, pos); pos += 4;           // biYPelsPerMeter
  buf.writeUInt32LE(0, pos); pos += 4;          // biClrUsed
  buf.writeUInt32LE(0, pos); pos += 4;          // biClrImportant

  // Pixel data — BMP is bottom-up
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const innerR = w * 0.42;
      const outerR = w * 0.5;

      let r, g, b, a;

      if (dist <= innerR) {
        // Inside circle — teal gradient
        const t = dist / innerR;
        r = Math.round(0x00 + t * 0x00);
        g = Math.round(0xe5 - t * 0x46);
        b = Math.round(0xcc - t * 0x2c);
        a = 255;
      } else if (dist <= outerR) {
        // Anti-alias edge
        const alpha = 1 - (dist - innerR) / (outerR - innerR);
        r = 0x00; g = 0xe5; b = 0xcc;
        a = Math.round(alpha * 255);
      } else {
        // Outside — dark bg
        r = 0x0a; g = 0x0f; b = 0x1e; a = 255;
      }

      // Draw "P" letter
      const lx = x - Math.floor(w * 0.30);
      const ly = y - Math.floor(h * 0.22);
      const sw = Math.max(2, Math.floor(w / 10));
      const sh = Math.floor(h * 0.56);
      const bh = Math.floor(sh * 0.48);
      const bw = Math.floor(w * 0.22);
      const thick = Math.max(1, Math.floor(w / 20));

      const inStem = lx >= 0 && lx < sw && ly >= 0 && ly < sh;
      const inBowlRight = lx >= sw && lx < sw + bw && ly >= 0 && ly < bh;
      const inBowlTop = lx >= 0 && lx < sw + bw && ly >= 0 && ly < thick;
      const inBowlMid = lx >= 0 && lx < sw + bw && ly >= bh - thick && ly < bh;

      if (dist <= innerR && (inStem || inBowlRight || inBowlTop || inBowlMid)) {
        r = 255; g = 255; b = 255; a = 255;
      }

      // Write BGRA
      buf[pos++] = b;
      buf[pos++] = g;
      buf[pos++] = r;
      buf[pos++] = a;
    }
  }

  // AND mask — all zeros (fully opaque, transparency handled by alpha channel)
  // Already zeroed by Buffer.alloc

  return buf;
}

function buildICO(sizes) {
  const bmps = sizes.map(s => buildBMPIcon(s));

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);           // Reserved
  header.writeUInt16LE(1, 2);           // Type: 1 = ICO
  header.writeUInt16LE(sizes.length, 4); // Image count

  // Directory entries: 16 bytes each
  let offset = 6 + sizes.length * 16;
  const dirs = sizes.map((s, i) => {
    const d = Buffer.alloc(16);
    d[0] = s >= 256 ? 0 : s;  // Width (0 = 256)
    d[1] = s >= 256 ? 0 : s;  // Height
    d[2] = 0;                  // Color count (0 = >256 colors)
    d[3] = 0;                  // Reserved
    d.writeUInt16LE(1, 4);     // Planes
    d.writeUInt16LE(32, 6);    // Bit count
    d.writeUInt32LE(bmps[i].length, 8);  // Size of image data
    d.writeUInt32LE(offset, 12);          // Offset of image data
    offset += bmps[i].length;
    return d;
  });

  return Buffer.concat([header, ...dirs, ...bmps]);
}

const outPath = path.join(__dirname, 'electron', 'icon.ico');
const ico = buildICO([16, 32, 48, 256]);
fs.writeFileSync(outPath, ico);
console.log('[OK] Icon written to', outPath, '(' + ico.length + ' bytes)');
