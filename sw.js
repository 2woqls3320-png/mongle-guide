// 온라인이면 항상 최신 페이지를 받고, 오프라인이면 저장해 둔 것을 보여 줘요.
const CACHE = 'mongle-v1';
const SHELL = ['/', '/favicon.svg', '/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('mongle-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // 글꼴 파일은 바뀌지 않으니 저장해 둔 것을 먼저 써요.
    if (url.hostname === 'fonts.gstatic.com') {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') e.waitUntil(cache.put(req, res.clone()));
      return res;
    } catch (err) {
      const hit = await cache.match(req) || (req.mode === 'navigate' && await cache.match('/'));
      return hit || Response.error();
    }
  })());
});
