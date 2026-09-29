// Tectonic: the grid is split into regions of one to five cells. A region of
// k cells holds 1 to k once each, and cells that touch, even diagonally,
// never hold the same number.
//
// A random set of regions is grown, filled by backtracking (a fresh layout
// is drawn if the fill takes too long), then numbers are cleared for as long
// as the solver can still finish.
//
// Tier 1: naked singles, and hidden singles inside a region.
// Tier 2: adds "every place a number can go in a region touches this cell",
//         and naked pairs and triples inside a region.

import { shuffle, range, int, bits } from './rng.js';

function neighbours(w, h) {
  const orth = [];
  const king = [];
  for (let i = 0; i < w * h; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    const o = [];
    const k = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        k.push(ny * w + nx);
        if (!dx || !dy) o.push(ny * w + nx);
      }
    }
    orth.push(o);
    king.push(k);
  }
  return { orth, king };
}

const SIZES = [5, 5, 5, 5, 5, 4, 4, 4, 3];

function regions(w, h, r, orth) {
  const region = new Array(w * h).fill(-1);
  let groups = [];
  for (const start of shuffle(range(w * h), r)) {
    if (region[start] >= 0) continue;
    const id = groups.length;
    const target = SIZES[int(r, SIZES.length)];
    const cells = [start];
    region[start] = id;
    while (cells.length < target) {
      const edge = [];
      for (const c of cells) for (const o of orth[c]) if (region[o] < 0 && !edge.includes(o)) edge.push(o);
      if (!edge.length) break;
      const next = edge[int(r, edge.length)];
      region[next] = id;
      cells.push(next);
    }
    groups.push(cells);
  }
  // Fold most small regions into a neighbour with room for them: a grid of
  // small regions has too many 1s and 2s to keep them all apart.
  for (const g of shuffle(groups.slice(), r)) {
    if (!g.length || g.length > 2 || r() < 0.25) continue;
    const options = [];
    for (const c of g) {
      for (const o of orth[c]) {
        const other = groups[region[o]];
        if (other !== g && other.length + g.length <= 5 && !options.includes(other)) options.push(other);
      }
    }
    if (!options.length) continue;
    const into = options[int(r, options.length)];
    const id = region[into[0]];
    for (const c of g) {
      into.push(c);
      region[c] = id;
    }
    g.length = 0;
  }
  groups = groups.filter((g) => g.length);
  groups.forEach((g, id) => g.forEach((c) => (region[c] = id)));
  return { region, groups };
}

function fill(w, h, region, groups, king, r) {
  const g = new Array(w * h).fill(0);
  const opts = new Array(w * h).fill(0);
  let budget = 300;
  const options = (i) => {
    let m = ((1 << groups[region[i]].length) - 1) << 1;
    for (const c of groups[region[i]]) if (g[c]) m &= ~(1 << g[c]);
    for (const c of king[i]) if (g[c]) m &= ~(1 << g[c]);
    return m;
  };
  // Most constrained first: a cell with the fewest options, or a number with
  // only one place left in its region. Give up early on a dead end.
  const step = () => {
    if (--budget < 0) return false;
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const m = (opts[i] = options(i));
      const k = bits(m);
      if (!k) return false;
      if (k < bestCount) {
        best = i;
        bestMask = m;
        bestCount = k;
      }
    }
    if (best < 0) return true;
    if (bestCount > 1) {
      for (const cells of groups) {
        for (let v = 1; v <= cells.length; v++) {
          const bit = 1 << v;
          let spot = -1;
          let n = 0;
          for (const c of cells) {
            if (g[c] === v) {
              n = -1;
              break;
            }
            if (!g[c] && opts[c] & bit) (spot = c), n++;
          }
          if (!n) return false;
          if (n === 1 && bestCount > 1) {
            best = spot;
            bestMask = bit;
            bestCount = 1;
          }
        }
      }
    }
    const values = [];
    for (let v = 1; v <= 5; v++) if (bestMask & (1 << v)) values.push(v);
    for (const v of shuffle(values, r)) {
      g[best] = v;
      if (step()) return true;
    }
    g[best] = 0;
    return false;
  };
  return step() ? g : null;
}

