// 🔥 Firebase CDN (compatible navigateur direct)

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

// 🔥 Export global
window.messaging = firebase.messaging();
