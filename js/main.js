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

let registrationData = {};
let currentStep = 1;

// --- DÉFINITION DES FONCTIONS ---

window.openRegisterFamily = () => {
    currentStep = 1;
    registrationData = {};
    renderRegisterStep();
};



function renderRegisterStep() {
    const app = document.getElementById("app");
    const progress = (currentStep / 4) * 100;

    app.innerHTML = `
    <div class="min-h-screen bg-white flex flex-col animate-fadeIn">
        <!-- Header du formulaire -->
        <header class="p-6 flex items-center justify-between border-b border-slate-50">
            <button onclick="currentStep > 1 ? (currentStep--, renderRegisterStep()) : window.location.reload()" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="text-center">
                <h2 class="font-black text-sm uppercase tracking-widest text-slate-800">Dossier d'Admission</h2>
                <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Étape ${currentStep} sur 4</p>
            </div>
            <div class="w-10"></div> <!-- Spacer -->
        </header>

        <!-- Barre de progression -->
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
        </div>

        <!-- Contenu de l'étape -->
        <main class="flex-1 p-6 overflow-y-auto custom-scroll">
            <div class="max-w-md mx-auto">
                ${getStepHTML()}
            </div>
        </main>

        <!-- Barre d'action basse -->
        <footer class="p-6 border-t border-slate-50 bg-white">
            <div class="max-w-md mx-auto">
                <button onclick="nextStep()" class="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    ${currentStep === 4 ? 'Finaliser l\'inscription' : 'Continuer'}
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </footer>
    </div>`;
}







function getStepHTML() {
    switch(currentStep) {
        case 1: return `
            <div class="animate-fadeIn">
                <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                    <i class="fa-solid fa-user-shield"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">Vous êtes ?</h3>
                <p class="text-slate-400 text-sm mb-8 leading-relaxed">Ces informations nous permettent de lier le payeur au dossier médical.</p>
                
                <div class="space-y-4">
                    <input id="f-nom" class="app-input" placeholder="Votre nom complet" value="${registrationData.nom_famille || ''}">
                    <input id="f-email" type="email" class="app-input" placeholder="Votre adresse email" value="${registrationData.email || ''}">
                    <input id="f-tel" class="app-input" placeholder="Téléphone (WhatsApp)" value="${registrationData.tel_famille || ''}">
                    <input id="f-pass" type="password" class="app-input" placeholder="Créer un mot de passe d'accès">
                </div>
            </div>`;
        
        case 2: return `
            <div class="animate-fadeIn">
                <div class="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                    <i class="fa-solid fa-hospital-user"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">Le Parent</h3>
                <p class="text-slate-400 text-sm mb-8">Qui allons-nous accompagner au Bénin ?</p>
                
                <div class="space-y-4">
                    <input id="p-nom" class="app-input" placeholder="Nom complet du patient" value="${registrationData.nom_patient || ''}">
                    <input id="p-age" type="number" class="app-input" placeholder="Âge du patient" value="${registrationData.age_patient || ''}">
                    <input id="p-addr" class="app-input" placeholder="Adresse exacte (Quartier/Rue)" value="${registrationData.adresse_patient || ''}">
                </div>
            </div>`;

        case 3: return `
            <div class="animate-fadeIn">
                <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                    <i class="fa-solid fa-notes-medical"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">Santé & Urgence</h3>
                <p class="text-slate-400 text-sm mb-8">Informations cruciales pour nos intervenants.</p>
                
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-3">
                        <label class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" class="med-hist w-5 h-5 accent-green-600" value="Diabète">
                            <span class="text-xs font-bold text-slate-700">Diabète</span>
                        </label>
                        <label class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" class="med-hist w-5 h-5 accent-green-600" value="Hypertension">
                            <span class="text-xs font-bold text-slate-700">Tension</span>
                        </label>
                    </div>
                    <input id="p-urgence" class="app-input" placeholder="Contact d'urgence local" value="${registrationData.contact_urgence || ''}">
                    <textarea id="p-notes" class="app-input h-32" placeholder="Observations (Allergies, mobilité...)">${registrationData.notes_medicales || ''}</textarea>
                </div>
            </div>`;

        case 4: return `
            <div class="animate-fadeIn">
                <div class="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-xl">
                    <i class="fa-solid fa-crown"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">Abonnement</h3>
                <p class="text-slate-400 text-sm mb-8">Choisissez la fréquence des visites.</p>
                
                <div class="space-y-4">
                    <button onclick="setPlan('Basic')" class="w-full p-6 rounded-3xl border-2 ${registrationData.formule === 'Basic' ? 'border-green-500 bg-green-50' : 'border-slate-100'} text-left transition-all">
                        <h4 class="font-black text-slate-800">BASIC</h4>
                        <p class="text-xs text-slate-400 mt-1">1 visite de contrôle par semaine</p>
                        <p class="text-green-600 font-black mt-2">50.000 CFA / mois</p>
                    </button>
                    <button onclick="setPlan('Standard')" class="w-full p-6 rounded-3xl border-2 ${registrationData.formule === 'Standard' ? 'border-green-500 bg-green-50' : 'border-slate-100'} text-left transition-all">
                        <h4 class="font-black text-slate-800">STANDARD</h4>
                        <p class="text-xs text-slate-400 mt-1">3 visites médicales par semaine</p>
                        <p class="text-green-600 font-black mt-2">75.000 CFA / mois</p>
                    </button>
                    <button onclick="setPlan('Premium')" class="w-full p-6 rounded-3xl border-2 ${registrationData.formule === 'Premium' ? 'border-green-500 bg-green-50' : 'border-slate-100'} text-left transition-all">
                        <h4 class="font-black text-slate-800">PREMIUM</h4>
                        <p class="text-xs text-slate-400 mt-1">Suivi quotidien (7j/7)</p>
                        <p class="text-green-600 font-black mt-2">100.000 CFA / mois</p>
                    </button>
                </div>
            </div>`;
    }
}


