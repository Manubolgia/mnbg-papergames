// Paper Games: three pencil puzzles, each one made on the spot.
//
// Views: home (#), a game's page (#sudoku) and the board (#sudoku/play).
// A link to one puzzle (#sudoku/hard/4211, #tectonic/easy-8/52) opens it.
// Puzzles are made in a worker so the page never stalls; the game in
// progress, settings and records live in localStorage. English or Spanish,
// picked with the flags on the home screen.

import { GAMES } from './puzzles/index.js';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const KEY = 'papergames.v1';
const inLibrary = window.parent !== window && window.name === 'mnbglibrary';

const INFO = {
  tectonic: {
    name: 'Tectonic',
    defaults: { level: 'easy', size: 6 },
    keys: 5,
  },
  binairo: {
    name: 'Binairo',
    defaults: { level: 'easy', size: 8 },
    keys: 2,
  },
  sudoku: {
    name: 'Sudoku',
    defaults: { level: 'medium' },
    keys: 9,
  },
};

// ---- words -----------------------------------------------------------------

const TEXT = {
  en: {
    games: {
      tectonic: {
        blurb: 'Regions of one to five cells. Touching cells never match.',
        rules: [
          'A region of N cells holds each number from 1 to N once.',
          'Cells that touch, even at a corner, never hold the same number.',
        ],
      },
      binairo: {
        blurb: 'Two kinds of square. No three in a row, every line balanced.',
        rules: [
          'Fill every cell with a full or an empty square. Tap a cell to cycle.',
          'Never three of the same kind side by side, across or down.',
          'Each row and column holds as many of one kind as the other.',
          'No two rows are the same, and no two columns.',
        ],
      },
      sudoku: {
        blurb: 'Nine by nine. Every row, column and box holds 1 to 9.',
        rules: ['Place 1 to 9 once in every row, every column and every 3 × 3 box.'],
      },
    },
    levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    no: 'No.',
    tagline: 'Every puzzle is made on the spot, and has exactly one solution you can reach without guessing.',
    language: 'Language',
    continue: 'Continue',
    library: '← Back to the library',
    install: 'Install',
    back: 'Back',
    level: 'Level',
    size: 'Size',
    newPuzzle: 'New puzzle',
    puzzleNumber: 'Puzzle number',
    open: 'Open',
    numberNote: (sizes) => `Someone's number opens the same puzzle at the same level${sizes ? ' and size' : ''}.`,
    solvedCount: 'Solved',
    best: (setting) => `Best, ${setting}`,
    numberRange: (max) => `A number from 1 to ${max}`,
    badLink: 'That puzzle link is not right',
    share: 'Share this puzzle',
    inApp: (title) => `${title} in Paper Games`,
    copied: 'Copied. Send it to a friend',
    making: 'Making puzzle',
    makeFailed: 'Could not make a puzzle',
    solved: 'Solved',
    hints: (n) => `${n} hint${n > 1 ? 's' : ''}`,
    fullSquare: 'Full square',
    emptySquare: 'Empty square',
    undo: 'Undo',
    notes: 'Notes',
    erase: 'Erase',
    hint: 'Hint',
    restart: 'Restart',
    sure: 'Sure?',
    offSomewhere: 'Full, but something is off',
    wasWrong: 'That one was wrong',
    newBest: 'A new best time',
  },
  es: {
    games: {
      tectonic: {
        blurb: 'Regiones de una a cinco casillas. Las casillas vecinas nunca coinciden.',
        rules: [
          'Una región de N casillas lleva cada número del 1 al N una vez.',
          'Dos casillas que se tocan, aunque sea por una esquina, nunca llevan el mismo número.',
        ],
      },
      binairo: {
        blurb: 'Dos tipos de cuadrado. Nunca tres seguidos, cada línea equilibrada.',
        rules: [
          'Rellena cada casilla con un cuadrado lleno o vacío. Toca una casilla para cambiarla.',
          'Nunca tres del mismo tipo seguidos, ni en horizontal ni en vertical.',
          'Cada fila y cada columna lleva tantos de un tipo como del otro.',
          'No hay dos filas iguales, ni dos columnas iguales.',
        ],
      },
      sudoku: {
        blurb: 'Nueve por nueve. Cada fila, columna y caja lleva del 1 al 9.',
        rules: ['Coloca del 1 al 9 una vez en cada fila, cada columna y cada caja de 3 × 3.'],
      },
    },
    levels: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
    no: 'Nº',
    tagline: 'Cada puzzle se crea al momento y tiene una sola solución, a la que se llega sin adivinar.',
    language: 'Idioma',
    continue: 'Continuar',
    library: '← Volver a la biblioteca',
    install: 'Instalar',
    back: 'Atrás',
    level: 'Nivel',
    size: 'Tamaño',
    newPuzzle: 'Nuevo puzzle',
    puzzleNumber: 'Número de puzzle',
    open: 'Abrir',
    numberNote: (sizes) => `El número de otra persona abre el mismo puzzle con el mismo nivel${sizes ? ' y tamaño' : ''}.`,
    solvedCount: 'Resueltos',
    best: (setting) => `Mejor, ${setting}`,
    numberRange: (max) => `Un número del 1 al ${max}`,
    badLink: 'Ese enlace de puzzle no es correcto',
    share: 'Compartir este puzzle',
    inApp: (title) => `${title} en Paper Games`,
    copied: 'Copiado. Envíaselo a alguien',
    making: 'Creando puzzle',
    makeFailed: 'No se pudo crear el puzzle',
    solved: 'Resuelto',
    hints: (n) => `${n} pista${n > 1 ? 's' : ''}`,
    fullSquare: 'Cuadrado lleno',
    emptySquare: 'Cuadrado vacío',
    undo: 'Deshacer',
    notes: 'Notas',
    erase: 'Borrar',
    hint: 'Pista',
    restart: 'Reiniciar',
    sure: '¿Seguro?',
    offSomewhere: 'Completo, pero algo no cuadra',
    wasWrong: 'Esa estaba mal',
    newBest: 'Nuevo mejor tiempo',
  },
};

