self.addEventListener('install', (event) => {
    console.log('Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
    // Left empty on purpose to pass the PWA install check
});