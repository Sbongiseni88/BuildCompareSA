// BuildCompare SA — Service Worker
// Enables offline caching and PWA install capability

// Version MUST be bumped on every release that changes the app shell —
// a stale cache under the old name kept serving the pre-pivot bundle
// (legacy AI concierge UI) long after the code was deleted from the repo.
const CACHE_NAME = 'buildcompare-v2-tender';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/images/logo.png',
    '/manifest.json',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network-first strategy with cache fallback
// This ensures users always get fresh data when online,
// but can still use cached pages during loadshedding
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API calls — always go to network
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses for offline use
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(async () => {
                // Network failed — try cache
                const cached = await caches.match(event.request);
                if (cached) return cached;

                // If it's a page navigation and nothing cached, show offline page
                if (event.request.mode === 'navigate') {
                    const offlinePage = await caches.match(OFFLINE_URL);
                    if (offlinePage) return offlinePage;
                }

                return new Response('Offline', { status: 503 });
            })
    );
});
