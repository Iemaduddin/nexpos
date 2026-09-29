/* NEXPOS POS service worker (vanilla, no build step).
 *
 * - App shell + POS pages: network-first, cached for offline reload.
 *   Cached page HTML carries its own product snapshot; the cashier UI
 *   labels it with the snapshot time and warns when offline.
 * - Images (product/logo): cache-first, 7 days, 200 entries max.
 * - Everything else (API POST, auth pages, Inertia JSON): network only.
 * - Background-sync event only wakes open tabs; the actual queue flush
 *   runs in page code (it owns the CSRF token and cart logic).
 */

const PAGE_CACHE = 'nexpos-pages-v1';
const IMAGE_CACHE = 'nexpos-images-v1';
const IMAGE_MAX_ENTRIES = 200;
const POS_PATH = /^\/pos(\/display)?\/?$/;

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== PAGE_CACHE && key !== IMAGE_CACHE)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

function trimImageCache() {
    caches.open(IMAGE_CACHE).then((cache) =>
        cache.keys().then((keys) => {
            if (keys.length > IMAGE_MAX_ENTRIES) {
                cache.delete(keys[0]).then(trimImageCache);
            }
        }),
    );
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        if (!POS_PATH.test(url.pathname)) {
            return;
        }

        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() =>
                    caches.match(request).then((cached) => {
                        if (cached) {
                            return cached;
                        }
                        throw new Error('offline');
                    }),
                ),
        );
        return;
    }

    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request)
                        .then((response) => {
                            if (response.ok) {
                                const copy = response.clone();
                                caches
                                    .open(IMAGE_CACHE)
                                    .then((cache) => cache.put(request, copy))
                                    .then(trimImageCache);
                            }
                            return response;
                        })
                        .catch(() => caches.match(request)),
            ),
        );
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag !== 'nexpos-checkout') {
        return;
    }

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'NEXPOS_FLUSH_OUTBOX' });
                });
            }),
    );
});
