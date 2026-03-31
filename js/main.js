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
const ONBOARDING_STEPS =[
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
  customClass: { popup: 'rounded-3xl shadow-2xl border border-slate-100' }
});

window.showAppAlert = (title, text, icon = 'success') => {
    Swal.fire({
        title: `<span class="text-xl font-black text-slate-800">${title}</span>`,
        html: `<p class="text-sm text-slate-500">${text}</p>`,
        icon: icon,
        confirmButtonText: 'COMPRIS',
        confirmButtonColor: '#0F172A',
        buttonsStyling: true,
        customClass: {
            popup: 'rounded-[3rem] p-8 border-none',
            confirmButton: 'rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-widest shadow-xl'
        }
    });
};

/* --- VARIABLES D'INSCRIPTION --- */
let registrationData = {};
let currentStep = 1;

/**
 * 🚀 INITIALISATION DE L'APP
 */
async function initApp() {
    const loader = document.getElementById("initial-loader");
    const token = localStorage.getItem("token");

    try {
        if (token) {
            // Check de l'onboarding pour la première connexion
            if (!localStorage.getItem("onboarding_seen")) {
                window.startOnboarding();
                return; 
            }
            renderLayout();
            Visites.resumeTrackingIfActive(); 
            const userRole = localStorage.getItem("user_role");
            const defaultView = userRole === "COORDINATEUR" ? "dashboard" : "patients";
            const lastView = localStorage.getItem("last_view") || defaultView;
            await window.switchView(lastView);
        } else {
            renderAuthView('login'); // Appel de la vue Unifiée
        }
    } catch (err) {
        console.error("Erreur Init:", err);
        renderAuthView('login');
    } finally {
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = "0";
                setTimeout(() => loader.classList.add("hidden"), 500);
            }, 1000);
        }
    }
}


/**
 * 💎 MOTEUR D'AUTHENTIFICATION UNIFIÉ (Login + Admission + OTP In-Card)
 */
