#!/usr/bin/env node
// Makes a batch of every puzzle at every setting and checks, with a plain
// brute-force search that knows nothing about the generators, that each one
// has exactly one solution and that it matches the stored one. Also checks
// the service worker precaches files that exist.
//
//   node tools/check.mjs [puzzles per setting, default 6]

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { make, GAMES } from '../web/js/puzzles/index.js';

const WEB = fileURLToPath(new URL('../web/', import.meta.url));
const COUNT = Number(process.argv[2]) || 6;
const problems = [];
const fail = (msg) => problems.push(msg);

// ---- brute force, one per rule set -------------------------------------

function countSudoku(givens, limit = 2) {
  const g = givens.map((v) => (v < 0 ? 0 : v));
  let found = 0;
  const ok = (i, d) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    for (let k = 0; k < 9; k++) if (g[r * 9 + k] === d || g[k * 9 + c] === d) return false;
    const r0 = r - (r % 3);
    const c0 = c - (c % 3);
    for (let k = 0; k < 9; k++) if (g[(r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3)] === d) return false;
    return true;
  };
  const go = () => {
    const i = g.indexOf(0);
    if (i < 0) return ++found >= limit;
    for (let d = 1; d <= 9; d++) {
      if (!ok(i, d)) continue;
      g[i] = d;
      if (go()) return true;
      g[i] = 0;
    }
    return false;
  };
  go();
  return found;
}

function countBinairo(givens, n, limit = 2) {
  // Depth first, filling in only what "no three in a row" and "half each"
  // force outright before every guess.
  const lines = [];
  for (let a = 0; a < n; a++) {
    lines.push(Array.from({ length: n }, (_, b) => a * n + b));
    lines.push(Array.from({ length: n }, (_, b) => b * n + a));
  }
  let found = 0;
  const settle = (g) => {
    for (let changed = true; changed; ) {
      changed = false;
      for (const line of lines) {
        let z = 0;
        let o = 0;
        for (let k = 0; k < n; k++) {
          const v = g[line[k]];
          if (v === 0) z++;
          else if (v === 1) o++;
          if (k >= 2 && v >= 0 && v === g[line[k - 1]] && v === g[line[k - 2]]) return false;
        }
        if (z > n / 2 || o > n / 2) return false;
        for (let k = 0; k < n; k++) {
          if (g[line[k]] >= 0) continue;
          const near = [
            [k - 2, k - 1],
            [k - 1, k + 1],
            [k + 1, k + 2],
          ];
          for (const [a, b] of near) {
            if (a < 0 || b >= n) continue;
            const v = g[line[a]];
            if (v >= 0 && v === g[line[b]]) {
              g[line[k]] = 1 - v;
              changed = true;
              break;
            }
          }
          if (g[line[k]] < 0 && (z === n / 2 || o === n / 2)) {
            g[line[k]] = z === n / 2 ? 1 : 0;
            changed = true;
          }
        }
      }
    }
    return true;
  };
  const go = (g) => {
    if (!settle(g)) return false;
    const i = g.indexOf(-1);
    if (i < 0) {
      for (const start of [0, 1]) {
        const seen = new Set();
        for (let k = start; k < lines.length; k += 2) seen.add(lines[k].map((c) => g[c]).join(''));
        if (seen.size !== n) return false;
      }
      return ++found >= limit;
    }
    for (const v of [0, 1]) {
      const next = g.slice();
      next[i] = v;
      if (go(next)) return true;
    }
    return false;
  };
  go(givens.slice());
  return found;
}

function countTectonic(givens, w, h, region, limit = 2) {
  const g = givens.map((v) => (v < 0 ? 0 : v));
  const size = [];
  region.forEach((id) => (size[id] = (size[id] || 0) + 1));
  let found = 0;
  const ok = (i, v) => {
    const x = i % w;
    const y = Math.floor(i / w);
    for (let j = 0; j < g.length; j++) if (j !== i && region[j] === region[i] && g[j] === v) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h && g[ny * w + nx] === v) return false;
      }
    }
    return true;
  };
  const go = () => {
    const i = g.indexOf(0);
    if (i < 0) return ++found >= limit;
    for (let v = 1; v <= size[region[i]]; v++) {
      if (!ok(i, v)) continue;
      g[i] = v;
      if (go()) return true;
      g[i] = 0;
    }
    g[i] = 0;
    return false;
  };
  go();
  return found;
}

// ---- the batch --------------------------------------------------------

for (const [game, def] of Object.entries(GAMES)) {
  for (const level of def.levels) {
    for (const size of def.sizes || [null]) {
      const times = [];
      const givens = [];
      for (let k = 0; k < COUNT; k++) {
        const seed = 1000 + k * 7919 + (size || 0);
        const t0 = performance.now();
        const p = make(game, { level, size }, seed);
        times.push(performance.now() - t0);
        const where = `${game} ${level}${size ? ` ${size}` : ''} #${seed}`;
        const again = make(game, { level, size }, seed);
        if (JSON.stringify(again.givens) !== JSON.stringify(p.givens)) fail(`${where}: same number, different puzzle`);
        for (let i = 0; i < p.givens.length; i++) {
          if (p.givens[i] >= 0 && p.givens[i] !== p.solution[i]) fail(`${where}: a given disagrees with the solution`);
        }
        const n =
          game === 'sudoku'
            ? countSudoku(p.givens)
            : game === 'binairo'
              ? countBinairo(p.givens, p.w)
              : countTectonic(p.givens, p.w, p.h, p.region);
        if (n !== 1) fail(`${where}: ${n} solutions`);
        givens.push(p.givens.filter((v) => v >= 0).length);
      }
      const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
      console.log(
        `${game.padEnd(9)} ${level.padEnd(7)} ${String(size || '').padEnd(3)} ` +
          `clues ${avg(givens).toFixed(1).padStart(5)}  ` +
          `avg ${avg(times).toFixed(0).padStart(5)} ms  max ${Math.max(...times).toFixed(0).padStart(5)} ms`,
      );
    }
  }
}

// ---- the service worker's shell -----------------------------------------

const sw = readFileSync(WEB + 'sw.js', 'utf8');
const shell = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shell) fail('sw.js: could not find SHELL');
for (const [, path] of shell ? shell[1].matchAll(/'([^']+)'/g) : []) {
  if (path === './') continue;
  if (!existsSync(WEB + path.replace(/^\.\//, ''))) fail(`sw.js precaches ${path}, which does not exist`);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log('✓ every puzzle has exactly one solution; service worker shell complete');
