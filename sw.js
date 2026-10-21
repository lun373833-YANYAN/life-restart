/* Change VERSION whenever any precached file changes. Never touches user data. */
const VERSION = 'v3.0.1';
const PREFIX = 'life-restart-shell-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + VERSION;
const FILES = ['index.html','style.css','app.js','core.js','store.js','records.js',
  'backup.js','offline.js','manifest.webmanifest','icons/apple-touch-icon.png',
  'icons/icon-192.png','icons/icon-512.png'];
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll is atomic: a failed response must never become “offline ready”.
    await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const shell = event.request.mode === 'navigate'
    ? urls[0] : urls.find(item => item === url.href);
  if (!shell) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(shell)) || fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const present = await Promise.all(urls.map(url => cache.match(url)));
    event.ports[0]?.postMessage({version:VERSION, count:present.filter(Boolean).length,
      total:urls.length, ready:present.every(Boolean)});
  })());
});
// Updates activate naturally after all app windows close, avoiding mixed versions.
