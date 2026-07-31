// Clean Service Worker that skips caching blocks
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass through normally without trapping old files
    event.respondWith(fetch(event.request));
});
