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
import * as MapModule from "./modules/map.js";

/* --- DONNÉES ONBOARDING PREMIUM AVEC IMAGES --- */
const ONBOARDING_STEPS = [
    {
        title: "L'Excellence à domicile",
        desc: "Bénéficiez d'un accompagnement médical de prestige pour vos parents restés au pays.",
        image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=800",
        accent: "border-emerald-500"
    },
    {
        title: "Suivi Live Diaspora",
        desc: "Consultez le carnet de santé numérique et recevez les photos des visites en temps réel.",
        image: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=800",
        accent: "border-blue-500"
    },
    {
        title: "Radar de Présence",
        desc: "Notre technologie GPS certifie la présence réelle de l'aidant à chaque intervention.",
        image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=800",
        accent: "border-indigo-500"
    },
    {
        title: "Transactions Sécurisées",
        desc: "Abonnements simplifiés via Mobile Money avec facturation automatique et transparente.",
        image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800",
        accent: "border-slate-900"
    }
];
let onboardingStep = 0;

/* --- CONFIGURATION SWEETALERT PREMIUM --- */
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    popup: 'rounded-3xl shadow-2xl border border-slate-100',
  }
});

// On remplace les alertes classiques par un design plus "App"
window.showAppAlert = (title, text, icon = 'success') => {
    Swal.fire({
        title: `<span class="text-xl font-black text-slate-800">${title}</span>`,
        html: `<p class="text-sm text-slate-500">${text}</p>`,
        icon: icon,
        confirmButtonText: 'COMPRIS',
        confirmButtonColor: '#0F172A', // Ton bleu nuit
        buttonsStyling: true,
        customClass: {
            popup: 'rounded-[3rem] p-8 border-none',
            confirmButton: 'rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-widest shadow-xl'
        }
    });
};

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
    <div class="h-full flex flex-col bg-white animate-fadeIn">
        
        <!-- HEADER FIXE -->
        <header class="p-6 flex items-center justify-between border-b border-slate-50 shrink-0">
            <button onclick="window.prevStep()" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="text-center">
                <h2 class="font-black text-[11px] uppercase tracking-[0.2em] text-slate-800">Dossier d'Admission</h2>
                <p class="text-[9px] text-green-600 font-bold uppercase mt-0.5">Étape ${currentStep} / 4</p>
            </div>
            <div class="w-10"></div>
        </header>

        <!-- BARRE DE PROGRESSION -->
        <div class="h-1 bg-slate-100 shrink-0">
            <div class="h-full bg-green-500 transition-all duration-500" style="width: ${progress}%"></div>
        </div>

        <!-- ZONE DE CONTENU SCROLLABLE -->
        <main class="form-scroll-area custom-scroll">
            <div class="max-w-md mx-auto w-full flex-1">
                ${getStepHTML()}
            </div>

            <!-- BOUTON D'ACTION (Placé dans le scroll pour être toujours visible à la fin) -->
            <div class="max-w-md mx-auto w-full mt-8 pb-10">
                <button onclick="window.nextStep()" class="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    ${currentStep === 4 ? 'Finaliser l\'inscription' : 'Continuer'}
                    <i class="fa-solid fa-chevron-right text-[8px]"></i>
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
 * 🚀 INITIALISATION DE L'APP
 */
async function initApp() {
    const loader = document.getElementById("initial-loader");
    const token = localStorage.getItem("token");

    try {
        if (token) {
            if (!localStorage.getItem("onboarding_seen")) {
                      window.startOnboarding();
                      return; 
                  }
            renderLayout();
            // On lance le chargement mais on n'attend pas forcément la fin pour cacher le loader
            const lastView = localStorage.getItem("last_view") || "patients";
            await window.switchView(lastView);
        } else {
            renderLogin();
        }
    } catch (err) {
        console.error("Erreur Init:", err);
        renderLogin();
    } finally {
        // 🟢 QUOI QU'IL ARRIVE, ON CACHE LE LOADER ICI
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = "0";
                setTimeout(() => loader.classList.add("hidden"), 500);
            }, 1000); // On laisse 1 seconde pour que l'UI se dessine
        }
    }
}