// Little flags for the language switch.
const FLAGS = {
  en: `<svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true"><path fill="#012169" d="M0 0h60v40H0z"/>
    <path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#c8102e" stroke-width="3"/>
    <path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#c8102e" stroke-width="7"/></svg>`,
  es: `<svg viewBox="0 0 60 40" aria-hidden="true"><path fill="#aa151b" d="M0 0h60v40H0z"/><path fill="#f1bf00" d="M0 10h60v20H0z"/></svg>`,
};
const LANG_NAMES = { en: 'English', es: 'Español' };

// ---- storage ---------------------------------------------------------------

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && typeof data === 'object') return { prefs: {}, saves: {}, stats: {}, ...data };
  } catch {}
  return { prefs: {}, saves: {}, stats: {} };
}

const store = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

let lang = TEXT[store.lang] ? store.lang : /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
document.documentElement.lang = lang;

function t(key, ...args) {
  const v = TEXT[lang][key] ?? TEXT.en[key];
  return typeof v === 'function' ? v(...args) : v;
}

function setLang(next) {
  if (!TEXT[next] || next === lang) return;
  lang = store.lang = next;
  document.documentElement.lang = lang;
  persist();
  route();
}

const prefs = (game) => ({ ...INFO[game].defaults, ...(store.prefs[game] || {}) });

// ---- helpers ---------------------------------------------------------------

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const pad2 = (n) => String(n).padStart(2, '0');

