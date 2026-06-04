const CACHE = "ffsensi-v4";
const FILES = [
  ".",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-icon-180.png",
  "icons/apple-icon-152.png",
  "icons/apple-icon-120.png",
  "icons/apple-icon-76.png",
  "icons/apple-icon-60.png",
];

const NEVER_CACHE = /\/api\/|\/version\.json/;

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => {
      return self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage("NEW_VERSION"));
      });
    })
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "CACHE_BUST") {
    const url = e.data.url;
    if (url) caches.open(CACHE).then(c => c.delete(url));
  }
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  // Network-first for HTML, cache-first for assets
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || new Response("Offline", {status:503})))
    );
    return;
  }
  if (NEVER_CACHE.test(e.request.url)) {
    e.respondWith(fetch(e.request).catch(() => new Response("", {status:503})));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response("Offline", {status:503})))
  );
});
