
const CACHE_NAME = 'sps-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. Installation : Mise en cache des fichiers de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. Stratégie de Network First (On prend le web, si pas de réseau on prend le cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 3. Notifications Push (Ton code existant)
self.addEventListener("push", function (event) {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: "https://cdn-icons-png.flaticon.com/512/9752/9752284.png",
    badge: "https://cdn-icons-png.flaticon.com/512/9752/9752284.png",
    vibrate: [100, 50, 100],
    data: { url: data.url }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
