import { CONFIG } from "./core/config.js";
import { AppState } from "./core/state.js";
import * as Auth from "./modules/auth.js";
import * as Patients from "./modules/patients.js";
import * as Billing from "./modules/billing.js";
import * as Dashboard from "./modules/dashboard.js";
import * as Aidants from "./modules/aidants.js";
import * as Commandes from "./modules/commandes.js";
import * as Visites from "./modules/visites.js";
import * as Messages from "./modules/message.js";
import { UI } from "./core/utils.js";

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
      applicationServerKey: "BM48rks5FJAMMZ9QcGpFPfvQz5TlS6CCeN8uvrucR7yKmJCmwMxjgzTuREGznW48kgwm8LPYwelg1R8wUzA0Pq0",
    });

    const sub = JSON.parse(JSON.stringify(subscription));
    await fetch(`${CONFIG.API_URL}/auth/subscribe-push`, {
      method: "POST",
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      }),
    });
  } catch (err) { console.warn("🔔 Push non configuré."); }
}

/**
 * 🚀 INITIALISATION AU DÉMARRAGE
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
            
            await window.switchView(lastView);
        } else {
            renderLogin();
        }
    } catch (err) {
        renderLogin();
    } finally {
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => loader.classList.add("hidden"), 500);
        }
    }
}

/**
 * 🔑 ÉCRAN DE CONNEXION
 */
/**
 * 🔑 ÉCRAN DE CONNEXION (Design Premium UI/UX)
 */
function renderLogin() {
  document.getElementById("app").innerHTML = `
        <div class="relative min-h-screen flex flex-col justify-center items-center bg-slate-50 overflow-hidden px-4">
            
            <!-- Arrière-plan animé (Blobs style Glassmorphism) -->
            <div class="absolute top-0 left-0 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div class="absolute top-0 right-0 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div class="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

            <!-- Conteneur principal -->
            <div class="relative w-full max-w-sm bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 animate-fadeIn z-10">
                
                <!-- Logo & Titre -->
                <div class="text-center mb-10">
                    <div class="w-20 h-20 mx-auto bg-gradient-to-tr from-green-500 to-teal-400 text-white rounded-[1.5rem] flex items-center justify-center text-4xl shadow-lg shadow-green-500/30 mb-5 transform transition hover:-translate-y-1 hover:shadow-green-500/50">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Santé Plus</h1>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Protocole de confiance</p>
                </div>
                
                <!-- Formulaire -->
                <div class="space-y-4">
                    <!-- Input Email -->
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-green-500 transition-colors">
                            <i class="fa-solid fa-envelope"></i>
                        </div>
                        <input id="email" type="email" class="w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-sm font-medium text-slate-700 placeholder-slate-400" placeholder="Votre adresse email">
                    </div>

                    <!-- Input Password -->
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-green-500 transition-colors">
                            <i class="fa-solid fa-lock"></i>
                        </div>
                        <input id="password" type="password" class="w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-sm font-medium text-slate-700 placeholder-slate-400" placeholder="Mot de passe">
                    </div>

                    <!-- Mot de passe oublié (Optionnel pour l'instant) -->
                    <div class="flex justify-end pb-2">
                        <span class="text-[10px] font-bold text-slate-400 hover:text-green-600 cursor-pointer transition-colors">Code d'accès oublié ?</span>
                    </div>

                    <!-- Bouton Connexion -->
                    <button onclick="window.login()" id="btn-login" class="w-full relative overflow-hidden group bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all uppercase text-xs tracking-widest flex justify-center items-center gap-2">
                        <span class="relative z-10">Accéder à mon espace</span>
                        <i class="fa-solid fa-arrow-right relative z-10 group-hover:translate-x-1 transition-transform"></i>
                        <!-- Effet gradient au survol -->
                        <div class="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                </div>
            </div>

            <!-- Pied de page : Inscription Famille -->
            <div class="relative z-10 mt-8 text-center animate-fadeIn" style="animation-delay: 0.2s">
                <p class="text-[11px] text-slate-500 font-medium mb-3">Nouveau sur la plateforme ?</p>
                <button onclick="window.openRegisterFamily()" class="inline-flex items-center gap-2 text-slate-700 font-black text-[11px] uppercase tracking-widest bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 hover:border-green-300 hover:text-green-600 transition-all active:scale-95">
                    Créer un compte Famille <i class="fa-solid fa-user-plus"></i>
                </button>
            </div>
        </div>`;
}

/**
 * 🏗️ STRUCTURE PRINCIPALE (LAYOUT)
 */
function renderLayout() {
  const userRole = localStorage.getItem("user_role");
  const userName = localStorage.getItem("user_name");

  document.getElementById("app").innerHTML = `
        <div class="flex flex-col h-screen overflow-hidden bg-slate-50">
            <header class="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <div>
                        <h2 class="font-black text-slate-800 leading-none text-sm uppercase">SANTÉ PLUS</h2>
                        <span class="text-[9px] font-bold text-green-600 uppercase tracking-widest">${userRole} : ${userName}</span>
                    </div>
                </div>
                <button onclick="window.logout()" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-power-off text-xl"></i></button>
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
                ${userRole !== "AIDANT" ? `
                <button onclick="switchView('commandes')" data-view="commandes" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-pills text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Médocs</span>
                </button>` : ""}
                <button onclick="switchView('feed')" data-view="feed" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-rss text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Feed</span>
                </button>
                ${userRole !== "AIDANT" ? `
                <button onclick="switchView('billing')" data-view="billing" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-file-invoice-dollar text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Factures</span>
                </button>` : ""}
                ${userRole === "COORDINATEUR" ? `
                <button onclick="switchView('aidants')" data-view="aidants" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-user-nurse text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Équipe</span>
                </button>` : ""}
            </footer>
        </div>`;
}

