#!/usr/bin/env node
/**
 * Writes src/assets/grain.png: a 128x128 seamless paper-grain tile (brown ink, alpha noise).
 * A tiled PNG is far cheaper to paint than an feTurbulence SVG background, which the browser
 * has to re-rasterise for every tile. Run once: node scripts/make-grain.mjs
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const N = 128;
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const raw = Array.from({ length: N * N }, rnd);
// Two octaves: per-pixel speckle plus a softer 3x3 wrap-around blur, so the tile is seamless.
const at = (x, y) => raw[((y + N) % N) * N + ((x + N) % N)];
const alpha = new Float32Array(N * N);
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at(x + dx, y + dy);
    alpha[y * N + x] = 0.55 * at(x, y) + 0.45 * (s / 9);
  }
const rows = [];
for (let y = 0; y < N; y++) {
  const row = Buffer.alloc(1 + N * 4);
  for (let x = 0; x < N; x++) {
    const a = Math.max(0, Math.min(1, (alpha[y * N + x] - 0.25) * 1.4)) * 0.5;
    row.set([77, 56, 26, Math.round(a * 255)], 1 + x * 4);
  }
  rows.push(row);
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr.set([8, 6, 0, 0, 0], 8);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'grain.png');
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
