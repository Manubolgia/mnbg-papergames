// Keeps Paper Games working offline. Puzzles are made on the device, so the
// shell is all there is to cache.
//
// Other games share this origin (<user>.github.io), so only caches carrying
// this app's prefix are ever cleared.

const PREFIX = 'mnbg-papergames-';
const VERSION = `${PREFIX}v3`;
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/worker.js',
  './js/puzzles/index.js',
  './js/puzzles/rng.js',
  './js/puzzles/sudoku.js',
  './js/puzzles/binairo.js',
  './js/puzzles/tectonic.js',
  './icons/icon.svg',
  './icons/icon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  // The page: network first, so a new version shows up straight away, with
  // the cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Everything else: from the cache, refreshed in the background.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
