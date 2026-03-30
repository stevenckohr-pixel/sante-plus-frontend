import { CONFIG } from "./core/config.js";
import { AppState } from "./core/state.js";
import * as Auth from "./modules/auth.js";
import * as Patients from "./modules/patients.js";
import * as Billing from "./modules/billing.js";
import * as Dashboard from "./modules/dashboard.js";
import * as Aidants from "./modules/aidants.js";
import * as Commandes from "./modules/commandes.js";
import * as Visites from "./modules/visites.js";
import * as Messages from "./modules/message.js"; // Correction nom fichier

window.CONFIG = CONFIG;

/**
 * 🔔 INITIALISATION DES NOTIFICATIONS NATIVES
 */
async function initPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Utilise ta clé publique générée en backend
      applicationServerKey:
        "BM48rks5FJAMMZ9QcGpFPfvQz5TlS6CCeN8uvrucR7yKmJCmwMxjgzTuREGznW48kgwm8LPYwelg1R8wUzA0Pq0",
    });

    const sub = JSON.parse(JSON.stringify(subscription));

    await secureFetch("/auth/subscribe-push", {
      method: "POST",
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      }),
    });
    console.log("🚀 Push certifié sur cet appareil.");
  } catch (err) {
    console.warn("🔔 Push non configuré ou refusé.");
  }
}


/**
 * Initialisation au démarrage
 */
async function initApp() {
    const app = document.getElementById("app");
    const loader = document.getElementById("initial-loader");
    const token = localStorage.getItem("token");

    try {
        if (token) {
            renderLayout();
            initPushNotifications();
            
            const userRole = localStorage.getItem("user_role");
            const defaultView = userRole === "COORDINATEUR" ? "dashboard" : "patients";
            const lastView = localStorage.getItem("last_view") || defaultView;
            
            // Attendre que la vue soit chargée avant de cacher le loader
            await window.switchView(lastView);
        } else {
            renderLogin();
        }
    } catch (err) {
        console.error("Erreur initApp:", err);
        renderLogin(); // En cas de problème, on redirige au login
    } finally {
        // 💥 LE SECRET : On cache le loader ici (garanti quoi qu'il arrive)
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => loader.classList.add("hidden"), 500);
        }
    }
}

/**
 * Écran de Connexion (Design Premium)
 */
function renderLogin() {
  document.getElementById("app").innerHTML = `
        <div class="h-screen flex items-center justify-center p-6 bg-slate-900">
            <div class="w-full max-w-sm bg-white p-10 rounded-[2.5rem] shadow-2xl animate-fadeIn">
                <div class="text-center mb-8">
                    <div class="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <h1 class="text-2xl font-black text-slate-800">Santé Plus</h1>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Protocole de confiance</p>
                </div>
                
                <div class="space-y-4">
                    <input id="email" type="email" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500" placeholder="Email">
                    <input id="password" type="password" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500" placeholder="Mot de passe">
                    <button onclick="window.login()" id="btn-login" class="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest">
                        Connexion
                    </button>
                </div>
            </div>
        </div>`;
}

/**
 * Structure principale avec Filtrage des boutons selon le Rôle
 */
function renderLayout() {
  const userRole = localStorage.getItem("user_role");

  document.getElementById("app").innerHTML = `
        <div class="flex flex-col h-screen overflow-hidden bg-slate-50">
            <header class="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <div>
                        <h2 class="font-black text-slate-800 leading-none text-sm">SANTÉ PLUS</h2>
                        <span class="text-[9px] font-bold text-green-600 uppercase tracking-widest">${userRole}</span>
                    </div>
                </div>
                <button onclick="window.logout()" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-power-off text-xl"></i></button>
            </header>

            <main id="main-content" class="flex-1 overflow-y-auto p-5 custom-scroll pb-24">
                <div id="view-container" class="max-w-md mx-auto"></div>
            </main>

            <footer class="bg-white border-t border-slate-100 px-4 py-3 flex justify-between items-center fixed bottom-0 left-0 right-0 z-20">
                
                <button onclick="switchView('patients')" data-view="patients" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-hospital-user text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Clients</span>
                </button>

                <button onclick="switchView('visits')" data-view="visits" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-calendar-check text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Visites</span>
                </button>

                <!-- Bouton Médicaments (Famille et Admin) -->
                ${
                  userRole !== "AIDANT"
                    ? `
                <button onclick="switchView('commandes')" data-view="commandes" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-pills text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Médocs</span>
                </button>`
                    : ""
                }

                <button onclick="switchView('feed')" data-view="feed" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-rss text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Feed</span>
                </button>

                <!-- Bouton Factures (Famille et Admin) -->
                ${
                  userRole !== "AIDANT"
                    ? `
                <button onclick="switchView('billing')" data-view="billing" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-file-invoice-dollar text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Factures</span>
                </button>`
                    : ""
                }

                <!-- Bouton Équipe (Admin uniquement) -->
                ${
                  userRole === "COORDINATEUR"
                    ? `
                <button onclick="switchView('aidants')" data-view="aidants" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-user-nurse text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Équipe</span>
                </button>`
                    : ""
                }
            </footer>
        </div>`;
}