window.setPlan = (plan) => {
    registrationData.formule = plan;
    renderRegisterStep();
};

function nextStep() {
    if (currentStep === 1) {
        registrationData.nom_famille = document.getElementById('f-nom').value;
        registrationData.email = document.getElementById('f-email').value;
        registrationData.tel_famille = document.getElementById('f-tel').value;
        registrationData.password = document.getElementById('f-pass').value;
        if(!registrationData.email || !registrationData.password) return UI.vibrate('error');
    }
    if (currentStep === 2) {
        registrationData.nom_patient = document.getElementById('p-nom').value;
        registrationData.age_patient = document.getElementById('p-age').value;
        registrationData.adresse_patient = document.getElementById('p-addr').value;
    }
    if (currentStep === 3) {
        const history = Array.from(document.querySelectorAll('.med-hist:checked')).map(el => el.value);
        registrationData.contact_urgence = document.getElementById('p-urgence').value;
        registrationData.notes_medicales = history.join(', ') + " | " + document.getElementById('p-notes').value;
    }

    if (currentStep < 4) {
        currentStep++;
        renderRegisterStep();
    } else {
        submitRegistration();
    }
}




async function submitRegistration() {
    if(!registrationData.formule) return Swal.fire("Erreur", "Veuillez choisir une formule", "warning");

    Swal.fire({ title: 'Création du dossier...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const res = await fetch(`${CONFIG.API_URL}/auth/register-family-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const data = await res.json(); // On récupère toujours la réponse (même en erreur)

        if (!res.ok) {
            throw new Error(data.error || "Une erreur est survenue");
        }

        Swal.fire({
            icon: "success",
            title: "Dossier Transmis !",
            text: "Un coordinateur va valider vos informations sous 24h.",
            confirmButtonText: "RETOUR À L'ACCUEIL",
            confirmButtonColor: "#16a34a"
        }).then(() => window.location.reload());

    } catch (e) {
        Swal.fire("Erreur", e.message, "error");
    }
}



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
 * 🔑 LOGIN UI (Style Pinterest / Clean UI)
 */
function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="relative min-h-screen flex flex-col justify-center items-center bg-slate-50 overflow-hidden px-4 font-sans">
        <!-- Blobs animés en fond -->
        <div class="absolute top-0 left-0 w-72 h-72 bg-green-300 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div class="absolute -bottom-8 right-0 w-72 h-72 bg-blue-300 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div class="relative w-full max-w-sm bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] shadow-2xl border border-white/50 animate-fadeIn z-10">
            <div class="text-center mb-10">
                <div class="w-20 h-20 mx-auto bg-green-600 text-white rounded-[1.5rem] flex items-center justify-center text-4xl shadow-xl shadow-green-200 mb-5">
                    <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight">Santé Plus</h1>
                <p class="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Protocole de confiance</p>
            </div>
            
            <div class="space-y-4">
                <div class="relative group">
                    <i class="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors"></i>
                    <input id="email" type="email" class="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-500 transition-all text-sm font-medium" placeholder="Email">
                </div>
                <div class="relative group">
                    <i class="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors"></i>
                    <input id="password" type="password" class="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-500 transition-all text-sm font-medium" placeholder="Mot de passe">
                </div>
                <button onclick="window.login()" id="btn-login" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-green-200 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    Accéder à mon espace <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>

        <div class="relative z-10 mt-8 text-center animate-fadeIn" style="animation-delay: 0.3s">
            <button onclick="window.openRegisterFamily()" class="text-slate-700 font-black text-[11px] uppercase tracking-widest bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100 hover:text-green-600 transition-all active:scale-95">
                Créer un compte Famille <i class="fa-solid fa-user-plus ml-2"></i>
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
                <!-- DASHBOARD : Uniquement pour Coordinateur -->
                ${userRole === "COORDINATEUR" ? `
                <button onclick="switchView('dashboard')" data-view="dashboard" class="nav-btn flex flex-col items-center gap-1 flex-1">
                    <i class="fa-solid fa-chart-pie text-lg"></i>
                    <span class="text-[8px] font-black uppercase">Stats</span>
                </button>` : ""}

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


// 🔑 BRANCHEMENTS GLOBAUX (À LA FIN POUR ÊTRE SÛR QUE TOUT EXISTE)
window.CONFIG = CONFIG;
window.AppState = AppState;
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.openAddPatient = Patients.openAddPatientModal;
window.openOrderModal = Commandes.openOrderModal;
window.markAsDelivered = Commandes.markAsDelivered;
window.viewPatientFeed = (id) => { AppState.currentPatient = id; window.switchView("feed"); };
window.nextStep = nextStep;
window.renderRegisterStep = renderRegisterStep;
window.renderLayout = renderLayout;
window.switchView = switchView;

initApp();
