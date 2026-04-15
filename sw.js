// ============================================================
// SERVICE WORKER - SANTÉ PLUS SERVICES
// Version unifiée (FCM uniquement)
// ============================================================

// 🔥 FIREBASE INITIALIZATION
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBzLQLLWmRI7Nr-c-Ht9DKkJejMxh-5C4g",
  authDomain: "santeplus-service.firebaseapp.com",
  projectId: "santeplus-service",
  messagingSenderId: "706607823043",
  appId: "1:706607823043:web:0f1f6433cdc796d62b0a76"
});

const messaging = firebase.messaging();

// ============================================================
// 🔔 NOTIFICATIONS FCM (BACKGROUND)
// ============================================================
messaging.onBackgroundMessage((payload) => {
  console.log("🔥 FCM Background:", payload);

  const title = payload.notification?.title || "Santé Plus";
  const options = {
    body: payload.notification?.body || "Nouvelle notification",
    icon: "/sante-plus-frontend/assets/images/logo-general-icon.png",
    badge: "/sante-plus-frontend/assets/images/logo-general-icon.png",
    vibrate: [100, 50, 100],
    data: { url: payload.data?.url || "/" }
  };

  self.registration.showNotification(title, options);
});

// ============================================================
// 📦 CACHES
// ============================================================
const CACHE_NAME = 'sps-v7';
const STATIC_CACHE = 'sps-static-v7';
const IMAGE_CACHE = 'sps-images-v7';

const staticUrls = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json',
  '/sante-plus-frontend/assets/images/logo-general-icon.png',
  '/sante-plus-frontend/assets/images/logo-general-text.png',
  '/sante-plus-frontend/assets/images/logo-maman-icon.png',
  '/sante-plus-frontend/assets/images/logo-maman-text.png'
];

// ============================================================
// 🔧 INSTALLATION
// ============================================================
self.addEventListener('install', (event) => {
  console.log('🔧 SW installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(staticUrls))
  );
  self.skipWaiting();
});

// ============================================================
// ✨ ACTIVATION
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('✨ SW activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== STATIC_CACHE && cache !== IMAGE_CACHE && cache !== CACHE_NAME) {
            console.log(`🗑️ Suppression ancien cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// 🌐 GESTION DES REQUÊTES
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Requêtes non-GET → on laisse passer
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Requêtes API → pas de cache, juste credentials
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request, {
        credentials: 'include',
        headers: {
          'Authorization': event.request.headers.get('Authorization') || ''
        }
      })
      .then(response => response)
      .catch(() => new Response('Network error', { status: 503 }))
    );
    return;
  }
  
  // Images → cache avec fallback
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(network => {
          if (network && network.status === 200) {
            const responseToCache = network.clone();
            caches.open(IMAGE_CACHE).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return network;
        });
      })
    );
    return;
  }
  
  // Assets statiques → cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cached);
      
      return cached || fetchPromise;
    })
  );
});

// ============================================================
// 🔔 CLIC SUR NOTIFICATION
// ============================================================
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  
  const url = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si une fenêtre est déjà ouverte, on l'utilise
        for (let client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon on ouvre une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