function clock(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(sec % 60)}` : `${pad2(m)}:${pad2(sec % 60)}`;
}

const settingKey = (level, size) => (size ? `${level}-${size}` : level);
const levelName = (level) => TEXT[lang].levels[level] || cap(level);
const settingName = (level, size) => (size ? `${levelName(level)} · ${size}×${size}` : levelName(level));
const number = (seed) => `${t('no')} ${String(seed).padStart(6, '0')}`;

const MAX_SEED = 999999;

// The number typed in, or null if it isn't one.
function parseSeed(text) {
  const digits = String(text).replace(/^\s*(no\.?|n\.?º)?\s*/i, '').trim();
  if (!/^\d{1,6}$/.test(digits)) return null;
  const n = Number(digits);
  return n >= 1 && n <= MAX_SEED ? n : null;
}

function newSeed() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] % 999999) + 1;
}

let toastTimer = 0;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Small drawings for the list: one per game.
const ICONS = {
  tectonic: `<svg viewBox="0 0 44 44" aria-hidden="true"><g fill="none" stroke="currentColor">
    <rect x="1" y="1" width="42" height="42" stroke-width="2"/>
    <path d="M15 1v14h14v28M1 29h14v14M29 15h14" stroke-width="2"/>
    <path d="M15 15v14h14M29 1v14" stroke-width="1" opacity=".35"/></g>
    <text x="8" y="12" font-size="9" font-weight="700" fill="currentColor" text-anchor="middle" font-family="Helvetica, Arial">1</text>
    <text x="36" y="38" font-size="9" font-weight="700" fill="currentColor" text-anchor="middle" font-family="Helvetica, Arial">3</text></svg>`,
  binairo: `<svg viewBox="0 0 44 44" aria-hidden="true"><g stroke="currentColor" fill="none">
    <rect x="1" y="1" width="42" height="42" stroke-width="2"/>
    <path d="M15 1v42M29 1v42M1 15h42M1 29h42" stroke-width="1" opacity=".35"/></g>
    <g fill="currentColor"><rect x="4" y="4" width="8" height="8"/><rect x="32" y="18" width="8" height="8"/><rect x="18" y="32" width="8" height="8"/></g>
    <g fill="none" stroke="currentColor" stroke-width="2"><rect x="19" y="5" width="6" height="6"/><rect x="5" y="19" width="6" height="6"/><rect x="33" y="33" width="6" height="6"/></g></svg>`,
  sudoku: `<svg viewBox="0 0 44 44" aria-hidden="true"><g fill="none" stroke="currentColor">
    <rect x="1" y="1" width="42" height="42" stroke-width="2"/>
    <path d="M15 1v42M29 1v42M1 15h42M1 29h42" stroke-width="2"/></g>
    <rect x="15" y="15" width="14" height="14" fill="var(--mark)"/>
    <path d="M15 15h14v14H15z" fill="none" stroke="currentColor" stroke-width="2"/>
    <text x="22" y="26" font-size="10" font-weight="700" fill="currentColor" text-anchor="middle" font-family="Helvetica, Arial">5</text>
    <text x="8" y="12" font-size="9" fill="var(--pen)" text-anchor="middle" font-family="Helvetica, Arial">9</text></svg>`,
};

// ---- the puzzle maker ------------------------------------------------------

let worker = null;
let workerBroken = false;
let jobs = 0;
const waiting = new Map();

function makePuzzle(game, opts, seed) {
  const id = ++jobs;
  const local = () =>
    import('./puzzles/index.js').then(({ make }) => new Promise((ok) => setTimeout(() => ok(make(game, opts, seed)), 30)));
  if (workerBroken || typeof Worker === 'undefined') return local();
  try {
    if (!worker) {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const job = waiting.get(e.data.id);
        if (!job) return;
        waiting.delete(e.data.id);
        if (e.data.puzzle) job.ok(e.data.puzzle);
        else job.fail(new Error(e.data.error));
      };
      worker.onerror = () => {
        // Older browsers without module workers: make them here instead.
        workerBroken = true;
        worker = null;
        for (const [, job] of waiting) job.retry();
        waiting.clear();
      };
    }
    return new Promise((ok, fail) => {
      waiting.set(id, { ok, fail, retry: () => local().then(ok, fail) });
      worker.postMessage({ id, game, opts, seed });
    });
  } catch {
    workerBroken = true;
    return local();
  }
}

// ---- routing ---------------------------------------------------------------

let updateReady = false; // a new version has taken over

function route() {
  const [game, sub, num] = location.hash.slice(1).split('/');
  // A new version is waiting: load it now, unless a puzzle is on the board.
  if (updateReady && sub !== 'play') return location.reload();
  stopClock();
  if (INFO[game] && sub === 'play') return showPlay(game);
  if (INFO[game] && sub && num) return openShared(game, sub, num);
  if (INFO[game]) return showSetup(game);
  return showHome();
}

function go(hash, replace = false) {
  if (replace) history.replaceState(null, '', hash || location.pathname);
  else history.pushState(null, '', hash || location.pathname);
  route();
}

window.addEventListener('popstate', route);

// ---- home ------------------------------------------------------------------

function showHome() {
  app.className = 'home';
  document.title = 'Paper Games';
  const rows = Object.keys(INFO)
    .map((game) => {
      const s = store.saves[game];
      const resume = s && !s.done ? `<span class="resume">${t('continue')} ${number(s.seed)} · ${settingName(s.level, s.size)} · ${clock(s.time)}</span>` : '';
      return `<li><a href="#${game}">
        ${ICONS[game]}
        <span><span class="name">${INFO[game].name}</span><span class="blurb">${TEXT[lang].games[game].blurb}</span>${resume}</span>
        <span class="go" aria-hidden="true">→</span>
        </a></li>`;
    })
    .join('');
  app.innerHTML = `
    <header class="masthead">
      <div class="langs" role="group" aria-label="${t('language')}">${Object.keys(TEXT)
        .map((l) => `<button type="button" data-lang="${l}" lang="${l}" aria-pressed="${l === lang}" aria-label="${LANG_NAMES[l]}" title="${LANG_NAMES[l]}">${FLAGS[l]}</button>`)
        .join('')}</div>
      <h1>Paper<br>Games</h1>
      <p>${t('tagline')}</p>
    </header>
    <ol class="games">${rows}</ol>
    <footer class="foot">
      ${inLibrary ? `<button class="btn" id="library">${t('library')}</button>` : ''}
      <button class="btn" id="install" hidden>${t('install')}</button>
    </footer>`;
  app.querySelectorAll('.games a').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go(a.getAttribute('href'));
    }),
  );
  app.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  const install = $('#install');
  if (installPrompt && !inLibrary) {
    install.hidden = false;
    install.addEventListener('click', async () => {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => {});
      installPrompt = null;
      install.hidden = true;
    });
  }
}

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  if (app.className === 'home') showHome();
});

// ---- a game's page --------------------------------------------------------

function showSetup(game) {
  const info = INFO[game];
  const def = GAMES[game];
  const p = prefs(game);
  const save = store.saves[game];
  const stats = store.stats[game] || { solved: 0, best: {} };
  app.className = 'setup';
  document.title = `${info.name} · Paper Games`;

  const seg = (name, options, current, label) =>
    `<div class="field"><span class="label">${label}</span><div class="seg" data-name="${name}">${options
      .map((o) => `<button type="button" data-value="${o}" aria-pressed="${o === current}">${name === 'size' ? `${o}×${o}` : levelName(o)}</button>`)
      .join('')}</div></div>`;

  const best = stats.best[settingKey(p.level, def.sizes ? p.size : null)];
  app.innerHTML = `
    <header class="bar">
      <a class="back" href="#" aria-label="${t('back')}">←</a>
      <h2>${info.name}</h2>
      <span></span>
    </header>
    <ol class="rules">${TEXT[lang].games[game].rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
    ${seg('level', def.levels, p.level, t('level'))}
    ${def.sizes ? seg('size', def.sizes, p.size, t('size')) : ''}
    <div class="actions-col">
      <button class="btn primary wide" id="new">${t('newPuzzle')}</button>
      ${save && !save.done ? `<button class="btn wide" id="continue">${t('continue')}<small>${number(save.seed)} · ${settingName(save.level, save.size)} · ${clock(save.time)}</small></button>` : ''}
    </div>
    <form class="field number" id="by-number" novalidate>
      <label class="label" for="seed">${t('puzzleNumber')}</label>
      <div class="entry">
        <input id="seed" inputmode="numeric" autocomplete="off" enterkeyhint="go" placeholder="000000" />
        <button class="btn" type="submit">${t('open')}</button>
      </div>
      <p class="note">${t('numberNote', !!def.sizes)}</p>
    </form>
    <dl class="stats">
      <dt>${t('solvedCount')}</dt><dd>${stats.solved}</dd>
      <dt>${t('best', settingName(p.level, def.sizes ? p.size : null).toLowerCase())}</dt><dd>${best ? clock(best) : '—'}</dd>
    </dl>`;

  $('.back').addEventListener('click', (e) => {
    e.preventDefault();
    go('#', true);
  });
  app.querySelectorAll('.seg').forEach((el) =>
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const value = el.dataset.name === 'size' ? Number(b.dataset.value) : b.dataset.value;
      store.prefs[game] = { ...prefs(game), [el.dataset.name]: value };
      persist();
      showSetup(game);
    }),
  );
  $('#new').addEventListener('click', () => startNew(game));
  $('#continue')?.addEventListener('click', () => go(`#${game}/play`));
  $('#by-number').addEventListener('submit', (e) => {
    e.preventDefault();
    const seed = parseSeed($('#seed').value);
    if (!seed) {
      toast(t('numberRange', MAX_SEED));
      return $('#seed').focus();
    }
    const now = prefs(game);
    openNumber(game, now.level, def.sizes ? now.size : null, seed);
  });
}

