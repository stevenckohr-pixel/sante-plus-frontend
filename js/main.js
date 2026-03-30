
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

// Rendre la config accessible partout
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
 * 🔑 ÉCRAN DE CONNEXION (Design Premium UI/UX)
 */
function renderLogin() {
  document.getElementById("app").innerHTML = `
        <div class="relative min-h-screen flex flex-col justify-center items-center bg-slate-50 overflow-hidden px-4">
            <!-- Arrière-plan animé (Blobs) -->
            <div class="absolute top-0 left-0 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div class="absolute top-0 right-0 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div class="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

            <div class="relative w-full max-w-sm bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-xl border border-white/50 animate-fadeIn z-10">
                <div class="text-center mb-10">
                    <div class="w-20 h-20 mx-auto bg-gradient-to-tr from-green-500 to-teal-400 text-white rounded-[1.5rem] flex items-center justify-center text-4xl shadow-lg mb-5 transform transition hover:-translate-y-1">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Santé Plus</h1>
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Protocole de confiance</p>
                </div>
                
                <div class="space-y-4">
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-green-500">
                            <i class="fa-solid fa-envelope"></i>
                        </div>
                        <input id="email" type="email" class="w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-500 transition-all text-sm" placeholder="Email">
                    </div>

                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-green-500">
                            <i class="fa-solid fa-lock"></i>
                        </div>
                        <input id="password" type="password" class="w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-500 transition-all text-sm" placeholder="Mot de passe">
                    </div>

                    <button onclick="window.login()" id="btn-login" class="w-full relative overflow-hidden group bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl active:scale-[0.98] transition-all uppercase text-xs tracking-widest flex justify-center items-center gap-2">
                        <span class="relative z-10">Accéder à mon espace</span>
                        <i class="fa-solid fa-arrow-right relative z-10 group-hover:translate-x-1 transition-transform"></i>
                        <div class="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </div>
            </div>

            <div class="relative z-10 mt-8 text-center">
                <button onclick="window.openRegisterFamily()" class="inline-flex items-center gap-2 text-slate-700 font-black text-[11px] uppercase tracking-widest bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 hover:text-green-600 transition-all">
                    Créer un compte Famille <i class="fa-solid fa-user-plus"></i>
                </button>
            </div>
        </div>`;
}

/**
 * 🏗️ STRUCTURE PRINCIPALE
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
                <button onclick="switchView('feed')" data-view="feed" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-rss text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Feed</span>
                </button>
                ${userRole !== "AIDANT" ? `
                <button onclick="switchView('billing')" data-view="billing" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-file-invoice-dollar text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Factures</span>
                </button>` : ""}
            </footer>
        </div>`;
}


/**
 * 🧭 MOTEUR DE NAVIGATION (Version Sécurisée & Premium)
 */
window.switchView = async (viewName) => {
  const container = document.getElementById("view-container");
  if (!container) return;

  const userRole = localStorage.getItem("user_role");
  const paymentStatus = localStorage.getItem("payment_status");

  // 🛡️ SÉCURITÉ : BLOCAGE SI FACTURE EN RETARD (Famille uniquement)
  const restrictedViews = ["feed", "visits", "commandes"];
  if (userRole === "FAMILLE" && paymentStatus === "En retard" && restrictedViews.includes(viewName)) {
    UI.vibrate("error");
    return Swal.fire({
      icon: "warning",
      title: `<span class="text-red-600">Accès Suspendu</span>`,
      html: `<p class="text-sm">Merci de régulariser votre abonnement pour accéder au suivi de votre proche.</p>`,
      confirmButtonText: "VOIR MA FACTURE",
      confirmButtonColor: "#0f172a",
      customClass: { popup: 'rounded-[2rem]' }
    }).then(() => window.switchView("billing"));
  }

  // 🎨 MISE À JOUR VISUELLE DES BOUTONS DE NAV
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const isActive = btn.dataset.view === viewName;
    btn.classList.toggle("text-green-600", isActive);
    btn.classList.toggle("active", isActive);
    btn.classList.toggle("text-slate-300", !isActive);
  });

  // Sauvegarde de la vue pour le prochain rafraîchissement
  localStorage.setItem("last_view", viewName);
  AppState.currentView = viewName;

  // 🚀 ROUTAGE & RENDU DES COMPOSANTS
  switch (viewName) {
    case "dashboard": 
      Dashboard.loadAdminDashboard(); 
      break;

    case "patients":
      container.innerHTML = `
        <div class="flex justify-between items-center mb-8 animate-fadeIn">
            <h3 class="font-black text-2xl text-slate-800">Dossiers Clients</h3>
            ${userRole === "COORDINATEUR" ? `
                <button onclick="window.openAddPatient()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all">
                    <i class="fa-solid fa-plus text-lg"></i>
                </button>` : ""}
        </div>
        <div id="patients-list" class="space-y-4">
             <div class="flex justify-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-3xl"></i></div>
        </div>`;
      Patients.loadPatients();
      break;

    case "visits":
      container.innerHTML = `
        <h3 class="font-black text-2xl text-slate-800 mb-8 animate-fadeIn">Planning & Visites</h3>
        <div id="visits-list" class="space-y-4">
            <div class="flex justify-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-3xl"></i></div>
        </div>`;
      Visites.loadVisits();
      break;

    case "feed":
      // Redirection si aucun patient n'est sélectionné (sécurité UX)
      if (!AppState.currentPatient && userRole === "FAMILLE") return window.switchView("patients");
      
      container.innerHTML = `
        <div class="flex items-center gap-4 mb-8 animate-fadeIn">
            <button onclick="window.switchView('patients')" class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <h3 class="font-black text-2xl text-slate-800">Journal de Soins</h3>
        </div>
        <div id="care-feed" class="space-y-6 pb-24"></div>`;
      Messages.loadFeed();
      break;

    case "billing":
      container.innerHTML = `
        <h3 class="font-black text-2xl text-slate-800 mb-8 animate-fadeIn">Abonnement & Factures</h3>
        <div id="billing-kpis" class="grid grid-cols-1 gap-4 mb-8"></div>
        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table class="w-full text-left border-collapse">
                <tbody id="billing-table" class="divide-y divide-slate-50"></tbody>
            </table>
        </div>`;
      Billing.loadBilling();
      break;

    case "aidants": 
      Aidants.loadAidants(); 
      break;

    case "commandes":
      container.innerHTML = `
        <div id="commandes-header" class="flex justify-between items-center mb-8 animate-fadeIn">
            <h3 class="font-black text-2xl text-slate-800">Médicaments</h3>
            ${userRole === "FAMILLE" ? `
                <button onclick="window.openOrderModal()" class="w-12 h-12 bg-green-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all">
                    <i class="fa-solid fa-cart-plus text-lg"></i>
                </button>` : ""}
        </div>
        <div id="commandes-list" class="space-y-4 pb-24"></div>`;
      Commandes.loadCommandes();
      break;
  }
};