/**
 * 🔑 LOGIN UI (Style Pinterest / Clean UI - Version Polie)
 */
function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="relative min-h-screen w-full flex flex-col justify-center items-center bg-[#F8FAFC] overflow-hidden px-4 font-sans text-center">
    
        <!-- Blobs animés (Positionnement optimisé pour Desktop & Mobile) -->
        <div class="absolute -top-20 -left-20 w-96 h-96 bg-green-200 rounded-full filter blur-[80px] opacity-40 animate-blob pointer-events-none"></div>
        <div class="absolute top-1/2 -right-20 w-80 h-80 bg-blue-200 rounded-full filter blur-[80px] opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>
        <div class="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-100 rounded-full filter blur-[80px] opacity-40 animate-blob animation-delay-4000 pointer-events-none"></div>

        <!-- CARTE DE CONNEXION (Glassmorphism Élite) -->
        <div class="relative w-full max-w-sm bg-white/70 backdrop-blur-3xl p-10 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white animate-fadeIn z-50">
            
            <!-- Logo Section -->
            <div class="text-center mb-10">
                <div class="w-24 h-24 mx-auto bg-gradient-to-tr from-green-500 to-emerald-400 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl shadow-green-500/20 mb-6 transform transition hover:scale-105 duration-500">
                    <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <h1 class="text-3xl font-[900] text-slate-900 tracking-tight leading-tight">Santé Plus</h1>
                <p class="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Protocole de confiance</p>
            </div>
            
            <!-- Formulaire -->
            <div class="space-y-4">
                <!-- Input Email -->
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-green-500 transition-colors">
                        <i class="fa-solid fa-envelope text-sm"></i>
                    </div>
                    <input id="email" type="email" 
                        class="w-full pl-12 pr-5 py-5 bg-white/50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm" 
                        placeholder="Adresse email">
                </div>

                <!-- Input Password -->
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-green-500 transition-colors">
                        <i class="fa-solid fa-shield-lock text-sm"></i>
                    </div>
                    <input id="password" type="password" 
                        class="w-full pl-12 pr-5 py-5 bg-white/50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm" 
                        placeholder="Code d'accès">
                </div>

                <!-- Bouton Connexion -->
                <button onclick="window.login()" id="btn-login" 
                    class="w-full mt-4 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black shadow-[0_15px_30px_rgba(15,23,42,0.2)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.3)] active:scale-[0.97] transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3">
                    Accéder à mon espace <i class="fa-solid fa-arrow-right-long opacity-50"></i>
                </button>
            </div>
        </div>

        <!-- Inscription (Design Pied de page) -->
        <div class="relative z-50 mt-10 text-center animate-fadeIn" style="animation-delay: 0.4s">
            <p class="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-4">Nouveau membre ?</p>
            <button onclick="window.openRegisterFamily()" 
                class="group bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100 hover:border-green-200 transition-all active:scale-95 flex items-center gap-3 mx-auto">
                <span class="text-slate-700 font-black text-[10px] uppercase tracking-widest">Créer un compte Famille</span>
                <div class="w-6 h-6 rounded-lg bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <i class="fa-solid fa-user-plus text-[10px]"></i>
                </div>
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
        
        <!-- 🖥️ SIDEBAR DESKTOP -->
        <aside class="hidden lg:flex flex-col w-72 bg-[#0F172A] text-white p-6 shadow-2xl z-30">
            <div class="flex items-center gap-3 mb-10 px-2">
                <div class="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <i class="fa-solid fa-heart-pulse text-white text-xl"></i>
                </div>
                <h2 class="font-black text-xl tracking-tighter uppercase leading-none">SPS</h2>
            </div>

            <!-- MENU SCROLLABLE SUR PC -->
            <nav class="flex-1 space-y-2 overflow-y-auto custom-scroll pr-2" id="nav-desktop">
                ${getNavLinks(userRole, 'desktop')}
            </nav>

            <!-- Profil Bas Sidebar (Fixe) -->
            <div class="mt-6 p-4 bg-slate-800/50 rounded-3xl border border-slate-700">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Session</p>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-black text-xs text-white">
                        ${userName.charAt(0)}
                    </div>
                    <p class="text-xs font-bold truncate flex-1">${userName}</p>
                </div>
                <button onclick="window.logout()" class="mt-4 w-full py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">
                    Déconnexion
                </button>
            </div>
        </aside>

        <!-- 📱 CONTENU PRINCIPAL -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            
            <!-- HEADER MOBILE & PC -->
            <header class="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 shrink-0 z-20">
                <div class="flex items-center gap-3">
                    <div class="lg:hidden w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                        <i class="fa-solid fa-heart-pulse text-sm"></i>
                    </div>
                    <h2 id="view-title" class="text-lg lg:text-2xl font-[900] text-slate-800 tracking-tight">Dashboard</h2>
                </div>

                <!-- ZONE UTILISATEUR (Indispensable pour mobile pour se déconnecter) -->
                <div class="flex items-center gap-3">
                    <button class="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
                        <i class="fa-solid fa-bell"></i>
                    </button>
                    <!-- Avatar cliquable pour voir le profil / se déconnecter -->
                    <button onclick="window.openProfileMenu()" class="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white">
                         <span class="font-black text-xs">${userName.charAt(0)}</span>
                    </button>
                </div>
            </header>

            <main id="main-content" class="flex-1 overflow-y-auto p-4 lg:p-10 custom-scroll pb-28 lg:pb-10">
                <div id="view-container" class="max-w-6xl mx-auto"></div>
            </main>

            <!-- NAVIGATION MOBILE (Épurée) -->
            <footer class="lg:hidden bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-3 fixed bottom-0 left-0 right-0 z-40 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                ${getNavLinks(userRole, 'mobile')}
            </footer>
        </div>
    </div>`;
}

/**
 * 👤 MODALE DE PROFIL RAPIDE (Pour Mobile)
 */
window.openProfileMenu = () => {
    const userName = localStorage.getItem("user_name");
    const userRole = localStorage.getItem("user_role");
    
    Swal.fire({
        title: `<div class="text-sm font-black uppercase text-slate-400 tracking-widest mb-1">Mon Compte</div><div class="text-xl font-black text-slate-800">${userName}</div>`,
        html: `
            <div class="text-center p-4">
                <div class="inline-block px-4 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase mb-6">${userRole}</div>
                <div class="space-y-3">
                    <button onclick="Swal.close()" class="w-full py-4 bg-slate-50 rounded-2xl font-bold text-slate-700 text-sm">Mon Profil</button>
                    <button onclick="window.logout()" class="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold text-sm">Déconnexion</button>
                </div>
            </div>`,
        showConfirmButton: false,
        customClass: { popup: 'rounded-[3rem] p-6' }
    });
};


/**
 * 🔗 GÉNÉRATEUR DE LIENS DE NAVIGATION SYNCHRONISÉ (Elite Version)
 */
function getNavLinks(role, mode) {
    const isMobile = mode === 'mobile';
    
    // Configuration centralisée des onglets
    const tabs = [
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', roles: ['COORDINATEUR'] },
        // 👇 LE NOUVEL ONGLET RADAR (Visible uniquement pour le coordinateur)
        { id: 'map', icon: 'fa-location-dot', label: 'Radar', roles: ['COORDINATEUR'] }, 
        
        { id: 'patients', icon: 'fa-hospital-user', label: 'Dossiers', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', icon: 'fa-calendar-check', label: 'Visites', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'feed', icon: 'fa-rss', label: 'Feed', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'billing', icon: 'fa-file-invoice-dollar', label: 'Factures', roles: ['COORDINATEUR', 'FAMILLE'] },
        { id: 'aidants', icon: 'fa-user-nurse', label: 'Équipe', roles: ['COORDINATEUR'] }
    ];

    return tabs.filter(tab => tab.roles.includes(role)).map(tab => {
        if (isMobile) {
            // Rendu pour la barre du bas (Mobile)
            return `
                <button onclick="switchView('${tab.id}')" data-view="${tab.id}" class="nav-btn flex flex-col items-center gap-1 flex-1 text-slate-400 transition-all">
                    <i class="fa-solid ${tab.icon} text-lg"></i>
                    <span class="text-[8px] font-black uppercase tracking-tighter">${tab.label}</span>
                </button>`;
        } else {
            // Rendu pour la Sidebar latérale (Desktop)
            return `
                <button onclick="switchView('${tab.id}')" data-view="${tab.id}" class="sidebar-link w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-slate-400 transition-all text-sm mb-1">
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

  // 🛡️ 1. SÉCURITÉ : BLOCAGE SI FACTURE EN RETARD
  const restrictedViews = ["feed", "visits", "commandes"];
  if (userRole === "FAMILLE" && paymentStatus === "En retard" && restrictedViews.includes(viewName)) {
    UI.vibrate("error");
    return Swal.fire({
      icon: "warning",
      title: `<span class="text-rose-600 font-black">Accès Suspendu</span>`,
      html: `<p class="text-sm text-slate-500">Merci de régulariser votre abonnement pour accéder au suivi en direct de votre proche.</p>`,
      confirmButtonText: "VOIR MA FACTURE",
      confirmButtonColor: "#0F172A",
      customClass: { popup: 'rounded-[2.5rem]' }
    }).then(() => window.switchView("billing"));
  }

  // 🎨 2. MISE À JOUR VISUELLE DES ONGLETS (Desktop & Mobile)
  document.querySelectorAll(".nav-btn, .sidebar-link").forEach((btn) => {
    const isActive = btn.dataset.view === viewName;
    if (btn.classList.contains('sidebar-link')) {
        btn.classList.toggle("active", isActive);
        btn.classList.toggle("text-white", isActive);
        btn.classList.toggle("text-slate-400", !isActive);
    } else {
        btn.classList.toggle("text-green-600", isActive);
        btn.classList.toggle("text-slate-400", !isActive);
    }
  });

  // 📝 3. MISE À JOUR DU TITRE (Header)
  const viewTitles = {
    dashboard: "Aperçu Analytique",
    patients: "Gestion des Dossiers",
    visits: "Suivi des Interventions",
    feed: "Journal de Soins Live",
    billing: "Centre de Facturation",
    aidants: "Gestion de l'Équipe",
    commandes: "Pharmacie & Logistique",
    map: "Radar Terrain Live" // 👈 Ajouté pour la cohérence
  };
  if (titleElement) titleElement.innerText = viewTitles[viewName] || "Santé Plus";

  // 💾 4. MÉMOIRE DE NAVIGATION
  localStorage.setItem("last_view", viewName);
  AppState.currentView = viewName;

  // 🔄 5. LOADER ÉLÉGANT
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-64 animate-pulse">
        <i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-4xl mb-4"></i>
        <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Synchronisation...</p>
    </div>`;

  // 🚀 6. GÉNÉRATION DE LA VUE
  try {
      switch (viewName) {
        case "dashboard": 
            await Dashboard.loadAdminDashboard(); 
            break;

        case "patients":
            // Injection de la structure pour les dossiers
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
                <div id="patients-list" class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20"></div>`;
            await Patients.loadPatients();
            break;

        case "visits":
            await Visites.loadVisits();
            break;

        case "feed":
            if (!AppState.currentPatient && userRole === "FAMILLE") return window.switchView("patients");
            await Messages.loadFeed();
            break;

        case "billing":
            await Billing.loadBilling();
            break;

        case "aidants": 
            await Aidants.loadAidants(); 
            break;

        case "commandes":
            await Commandes.loadCommandes();
            break;
        
        case "map":
            await MapModule.initLiveMap();
            break;
      }
  } catch (err) {
      container.innerHTML = `
        <div class="p-10 text-center bg-white rounded-[2rem] border border-rose-100 shadow-sm">
            <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-4"></i>
            <p class="text-sm font-black text-slate-800 uppercase">Erreur de liaison</p>
            <p class="text-xs text-slate-400 mt-2">${err.message}</p>
        </div>`;
  }
};



