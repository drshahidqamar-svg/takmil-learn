// TAKMIL Learn — Service Worker v33
// Deploy this file at the repo root as "sw.js"
// Railway will serve it at /sw.js alongside index.html

const CACHE = 'takmil-learn-v33';

// Cache the app shell (index.html served at root)
const SHELL = ['/'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(SHELL).catch(() => {})
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for Google Fonts / CDN so they get cached on first load
  const isCDN = url.hostname.includes('googleapis') ||
                url.hostname.includes('gstatic')    ||
                url.hostname.includes('cdnjs')      ||
                url.hostname.includes('jsdelivr');

  if (isCDN) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for same-origin; fall back to network then app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(r => {
          if (r && r.status === 200 && r.type !== 'opaque') {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => {
          // Offline fallback: serve the cached app shell for navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
