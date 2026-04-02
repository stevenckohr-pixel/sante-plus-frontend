const CACHE_NAME = 'sps-v3';
const STATIC_CACHE = 'sps-static-v3';
const IMAGE_CACHE = 'sps-images-v3';

const staticUrls = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installation...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(staticUrls)),
      caches.open(IMAGE_CACHE)
    ]).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(network => {
            cache.put(event.request, network.clone());
            return network;
          });
        });
      })
    );
    return;
  }
  
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

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
