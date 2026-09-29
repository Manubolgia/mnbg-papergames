// One entry point for the three generators.

import { rng } from './rng.js';
import * as sudoku from './sudoku.js';
import * as binairo from './binairo.js';
import * as tectonic from './tectonic.js';

export const GAMES = {
  tectonic: { levels: ['easy', 'hard'], sizes: [5, 6, 7, 8, 9, 10], generate: tectonic.generate },
  binairo: { levels: ['easy', 'hard'], sizes: [6, 8, 10, 12, 14], generate: binairo.generate },
  sudoku: { levels: ['easy', 'medium', 'hard'], generate: sudoku.generate },
};

// Same game, settings and number: same puzzle.
export function make(game, { level, size }, seed) {
  const def = GAMES[game];
  const p = def.generate({ level, size: size || undefined }, rng(seed));
  return { ...p, seed, size: size || null };
}