/**
 * Moteur de Navigation
 */
window.switchView = async (viewName) => {
  const container = document.getElementById("view-container");
  if (!container) return;

  const userRole = localStorage.getItem("user_role");
  const paymentStatus = localStorage.getItem("payment_status");

  // Sécurité Impayés (Diaspora)
  if (
    userRole === "FAMILLE" &&
    paymentStatus === "En retard" &&
    ["feed", "visits", "commandes"].includes(viewName)
  ) {
    UI.vibrate("error");
    return Swal.fire({
      icon: "warning",
      title: "Accès Suspendu",
      text: "Merci de régulariser votre abonnement pour accéder au suivi.",
      confirmButtonText: "Aller aux factures",
      confirmButtonColor: "#16a34a",
    }).then(() => window.switchView("billing"));
  }

  // UI : État actif du menu
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("text-green-600", btn.dataset.view === viewName);
    btn.classList.toggle("active", btn.dataset.view === viewName);
    btn.classList.toggle("text-slate-300", btn.dataset.view !== viewName);
  });

  localStorage.setItem("last_view", viewName);
  AppState.currentView = viewName;

  switch (viewName) {
    case "dashboard":
      Dashboard.loadAdminDashboard();
      break;
    case "patients":
      container.innerHTML = `<div class="flex justify-between items-center mb-6"><h3 class="font-black text-xl">Dossiers</h3>${userRole === "COORDINATEUR" ? '<button onclick="window.openAddPatient()" class="w-10 h-10 bg-green-600 text-white rounded-xl shadow-lg"><i class="fa-solid fa-plus"></i></button>' : ""}</div><div id="patients-list" class="space-y-4"></div>`;
      Patients.loadPatients();
      break;
    case "visits":
      container.innerHTML = `<h3 class="font-black text-xl mb-4">Planning & Visites</h3><div id="visits-list" class="space-y-4"></div>`;
      Visites.loadVisits();
      break;
    case "feed":
      if (!AppState.currentPatient && userRole === "FAMILLE")
        return window.switchView("patients");
      container.innerHTML = `<div class="flex items-center gap-3 mb-6"><button onclick="window.switchView('patients')" class="text-slate-400"><i class="fa-solid fa-arrow-left"></i></button><h3 class="font-black text-xl">Journal de Soins</h3></div><div id="care-feed" class="space-y-6 pb-20"></div>`;
      Messages.loadFeed();
      break;
    case "billing":
      container.innerHTML = `<h3 class="font-black text-xl mb-4">Abonnement</h3><div id="billing-kpis" class="grid grid-cols-1 gap-3 mb-6"></div><div id="billing-table" class="space-y-3"></div>`;
      Billing.loadBilling();
      break;
    case "aidants":
      Aidants.loadAidants();
      break;
    case "commandes":
      container.innerHTML =
        document.getElementById("template-commandes").innerHTML;
      if (userRole === "FAMILLE") {
        document.getElementById("commandes-header").innerHTML +=
          `<button onclick="window.openOrderModal()" class="w-10 h-10 bg-green-600 text-white rounded-xl shadow-lg"><i class="fa-solid fa-cart-plus"></i></button>`;
      }
      Commandes.loadCommandes();
      break;
  }
  document.getElementById("main-content").scrollTop = 0;
};

// Branchements globaux
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.openAddPatient = Patients.openAddPatientModal;
window.openOrderModal = Commandes.openOrderModal;
window.markAsDelivered = Commandes.markAsDelivered;

window.viewPatientFeed = (id) => {
  AppState.currentPatient = id;
  window.switchView("feed");
};

initApp();