// Solve with techniques up to `tier` (0 = empty). Returns the hardest tier
// needed, or 0 when stuck.
export function solve(givens, w, h, region, tier) {
  const { king } = neighbours(w, h);
  const groups = [];
  region.forEach((id, i) => (groups[id] ||= []).push(i));
  const g = givens.slice();
  const cand = g.map((_, i) => ((1 << groups[region[i]].length) - 1) << 1);
  let hardest = 1;

  const place = (i, v) => {
    g[i] = v;
    cand[i] = 0;
    const bit = ~(1 << v);
    for (const c of groups[region[i]]) cand[c] &= bit;
    for (const c of king[i]) cand[c] &= bit;
  };
  g.forEach((v, i) => v && place(i, v));

  const singles = () => {
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      if (!cand[i]) return -1;
      if (bits(cand[i]) === 1) {
        place(i, 31 - Math.clz32(cand[i]));
        return 1;
      }
    }
    for (const cells of groups) {
      for (let v = 1; v <= cells.length; v++) {
        if (cells.some((c) => g[c] === v)) continue;
        const spots = cells.filter((c) => cand[c] & (1 << v));
        if (spots.length === 1) {
          place(spots[0], v);
          return 1;
        }
      }
    }
    return 0;
  };

  const touching = () => {
    let changed = false;
    for (const cells of groups) {
      for (let v = 1; v <= cells.length; v++) {
        if (cells.some((c) => g[c] === v)) continue;
        const bit = 1 << v;
        const spots = cells.filter((c) => cand[c] & bit);
        if (!spots.length) continue;
        // Cells next to every spot lose v, since v lands in one of them.
        for (const c of king[spots[0]]) {
          if (!(cand[c] & bit) || spots.includes(c)) continue;
          if (spots.every((s) => king[s].includes(c))) {
            cand[c] &= ~bit;
            changed = true;
          }
        }
      }
    }
    return changed;
  };

  const subsets = () => {
    let changed = false;
    for (const cells of groups) {
      const open = cells.filter((c) => !g[c]);
      for (const k of [2, 3]) {
        if (open.length <= k) continue;
        for (const combo of choose(open, k)) {
          const m = combo.reduce((a, c) => a | cand[c], 0);
          if (bits(m) !== k) continue;
          for (const c of open) if (!combo.includes(c) && cand[c] & m) (cand[c] &= ~m), (changed = true);
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
    if (touching() || subsets()) {
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

// Easy keeps a few extra numbers (a fifth of the grid) to get going with.
export const LEVELS = {
  easy: { tier: 1, floor: 0.2 },
  hard: { tier: 2, floor: 0, needs: 2 },
};

export function generate({ level = 'easy', size = 6 }, r) {
  const w = size;
  const h = size;
  const L = LEVELS[level] || LEVELS.easy;
  const { orth, king } = neighbours(w, h);
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    let layout;
    let solution = null;
    while (!solution) {
      layout = regions(w, h, r, orth);
      solution = fill(w, h, layout.region, layout.groups, king, r);
    }
    const g = solution.slice();
    let count = w * h;
    for (const i of shuffle(range(w * h), r)) {
      if (count <= L.floor * w * h) break;
      const v = g[i];
      g[i] = 0;
      if (solve(g, w, h, layout.region, L.tier)) count--;
      else g[i] = v;
    }
    best = { givens: g, solution, region: layout.region };
    if (!L.needs || solve(g, w, h, layout.region, L.tier) >= L.needs) break;
  }
  return {
    game: 'tectonic',
    w,
    h,
    level,
    region: best.region,
    givens: best.givens.map((v) => v || -1),
    solution: best.solution,
  };
}
