const CACHE_NAME = 'sps-v3';
const STATIC_CACHE = 'sps-static-v3';
const IMAGE_CACHE = 'sps-images-v3';

// Fichiers statiques à mettre en cache
const staticUrls = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installation...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(staticUrls)),
      caches.open(IMAGE_CACHE)
    ]).then(() => self.skipWaiting())
  );
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== IMAGE_CACHE && cache !== CACHE_NAME) {
            console.log(`🗑️ Suppression ancien cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie : Network First avec fallback cache pour les API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Images : Cache First
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          if (cached) {
            console.log(`📷 Image servie depuis cache: ${url.pathname}`);
            return cached;
          }
          return fetch(event.request).then(network => {
            cache.put(event.request, network.clone());
            return network;
          }).catch(() => {
            // Image par défaut si hors ligne
            return cache.match('/offline-image.png');
          });
        });
      })
    );
    return;
  }
  
  // API : Network First avec fallback
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          console.log(`📡 API offline fallback: ${url.pathname}`);
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Fichiers statiques : Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          console.log(`📄 Fichier statique servi depuis cache: ${url.pathname}`);
          return cached;
        }
        return fetch(event.request);
      })
  );
});

// Gestion des notifications push améliorée
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
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});
