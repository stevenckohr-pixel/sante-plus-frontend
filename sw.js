const CACHE_NAME = 'sps-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;600;700;800&display=swap'
];

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie : Network First puis Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Notifications Push
self.addEventListener("push", function (event) {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: "https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png",
    badge: "https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png",
    vibrate: [100, 50, 100],
    data: { url: data.url }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