async function startNew(game) {
  const p = prefs(game);
  const size = GAMES[game].sizes ? p.size : null;
  store.saves[game] = { making: true, level: p.level, size, seed: newSeed() };
  go(`#${game}/play`);
}

// The same number at the same settings is the same puzzle on every device.
// If it's the one already on the board, carry on with it.
function openNumber(game, level, size, seed, replace = false) {
  const s = store.saves[game];
  const same = s && !s.done && s.seed === seed && s.level === level && (s.size || null) === size;
  if (!same) store.saves[game] = { making: true, level, size, seed };
  store.prefs[game] = { ...prefs(game), level, ...(size ? { size } : {}) };
  persist();
  go(`#${game}/play`, replace);
}

// A shared link: #sudoku/hard/4211 or #tectonic/easy-8/52.
function openShared(game, setting, num) {
  const def = GAMES[game];
  const [level, sizeText] = setting.split('-');
  const size = def.sizes ? Number(sizeText) : null;
  const seed = parseSeed(num);
  if (!def.levels.includes(level) || (def.sizes && !def.sizes.includes(size)) || !seed) {
    toast(t('badLink'));
    return go(`#${game}`, true);
  }
  openNumber(game, level, size, seed, true);
}

const shareHash = (s) => `#${s.game}/${settingKey(s.level, s.size)}/${s.seed}`;