/**
 * 📝 DOSSIER D'ADMISSION (Inscription Famille + Patient complète)
 */
window.openRegisterFamily = async () => {
    const { value: form } = await Swal.fire({
        title: '<h2 class="text-xl font-black text-slate-800">Dossier d\'Admission</h2>',
        width: '38rem',
        padding: '2rem',
        confirmButtonText: 'VALIDER LE DOSSIER',
        confirmButtonColor: '#0f172a',
        showCancelButton: true,
        customClass: { popup: 'rounded-[2.5rem]' },
        html: `
            <div class="text-left space-y-5 mt-6 max-h-[60vh] overflow-y-auto px-2">
                <!-- 1. FAMILLE -->
                <div class="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">1. Responsable de la Famille</p>
                    <div class="grid grid-cols-2 gap-3">
                        <input id="f-nom" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Nom complet">
                        <input id="f-tel" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Téléphone (WhatsApp)">
                        <input id="f-email" type="email" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Email">
                        <input id="f-pass" type="password" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Mot de passe">
                    </div>
                </div>

                <!-- 2. PATIENT -->
                <div class="bg-green-50 p-5 rounded-3xl border border-green-100">
                    <p class="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3">2. Parent à accompagner</p>
                    <div class="grid grid-cols-2 gap-3">
                        <input id="p-nom" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Nom du parent">
                        <input id="p-age" type="number" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Âge">
                        <input id="p-addr" class="swal2-input !m-0 !w-full !text-sm !rounded-xl col-span-2" placeholder="Adresse exacte au Bénin">
                    </div>
                </div>

                <!-- 3. MEDICAL -->
                <div class="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                    <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">3. Profil Médical & Urgence</p>
                    <div class="grid grid-cols-2 gap-2 mb-3">
                        <label class="flex items-center gap-2 text-[11px]"><input type="checkbox" class="med-history" value="Diabète"> Diabète</label>
                        <label class="flex items-center gap-2 text-[11px]"><input type="checkbox" class="med-history" value="Hypertension"> Hypertension</label>
                    </div>
                    <input id="p-urgence" class="swal2-input !m-0 !w-full !text-sm !rounded-xl" placeholder="Contact d'urgence local">
                </div>

                <!-- 4. FORMULE -->
                <select id="p-form" class="swal2-input !m-0 !w-full !text-sm !rounded-xl !bg-slate-900 !text-white">
                    <option value="Basic">Pack Basic (1 visite/sem)</option>
                    <option value="Standard">Pack Standard (3 visites/sem)</option>
                    <option value="Premium">Pack Premium (7 visites/sem)</option>
                </select>
            </div>`,
        preConfirm: () => {
            return {
                nom_famille: document.getElementById('f-nom').value,
                email: document.getElementById('f-email').value,
                password: document.getElementById('f-pass').value,
                tel_famille: document.getElementById('f-tel').value,
                nom_patient: document.getElementById('p-nom').value,
                adresse_patient: document.getElementById('p-addr').value,
                formule: document.getElementById('p-form').value,
                // On peut ajouter les nouveaux champs ici
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
            Swal.fire("Succès", "Dossier envoyé ! Un coordinateur vous contactera.", "success");
        }
    }
};

// --- BRANCHEMENTS GLOBAUX ---
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.switchView = window.switchView;
window.openAddPatient = Patients.openAddPatientModal;
window.viewPatientFeed = (id) => { AppState.currentPatient = id; window.switchView("feed"); };

// Lancement
initApp();


