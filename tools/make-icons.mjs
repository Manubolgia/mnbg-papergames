#!/usr/bin/env node
// Draws the app icon: a three by three grid on paper, one cell under the
// highlighter, and Binairo's full and empty squares. Writes PNGs with nothing
// but node's zlib, plus an SVG of the same design.
//
//   node tools/make-icons.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../web/icons/', import.meta.url));
const PAPER = [0xf4, 0xf2, 0xed];
const INK = [0x14, 0x14, 0x14];
const MARK = [0xff, 0xdf, 0x3d];

// The design as rectangles in a 0..1 square, drawn in order.
function shapes(maskable) {
  const s = maskable ? 0.5 : 0.62;
  const o = (1 - s) / 2;
  const c = s / 3;
  const out = [];
  const rect = (x, y, w, h, color) => out.push({ x, y, w, h, color });
  const cell = (i, j) => [o + i * c, o + j * c];
  // Highlighted cell.
  rect(...cell(1, 1), c, c, MARK);
  // Full squares and empty squares.
  const inset = c * 0.24;
  const full = (i, j) => {
    const [x, y] = cell(i, j);
    rect(x + inset, y + inset, c - 2 * inset, c - 2 * inset, INK);
  };
  const empty = (i, j) => {
    const [x, y] = cell(i, j);
    const t = c * 0.09;
    const k = c - 2 * inset;
    rect(x + inset, y + inset, k, t, INK);
    rect(x + inset, y + inset + k - t, k, t, INK);
    rect(x + inset, y + inset, t, k, INK);
    rect(x + inset + k - t, y + inset, t, k, INK);
  };
  full(0, 0);
  empty(2, 0);
  empty(0, 2);
  full(2, 2);
  full(1, 2);
  // Grid lines.
  const thin = s * 0.018;
  for (const k of [1, 2]) {
    rect(o + k * c - thin / 2, o, thin, s, INK);
    rect(o, o + k * c - thin / 2, s, thin, INK);
  }
  const thick = s * 0.055;
  rect(o - thick / 2, o - thick / 2, s + thick, thick, INK);
  rect(o - thick / 2, o + s - thick / 2, s + thick, thick, INK);
  rect(o - thick / 2, o - thick / 2, thick, s + thick, INK);
  rect(o + s - thick / 2, o - thick / 2, thick, s + thick, INK);
  return out;
}

function render(size, maskable) {
  const list = shapes(maskable);
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          let col = PAPER;
          for (const r of list) if (u >= r.x && u < r.x + r.w && v >= r.y && v < r.y + r.h) col = r.color;
          for (let k = 0; k < 3; k++) acc[k] += col[k];
        }
      }
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) px[i + k] = Math.round(acc[k] / (SS * SS));
      px[i + 3] = 255;
    }
  }
  return png(size, size, px);
}

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function svg() {
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const r = (n) => +(n * 64).toFixed(3);
  const body = shapes(false)
    .map((s) => `<rect x="${r(s.x)}" y="${r(s.y)}" width="${r(s.w)}" height="${r(s.h)}" fill="${hex(s.color)}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${hex(PAPER)}"/>${body}</svg>\n`;
}

for (const size of [32, 180, 192, 512]) writeFileSync(`${OUT}icon-${size}.png`, render(size, false));
writeFileSync(`${OUT}icon-maskable-512.png`, render(512, true));
writeFileSync(`${OUT}icon.svg`, svg());
console.log('icons written to web/icons/');