async function share() {
  if (!S) return;
  const title = `${INFO[S.game].name} · ${settingName(S.level, S.size)} · ${number(S.seed)}`;
  // Outside pages can't be linked into the library's frame, so the link
  // points at the app on its own; the number works anywhere.
  const url = location.href.split('#')[0] + shareHash(S);
  const text = t('inApp', title);
  try {
    if (navigator.share && !inLibrary) return await navigator.share({ title, text, url });
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast(t('copied'));
  } catch {
    toast(title);
  }
}

// ---- playing ---------------------------------------------------------------

let S = null; // the game on the board
let sel = -1;
let notesMode = false;
let clockTimer = 0;
let lastTick = 0;
let confirmKey = null;
let confirmTimer = 0;
let cells = [];

function stopClock() {
  clearInterval(clockTimer);
  clockTimer = 0;
  if (S) tickClock();
}

function tickClock() {
  const t = performance.now();
  if (S && !S.done && lastTick && document.visibilityState === 'visible') S.time += (t - lastTick) / 1000;
  lastTick = t;
  const el = $('.timer');
  if (el && S) el.textContent = clock(S.time);
}

function startClock() {
  clearInterval(clockTimer);
  lastTick = performance.now();
  clockTimer = setInterval(() => {
    tickClock();
    if (Math.floor(S?.time || 0) % 5 === 0) save();
  }, 500);
}

document.addEventListener('visibilitychange', () => {
  if (!S) return;
  if (document.visibilityState === 'visible') lastTick = performance.now();
  else {
    tickClock();
    save();
  }
});

function save() {
  if (!S) return;
  store.saves[S.game] = {
    seed: S.seed,
    level: S.level,
    size: S.size,
    w: S.w,
    h: S.h,
    givens: S.givens,
    solution: S.solution,
    region: S.region,
    values: S.values,
    notes: S.notes,
    hinted: S.hinted,
    hints: S.hints,
    time: Math.floor(S.time),
    done: S.done,
    history: S.history.slice(-200),
  };
  persist();
}

async function showPlay(game) {
  const info = INFO[game];
  let saved = store.saves[game];
  if (!saved) return go(`#${game}`, true);
  app.className = 'play';
  document.title = `${info.name} · Paper Games`;
  S = null;
  sel = -1;
  notesMode = false;

  app.innerHTML = `
    <header class="bar">
      <a class="back" href="#${game}" aria-label="${t('back')}">←</a>
      <div><h2>${info.name}</h2><button type="button" class="sub share" aria-label="${t('share')}">${settingName(saved.level, saved.size)} · ${number(saved.seed)} <span aria-hidden="true">↗</span></button></div>
      <span class="timer">00:00</span>
    </header>
    <div class="stage"><div class="board wait"><span class="making">${t('making')}</span></div></div>
    <div class="controls"></div>`;
  $('.back').addEventListener('click', (e) => {
    e.preventDefault();
    save();
    go(`#${game}`, true);
  });
  $('.share').addEventListener('click', share);

  if (saved.making) {
    try {
      const p = await makePuzzle(game, { level: saved.level, size: saved.size }, saved.seed);
      if (location.hash !== `#${game}/play` || store.saves[game] !== saved) return;
      saved = {
        ...p,
        values: p.givens.slice(),
        notes: p.givens.map(() => 0),
        hinted: [],
        hints: 0,
        time: 0,
        done: false,
        history: [],
      };
    } catch (err) {
      toast(t('makeFailed'));
      console.error(err);
      delete store.saves[game];
      persist();
      return go(`#${game}`, true);
    }
  }

  S = { ...saved, game, history: saved.history || [], hinted: saved.hinted || [] };
  save();
  buildBoard();
  buildControls();
  paint();
  tickClock();
  if (!S.done) startClock();
}

// Borders: thick ink where regions (or boxes) meet.
function edgeGroup(i) {
  if (S.game === 'tectonic') return S.region[i];
  if (S.game === 'sudoku') return Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);
  return 0;
}

