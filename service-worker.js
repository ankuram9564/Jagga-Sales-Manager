/* ==========================================================================
   Jagga Sales Manager — service-worker.js
   Caches the app shell so it keeps working with no signal out in the
   market. Data itself lives in localStorage on the device, not here.
   ========================================================================== */

const CACHE_NAME = 'jagga-sales-manager-v1';

const APP_SHELL = [
  './',
  './index.html',
  './dashboard.html',
  './wholesalers.html',
  './wholesaler-detail.html',
  './retailers.html',
  './retailer-detail.html',
  './orders.html',
  './order-form.html',
  './visit-form.html',
  './tour.html',
  './reports.html',
  './search.html',
  './manifest.json',
  './css/style.css',
  './js/database.js',
  './js/app.js',
  './js/dashboard.js',
  './js/orders.js',
  './js/tour.js',
  './js/report.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigation requests (so updates are picked up when
// online), cache-first fallback for everything else (so the app still
// opens with no connection at all).
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((res) => res || caches.match('./dashboard.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
