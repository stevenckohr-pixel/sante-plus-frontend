const CACHE_NAME = 'sps-v6';
const STATIC_CACHE = 'sps-static-v6';
const IMAGE_CACHE = 'sps-images-v6';

const staticUrls = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json',
  './assets/images/logo-general-icon.png',
  './assets/images/logo-general-text.png',
  './assets/images/logo-maman-icon.png',
  './assets/images/logo-maman-text.png'
];

self.addEventListener('install', (event) => {
  console.log('🔧 SW installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(staticUrls))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✨ SW activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== STATIC_CACHE && cache !== IMAGE_CACHE && cache !== CACHE_NAME) {
            console.log(`🗑️ Suppression: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(network => {
          if (network && network.status === 200) {
            caches.open(IMAGE_CACHE).then(cache => {
              cache.put(event.request, network.clone());
            });
          }
          return network;
        });
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Notifications push
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Santé Plus", message: "Nouvelle notification" };
  }
  
  const options = {
    body: data.message,
    icon: "/assets/images/logo-general-icon.png",
    badge: "/assets/images/logo-general-icon.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Voir" },
      { action: "close", title: "Fermer" }
    ]
  };
  
  event.waitUntil(self.registration.showNotification(data.title || "Santé Plus", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  if (event.action === 'close') return;
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
