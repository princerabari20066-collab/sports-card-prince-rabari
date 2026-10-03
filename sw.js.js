/* ==========================================================================
   Service Worker: Sports Committee Digital ID Pass
   Author: Prince Rabari (Deputy Logistics Head)
   Affiliation: Nirma University • Sports Committee 2026-27
   ========================================================================== */

const CACHE_VERSION = 'v2026.27.1';
const CACHE_NAME = `sports-pass-${CACHE_VERSION}`;

// Core assets required for offline rendering
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './profile.jpg',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
];

/* --------------------------------------------------------------------------
   1. INSTALL LIFECYCLE: Pre-cache core pass assets
   -------------------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing. Version:', CACHE_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching digital ID assets into:', CACHE_NAME);
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] All core assets successfully cached.');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache pre-caching failed during install:', error);
      })
  );
});

/* --------------------------------------------------------------------------
   2. ACTIVATE LIFECYCLE: Purge stale caches from previous committee builds
   -------------------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating.');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((existingCache) => {
            if (existingCache !== CACHE_NAME) {
              console.log('[SW] Deleting legacy cache store:', existingCache);
              return caches.delete(existingCache);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients for immediate control.');
        return self.clients.claim();
      })
  );
});

/* --------------------------------------------------------------------------
   3. FETCH INTERCEPTION: Cache-First with Dynamic Network Fallback
   -------------------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  // Only intercept standard GET HTTP/HTTPS requests
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Handle external scheme requests (tel:, mailto:, wa.me) by passing them through
  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return instantly from cache for <50ms load speed
        return cachedResponse;
      }

      // Fetch from network and dynamically cache valid responses
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque'
          ) {
            return networkResponse;
          }

          // Clone response stream before caching
          const responseToStore = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToStore);
          });

          return networkResponse;
        })
        .catch((fetchError) => {
          console.warn('[SW] Network request failed:', event.request.url, fetchError);

          // If offline and navigating to a page, serve the cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});