function buildBoard() {
  const board = $('.board');
  board.className = `board ${S.game}`;
  board.style.setProperty('--w', S.w);
  board.style.setProperty('--h', S.h);
  board.setAttribute('role', 'grid');
  board.innerHTML = '';
  cells = [];
  for (let i = 0; i < S.w * S.h; i++) {
    const x = i % S.w;
    const y = Math.floor(i / S.w);
    const el = document.createElement('div');
    el.dataset.i = i;
    el.setAttribute('role', 'gridcell');
    let edges = '';
    if (x === S.w - 1) edges += ' lc';
    else if (edgeGroup(i) !== edgeGroup(i + 1)) edges += ' er';
    if (y === S.h - 1) edges += ' lr';
    else if (edgeGroup(i) !== edgeGroup(i + S.w)) edges += ' eb';
    el.dataset.edges = edges;
    board.appendChild(el);
    cells.push(el);
  }
  board.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-i]');
    if (!el) return;
    e.preventDefault();
    tap(Number(el.dataset.i));
  });
}

function buildControls() {
  const box = $('.controls');
  const info = INFO[S.game];
  if (S.done) {
    box.innerHTML = `
      <div class="solved">
        <h3>${t('solved')}</h3>
        <p>${clock(S.time)}${S.hints ? ` · ${t('hints', S.hints)}` : ''} · ${settingName(S.level, S.size)} · ${number(S.seed)}</p>
        <div class="row">
          <button class="btn" id="menu">${info.name}</button>
          <button class="btn primary" id="again">${t('newPuzzle')}</button>
        </div>
      </div>`;
    $('#menu').addEventListener('click', () => go(`#${S.game}`, true));
    $('#again').addEventListener('click', () => {
      store.saves[S.game] = { making: true, level: S.level, size: S.size, seed: newSeed() };
      go(`#${S.game}/play`, true);
    });
    return;
  }
  const keys =
    S.game === 'binairo'
      ? [1, 0].map((v) => `<button type="button" data-v="${v}" aria-label="${t(v ? 'fullSquare' : 'emptySquare')}"><span class="sq ${v ? 'one' : 'zero'}"></span></button>`)
      : Array.from({ length: info.keys }, (_, k) => `<button type="button" data-v="${k + 1}">${k + 1}</button>`);
  const tools = [
    'undo',
    ...(S.game === 'binairo' ? [] : ['notes']),
    'erase',
    'hint',
    'restart',
  ];
  box.innerHTML = `
    <div class="pad" style="--keys:${keys.length}">${keys.join('')}</div>
    <div class="tools" style="--tools:${tools.length}">${tools
      .map((id) => `<button type="button" data-tool="${id}">${t(id)}</button>`)
      .join('')}</div>`;
  $('.pad').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) enter(Number(b.dataset.v));
  });
  $('.tools').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) tool(b.dataset.tool, b);
  });
}

// ---- rules: who sees whom -----------------------------------------------

function peersOf(i) {
  const { w, h } = S;
  const x = i % w;
  const y = Math.floor(i / w);
  const out = new Set();
  if (S.game === 'sudoku') {
    for (let k = 0; k < 9; k++) {
      out.add(y * 9 + k);
      out.add(k * 9 + x);
    }
    const x0 = x - (x % 3);
    const y0 = y - (y % 3);
    for (let k = 0; k < 9; k++) out.add((y0 + Math.floor(k / 3)) * 9 + x0 + (k % 3));
  } else if (S.game === 'tectonic') {
    S.region.forEach((r, j) => r === S.region[i] && out.add(j));
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.add(ny * w + nx);
      }
    }
  } else {
    for (let k = 0; k < w; k++) out.add(y * w + k);
    for (let k = 0; k < h; k++) out.add(k * w + x);
  }
  out.delete(i);
  return out;
}

function regionSize(i) {
  return S.region.filter((r) => r === S.region[i]).length;
}

// Cells that break a rule as the grid stands.
function conflicts() {
  const bad = new Set();
  const v = S.values;
  if (S.game !== 'binairo') {
    for (let i = 0; i < v.length; i++) {
      if (v[i] < 0) continue;
      for (const p of peersOf(i)) if (v[p] === v[i]) bad.add(i);
    }
    return bad;
  }
  const n = S.w;
  const lines = [];
  for (let a = 0; a < n; a++) {
    lines.push(Array.from({ length: n }, (_, b) => a * n + b));
    lines.push(Array.from({ length: n }, (_, b) => b * n + a));
  }
  lines.forEach((line) => {
    for (let k = 2; k < n; k++) {
      const [a, b, c] = [line[k - 2], line[k - 1], line[k]];
      if (v[a] >= 0 && v[a] === v[b] && v[b] === v[c]) [a, b, c].forEach((i) => bad.add(i));
    }
    for (const val of [0, 1]) {
      const has = line.filter((i) => v[i] === val);
      if (has.length > n / 2) has.forEach((i) => bad.add(i));
    }
  });
  // Identical finished lines, rows with rows and columns with columns.
  for (const start of [0, 1]) {
    const seen = new Map();
    for (let k = start; k < lines.length; k += 2) {
      const line = lines[k];
      if (line.some((i) => v[i] < 0)) continue;
      const key = line.map((i) => v[i]).join('');
      if (seen.has(key)) [...line, ...seen.get(key)].forEach((i) => bad.add(i));
      else seen.set(key, line);
    }
  }
  return bad;
}

