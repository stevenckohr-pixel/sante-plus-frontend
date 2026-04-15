// 🔥 Firebase CDN - Configuration unique

const firebaseConfig = {
  apiKey: "AIzaSyBzLQLLWmRI7Nr-c-Ht9DKkJejMxh-5C4g",
  authDomain: "santeplus-service.firebaseapp.com",
  projectId: "santeplus-service",
  storageBucket: "santeplus-service.firebasestorage.app",
  messagingSenderId: "706607823043",
  appId: "1:706607823043:web:0f1f6433cdc796d62b0a76"
};

// Initialisation
firebase.initializeApp(firebaseConfig);

// 🔥 Demander la permission et enregistrer le token
async function initFirebaseNotifications() {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('❌ Permission notifications refusée');
            return;
        }
        
        const messaging = firebase.messaging();
        
        // Obtenir le token VAPID
        const token = await messaging.getToken({
            vapidKey: "BAStgbdhdf4eevMHymMZSalvx5ZjbrR_6rJQX6VUfxURmNo6X0ej18IHKw0j-y3oCmu6kmLK0T8YvRAeRENjAkk"
        });
        
        console.log("🔥 Token FCM:", token);
        
        // Sauvegarder le token dans le backend
        const userId = localStorage.getItem("user_id");
        if (userId && token) {
            await fetch(`${CONFIG.API_URL}/save-push-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, user_id: userId })
            });
            console.log("✅ Token FCM enregistré");
        }
        
        // Écouter les messages foreground
        messaging.onMessage((payload) => {
            console.log("📨 Notification foreground:", payload);
            // Afficher un toast personnalisé
            if (window.showToast) {
                window.showToast(payload.notification?.body || "Nouvelle notification", "info", 5000);
            }
        });
        
    } catch (err) {
        console.error("❌ Erreur init Firebase:", err);
    }
}

// Exécuter au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseNotifications);
} else {
    initFirebaseNotifications();
}

// Export global
window.messaging = firebase.messaging();
