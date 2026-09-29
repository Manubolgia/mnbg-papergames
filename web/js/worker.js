// Makes puzzles off the main thread, so the page stays responsive while a
// big one is being built.

import { make } from './puzzles/index.js';

self.onmessage = (e) => {
  const { id, game, opts, seed } = e.data;
  try {
    self.postMessage({ id, puzzle: make(game, opts, seed) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};