// ---- drawing the board ------------------------------------------------------

function paint() {
  if (!S) return;
  const bad = conflicts();
  const peers = sel >= 0 ? peersOf(sel) : new Set();
  const selValue = sel >= 0 ? S.values[sel] : -1;
  const hinted = new Set(S.hinted);
  const five = S.game === 'tectonic';
  cells.forEach((el, i) => {
    const v = S.values[i];
    const given = S.givens[i] >= 0;
    let cls = `cell${el.dataset.edges}`;
    if (given) cls += ' given';
    if (i === sel) cls += ' sel';
    else if (S.game !== 'binairo' && selValue >= 0 && v === selValue) cls += ' same';
    else if (peers.has(i) && !S.done) cls += ' peer';
    if (bad.has(i)) cls += ' bad';
    if (hinted.has(i)) cls += ' hinted';
    let html = '';
    if (v >= 0) {
      html = S.game === 'binairo' ? `<span class="sq ${v ? 'one' : 'zero'}"></span>` : String(v);
    } else if (S.notes[i]) {
      const max = five ? 6 : 9;
      let spans = '';
      for (let d = 1; d <= max; d++) spans += `<span>${S.notes[i] & (1 << d) && d <= (five ? 5 : 9) ? d : ''}</span>`;
      html = `<div class="notes${five ? ' five' : ''}">${spans}</div>`;
    }
    const key = cls + '|' + html;
    if (el._key !== key) {
      el.className = cls;
      el.innerHTML = html;
      el._key = key;
    }
    el.setAttribute('aria-selected', i === sel);
  });
  paintPad();
}

function paintPad() {
  const pad = $('.pad');
  if (!pad) return;
  pad.classList.toggle('notes-on', notesMode);
  const notesBtn = $('[data-tool="notes"]');
  if (notesBtn) notesBtn.setAttribute('aria-pressed', notesMode);
  pad.querySelectorAll('button').forEach((b) => {
    const v = Number(b.dataset.v);
    let off = false;
    if (S.game === 'tectonic') off = sel >= 0 && v > regionSize(sel);
    if (S.game === 'sudoku') off = S.values.filter((x) => x === v).length >= 9;
    b.disabled = off;
  });
  const undo = $('[data-tool="undo"]');
  if (undo) undo.disabled = !S.history.length;
}

// ---- input ---------------------------------------------------------------

function tap(i) {
  if (!S || S.done) return;
  if (S.game === 'binairo' && S.givens[i] < 0) {
    // Tapping cycles: empty, full, empty square, empty.
    const v = S.values[i];
    sel = i;
    change([[i, v < 0 ? 1 : v === 1 ? 0 : -1, 0]]);
    return;
  }
  sel = i;
  paint();
}

// Apply a list of [cell, value, notes] as one undoable step.
function change(list) {
  const before = list.map(([i]) => [i, S.values[i], S.notes[i]]);
  let moved = false;
  for (const [i, v, n] of list) {
    if (S.values[i] !== v || S.notes[i] !== n) moved = true;
    S.values[i] = v;
    S.notes[i] = n;
  }
  if (!moved) return paint();
  S.history.push(before);
  after();
}

function after() {
  paint();
  save();
  if (!S.values.includes(-1)) {
    if (S.values.every((v, i) => v === S.solution[i])) solved();
    else toast(t('offSomewhere'));
  }
}

function enter(v) {
  if (!S || S.done || sel < 0 || S.givens[sel] >= 0) return;
  if (S.game === 'tectonic' && v > regionSize(sel)) return;
  if (notesMode && S.game !== 'binairo') {
    if (S.values[sel] >= 0) return;
    change([[sel, -1, S.notes[sel] ^ (1 << v)]]);
    return;
  }
  const next = S.values[sel] === v ? -1 : v;
  const list = [[sel, next, 0]];
  // Placing a number clears it from the notes of every cell that sees it.
  if (next >= 0 && S.game !== 'binairo') {
    for (const p of peersOf(sel)) {
      if (S.notes[p] & (1 << next)) list.push([p, S.values[p], S.notes[p] & ~(1 << next)]);
    }
  }
  change(list);
}

