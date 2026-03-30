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
function renderLogin() {
  document.getElementById("app").innerHTML = `
        <div class="h-screen flex items-center justify-center p-6 bg-slate-900">
            <div class="w-full max-w-sm bg-white p-10 rounded-[2.5rem] shadow-2xl animate-fadeIn">
                <div class="text-center mb-8">
                    <div class="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <h1 class="text-2xl font-black text-slate-800">Santé Plus</h1>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Protocole de confiance</p>
                </div>
                
                <div class="space-y-4">
                    <input id="email" type="email" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all" placeholder="Email">
                    <input id="password" type="password" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all" placeholder="Mot de passe">
                    <button onclick="window.login()" id="btn-login" class="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest">
                        Connexion
                    </button>

                    <div class="text-center pt-6 border-t border-slate-50 mt-6">
                        <p class="text-[10px] text-slate-400 font-bold uppercase mb-2">Vous êtes de la famille ?</p>
                        <button onclick="window.openRegisterFamily()" class="text-green-600 font-black text-xs uppercase underline tracking-widest hover:text-green-700 transition-colors">
                            Créer un compte Diaspora
                        </button>
                    </div>
                </div>
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
    const { value: formValues } = await Swal.fire({
        title: '<span class="text-lg font-black uppercase text-slate-800">Compte Famille</span>',
        html: `
            <div class="text-left space-y-4 p-2">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Créez votre accès pour suivre votre proche.</p>
                <input id="reg-nom" class="swal2-input !m-0" placeholder="Votre nom complet">
                <input id="reg-email" type="email" class="swal2-input !m-0" placeholder="Votre email">
                <input id="reg-tel" class="swal2-input !m-0" placeholder="Votre téléphone">
                <input id="reg-pass" type="password" class="swal2-input !m-0" placeholder="Choisissez un mot de passe">
            </div>`,
        confirmButtonText: 'CRÉER MON COMPTE',
        confirmButtonColor: '#16a34a',
        showCancelButton: true,
        cancelButtonText: 'Annuler',
        preConfirm: () => {
            const nom = document.getElementById('reg-nom').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-pass').value;
            if(!nom || !email || !password) return Swal.showValidationMessage("Merci de remplir tous les champs");
            return { nom, email, telephone: document.getElementById('reg-tel').value, password, role: 'FAMILLE' };
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Inscription...', didOpen: () => Swal.showLoading() });
            const res = await fetch(`${CONFIG.API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            if(res.ok) {
                Swal.fire("Bienvenue !", "Votre compte a été créé. Connectez-vous maintenant.", "success");
            } else {
                const err = await res.json();
                throw new Error(err.error);
            }
        } catch(e) { Swal.fire("Erreur", e.message, "error"); }
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
