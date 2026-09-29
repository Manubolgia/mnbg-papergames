// Sudoku: fill a random complete grid, then take digits away one pair at a
// time for as long as a solver using human techniques can still finish it.
// The solver only ever makes forced deductions, so reaching the end also
// proves the solution is unique.
//
// Tier 1: naked and hidden singles.
// Tier 2: adds pointing and claiming (locked candidates) and naked and
//         hidden pairs and triples.

import { shuffle, range, bits } from './rng.js';

const ALL = 0x3fe; // bits 1..9
const UNITS = [];
const PEERS = [];
const CELL_UNITS = [];

for (let r = 0; r < 9; r++) UNITS.push(range(9).map((c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push(range(9).map((r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const r0 = Math.floor(b / 3) * 3;
  const c0 = (b % 3) * 3;
  UNITS.push(range(9).map((k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3)));
}
for (let i = 0; i < 81; i++) {
  CELL_UNITS.push(UNITS.filter((u) => u.includes(i)));
  PEERS.push([...new Set(CELL_UNITS[i].flat())].filter((p) => p !== i));
}

export const box = (i) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);

function full(r) {
  const g = new Array(81).fill(0);
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  const fill = (i) => {
    if (i === 81) return true;
    const row = Math.floor(i / 9);
    const col = i % 9;
    const b = box(i);
    for (const d of shuffle(range(9).map((k) => k + 1), r)) {
      const bit = 1 << d;
      if ((rows[row] | cols[col] | boxes[b]) & bit) continue;
      g[i] = d;
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[b] |= bit;
      if (fill(i + 1)) return true;
      rows[row] &= ~bit;
      cols[col] &= ~bit;
      boxes[b] &= ~bit;
    }
    g[i] = 0;
    return false;
  };
  fill(0);
  return g;
}

// Solve with techniques up to `tier`. Returns the hardest tier it needed, or
// 0 if it got stuck.
export function solve(givens, tier) {
  const g = givens.slice();
  const cand = new Array(81).fill(ALL);
  let open = 0;
  let hardest = 1;

  const place = (i, d) => {
    g[i] = d;
    cand[i] = 0;
    const bit = ~(1 << d);
    for (const p of PEERS[i]) cand[p] &= bit;
  };
  for (let i = 0; i < 81; i++) if (!g[i]) open++;
  for (let i = 0; i < 81; i++) if (g[i]) place(i, g[i]);

  const singles = () => {
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = cand[i];
      if (!m) return -1;
      if (bits(m) === 1) {
        place(i, 31 - Math.clz32(m));
        return 1;
      }
    }
    for (const u of UNITS) {
      for (let d = 1; d <= 9; d++) {
        let spot = -1;
        let count = 0;
        for (const i of u) {
          if (g[i] === d) {
            count = -1;
            break;
          }
          if (cand[i] & (1 << d)) {
            spot = i;
            count++;
          }
        }
        if (count === 1) {
          place(spot, d);
          return 1;
        }
      }
    }
    return 0;
  };

  // A digit confined to one line inside a box, or to one box inside a line.
  const locked = () => {
    let changed = false;
    for (let b = 18; b < 27; b++) {
      for (const line of UNITS.slice(0, 18)) {
        const shared = UNITS[b].filter((i) => line.includes(i));
        if (!shared.length) continue;
        for (let d = 1; d <= 9; d++) {
          const bit = 1 << d;
          const inShared = shared.some((i) => cand[i] & bit);
          if (!inShared) continue;
          const boxRest = UNITS[b].some((i) => !shared.includes(i) && cand[i] & bit);
          const lineRest = line.some((i) => !shared.includes(i) && cand[i] & bit);
          if (!boxRest && lineRest) {
            for (const i of line) if (!shared.includes(i) && cand[i] & bit) (cand[i] &= ~bit), (changed = true);
          } else if (!lineRest && boxRest) {
            for (const i of UNITS[b]) if (!shared.includes(i) && cand[i] & bit) (cand[i] &= ~bit), (changed = true);
          }
        }
      }
    }
    return changed;
  };

  // k cells sharing k candidates (naked), or k digits sharing k cells (hidden).
  const subsets = () => {
    let changed = false;
    for (const u of UNITS) {
      const cells = u.filter((i) => !g[i]);
      for (const k of [2, 3]) {
        if (cells.length <= k) continue;
        for (const combo of choose(cells, k)) {
          const m = combo.reduce((a, i) => a | cand[i], 0);
          if (bits(m) !== k) continue;
          for (const i of cells) {
            if (!combo.includes(i) && cand[i] & m) (cand[i] &= ~m), (changed = true);
          }
        }
        const digits = range(9)
          .map((d) => d + 1)
          .filter((d) => !u.some((i) => g[i] === d));
        for (const combo of choose(digits, k)) {
          const m = combo.reduce((a, d) => a | (1 << d), 0);
          const where = cells.filter((i) => cand[i] & m);
          if (where.length !== k) continue;
          for (const i of where) if (cand[i] & ~m) (cand[i] &= m), (changed = true);
        }
      }
    }
    return changed;
  };

  for (;;) {
    if (!g.includes(0)) return hardest;
    const s = singles();
    if (s < 0) return 0;
    if (s) continue;
    if (tier < 2) return 0;
    if (locked() || subsets()) {
      hardest = 2;
      continue;
    }
    return 0;
  }
}

function* choose(list, k, start = 0, acc = []) {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = start; i < list.length; i++) {
    acc.push(list[i]);
    yield* choose(list, k, i + 1, acc);
    acc.pop();
  }
}

export const LEVELS = {
  easy: { tier: 1, floor: 38 },
  medium: { tier: 1, floor: 0 },
  hard: { tier: 2, floor: 0, needs: 2 },
};

export function generate({ level = 'medium' }, r) {
  const L = LEVELS[level] || LEVELS.medium;
  let best = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const solution = full(r);
    const g = solution.slice();
    let count = 81;
    // Take cells away in mirrored pairs, for the classic symmetric look.
    for (const i of shuffle(range(41), r)) {
      if (count <= L.floor) break;
      const j = 80 - i;
      const a = g[i];
      const b = g[j];
      g[i] = 0;
      g[j] = 0;
      if (solve(g, L.tier)) count -= i === j ? 1 : 2;
      else {
        g[i] = a;
        g[j] = b;
      }
    }
    best = { givens: g, solution };
    if (!L.needs || solve(g, L.tier) >= L.needs) break;
  }
  return {
    game: 'sudoku',
    w: 9,
    h: 9,
    level,
    givens: best.givens.map((v) => v || -1),
    solution: best.solution,
  };
}
