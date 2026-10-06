/* TAKMIL Learn — Service Worker v1
   Deploy this file at the repo root alongside index.html.
   Railway will serve it at /sw.js — the same origin the app
   is served from — which is required by Android Chrome.
   Without a same-origin SW, beforeinstallprompt never fires
   and "Add to Home Screen" does not appear in Chrome's menu. */

const CACHE  = 'takmil-learn-v1';
const SHELL  = ['/'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url    = new URL(e.request.url);
  const isCDN  = url.hostname.includes('googleapis') || url.hostname.includes('gstatic');

  if (isCDN) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      // Navigation requests (page load) fall back to the cached app shell
      if (e.request.mode === 'navigate') {
        return caches.match('/') || fetch(e.request);
      }
      return fetch(e.request).then(nr => {
        if (!nr || nr.status !== 200 || nr.type === 'opaque') return nr;
        const clone = nr.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return nr;
      }).catch(() => caches.match('/'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
