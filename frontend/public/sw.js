const CACHE_NAME = 'ryanair-app-v1';
const RUNTIME_CACHE = 'ryanair-runtime-v1';
const STALE_CACHE_TIME = 24 * 60 * 60 * 1000; // 24 hours

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        console.log('Some assets failed to cache during install');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Aggressively delete old caches to prevent stale content
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML files: Network-first (always get fresh copy from server)
  if (request.method === 'GET' && (url.pathname === '/' || url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline – Seite nicht verfügbar', { status: 503 });
          });
        })
    );
    return;
  }

  // API calls: Network-first with fallback
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const runtimeCache = caches.open(RUNTIME_CACHE);
          runtimeCache.then((cache) => {
            cache.put(request, response.clone());
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(JSON.stringify({ error: 'Offline – keine Daten im Cache' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS): Cache-first (they have content hashes)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseClone = response.clone();
          const cache = caches.open(RUNTIME_CACHE);
          cache.then((c) => {
            c.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return new Response('Offline – Datei nicht verfügbar', { status: 503 });
        });
    })
  );
});

