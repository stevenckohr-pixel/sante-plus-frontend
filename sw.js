// ============================================================
// SERVICE WORKER - SANTÉ PLUS SERVICES (OFFLINE-FIRST)
// ============================================================

const CACHE_NAME = 'sps-v8';
const STATIC_CACHE = 'sps-static-v8';
const IMAGE_CACHE = 'sps-images-v8';
const API_CACHE = 'sps-api-v8';

// Fichiers statiques à mettre en cache immédiatement
const STATIC_URLS = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './manifest.json',
  '/sante-plus-frontend/assets/images/logo-general-icon.png',
  '/sante-plus-frontend/assets/images/logo-general-text.png',
  '/sante-plus-frontend/assets/images/logo-maman-icon.png',
  '/sante-plus-frontend/assets/images/logo-maman-text.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

// 🔥 FIREBASE (gardé)
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

messaging.onBackgroundMessage((payload) => {
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
// INSTALLATION - Cache des assets statiques
// ============================================================
self.addEventListener('install', (event) => {
  console.log('🔧 SW installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_URLS);
    }).catch(err => console.warn('⚠️ Erreur cache statique:', err))
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVATION - Nettoyage des anciens caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('✨ SW activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (![STATIC_CACHE, IMAGE_CACHE, API_CACHE, CACHE_NAME].includes(cache)) {
            console.log(`🗑️ Suppression: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// STRATÉGIE DE CACHE: OFFLINE-FIRST
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ============================================================
  // 1. REQUÊTES API (avec fallback IndexedDB)
  // ============================================================
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request, {
        credentials: 'include',
        headers: {
          'Authorization': event.request.headers.get('Authorization') || ''
        }
      })
      .then(response => {
        // Mettre en cache les réponses API réussies
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(API_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Fallback: essayer le cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log(`📦 [SW] API Cache hit: ${url.pathname}`);
          return cachedResponse;
        }
        
        // Fallback: retourner une réponse offline générique
        return new Response(JSON.stringify({
          error: 'offline',
          message: 'Vous êtes hors-ligne. Les données affichées sont en cache.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // ============================================================
  // 2. IMAGES (Cache first)
  // ============================================================
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
      }).catch(() => {
        // Image par défaut hors-ligne
        return caches.match('/sante-plus-frontend/assets/images/logo-general-icon.png');
      })
    );
    return;
  }
  
  // ============================================================
  // 3. ASSETS STATIQUES (Cache first)
  // ============================================================
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log(`📦 [SW] Static Cache hit: ${url.pathname}`);
        return cached;
      }
      
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback: page offline personnalisée
        if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === './') {
          return caches.match('./offline.html');
        }
        return new Response('Vous êtes hors-ligne', { status: 503 });
      });
    })
  );
});

// ============================================================
// 4. NOTIFICATION CLICK
// ============================================================
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
