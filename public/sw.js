// Harf PWA Service Worker — network-first navigation with offline fallback
const CACHE_NAME = 'harf-v2';
const OFFLINE_URL = '/offline.html';

// Static assets that are safe to cache on install
const PRECACHE_ASSETS = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept same-origin navigation requests
  if (
    event.request.mode === 'navigate' &&
    event.request.url.startsWith(self.location.origin)
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For Quran audio — cache-first (large files, rarely change)
  if (
    event.request.url.includes('everyayah.com') ||
    event.request.url.includes('audios.quranwbw.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // For Quran text CDN — stale-while-revalidate
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
});
