// 🔥 FIREBASE (AJOUT)
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

// 🔥 AJOUT : réception FCM en background
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


// ================= EXISTANT (INTOUCHÉ) =================

const CACHE_NAME = 'sps-v6';
const STATIC_CACHE = 'sps-static-v6';
const IMAGE_CACHE = 'sps-images-v6';

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
          const responseToCache = response.clone();
          if (response && response.status === 200) {
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

// 🔔 PUSH fallback (ton système existant gardé)
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Santé Plus", message: "Nouvelle notification" };
  }
  
  const options = {
    body: data.message,
    icon: "/sante-plus-frontend/assets/images/logo-general-icon.png",
    badge: "/sante-plus-frontend/assets/images/logo-general-icon.png",
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
