/**
 * Generates PNG icons for PWA from the SVG source.
 * Runs automatically before build: npm run build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { deflateSync, crc32 } from 'zlib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// CRC32 table for PNG chunk integrity
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function calcCRC(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(calcCRC(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createColorPNG(size, bgR, bgG, bgB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = chunk('IHDR', Buffer.from([
    0, 0, (size >> 8) & 0xff, size & 0xff,
    0, 0, (size >> 8) & 0xff, size & 0xff,
    8, 2, 0, 0, 0
  ]));

  // Fill with blue gradient (top=light, bottom=dark)
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter none
    const factor = 1 - (y / size) * 0.25;
    const r = Math.round(bgR * factor);
    const g = Math.round(bgG * factor);
    const b = Math.round(bgB * factor);

    // Rounded rect mask
    const radius = size * 0.16;
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      const inCorner =
        (px < radius && py < radius && Math.hypot(px - radius, py - radius) > radius) ||
        (px > size - radius && py < radius && Math.hypot(px - (size - radius), py - radius) > radius) ||
        (px < radius && py > size - radius && Math.hypot(px - radius, py - (size - radius)) > radius) ||
        (px > size - radius && py > size - radius && Math.hypot(px - (size - radius), py - (size - radius)) > radius);

      if (inCorner) {
        row[1 + x * 3] = 255;
        row[1 + x * 3 + 1] = 255;
        row[1 + x * 3 + 2] = 255;
      } else {
        // Add "NC" text area (simple pixel font approximation)
        const cx = size / 2, cy = size * 0.78;
        const tw = size * 0.45, th = size * 0.13;
        const inText = Math.abs(px - cx) < tw && Math.abs(py - cy) < th;
        if (inText) {
          row[1 + x * 3] = 255;
          row[1 + x * 3 + 1] = 255;
          row[1 + x * 3 + 2] = 255;
        } else {
          row[1 + x * 3] = r;
          row[1 + x * 3 + 1] = g;
          row[1 + x * 3 + 2] = b;
        }
      }
    }
    rawRows.push(row);
  }

  const raw = Buffer.concat(rawRows);
  const compressed = deflateSync(raw, { level: 9 });
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = join(publicDir, 'icons');
mkdirSync(iconsDir, { recursive: true });

for (const size of sizes) {
  const png = createColorPNG(size, 37, 99, 235); // blue-600
  writeFileSync(join(iconsDir, `icon-${size}x${size}.png`), png);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Apple touch icon (180x180)
const apple = createColorPNG(180, 37, 99, 235);
writeFileSync(join(publicDir, 'apple-touch-icon.png'), apple);
console.log('✓ apple-touch-icon.png');

console.log('\n✅ PWA icons generated successfully.');