/**
 * 🧭 MOTEUR DE NAVIGATION
 */
window.switchView = async (viewName) => {
  const container = document.getElementById("view-container");
  if (!container) return;

  const userRole = localStorage.getItem("user_role");
  const paymentStatus = localStorage.getItem("payment_status");

  if (userRole === "FAMILLE" && paymentStatus === "En retard" && ["feed", "visits", "commandes"].includes(viewName)) {
    UI.vibrate("error");
    return Swal.fire({
      icon: "warning",
      title: "Accès Suspendu",
      text: "Merci de régulariser votre abonnement pour accéder au suivi.",
      confirmButtonText: "Aller aux factures",
      confirmButtonColor: "#16a34a",
    }).then(() => window.switchView("billing"));
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("text-green-600", btn.dataset.view === viewName);
    btn.classList.toggle("active", btn.dataset.view === viewName);
    btn.classList.toggle("text-slate-300", btn.dataset.view !== viewName);
  });

  localStorage.setItem("last_view", viewName);
  AppState.currentView = viewName;

  switch (viewName) {
    case "dashboard": Dashboard.loadAdminDashboard(); break;
    case "patients":
      container.innerHTML = `<div class="flex justify-between items-center mb-6"><h3 class="font-black text-xl">Dossiers</h3>${userRole === "COORDINATEUR" ? '<button onclick="window.openAddPatient()" class="w-10 h-10 bg-green-600 text-white rounded-xl shadow-lg"><i class="fa-solid fa-plus"></i></button>' : ""}</div><div id="patients-list" class="space-y-4"></div>`;
      Patients.loadPatients();
      break;
    case "visits":
      container.innerHTML = `<h3 class="font-black text-xl mb-4">Planning & Visites</h3><div id="visits-list" class="space-y-4"></div>`;
      Visites.loadVisits();
      break;
    case "feed":
      if (!AppState.currentPatient && userRole === "FAMILLE") return window.switchView("patients");
      container.innerHTML = `<div class="flex items-center gap-3 mb-6"><button onclick="window.switchView('patients')" class="text-slate-400"><i class="fa-solid fa-arrow-left"></i></button><h3 class="font-black text-xl">Journal de Soins</h3></div><div id="care-feed" class="space-y-6 pb-20"></div>`;
      Messages.loadFeed();
      break;
    case "billing":
      container.innerHTML = `<h3 class="font-black text-xl mb-4">Abonnement</h3><div id="billing-kpis" class="grid grid-cols-1 gap-3 mb-6"></div><div id="billing-table" class="space-y-3"></div>`;
      Billing.loadBilling();
      break;
    case "aidants": Aidants.loadAidants(); break;
    case "commandes":
      container.innerHTML = document.getElementById("template-commandes").innerHTML;
      if (userRole === "FAMILLE") {
        document.getElementById("commandes-header").innerHTML += `<button onclick="window.openOrderModal()" class="w-10 h-10 bg-green-600 text-white rounded-xl shadow-lg flex items-center justify-center"><i class="fa-solid fa-cart-plus"></i></button>`;
      }
      Commandes.loadCommandes();
      break;
  }
};

/**
 * 📝 INSCRIPTION LIBRE DES FAMILLES (DIASPORA)
 */
window.openRegisterFamily = async () => {
    const { value: form } = await Swal.fire({
        title: 'Inscription Diaspora',
        width: '600px',
        html: `
            <div class="text-left space-y-4">
                <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest">1. Vos informations (Famille)</p>
                <div class="grid grid-cols-2 gap-2">
                    <input id="f-nom" class="swal2-input !m-0" placeholder="Votre Nom">
                    <input id="f-tel" class="swal2-input !m-0" placeholder="Votre Téléphone">
                </div>
                <input id="f-email" type="email" class="swal2-input !m-0" placeholder="Votre Email">
                <input id="f-pass" type="password" class="swal2-input !m-0" placeholder="Choisissez un mot de passe">
                
                <p class="text-[10px] font-black text-green-600 uppercase tracking-widest mt-6">2. Le Proche à accompagner</p>
                <input id="p-nom" class="swal2-input !m-0" placeholder="Nom complet du parent">
                <input id="p-addr" class="swal2-input !m-0" placeholder="Adresse exacte au Bénin">
                <select id="p-form" class="swal2-input !m-0">
                    <option value="Basic">Formule Basic (1 visite/sem)</option>
                    <option value="Standard">Formule Standard (3 visites/sem)</option>
                    <option value="Premium">Formule Premium (7j/7)</option>
                </select>
            </div>`,
        confirmButtonText: 'VALIDER MON INSCRIPTION',
        preConfirm: () => {
            // Récupération de tous les champs...
            return {
                nom_famille: document.getElementById('f-nom').value,
                email: document.getElementById('f-email').value,
                password: document.getElementById('f-pass').value,
                tel_famille: document.getElementById('f-tel').value,
                nom_patient: document.getElementById('p-nom').value,
                adresse_patient: document.getElementById('p-addr').value,
                formule: document.getElementById('p-form').value
            }
        }
    });

    if (form) {
        Swal.fire({ title: 'Traitement...', didOpen: () => Swal.showLoading() });
        const res = await fetch(`${CONFIG.API_URL}/auth/register-family-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if(res.ok) {
            Swal.fire("Merci !", "Demande envoyée. Vérifiez vos mails.", "success");
        }
    }
};
// Branchements globaux
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.openAddPatient = Patients.openAddPatientModal;
window.openOrderModal = Commandes.openOrderModal;
window.markAsDelivered = Commandes.markAsDelivered;
window.viewPatientFeed = (id) => { AppState.currentPatient = id; window.switchView("feed"); };

initApp();