function tool(id, button) {
  if (!S || S.done) return;
  if (id === 'undo') {
    const step = S.history.pop();
    if (!step) return;
    for (const [i, v, n] of step) {
      S.values[i] = v;
      S.notes[i] = n;
    }
    paint();
    save();
  } else if (id === 'notes') {
    notesMode = !notesMode;
    paintPad();
  } else if (id === 'erase') {
    if (sel >= 0 && S.givens[sel] < 0) change([[sel, -1, 0]]);
  } else if (id === 'hint') {
    hint();
  } else if (id === 'restart') {
    if (confirmKey !== 'restart') {
      confirmKey = 'restart';
      button.classList.add('confirm');
      button.textContent = t('sure');
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => {
        confirmKey = null;
        button.classList.remove('confirm');
        button.textContent = t('restart');
      }, 2500);
      return;
    }
    confirmKey = null;
    clearTimeout(confirmTimer);
    button.classList.remove('confirm');
    button.textContent = t('restart');
    S.values = S.givens.slice();
    S.notes = S.givens.map(() => 0);
    S.history = [];
    S.hinted = [];
    paint();
    save();
  }
}

// A wrong cell gets fixed first; otherwise the selected cell, or any empty one.
function hint() {
  const wrong = S.values.map((v, i) => (v >= 0 && v !== S.solution[i] ? i : -1)).filter((i) => i >= 0);
  const empty = S.values.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0);
  let i = -1;
  if (wrong.length) i = wrong.includes(sel) ? sel : wrong[0];
  else if (sel >= 0 && S.values[sel] < 0) i = sel;
  else if (empty.length) i = empty[Math.floor(Math.random() * empty.length)];
  if (i < 0) return;
  sel = i;
  S.hints++;
  if (!S.hinted.includes(i)) S.hinted.push(i);
  if (wrong.length) toast(t('wasWrong'));
  change([[i, S.solution[i], 0]]);
}

function solved() {
  S.done = true;
  tickClock();
  stopClock();
  sel = -1;
  const stats = (store.stats[S.game] ||= { solved: 0, best: {} });
  stats.solved++;
  const key = settingKey(S.level, S.size);
  const t = Math.floor(S.time);
  const record = !S.hints && (!stats.best[key] || t < stats.best[key]);
  if (record) stats.best[key] = t;
  save();
  paint();
  buildControls();
  if (record) toast(t('newBest'));
}

document.addEventListener('keydown', (e) => {
  if (!S || S.done || app.className !== 'play' || e.metaKey || e.altKey) return;
  const k = e.key;
  if ((e.ctrlKey && k.toLowerCase() === 'z') || (!e.ctrlKey && k.toLowerCase() === 'u')) {
    e.preventDefault();
    return tool('undo');
  }
  if (e.ctrlKey) return;
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (moves[k]) {
    e.preventDefault();
    if (sel < 0) sel = 0;
    else {
      const x = (sel % S.w) + moves[k][0];
      const y = Math.floor(sel / S.w) + moves[k][1];
      if (x >= 0 && y >= 0 && x < S.w && y < S.h) sel = y * S.w + x;
    }
    return paint();
  }
  if (k === 'Backspace' || k === 'Delete' || k === '.') return tool('erase');
  if (k.toLowerCase() === 'n' && S.game !== 'binairo') return tool('notes');
  if (k.toLowerCase() === 'h') return hint();
  if (/^[0-9]$/.test(k)) {
    const v = Number(k);
    if (S.game === 'binairo' ? v <= 1 : v >= 1) enter(v);
  }
});

// ---- start -------------------------------------------------------------------

if (inLibrary) window.parent.postMessage({ type: 'mnbglibrary:hello', exit: true }, location.origin);

// Back to the library: call the deck directly when it offers that (same
// site), and send the message too, which is what older decks listen for.
function backToLibrary() {
  try {
    if (typeof window.parent.mnbglibrary?.eject === 'function') return window.parent.mnbglibrary.eject();
  } catch {}
  window.parent.postMessage({ type: 'mnbglibrary:eject' }, location.origin);
}

// Caught on the document, so it works however often the home screen is drawn.
document.addEventListener('click', (e) => {
  if (inLibrary && e.target.closest('#library')) backToLibrary();
});

route();

// The installed app is often resumed rather than opened, so it looks for a
// new version each time it comes back, and loads one once it has taken over.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
  let hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The very first install has no older version to replace.
    if (!hadWorker) return (hadWorker = true);
    updateReady = true;
    if (app.className !== 'play') location.reload();
  });
}