function renderAuthView(mode = 'login', stepSource = 1) {
    const app = document.getElementById("app");
    currentStep = typeof stepSource === 'number' ? stepSource : 1; 
    const otpEmail = mode === 'otp' ? stepSource : null; // Si c'est OTP, on passe l'email ici

    let dynamicContent = "";
    let stepTitle = mode === 'login' ? "Espace Sécurisé" : (mode === 'otp' ? "Sécurité Avancée" : `Étape ${currentStep} / 4`);

    // 1. MODE CONNEXION
    if (mode === 'login') {
        dynamicContent = `
            <div class="px-8 pb-8 space-y-4 animate-fadeIn flex flex-col justify-center h-full mt-4">
                <div class="relative group">
                    <i class="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                    <input id="email" type="email" class="app-input !pl-12" placeholder="Adresse email" value="${registrationData.email || ''}">
                </div>
                <div class="relative group">
                    <i class="fa-solid fa-shield-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                    <input id="password" type="password" class="app-input !pl-12" placeholder="Code d'accès">
                </div>
                <button onclick="window.login()" id="btn-login" class="w-full mt-2 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3">
                    Accéder à mon espace <i class="fa-solid fa-arrow-right-long opacity-50"></i>
                </button>
            </div>`;
    } 
    // 2. MODE ADMISSION (Formulaire par étapes)
    else if (mode === 'register') {
        dynamicContent = `
            <div class="px-8 pb-4 animate-fadeIn flex flex-col min-h-full">
                <div class="mb-auto">
                    ${getStepHTML()}
                </div>
                <div class="flex gap-3 mt-6 shrink-0">
                    ${currentStep > 1 ? `<button onclick="window.prevAuthStep()" class="w-12 h-12 rounded-[1.25rem] bg-slate-100 text-slate-400 flex items-center justify-center shadow-sm active:scale-95 transition-all"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                    <button onclick="window.nextAuthStep()" class="flex-1 bg-green-600 text-white py-3 rounded-[1.25rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-green-200 active:scale-95 transition-all">
                        ${currentStep === 4 ? 'Finaliser' : 'Suivant'}
                    </button>
                </div>
            </div>`;
    }
    // 3. 🔒 MODE OTP (Nouveau design)
    else if (mode === 'otp') {
        dynamicContent = `
            <div class="px-8 pb-8 space-y-6 animate-fadeIn flex flex-col justify-center h-full text-center">
                <div class="w-20 h-20 mx-auto bg-amber-50 border-4 border-white shadow-xl text-amber-500 rounded-[2rem] flex items-center justify-center text-3xl mb-2">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <div>
                    <h3 class="text-xl font-[900] text-slate-800 tracking-tight">Code de vérification</h3>
                    <p class="text-xs text-slate-500 font-medium mt-2 leading-relaxed">Saisissez le code à 6 chiffres envoyé à <br><b class="text-slate-800">${otpEmail}</b></p>
                </div>
                
                <div class="pt-4">
                    <input id="otp-code" type="text" maxlength="6" inputmode="numeric" autocomplete="one-time-code" class="w-full py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:border-amber-400 transition-all text-3xl font-black text-slate-800 text-center tracking-[0.5em] shadow-inner" placeholder="••••••">
                </div>
                
                <button onclick="window.verifyOTP('${otpEmail}')" id="btn-otp" class="w-full mt-4 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3">
                    Vérifier le code <i class="fa-solid fa-shield-check"></i>
                </button>
                
                <button onclick="window.renderAuthView('login')" class="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 hover:text-slate-700 transition-colors">
                    <i class="fa-solid fa-arrow-left mr-1"></i> Annuler
                </button>
            </div>`;
    }

    // 🚀 LE CONTENEUR PRINCIPAL
    app.innerHTML = `
    <div class="fixed inset-0 w-full h-[100dvh] flex items-center justify-center bg-[#F8FAFC] p-4 lg:p-8 z-50">
        
        <!-- Blobs animés -->
        <div class="absolute -top-20 -left-20 w-96 h-96 bg-green-200 rounded-full filter blur-[100px] opacity-40 animate-blob pointer-events-none z-0"></div>
        <div class="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-100 rounded-full filter blur-[100px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>

        <!-- 💎 LA CARTE FIXE -->
        <div class="auth-card relative w-full max-w-md bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] border border-white z-10 flex flex-col h-[620px] max-h-[85dvh]">
            
            <!-- HEADER FIXE -->
            <div class="shrink-0 text-center pt-8 pb-4">
                <div class="w-14 h-14 mx-auto bg-slate-900 text-white rounded-[1.2rem] flex items-center justify-center text-xl shadow-xl mb-3">
                    <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <h1 class="text-xl font-[900] text-slate-900 tracking-tight leading-none">Santé Plus</h1>
                <p class="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em] mt-1.5">${stepTitle}</p>
            </div>

            <!-- TABS DE BASCULE (Cachées en mode OTP) -->
            ${mode !== 'otp' ? `
                <div class="shrink-0 px-8 mb-4 animate-fadeIn">
                    <div class="bg-slate-100/50 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200/30">
                        <button onclick="window.renderAuthView('login')" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            Connexion
                        </button>
                        <button onclick="window.renderAuthView('register', 1)" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            Admission
                        </button>
                    </div>
                </div>
            ` : ''}

            <!-- JAUGE DE PROGRESSION -->
            ${mode === 'register' ? `
                <div class="shrink-0 px-8 mb-4">
                    <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-green-500 transition-all duration-300" style="width: ${(currentStep/4)*100}%"></div>
                    </div>
                </div>
            ` : ''}

            <!-- ZONE DE CONTENU SCROLLABLE -->
            <div class="flex-1 overflow-y-auto custom-scroll relative">
                ${dynamicContent}
            </div>

            <!-- FOOTER FIXE -->
            <div class="shrink-0 bg-slate-50/50 py-4 px-8 border-t border-slate-100 flex items-center justify-between mt-auto">
                <span class="text-[8px] text-slate-400 font-[800] uppercase tracking-widest">© 2026 SPS Elite</span>
                <span class="text-[8px] text-green-500 font-[800] uppercase tracking-widest flex items-center gap-1"><i class="fa-solid fa-shield-check"></i> Sécurisé</span>
            </div>
            
        </div>
    </div>`;
}

/**
 * 📦 MINI-VUES DE L'INSCRIPTION IN-CARD
 */
function getStepHTML() {
    switch(currentStep) {
        case 1: return `
            <div class="text-center mb-4">
                <h3 class="text-base font-black text-slate-800">Identité du Payeur</h3>
            </div>
            <div class="space-y-3">
                <input id="f-nom" class="app-input !py-3 !text-sm" placeholder="Nom complet" value="${registrationData.nom_famille || ''}">
                <select id="f-lien" class="app-input !py-3 !text-sm">
                    <option value="">Lien de parenté...</option>
                    <option value="Fils/Fille">Fils / Fille</option>
                    <option value="Frère/Soeur">Frère / Soeur</option>
                    <option value="Conjoint">Conjoint(e)</option>
                </select>
                <input id="f-email" type="email" class="app-input !py-3 !text-sm" placeholder="Email" value="${registrationData.email || ''}">
                <input id="f-tel" class="app-input !py-3 !text-sm" placeholder="Téléphone" value="${registrationData.tel_famille || ''}">
                <input id="f-pass" type="password" class="app-input !py-3 !text-sm" placeholder="Créer un mot de passe" value="${registrationData.password || ''}">
            </div>`;
        
        case 2: return `
            <div class="text-center mb-4">
                <h3 class="text-base font-black text-slate-800">Le Proche au Bénin</h3>
            </div>
            <div class="space-y-3">
                <input id="p-nom" class="app-input !py-3 !text-sm" placeholder="Nom complet du patient" value="${registrationData.nom_patient || ''}">
                <input id="p-age" type="number" class="app-input !py-3 !text-sm" placeholder="Âge du patient" value="${registrationData.age_patient || ''}">
                <input id="p-addr" class="app-input !py-3 !text-sm" placeholder="Adresse exacte (Ville, Quartier)" value="${registrationData.adresse_patient || ''}">
            </div>`;

        case 3: return `
            <div class="text-center mb-4">
                <h3 class="text-base font-black text-slate-800">Santé & Urgence</h3>
            </div>
            <div class="space-y-4">
                <div class="flex justify-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="med-hist accent-green-600" value="Diabète"> Diabète</label>
                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="med-hist accent-green-600" value="Tension"> Tension</label>
                </div>
                <input id="p-urgence" class="app-input !py-3 !text-sm" placeholder="Contact d'urgence local" value="${registrationData.contact_urgence || ''}">
                <textarea id="p-notes" class="app-input !py-3 !text-sm h-20" placeholder="Observations médicales...">${registrationData.notes_medicales ? registrationData.notes_medicales.split(' | ')[1] || '' : ''}</textarea>
            </div>`;

        case 4: return `
            <div class="text-center mb-4">
                <h3 class="text-base font-black text-slate-800">Formule de Soins</h3>
            </div>
            <div class="space-y-3">
                <button onclick="window.setPlan('Basic')" class="w-full p-4 rounded-[1.25rem] border-2 ${registrationData.formule === 'Basic' ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50'} text-left transition-all">
                    <h4 class="font-black text-slate-800 text-xs uppercase">Basic <span class="text-green-600 float-right">50k CFA</span></h4>
                    <p class="text-[9px] text-slate-500 mt-1 font-bold">1 visite / semaine</p>
                </button>
                <button onclick="window.setPlan('Standard')" class="w-full p-4 rounded-[1.25rem] border-2 ${registrationData.formule === 'Standard' ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50'} text-left transition-all">
                    <h4 class="font-black text-slate-800 text-xs uppercase">Standard <span class="text-green-600 float-right">75k CFA</span></h4>
                    <p class="text-[9px] text-slate-500 mt-1 font-bold">3 visites / semaine</p>
                </button>
                <button onclick="window.setPlan('Premium')" class="w-full p-4 rounded-[1.25rem] border-2 ${registrationData.formule === 'Premium' ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50'} text-left transition-all">
                    <h4 class="font-black text-slate-800 text-xs uppercase">Premium <span class="text-green-600 float-right">100k CFA</span></h4>
                    <p class="text-[9px] text-slate-500 mt-1 font-bold">Suivi quotidien (7j/7)</p>
                </button>
            </div>`;
    }
}

/**
 * 🚶 LOGIQUE DU STEPPER & INSCRIPTION
 */
function setPlan(plan) {
    registrationData.formule = plan;
    renderAuthView('register', 4);
}

function nextAuthStep() {
    if (currentStep === 1) {
        registrationData.nom_famille = document.getElementById('f-nom').value;
        registrationData.email = document.getElementById('f-email').value;
        registrationData.tel_famille = document.getElementById('f-tel').value;
        registrationData.password = document.getElementById('f-pass').value;
        registrationData.lien_parente = document.getElementById('f-lien').value;
        if(!registrationData.email || !registrationData.password) return UI.vibrate('error');
    } else if (currentStep === 2) {
        registrationData.nom_patient = document.getElementById('p-nom').value;
        registrationData.age_patient = document.getElementById('p-age').value;
        registrationData.adresse_patient = document.getElementById('p-addr').value;
    } else if (currentStep === 3) {
        const history = Array.from(document.querySelectorAll('.med-hist:checked')).map(el => el.value);
        registrationData.contact_urgence = document.getElementById('p-urgence').value;
        registrationData.notes_medicales = history.join(', ') + " | " + document.getElementById('p-notes').value;
    }

    if (currentStep < 4) {
        currentStep++;
        renderAuthView('register', currentStep);
    } else {
        submitRegistration();
    }
}

function prevAuthStep() {
    if (currentStep > 1) {
        currentStep--;
        renderAuthView('register', currentStep);
    }
}

async function submitRegistration() {
    if(!registrationData.formule) return Swal.fire("Erreur", "Veuillez choisir une formule", "warning");

    registrationData.email = registrationData.email.trim().toLowerCase();

    Swal.fire({ title: 'Création du dossier...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const res = await fetch(`${CONFIG.API_URL}/auth/register-family-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const data = await res.json(); 

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
 * 🏗️ STRUCTURE PRINCIPALE (LAYOUT)
 */
function renderLayout() {
  const userRole = localStorage.getItem("user_role");
  const userName = localStorage.getItem("user_name");

  document.getElementById("app").innerHTML = `
    <div class="flex h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans select-none">
        
        <!-- 🖥️ SIDEBAR DESKTOP -->
        <aside class="hidden lg:flex flex-col w-80 bg-[#0F172A] text-white p-8 shadow-[10px_0_40px_rgba(0,0,0,0.04)] z-50">
            <div class="flex items-center gap-4 mb-14 px-2">
                <div class="w-12 h-12 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <i class="fa-solid fa-heart-pulse text-white text-2xl"></i>
                </div>
                <div>
                    <h2 class="font-[900] text-xl tracking-tighter uppercase leading-none italic">SPS</h2>
                    <span class="text-[8px] text-green-400 font-black tracking-[0.4em] uppercase opacity-80">Elite Management</span>
                </div>
            </div>

            <nav class="flex-1 space-y-3" id="nav-desktop">
                ${getNavLinks(userRole, 'desktop')}
            </nav>

            <div class="mt-auto p-5 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-black text-xs border border-white/20">
                        ${userName ? userName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-xs font-black truncate">${userName || 'Utilisateur'}</p>
                        <p class="text-[9px] text-slate-500 uppercase font-black tracking-widest">${userRole}</p>
                    </div>
                </div>
                <button onclick="window.logout()" class="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2">
                    <i class="fa-solid fa-power-off"></i> Déconnexion
                </button>
            </div>
        </aside>

        <!-- 🚀 CONTENEUR DE CONTENU -->
        <div class="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden">
            
            <header class="h-20 lg:h-24 glass-header border-b border-slate-200/50 flex items-center justify-between px-6 lg:px-12 shrink-0 z-40">
                <div class="lg:hidden flex items-center">
                    <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl rotate-[-5deg]">
                        <i class="fa-solid fa-heart-pulse text-sm"></i>
                    </div>
                </div>
                
                <div class="flex flex-col">
                    <h2 id="view-title" class="text-xl lg:text-3xl font-[900] text-slate-900 tracking-tight">Tableau de bord</h2>
                    <p class="hidden lg:block text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Santé Plus • Protocole de confiance</p>
                </div>

                <div class="flex items-center gap-3 lg:gap-6">
                    <button class="relative w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-green-600 transition-all shadow-sm group">
                        <i class="fa-solid fa-bell text-sm"></i>
                        <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                    </button>
                    
                    <div class="h-8 w-[1px] bg-slate-100 hidden md:block"></div>
                    
                    <div class="flex items-center gap-3 pl-2">
                         <div class="hidden md:flex flex-col text-right">
                            <p class="text-xs font-black text-slate-900 leading-none">${userName}</p>
                            <span class="text-[9px] text-green-600 font-bold uppercase mt-1 tracking-tighter">Statut : ${userRole}</span>
                         </div>
                         <button onclick="window.openProfileMenu()" class="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 active:scale-95 transition-all">
                            <i class="fa-solid fa-user-gear text-sm"></i>
                         </button>
                    </div>
                </div>
            </header>

            <div class="absolute top-40 left-[-5%] w-[500px] h-[500px] bg-green-200/20 rounded-full blur-[120px] pointer-events-none z-0 animate-blob"></div>
            <div class="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none z-0 animate-blob animation-delay-2000"></div>

            <main id="main-content" class="flex-1 overflow-y-auto custom-scroll p-6 lg:p-12 z-10 relative">
                <div id="view-container" class="max-w-7xl mx-auto min-h-full"></div>
            </main>

            <footer class="lg:hidden h-20 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-6 py-2 fixed bottom-0 left-0 right-0 z-50 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                ${getNavLinks(userRole, 'mobile')}
            </footer>
        </div>
    </div>`;
}

function getNavLinks(role, mode) {
    const isMobile = mode === 'mobile';
    const tabs =[
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', roles: ['COORDINATEUR'] },
        { id: 'map', icon: 'fa-location-dot', label: 'Radar', roles: ['COORDINATEUR'] }, 
        { id: 'patients', icon: 'fa-hospital-user', label: 'Dossiers', roles:['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', icon: 'fa-calendar-check', label: 'Visites', roles:['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'feed', icon: 'fa-rss', label: 'Feed', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'billing', icon: 'fa-file-invoice-dollar', label: 'Factures', roles:['COORDINATEUR', 'FAMILLE'] },
        { id: 'aidants', icon: 'fa-user-nurse', label: 'Équipe', roles: ['COORDINATEUR'] }
    ];

    return tabs.filter(tab => tab.roles.includes(role)).map(tab => {
        if (isMobile) {
            return `
                <button onclick="window.switchView('${tab.id}')" data-view="${tab.id}" class="nav-btn flex flex-col items-center gap-1 flex-1 text-slate-400 transition-all">
                    <i class="fa-solid ${tab.icon} text-lg"></i>
                    <span class="text-[8px] font-black uppercase tracking-tighter">${tab.label}</span>
                </button>`;
        } else {
            return `
                <button onclick="window.switchView('${tab.id}')" data-view="${tab.id}" class="sidebar-link w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-slate-400 transition-all text-sm mb-1">
                    <i class="fa-solid ${tab.icon} text-lg"></i>
                    <span>${tab.label}</span>
                </button>`;
        }
    }).join('');
}

window.switchView = async (viewName) => {
  const container = document.getElementById("view-container");
  const titleElement = document.getElementById("view-title");
  if (!container) return;

  const userRole = localStorage.getItem("user_role");
  const paymentStatus = localStorage.getItem("payment_status");

  const restrictedViews =["feed", "visits", "commandes"];
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

  const viewTitles = {
    dashboard: "Aperçu Analytique", map: "Radar Terrain Live", patients: "Gestion des Dossiers",
    visits: "Suivi des Interventions", feed: "Journal de Soins Live", billing: "Centre de Facturation",
    aidants: "Gestion de l'Équipe", commandes: "Pharmacie & Logistique"
  };
  if (titleElement) titleElement.innerText = viewTitles[viewName] || "Santé Plus";

  localStorage.setItem("last_view", viewName);
  AppState.currentView = viewName;

  container.innerHTML = `<div class="flex flex-col items-center justify-center h-64 animate-pulse"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-4xl mb-4"></i></div>`;

  try {
      switch (viewName) {
        case "dashboard": await Dashboard.loadAdminDashboard(); break;
        case "map": await MapModule.initLiveMap(); break;
        case "patients": 
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
        case "visits": await Visites.loadVisits(); break;
        case "feed": 
            if (!AppState.currentPatient && userRole === "FAMILLE") return window.switchView("patients");
            await Messages.loadFeed(); 
            break;
        case "billing": await Billing.loadBilling(); break;
        case "aidants": await Aidants.loadAidants(); break;
        case "commandes": await Commandes.loadCommandes(); break;
        case "add-patient": await Patients.renderAddPatientView(); break;
        case "link-family": await Patients.renderLinkFamilyView(); break;
        case "add-aidant": await Aidants.renderAddAidantView(); break;
        case "end-visit": await Visites.renderEndVisitView(); break;
      }
  } catch (err) {
      container.innerHTML = `<div class="p-10 text-center bg-white rounded-[2rem] border border-rose-100 shadow-sm"><i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-4"></i><p class="text-sm font-black text-slate-800 uppercase">Erreur de liaison</p><p class="text-xs text-slate-400 mt-2">${err.message}</p></div>`;
  }
};

window.openProfileMenu = () => {
    const userName = localStorage.getItem("user_name");
    const userRole = localStorage.getItem("user_role");
    Swal.fire({
        title: `<div class="text-sm font-black uppercase text-slate-400 tracking-widest mb-1">Mon Compte</div><div class="text-xl font-black text-slate-800">${userName}</div>`,
        html: `
            <div class="text-center p-4">
                <div class="inline-block px-4 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase mb-6">${userRole}</div>
                <div class="space-y-3">
                    <button onclick="window.logout()" class="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Déconnexion</button>
                </div>
            </div>`,
        showConfirmButton: false,
        customClass: { popup: 'rounded-[3rem] p-6' }
    });
};

/* --- 📝 LOGIQUE DE L'ONBOARDING (Slides d'accueil) --- */
window.startOnboarding = () => {
    if (localStorage.getItem("onboarding_seen")) return;
    onboardingStep = 0;
    renderOnboarding();
};

function renderOnboarding() {
    const app = document.getElementById("app");
    const step = ONBOARDING_STEPS[onboardingStep];
    const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;

    app.innerHTML = `
        <div class="absolute inset-0 z-[10000] animate-fadeIn font-sans bg-white flex flex-col">
            <div class="onboarding-image-container animate-fadeIn">
                <img src="${step.image}" class="onboarding-img shadow-2xl">
                <div class="onboarding-image-blur"></div>
                ${!isLast ? `
                    <button onclick="window.finishOnboarding()" class="absolute top-10 right-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-white tracking-widest border border-white/30 z-50">
                        Ignorer
                    </button>
                ` : ''}
            </div>

            <div class="flex-1 flex flex-col items-center text-center px-10 pb-10">
                <h2 class="text-3xl font-[900] text-slate-900 tracking-tight mb-4 leading-tight">
                    ${step.title}
                </h2>
                <p class="text-slate-400 text-sm leading-relaxed mb-auto">
                    ${step.desc}
                </p>

                <div class="flex gap-2 mb-8">
                    ${ONBOARDING_STEPS.map((_, i) => `<div class="onboarding-dot ${i === onboardingStep ? 'active' : ''}"></div>`).join('')}
                </div>

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
    window.location.reload(); 
};



/* --- 🔑 MAÎTRE DES BRANCHEMENTS --- */
window.CONFIG = CONFIG;
window.AppState = AppState;
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.verifyOTP = Auth.verifyOTP;

// 🚀 NOUVELLE LOGIQUE DE PAGES (Adieu les modales pour la gestion !)
window.openAddPatient = () => window.switchView('add-patient');
window.openEndVisit = () => window.switchView('end-visit');
window.submitEndVisit = Visites.submitEndVisit;
window.submitAddAidant = Aidants.submitAddAidant;
window.openLinkFamilyModal = (id, name) => {
    AppState.tempData = { patientId: id, patientName: name }; 
    window.switchView('link-family');
};

// Modales restantes (à transformer bientôt)
window.openAddAidantModal = Aidants.openAddAidantModal;
window.openOrderModal = Commandes.openOrderModal;
window.markAsDelivered = Commandes.markAsDelivered;

window.viewPatientFeed = (id) => { AppState.currentPatient = id; window.switchView("feed"); };
window.switchView = switchView;

// Inscription In-Card
window.renderAuthView = renderAuthView;
window.nextAuthStep = nextAuthStep;
window.prevAuthStep = prevAuthStep;
window.setPlan = setPlan;

// Onboarding
window.startOnboarding = startOnboarding;
window.finishOnboarding = finishOnboarding;
window.nextOnboarding = nextOnboarding;
window.setPatientHomeDirect = (id) => window.setPatientHomeDirect(id);


initApp();
