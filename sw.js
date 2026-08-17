// 南臺新生開學懶人導航 — Service Worker
// 目的：讓網站能被「安裝到主畫面」並在離線／訊號差時仍可開啟。
const V = 'stust-freshman-v1';
const CORE = [
  './',
  './index.html',
  './support.js',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/campus-map-sq.png',
  './assets/fonts/pixel-subset.ttf',
  './assets/fonts/seed-rg-sub.ttf',
  './assets/fonts/seed-bd-sub.ttf'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 頁面本身：先連線、失敗才用快取（內容才不會卡在舊版）
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(V);
        c.put('./', fresh.clone());
        return fresh;
      } catch (err) {
        const c = await caches.open(V);
        return (await c.match('./')) || (await c.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 靜態資源：先快取、背景更新
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }

  // 外部資源（字型等）：連線優先，離線時用快取
  e.respondWith((async () => {
    try {
      const r = await fetch(req);
      if (r && (r.ok || r.type === 'opaque')) {
        const c = await caches.open(V);
        c.put(req, r.clone());
      }
      return r;
    } catch (err) {
      const c = await caches.open(V);
      return (await c.match(req)) || Response.error();
    }
  })());
});
