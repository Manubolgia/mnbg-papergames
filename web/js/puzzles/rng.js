// Seeded randomness, so a puzzle number always makes the same puzzle.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (r, n) => Math.floor(r() * n);

export function shuffle(list, r) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = int(r, i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export const range = (n) => Array.from({ length: n }, (_, i) => i);

export function bits(mask) {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
}
