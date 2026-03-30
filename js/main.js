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
    <div class="min-h-screen bg-white flex flex-col">
        <!-- Header fixe en haut -->
        <header class="sticky top-0 bg-white/95 backdrop-blur p-6 flex items-center justify-between border-b border-slate-50 z-20">
            <button onclick="currentStep > 1 ? (currentStep--, renderRegisterStep()) : window.location.reload()" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="text-center">
                <h2 class="font-black text-sm uppercase text-slate-800">Dossier d'Admission</h2>
                <p class="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Étape ${currentStep} sur 4</p>
            </div>
            <div class="w-10"></div>
        </header>

        <!-- Barre de progression -->
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
        </div>

        <!-- Contenu scrollable (Le bouton est DANS le scroll ici) -->
        <main class="flex-1 overflow-y-auto p-6 pb-12 custom-scroll">
            <div class="max-w-md mx-auto space-y-8">
                ${getStepHTML()}
                
                <!-- BOUTON DANS LE FLUX -->
                <button onclick="nextStep()" class="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    ${currentStep === 4 ? 'Finaliser l\'inscription' : 'Continuer'}
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </main>
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
    console.log("Données envoyées au serveur :", registrationData);

    registrationData.email = registrationData.email ? registrationData.email.trim() : "";
    if(!registrationData.email || !registrationData.email.includes('@')) {
        return Swal.fire("Erreur", "L'email semble invalide.", "error");
    }

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
    <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
        
        <!-- SIDEBAR DESKTOP (Visible uniquement sur grands écrans) -->
        <aside class="hidden lg:flex flex-col w-72 bg-[#0F172A] text-white p-6 shadow-2xl z-30">
            <div class="flex items-center gap-4 mb-12 px-2">
                <div class="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <i class="fa-solid fa-heart-pulse text-white text-xl"></i>
                </div>
                <div>
                    <h2 class="font-black text-lg tracking-tighter uppercase leading-none">Santé Plus</h2>
                    <span class="text-[8px] text-green-400 font-bold tracking-[0.3em] uppercase">Services Élite</span>
                </div>
            </div>

            <nav class="flex-1 space-y-2" id="nav-desktop">
                ${getNavLinks(userRole, 'desktop')}
            </nav>

            <!-- Profil Bas Sidebar -->
            <div class="mt-auto p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-black text-xs">
                        ${userName.charAt(0)}
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-xs font-bold truncate">${userName}</p>
                        <p class="text-[9px] text-slate-400 uppercase font-black tracking-widest">${userRole}</p>
                    </div>
                </div>
                <button onclick="window.logout()" class="mt-4 w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                    <i class="fa-solid fa-power-off"></i> Déconnexion
                </button>
            </div>
        </aside>

        <!-- CONTENU PRINCIPAL -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            
            <!-- HEADER PRO (Sticky & Blur) -->
            <header class="h-20 glass-header border-b border-slate-200/60 flex items-center justify-between px-6 lg:px-10 shrink-0 z-20">
                <div class="lg:hidden flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                </div>
                
                <h2 id="view-title" class="text-xl font-black text-slate-800 lg:text-2xl tracking-tight">Tableau de bord</h2>

                <div class="flex items-center gap-4">
                    <button class="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-green-600 transition-all shadow-sm">
                        <i class="fa-solid fa-bell text-sm"></i>
                    </button>
                    <div class="h-8 w-[1px] bg-slate-200 hidden md:block"></div>
                    <div class="hidden md:flex items-center gap-3 pl-2">
                         <p class="text-sm font-bold text-slate-700">${userName}</p>
                         <div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <i class="fa-solid fa-user-gear"></i>
                         </div>
                    </div>
                </div>
            </header>

            <!-- ZONE DE CONTENU DYNAMIQUE -->
            <main id="main-content" class="flex-1 overflow-y-auto p-6 lg:p-10 custom-scroll pb-28 lg:pb-10 bg-[#F1F5F9]/50">
                <div id="view-container" class="max-w-7xl mx-auto"></div>
            </main>

            <!-- NAVIGATION MOBILE (Visible uniquement sur Mobile) -->
            <footer class="lg:hidden bg-white/90 backdrop-blur-lg border-t border-slate-200 px-6 py-4 fixed bottom-0 left-0 right-0 z-40 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                ${getNavLinks(userRole, 'mobile')}
            </footer>
        </div>
    </div>`;
}

/**
 * 🔗 GÉNÉRATEUR DE LIENS DE NAVIGATION SYNCHRONISÉ
 */
function getNavLinks(role, mode) {
    const isMobile = mode === 'mobile';
    
    // Configuration des onglets
    const tabs = [
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', roles: ['COORDINATEUR'] },
        { id: 'patients', icon: 'fa-hospital-user', label: 'Dossiers', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', icon: 'fa-calendar-check', label: 'Visites', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'feed', icon: 'fa-rss', label: 'Feed', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'billing', icon: 'fa-file-invoice-dollar', label: 'Factures', roles: ['COORDINATEUR', 'FAMILLE'] },
        { id: 'aidants', icon: 'fa-user-nurse', label: 'Équipe', roles: ['COORDINATEUR'] }
    ];

    return tabs.filter(tab => tab.roles.includes(role)).map(tab => {
        if (isMobile) {
            return `
                <button onclick="switchView('${tab.id}')" data-view="${tab.id}" class="nav-btn flex flex-col items-center gap-1 flex-1 text-slate-400 transition-all">
                    <i class="fa-solid ${tab.icon} text-lg"></i>
                    <span class="text-[8px] font-black uppercase tracking-tighter">${tab.label}</span>
                </button>`;
        } else {
            return `
                <button onclick="switchView('${tab.id}')" data-view="${tab.id}" class="sidebar-link w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-slate-400 transition-all text-sm">
                    <i class="fa-solid ${tab.icon} text-lg"></i>
                    <span>${tab.label}</span>
                </button>`;
        }
    }).join('');
}




/**
 * 🧭 MOTEUR DE ROUTAGE ÉLITE (Desktop Sidebar + Mobile Nav)
 */
window.switchView = async (viewName) => {
  const container = document.getElementById("view-container");
  const titleElement = document.getElementById("view-title");
  if (!container) return;

  const userRole = localStorage.getItem("user_role");
  const paymentStatus = localStorage.getItem("payment_status");

  // 🛡️ 1. SÉCURITÉ : BLOCAGE SI FACTURE EN RETARD (Uniquement pour la Famille)
  const restrictedViews = ["feed", "visits", "commandes"];
  if (userRole === "FAMILLE" && paymentStatus === "En retard" && restrictedViews.includes(viewName)) {
    UI.vibrate("error");
    return Swal.fire({
      icon: "warning",
      title: `<span class="text-rose-600">Accès Suspendu</span>`,
      html: `<p class="text-sm text-slate-500">Votre abonnement présente un retard de paiement. Merci de régulariser pour accéder au suivi en direct.</p>`,
      confirmButtonText: "RÉGULARISER MAINTENANT",
      confirmButtonColor: "#0F172A",
      customClass: { popup: 'rounded-[2.5rem]' }
    }).then(() => window.switchView("billing"));
  }

  // 🎨 2. MISE À JOUR VISUELLE (Desktop Sidebar + Mobile Buttons)
  document.querySelectorAll(".nav-btn, .sidebar-link").forEach((btn) => {
    const isActive = btn.dataset.view === viewName;
    
    if (btn.classList.contains('sidebar-link')) {
        // Style Sidebar Desktop
        btn.classList.toggle("active", isActive);
        btn.classList.toggle("text-white", isActive);
        btn.classList.toggle("text-slate-400", !isActive);
    } else {
        // Style Bottom Nav Mobile
        btn.classList.toggle("text-green-600", isActive);
        btn.classList.toggle("text-slate-400", !isActive);
    }
  });

  // 📝 3. MISE À JOUR DU TITRE DYNAMIQUE (Header)
  const viewTitles = {
    dashboard: "Aperçu Analytique",
    patients: "Gestion des Dossiers",
    visits: "Suivi des Interventions",
    feed: "Journal de Soins Live",
    billing: "Centre de Facturation",
    aidants: "Gestion de l'Équipe",
    commandes: "Pharmacie & Logistique"
  };
  if (titleElement) titleElement.innerText = viewTitles[viewName] || "Santé Plus";

  // 💾 4. PERSISTANCE
  localStorage.setItem("last_view", viewName);
  AppState.currentView = viewName;

  // 🔄 5. NETTOYAGE ET LOADER AVANT RENDU
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-64 animate-pulse">
        <i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-4xl mb-4"></i>
        <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Chargement des données...</p>
    </div>`;

  // 🚀 6. RENDU DES COMPOSANTS
  try {
      switch (viewName) {
        case "dashboard": 
            Dashboard.loadAdminDashboard(); 
            break;

        case "patients":
            // On pré-injecte la structure pour éviter le flash blanc
            container.innerHTML = `
                <div class="flex justify-between items-center mb-8 animate-fadeIn">
                    <div>
                        <h3 class="font-black text-2xl text-slate-800 tracking-tight">Dossiers Clients</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase mt-1">Base de données active</p>
                    </div>
                    ${userRole === "COORDINATEUR" ? `
                        <button onclick="window.openAddPatient()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-green-600 transition-all active:scale-95">
                            <i class="fa-solid fa-plus"></i>
                        </button>` : ""}
                </div>
                <div id="patients-list" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>`;
            Patients.loadPatients();
            break;

        case "visits":
            Visites.loadVisits();
            break;

        case "feed":
            if (!AppState.currentPatient && userRole === "FAMILLE") return window.switchView("patients");
            Messages.loadFeed();
            break;

        case "billing":
            Billing.loadBilling();
            break;

        case "aidants": 
            Aidants.loadAidants(); 
            break;

        case "commandes":
            Commandes.loadCommandes();
            break;
      }
  } catch (err) {
      container.innerHTML = `<div class="p-10 text-center text-rose-500 font-bold">Erreur de chargement : ${err.message}</div>`;
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
