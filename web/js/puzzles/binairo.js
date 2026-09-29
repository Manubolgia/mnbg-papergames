// Binairo: fill the grid with 0s and 1s. No three of the same side by side,
// every row and column holds as many 0s as 1s, and no two rows (or two
// columns) are the same.
//
// A complete grid is built row by row from every line that is legal on its
// own, then cells are cleared for as long as the solver can still finish.
//
// Tier 1: pairs and gaps (xx. and x.x), and full counts.
// Tier 2: whole-line reasoning: of all the ways a line could still be
//         completed (without copying a finished line), cells that agree in
//         every one are forced.

import { shuffle, range } from './rng.js';

const lineCache = new Map();

// Every legal line of length n, as bit masks (bit k = cell k is a 1).
export function lines(n) {
  if (lineCache.has(n)) return lineCache.get(n);
  const out = [];
  for (let m = 0; m < 1 << n; m++) {
    let ones = 0;
    let ok = true;
    for (let k = 0; k < n; k++) {
      if ((m >> k) & 1) ones++;
      if (k >= 2) {
        const a = (m >> k) & 1;
        if (a === ((m >> (k - 1)) & 1) && a === ((m >> (k - 2)) & 1)) {
          ok = false;
          break;
        }
      }
    }
    if (ok && ones * 2 === n) out.push(m);
  }
  lineCache.set(n, out);
  return out;
}

function full(n, r) {
  const all = lines(n);
  const mask = (1 << n) - 1;
  const half = n / 2;
  for (;;) {
    const rows = [];
    const ones = new Array(n).fill(0);
    let budget = 20000;
    const fill = (row) => {
      if (row === n) {
        const cols = new Set();
        for (let c = 0; c < n; c++) {
          let m = 0;
          for (let k = 0; k < n; k++) m |= ((rows[k] >> c) & 1) << k;
          cols.add(m);
        }
        return cols.size === n;
      }
      for (const p of shuffle(all.slice(), r)) {
        if (--budget < 0) return false;
        if (rows.includes(p)) continue;
        if (row >= 2) {
          const a = rows[row - 1];
          const b = rows[row - 2];
          if (p & a & b || ~p & ~a & ~b & mask) continue;
        }
        let ok = true;
        for (let c = 0; c < n && ok; c++) {
          const o = ones[c] + ((p >> c) & 1);
          if (o > half || row + 1 - o > half) ok = false;
        }
        if (!ok) continue;
        rows.push(p);
        for (let c = 0; c < n; c++) ones[c] += (p >> c) & 1;
        if (fill(row + 1)) return true;
        rows.pop();
        for (let c = 0; c < n; c++) ones[c] -= (p >> c) & 1;
      }
      return false;
    };
    if (fill(0)) {
      const g = [];
      for (const p of rows) for (let c = 0; c < n; c++) g.push((p >> c) & 1);
      return g;
    }
  }
}

// Solve with techniques up to `tier` (grid: -1 empty, 0, 1). Returns the
// hardest tier needed, or 0 when stuck.
export function solve(givens, n, tier) {
  const g = givens.slice();
  const half = n / 2;
  const L = [];
  for (let r = 0; r < n; r++) L.push(range(n).map((c) => r * n + c));
  for (let c = 0; c < n; c++) L.push(range(n).map((r) => r * n + c));
  let hardest = 1;

  const basic = () => {
    let changed = false;
    for (const line of L) {
      for (let k = 0; k + 2 < n; k++) {
        const a = g[line[k]];
        const b = g[line[k + 1]];
        const c = g[line[k + 2]];
        if (a >= 0 && a === b && c < 0) (g[line[k + 2]] = 1 - a), (changed = true);
        else if (b >= 0 && b === c && a < 0) (g[line[k]] = 1 - b), (changed = true);
        else if (a >= 0 && a === c && b < 0) (g[line[k + 1]] = 1 - a), (changed = true);
      }
      let zeros = 0;
      let ones = 0;
      for (const i of line) {
        if (g[i] === 0) zeros++;
        else if (g[i] === 1) ones++;
      }
      if (zeros + ones < n && (zeros === half || ones === half)) {
        const v = zeros === half ? 1 : 0;
        for (const i of line) if (g[i] < 0) g[i] = v;
        changed = true;
      }
    }
    return changed;
  };

  const all = lines(n);
  const whole = () => {
    let changed = false;
    for (let li = 0; li < L.length; li++) {
      const line = L[li];
      let known = 0;
      let value = 0;
      line.forEach((i, k) => {
        if (g[i] >= 0) {
          known |= 1 << k;
          value |= g[i] << k;
        }
      });
      if (known === (1 << n) - 1) continue;
      // Finished lines running the same way can't be repeated.
      const done = new Set();
      const from = li < n ? 0 : n;
      for (let o = from; o < from + n; o++) {
        let m = 0;
        let complete = true;
        L[o].forEach((i, k) => {
          if (g[i] < 0) complete = false;
          else m |= g[i] << k;
        });
        if (complete) done.add(m);
      }
      let and = -1;
      let or = 0;
      for (const p of all) {
        if ((p & known) !== value || done.has(p)) continue;
        and &= p;
        or |= p;
      }
      if (and === -1 && or === 0) return false;
      line.forEach((i, k) => {
        if (g[i] >= 0) return;
        if ((and >> k) & 1) (g[i] = 1), (changed = true);
        else if (!((or >> k) & 1)) (g[i] = 0), (changed = true);
      });
    }
    return changed;
  };

  for (;;) {
    if (!g.includes(-1)) return valid(g, n) ? hardest : 0;
    if (basic()) continue;
    if (tier < 2) return 0;
    if (whole()) {
      hardest = 2;
      continue;
    }
    return 0;
  }
}

function valid(g, n) {
  const rows = new Set();
  const cols = new Set();
  for (let a = 0; a < n; a++) {
    let r = '';
    let c = '';
    for (let b = 0; b < n; b++) {
      r += g[a * n + b];
      c += g[b * n + a];
    }
    rows.add(r);
    cols.add(c);
  }
  return rows.size === n && cols.size === n;
}

export const LEVELS = {
  easy: { tier: 1 },
  hard: { tier: 2, needs: 2 },
};

export function generate({ level = 'easy', size = 8 }, r) {
  const n = size;
  const L = LEVELS[level] || LEVELS.easy;
  let best = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const solution = full(n, r);
    const g = solution.slice();
    for (const i of shuffle(range(n * n), r)) {
      const v = g[i];
      g[i] = -1;
      if (!solve(g, n, L.tier)) g[i] = v;
    }
    best = { givens: g, solution };
    if (!L.needs || solve(g, n, L.tier) >= L.needs) break;
  }
  return { game: 'binairo', w: n, h: n, level, givens: best.givens, solution: best.solution };
}
