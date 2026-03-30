self.addEventListener("push", function (event) {
  const data = event.data.json();

  const options = {
    body: data.message,
    // Utilisation du logo officiel harmonisé
    icon: "https://cdn-icons-png.flaticon.com/512/9752/9752284.png",
    badge: "https://cdn-icons-png.flaticon.com/512/9752/9752284.png",
    vibrate: [100, 50, 100],
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Quand on clique sur la notif, on ouvre l'app au bon endroit
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