window.startOnboarding = () => {
    // Si l'utilisateur l'a déjà vu, on ne l'affiche pas
    if (localStorage.getItem("onboarding_seen")) return;
    
    onboardingStep = 0;
    renderOnboarding();
};

function renderOnboarding() {
    const app = document.getElementById("app");
    const step = ONBOARDING_STEPS[onboardingStep];
    const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;

    app.innerHTML = `
        <div class="onboarding-overlay animate-fadeIn font-sans bg-white">
            
            <!-- Zone Image Premium -->
            <div class="onboarding-image-container animate-fadeIn">
                <img src="${step.image}" class="onboarding-img shadow-2xl">
                <div class="onboarding-image-blur"></div>
                
                <!-- Bouton Ignorer flottant -->
                ${!isLast ? `
                    <button onclick="window.finishOnboarding()" class="absolute top-10 right-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-white tracking-widest border border-white/30 z-50">
                        Ignorer
                    </button>
                ` : ''}
            </div>

            <!-- Zone Texte & Navigation -->
            <div class="flex-1 flex flex-col items-center text-center px-10">
                <h2 class="text-3xl font-[900] text-slate-900 tracking-tight mb-4 leading-tight">
                    ${step.title}
                </h2>
                <p class="text-slate-400 text-sm leading-relaxed mb-10">
                    ${step.desc}
                </p>

                <!-- Dots de progression -->
                <div class="flex gap-2 mb-12">
                    ${ONBOARDING_STEPS.map((_, i) => `
                        <div class="onboarding-dot ${i === onboardingStep ? 'active' : ''}"></div>
                    `).join('')}
                </div>

                <!-- Bouton Principal -->
                <button onclick="${isLast ? 'window.finishOnboarding()' : 'window.nextOnboarding()'}" 
                    class="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 transition-all">
                    ${isLast ? 'Démarrer SPS Élite' : 'Continuer'}
                </button>
            </div>
        </div>
    `;
}
window.nextOnboarding = () => {
    onboardingStep++;
    renderOnboarding();
};

window.finishOnboarding = () => {
    localStorage.setItem("onboarding_seen", "true");
    window.location.reload(); // Redémarre l'app normalement vers le Dashboard
};

// 🔑 BRANCHEMENTS GLOBAUX (À LA FIN POUR ÊTRE SÛR QUE TOUT EXISTE)
window.CONFIG = CONFIG;
window.AppState = AppState;
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.openAddPatient = Patients.openAddPatientModal;
window.openLinkFamilyModal = Patients.openLinkFamilyModal;
window.openOrderModal = Commandes.openOrderModal;
window.markAsDelivered = Commandes.markAsDelivered;
window.viewPatientFeed = (id) => { AppState.currentPatient = id; window.switchView("feed"); };
window.nextStep = nextStep;
window.openAddAidantModal = Aidants.openAddAidantModal;
window.loadAdminDashboard = Dashboard.loadAdminDashboard;
window.renderRegisterStep = renderRegisterStep;
window.renderLayout = renderLayout;
window.switchView = switchView;
window.prevStep = () => { 
    if (currentStep > 1) {
        currentStep--;
        renderRegisterStep();
    } else {
        window.location.reload(); 
    }
};

initApp();
