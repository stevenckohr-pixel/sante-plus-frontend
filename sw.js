// ============================================
// SERVICE WORKER OPTIMISÉ POUR PETITS RAM
// ============================================

const CACHE_NAME = 'sps-v4';
const STATIC_CACHE = 'sps-static-v4';
const IMAGE_CACHE = 'sps-images-v4';

// Fichiers statiques essentiels uniquement
const staticUrls = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('🔧 SW installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(staticUrls))
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('✨ SW activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== IMAGE_CACHE && cache !== CACHE_NAME) {
            console.log(`🗑️ Suppression: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie: Cache First avec timeout pour économiser la batterie
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API: Network First avec timeout (5 secondes max)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Images: Cache First (priorité cache pour économiser la data)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(network => {
          caches.open(IMAGE_CACHE).then(cache => cache.put(event.request, network.clone()));
          return network;
        });
      })
    );
    return;
  }
  
  // Fichiers statiques: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Notifications push (allégées)
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
    vibrate: [100],
    data: { url: data.url || "/" }
  };
  
  event.waitUntil(self.registration.showNotification(data.title || "Santé Plus", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
