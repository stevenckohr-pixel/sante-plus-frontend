const CACHE_NAME = 'sps-v5';
const STATIC_CACHE = 'sps-static-v5';
const IMAGE_CACHE = 'sps-images-v5';

const staticUrls = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json'
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
  
  // ✅ NE PAS CACHER LES REQUÊTES POST, PUT, DELETE
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // ✅ API GET - Network First (sans clone problématique)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre en cache seulement si la réponse est OK
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
  
  // ✅ Images - Cache First
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
  
  // ✅ Fichiers statiques - Cache First
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
    icon: "https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png",
    badge: "https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png",
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
