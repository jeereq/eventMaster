// v4 : purge les réponses RSC mises en cache par la v3 (cause de « Connection closed »).
const CACHE_NAME = 'eventmaster-cache-v4';
/** En local (next dev), aucun cache : les fichiers changent à chaque compilation. */
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);
const ASSETS_TO_CACHE = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      ASSETS_TO_CACHE.length > 0 ? cache.addAll(ASSETS_TO_CACHE) : cache,
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  if (IS_LOCAL_DEV) return;

  // Flux RSC des navigations Next.js : toujours le réseau, jamais le cache (réponse liée au build et à l'état).
  const url = new URL(event.request.url);
  if (url.searchParams.has('_rsc') || event.request.headers.get('RSC') === '1') return;

  // Pages HTML : réseau d'abord pour éviter un ancien bundle JS en cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }),
  );
});
