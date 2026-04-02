const CACHE_NAME = 'sps-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json'
  // Ne plus mettre les URLs externes (tailwind, fontawesome, etc.)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

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

// Stratégie : Network First pour les ressources internes, mais on ignore les CDN externes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ne pas intercepter les requêtes vers les CDN externes (tailwind, fontawesome, google fonts, etc.)
  if (url.origin !== self.location.origin) {
    // Laisser le navigateur gérer normalement
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Notifications Push (inchangé)
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
