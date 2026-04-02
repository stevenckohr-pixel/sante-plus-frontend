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
import * as MapModule from "./modules/map.js";
import * as Planning from "./modules/planning.js";
import * as Admin from "./modules/admin.js";
import { UI, showToast, showSuccessToast, showErrorToast, showWarningToast, showInfoToast, openModernSelector, initMicroInteractions, setSoundsEnabled, getSoundsEnabled, refreshMicroInteractions, playSound, showLocalLoader, hideLocalLoader } from "./core/utils.js";


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





// ============================================
// LOADER GLOBAL
// ============================================

let loaderTimeout = null;

function showGlobalLoader() {
    let loader = document.getElementById('global-loader');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'global-loader';
        loader.innerHTML = `
            <div class="relative mb-4">
                <div class="loader-ring"></div>
                <img src="https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png" class="loader-heart">
            </div>
            <p class="loader-text">Santé Plus Services</p>
        `;
        document.body.appendChild(loader);
    }
    
    // Applique la couleur rose ou verte selon le contexte
    const isMaman = localStorage.getItem('user_is_maman') === 'true';
    if (isMaman) {
        loader.classList.add('rose');
    } else {
        loader.classList.remove('rose');
    }
    
    loader.classList.remove('hidden');
    loader.style.opacity = '1';
}

function hideGlobalLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.add('hidden');
        loader.style.opacity = '0';
    }
}
// Force la disparition du loader après un délai max (sécurité)
function hideGlobalLoaderWithDelay() {
    if (loaderTimeout) clearTimeout(loaderTimeout);
    loaderTimeout = setTimeout(() => {
     hideGlobalLoader();
    }, 5000); // 5 secondes max
}


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
 * 🚀 INITIALISATION AU DÉMARRAGE
 */
async function initApp() {
    const loader = document.getElementById("initial-loader");
    const token = localStorage.getItem("token");


    // Initialiser les micro-interactions
    initMicroInteractions();
    
    // Récupérer la préférence utilisateur pour les sons
    const savedSoundPref = localStorage.getItem('sounds_enabled');
    if (savedSoundPref !== null) {
        setSoundsEnabled(savedSoundPref === 'true');
    }

    // On prépare la disparition du loader
    const hideLoader = () => {
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => loader.classList.add("hidden"), 500);
        }
    };

    try {
        if (token) {
            // Check de l'onboarding
            if (!localStorage.getItem("onboarding_seen")) {
                hideLoader(); // On cache le loader avant de lancer l'onboarding
                window.startOnboarding();
                return; 
            }
            
            renderLayout();
            Visites.resumeTrackingIfActive(); 
            
            const userRole = localStorage.getItem("user_role");
            // Adaptation Viewport : 'home' pour mobile, 'dashboard' pour coordinateur desktop
            const defaultView = window.innerWidth < 1024 ? "home" : (userRole === "COORDINATEUR" ? "dashboard" : "patients");
            const lastView = localStorage.getItem("last_view") || defaultView;
            
            await window.switchView(lastView);
            hideLoader(); // Cache après le rendu
        } else {
            renderAuthView('login');
            hideLoader(); // Cache après le login
        }
    } catch (err) {
        console.error("Erreur Init:", err);
        renderAuthView('login');
        hideLoader();
    }
}

/**
 * 💎 MOTEUR D'AUTHENTIFICATION UNIFIÉ (Login + Admission + OTP In-Card)
 */

function renderAuthView(mode = 'login', stepSource = 1) {
    const app = document.getElementById("app");
    currentStep = typeof stepSource === 'number' ? stepSource : 1; 
    const otpEmail = mode === 'otp' ? stepSource : null;

    // ============================================
    // 🎨 COULEURS DYNAMIQUES SELON LA CATÉGORIE
    // ============================================
    const isMamanFlow = registrationData.categorie === 'MAMAN_BEBE';
    const accentBgClass = isMamanFlow ? 'bg-rose-primary' : 'bg-gold-primary';
    const accentHoverClass = isMamanFlow ? 'hover:bg-rose-600' : 'hover:bg-amber-500';
    const accentShadowClass = isMamanFlow ? 'shadow-rose-200' : 'shadow-amber-200';
    const progressColor = isMamanFlow ? 'bg-rose-primary' : 'bg-gold-primary';

    let dynamicContent = "";
    let stepTitle = mode === 'login' ? "Espace Sécurisé" : (mode === 'otp' ? "Sécurité Avancée" : `Étape ${currentStep} / 6`);

    // 1. MODE CONNEXION
    if (mode === 'login') {
        dynamicContent = `
            <div class="px-8 pb-8 space-y-4 animate-fadeIn flex flex-col justify-center min-h-full">
                <div class="relative group">
                    <i class="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                    <input id="email" type="email" class="app-input !pl-12" placeholder="Adresse email" value="${registrationData.email || ''}">
                </div>
                <div class="relative group">
                    <i class="fa-solid fa-shield-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                    <input id="password" type="password" class="app-input !pl-12" placeholder="Code d'accès">
                </div>
                <button onclick="window.login()" id="btn-login" class="w-full mt-4 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3">
                    Accéder à mon espace <i class="fa-solid fa-arrow-right-long opacity-50"></i>
                </button>
            </div>`;
    } 
    // 2. MODE ADMISSION (avec couleurs dynamiques)
    else if (mode === 'register') {
        dynamicContent = `
            <div class="px-8 pb-6 animate-fadeIn flex flex-col h-full">
                <div class="flex-1 overflow-y-auto custom-scroll pr-2 pb-4">
                    ${getStepHTML()}
                </div>
                <div class="flex gap-3 pt-4 border-t border-slate-50 shrink-0 mt-auto">
                    ${currentStep > 1 ? `<button onclick="window.prevAuthStep()" class="w-12 h-12 rounded-[1.25rem] bg-slate-100 text-slate-400 flex items-center justify-center shadow-sm active:scale-95 transition-all hover:bg-slate-200"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                    <button onclick="window.nextAuthStep()" class="flex-1 ${accentBgClass} ${accentHoverClass} text-white py-3 rounded-[1.25rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-lg ${accentShadowClass} active:scale-95 transition-all">
                        ${currentStep === 6 ? 'Valider le dossier' : 'Étape Suivante'}
                    </button>
                </div>
            </div>`;
    }
    // 3. MODE OTP
    else if (mode === 'otp') {
        dynamicContent = `
            <div class="px-8 pb-8 space-y-6 animate-fadeIn flex flex-col justify-center min-h-full text-center">
                <div class="w-16 h-16 mx-auto ${isMamanFlow ? 'bg-rose-soft text-rose-primary' : 'bg-amber-50 text-amber-500'} border-4 border-white shadow-xl rounded-[1.5rem] flex items-center justify-center text-2xl mb-2">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <div>
                    <h3 class="text-xl font-[900] text-slate-800 tracking-tight">Vérification Requise</h3>
                    <p class="text-xs text-slate-500 font-medium mt-2 leading-relaxed">Code à 6 chiffres envoyé à <br><b class="text-slate-800">${otpEmail}</b></p>
                </div>
                
                <div class="pt-2">
                    <input id="otp-code" type="text" maxlength="6" inputmode="numeric" autocomplete="one-time-code" class="w-full py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:${isMamanFlow ? 'border-rose-primary' : 'border-amber-400'} transition-all text-2xl font-black text-slate-800 text-center tracking-[0.5em] shadow-inner" placeholder="••••••">
                </div>
                
                <button onclick="window.verifyOTP('${otpEmail}')" id="btn-otp" class="w-full mt-2 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800">
                    Vérifier l'identité <i class="fa-solid fa-shield-check"></i>
                </button>
                
                <button onclick="window.renderAuthView('login')" class="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 hover:text-slate-700 transition-colors">
                    Annuler la connexion
                </button>
            </div>`;
    }

    // INJECTION DU CONTENEUR
    const existingCard = document.getElementById("auth-card-content");

    if (existingCard) {
        document.getElementById("auth-step-title").innerText = stepTitle;
        
        const tabContainer = document.getElementById("auth-tabs");
        if (tabContainer && mode !== 'otp') {
            tabContainer.style.display = "block";
            tabContainer.innerHTML = `
                <div class="bg-slate-100/50 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200/30">
                    <button onclick="window.renderAuthView('login')" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                        Connexion
                    </button>
                    <button onclick="window.renderAuthView('register', 1)" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                        Admission
                    </button>
                </div>`;
        } else if (tabContainer) {
            tabContainer.style.display = "none";
        }

        const progressContainer = document.getElementById("auth-progress");
        if (progressContainer) {
            if (mode === 'register') {
                progressContainer.style.display = "block";
                progressContainer.innerHTML = `
                    <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full ${progressColor} transition-all duration-500" style="width: ${(currentStep/6)*100}%"></div>
                    </div>`;
            } else {
                progressContainer.style.display = "none";
            }
        }

        existingCard.innerHTML = dynamicContent;
    } else {
        // Premier chargement (code inchangé pour la structure de base)
        app.innerHTML = `
        <div class="fixed inset-0 w-full h-[100dvh] flex items-center justify-center bg-[#F8FAFC] p-4 lg:p-8 z-50">
            
            <div class="absolute -top-20 -left-20 w-96 h-96 bg-emerald-200 rounded-full filter blur-[100px] opacity-40 animate-blob pointer-events-none z-0"></div>
            <div class="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-100 rounded-full filter blur-[100px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>

            <div class="auth-card relative w-full max-w-md bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] border border-white z-10 flex flex-col h-[600px] max-h-[85dvh]">
                
                <div class="shrink-0 text-center pt-8 pb-4">
                    <div class="w-14 h-14 mx-auto bg-slate-900 text-white rounded-[1.2rem] flex items-center justify-center text-xl shadow-xl mb-3">
                        <img src="https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png" class="w-8 h-8 object-contain invert">
                    </div>
                    <h1 class="text-xl font-[900] text-slate-900 tracking-tight leading-none uppercase">Santé Plus</h1>
                    <p id="auth-step-title" class="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em] mt-1.5">${stepTitle}</p>
                </div>

                <div id="auth-tabs" class="shrink-0 px-8 mb-4 animate-fadeIn" style="display: ${mode !== 'otp' ? 'block' : 'none'}">
                    <div class="bg-slate-100/50 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200/30">
                        <button onclick="window.renderAuthView('login')" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            Connexion
                        </button>
                        <button onclick="window.renderAuthView('register', 1)" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            Admission
                        </button>
                    </div>
                </div>

                <div id="auth-progress" class="shrink-0 px-8 mb-2" style="display: ${mode === 'register' ? 'block' : 'none'}">
                    <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full ${progressColor} transition-all duration-500" style="width: ${(currentStep/6)*100}%"></div>
                    </div>
                </div>

                <div id="auth-card-content" class="flex-1 flex flex-col relative overflow-hidden">
                    ${dynamicContent}
                </div>
                
            </div>
        </div>`;
    }
}


// ============================================
// CHANGER LA COULEUR DE LA BARRE D'ÉTAT (THEME COLOR)
// ============================================
function setThemeColor(color) {
    const metaTheme = document.getElementById('theme-color');
    if (metaTheme) {
        metaTheme.setAttribute('content', color);
    }
    // Pour les navigateurs modernes (Chrome Android)
    if (document.querySelector('meta[name="theme-color"]')) {
        document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
    }
}



/**
 * 📦 MINI-VUES DYNAMIQUES (Alignées sur le PDF)
 */
function getStepHTML() {
    switch(currentStep) {
        case 1: return `
            <div class="text-center mb-4"><h3 class="text-base font-black text-slate-800">Identité du Payeur</h3></div>
            <div class="space-y-3">
                <input id="f-nom" class="app-input !py-3 !text-sm" placeholder="Nom complet" value="${registrationData.nom_famille || ''}">
                <select id="f-lien" class="app-input !py-3 !text-sm">
                    <option value="">Lien de parenté...</option>
                    <option value="Fils/Fille">Fils / Fille</option>
                    <option value="Frère/Soeur">Frère / Soeur</option>
                    <option value="Conjoint">Conjoint(e)</option>
                </select>
                <input id="f-email" type="email" class="app-input !py-3 !text-sm" placeholder="Email" value="${registrationData.email || ''}">
                <input id="f-pass" type="password" class="app-input !py-3 !text-sm" placeholder="Créer un mot de passe">
            </div>`;
        
        case 2: return `
            <div class="text-center mb-4"><h3 class="text-base font-black text-slate-800">Le Proche au Bénin</h3></div>
            <div class="space-y-3">
                <input id="p-nom" class="app-input !py-3 !text-sm" placeholder="Nom complet du patient" value="${registrationData.nom_patient || ''}">
                <input id="p-addr" class="app-input !py-3 !text-sm" placeholder="Adresse (Ville, Quartier)" value="${registrationData.adresse_patient || ''}">
                <input id="p-urgence" class="app-input !py-3 !text-sm" placeholder="Urgence locale (Voisin/Proche)" value="${registrationData.contact_urgence || ''}">
            </div>`;

        case 3: return `
            <div class="text-center mb-4"><h3 class="text-base font-black text-slate-800">Profil de Santé</h3></div>
            <div class="space-y-4">
                <div class="flex justify-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="med-hist accent-green-600" value="Diabète"> Diabète</label>
                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" class="med-hist accent-green-600" value="Tension"> Tension</label>
                </div>
                <textarea id="p-notes" class="app-input !py-3 !text-sm h-28" placeholder="Observations (Allergies, mobilité, habitudes...)">${registrationData.notes_medicales || ''}</textarea>
            </div>`;

            case 4: return `
                <div class="text-center mb-6">
                    <h3 class="text-base font-black text-slate-800">Type de Service</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Sélectionnez la catégorie</p>
                </div>
                
                <!-- Sélecteur moderne pour catégorie -->
                <div id="category-selector" class="space-y-3">
                    <!-- Carte Sénior -->
                    <div onclick="window.openCategorySelector('SENIOR')" 
                         class="category-card p-5 bg-white rounded-2xl border-2 border-slate-100 cursor-pointer transition-all active:scale-98 hover:border-emerald-200">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                                👴
                            </div>
                            <div class="flex-1">
                                <h4 class="font-black text-slate-800 text-base">Personne Âgée</h4>
                                <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Maintien à domicile</p>
                            </div>
                            <i class="fa-solid fa-chevron-right text-slate-300"></i>
                        </div>
                    </div>
                    
                    <!-- Carte Maman & Bébé -->
                    <div onclick="window.openCategorySelector('MAMAN_BEBE')" 
                         class="category-card p-5 bg-white rounded-2xl border-2 border-slate-100 cursor-pointer transition-all active:scale-98 hover:border-pink-200">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center text-2xl">
                                👶
                            </div>
                            <div class="flex-1">
                                <h4 class="font-black text-slate-800 text-base">Maman & Bébé</h4>
                                <p class="text-[10px] text-pink-500 font-bold uppercase mt-0.5">Sortie de maternité</p>
                            </div>
                            <i class="fa-solid fa-chevron-right text-slate-300"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Indicateur de sélection (caché au début) -->
                <div id="selected-category-display" class="mt-4 hidden">
                    <div class="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div class="flex items-center gap-2">
                            <i id="selected-category-icon" class="fa-solid fa-check-circle text-emerald-500"></i>
                            <span id="selected-category-text" class="text-xs font-bold text-emerald-700"></span>
                        </div>
                        <button onclick="window.clearCategorySelection()" class="text-[10px] text-emerald-500 underline">Modifier</button>
                    </div>
                </div>
            `;

            

case 5: 
    const isMamanFlow = registrationData.categorie === 'MAMAN_BEBE';
    const themeColor = isMamanFlow ? 'pink' : 'emerald';
    const themeColorClass = isMamanFlow ? 'text-pink-600' : 'text-emerald-600';
    const themeBgClass = isMamanFlow ? 'bg-pink-50 border-pink-200' : 'bg-emerald-50 border-emerald-200';
    
    // Définition des packs selon la catégorie
    const packs = isMamanFlow ? [
        { 
            id: 'ESSENTIEL', 
            name: 'Pack Essentiel', 
            desc: '2 visites / semaine', 
            price: '50.000', 
            features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire'],
            icon: 'fa-seedling',
            popular: false
        },
        { 
            id: 'CONFORT', 
            name: 'Pack Confort', 
            desc: '3 à 4 visites / semaine', 
            price: '85.000', 
            features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé'],
            icon: 'fa-chart-line',
            popular: true
        },
        { 
            id: 'SERENITE', 
            name: 'Pack Sérénité', 
            desc: 'Présence quasi quotidienne', 
            price: '150.000', 
            features: ['6-7 visites par semaine', 'Accompagnement complet', 'Urgence 24/7', 'Rapport en temps réel'],
            icon: 'fa-crown',
            popular: false
        },
        { 
            id: 'MATERNITE', 
            name: 'Spécial Sortie Maternité', 
            desc: 'Suivi intensif sur 2 semaines', 
            price: '70.000', 
            features: ['Visite quotidienne', 'Aide bébé', 'Conseils allaitement', 'Suivi personnalisé'],
            icon: 'fa-baby-carriage',
            popular: false
        }
    ] : [
        { 
            id: 'PONCTUEL', 
            name: 'Intervention Ponctuelle', 
            desc: 'Rdv médical, besoin urgent', 
            price: '10.000', 
            features: ['Intervention à la demande', 'Accompagnement RDV', 'Flexibilité totale'],
            icon: 'fa-clock',
            popular: false
        },
        { 
            id: 'REGULIER', 
            name: 'Suivi Régulier', 
            desc: '2 à 3 visites / semaine', 
            price: '60.000', 
            features: ['2-3 visites par semaine', 'Suivi médical', 'Lien famille', 'Rapport détaillé'],
            icon: 'fa-calendar-week',
            popular: true
        },
        { 
            id: 'COMPLET', 
            name: 'Accompagnement Complet', 
            desc: 'Présence soutenue', 
            price: '150.000', 
            features: ['5-6 visites par semaine', 'Présence renforcée', 'Veille sanitaire', 'Rapport en temps réel'],
            icon: 'fa-star',
            popular: false
        }
    ];
    
    return `
        <div class="text-center mb-6">
            <h3 class="text-base font-black text-slate-800">Choisissez votre formule</h3>
            <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Tarifs mensuels en CFA</p>
        </div>
        
        <div id="pack-selector" class="space-y-3 max-h-96 overflow-y-auto custom-scroll pr-1">
            ${packs.map(pack => `
                <div onclick="window.selectPack('${pack.id}', '${pack.price}')" 
                     class="pack-card p-4 bg-white rounded-xl border-2 border-slate-100 cursor-pointer transition-all active:scale-98 hover:border-${themeColor}-300 ${registrationData.type_pack === pack.id ? `border-${themeColor}-500 ${themeBgClass}` : ''}"
                     data-pack-id="${pack.id}">
                    <div class="flex items-start gap-3">
                        <div class="w-12 h-12 rounded-xl ${registrationData.type_pack === pack.id ? themeBgClass : 'bg-slate-50'} flex items-center justify-center shrink-0">
                            <i class="fa-solid ${pack.icon} ${registrationData.type_pack === pack.id ? themeColorClass : 'text-slate-400'} text-xl"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                    <p class="font-black text-slate-800 text-sm">${pack.name}</p>
                                    ${pack.popular ? `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase">Populaire</span>` : ''}
                                </div>
                                <p class="text-base font-black ${themeColorClass}">${pack.price} F</p>
                            </div>
                            <p class="text-[10px] text-slate-400 mt-0.5">${pack.desc}</p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${pack.features.map(f => `<span class="text-[8px] text-slate-500 bg-slate-50 px-2 py-1 rounded-full">✓ ${f}</span>`).join('')}
                            </div>
                        </div>
                        <div class="shrink-0">
                            <div class="w-5 h-5 rounded-full border-2 ${registrationData.type_pack === pack.id ? `border-${themeColor}-500 bg-${themeColor}-500` : 'border-slate-300'} flex items-center justify-center">
                                ${registrationData.type_pack === pack.id ? '<i class="fa-solid fa-check text-white text-[8px]"></i>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="mt-6">
            <button onclick="window.nextAuthStep()" 
                    id="pack-continue-btn"
                    class="w-full py-4 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${registrationData.type_pack ? (isMamanFlow ? 'bg-pink-500 hover:bg-pink-600' : 'bg-emerald-500 hover:bg-emerald-600') : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
                    ${!registrationData.type_pack ? 'disabled' : ''}>
                Continuer <i class="fa-solid fa-arrow-right"></i>
            </button>
        </div>
    `;
        case 6: return `
            <div class="text-center mb-4">
                <h3 class="text-base font-black text-slate-800">Engagement Élite</h3>
            </div>
            <div class="bg-amber-50 p-5 rounded-3xl border border-amber-100 mb-6">
                <p class="text-[11px] text-amber-800 leading-relaxed font-medium">
                    <b>AVERTISSEMENT LÉGAL :</b> Santé Plus Services propose un accompagnement <b>humain et logistique</b>. Nos intervenants ne sont pas des médecins ou infirmiers. 
                    <br><br>
                    ❌ Pas d'injections<br>
                    ❌ Pas de prescriptions médicales<br>
                    ❌ Pas d'actes infirmiers
                </p>
            </div>
            <label class="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-emerald-500 transition-all">
                <input type="checkbox" id="legal-check" class="mt-1 w-5 h-5 accent-emerald-500">
                <span class="text-xs font-bold text-slate-700 leading-tight">Je certifie avoir compris que ce service est une assistance au quotidien, non-médicale.</span>
            </label>`;
    }
}


// Ouvre le sélecteur de catégorie avec style moderne
window.openCategorySelector = async (category) => {
    const categories = {
        'SENIOR': {
            name: 'Personne Âgée',
            desc: 'Maintien à domicile',
            icon: '👴',
            color: 'emerald',
            bgClass: 'bg-emerald-50 border-emerald-200',
            textClass: 'text-emerald-700'
        },
        'MAMAN_BEBE': {
            name: 'Maman & Bébé',
            desc: 'Sortie de maternité',
            icon: '👶',
            color: 'pink',
            bgClass: 'bg-pink-50 border-pink-200',
            textClass: 'text-pink-600'
        }
    };
    
    const cat = categories[category];
    if (!cat) return;
    
    // Confirmation visuelle avant de valider
    const confirmModal = `
        <div class="text-center">
            <div class="text-6xl mb-3">${cat.icon}</div>
            <p class="text-lg font-black text-slate-800">${cat.name}</p>
            <p class="text-xs text-slate-400 mt-1">${cat.desc}</p>
            <div class="mt-4 p-3 ${cat.bgClass} rounded-xl">
                <p class="text-[10px] font-bold ${cat.textClass}">✓ Vous allez recevoir des offres adaptées</p>
            </div>
        </div>
    `;
    
    const result = await Swal.fire({
        title: 'Confirmer la catégorie',
        html: confirmModal,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmer',
        confirmButtonColor: category === 'MAMAN_BEBE' ? '#DB2777' : '#10B981',
        cancelButtonText: 'Annuler',
        customClass: {
            popup: 'rounded-2xl p-6',
            confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider',
            cancelButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
        }
    });
    
    if (result.isConfirmed) {
        registrationData.categorie = category;
        
        // Mettre à jour l'affichage
        const displayDiv = document.getElementById('selected-category-display');
        const iconSpan = document.getElementById('selected-category-icon');
        const textSpan = document.getElementById('selected-category-text');
        
        if (displayDiv && iconSpan && textSpan) {
            iconSpan.className = category === 'MAMAN_BEBE' ? 'fa-solid fa-baby-carriage text-pink-500' : 'fa-solid fa-user-plus text-emerald-500';
            textSpan.innerText = `${cat.icon} ${cat.name} sélectionné`;
            displayDiv.classList.remove('hidden');
        }
        
        // Mettre en surbrillance la carte sélectionnée
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('border-emerald-500', 'border-pink-500', 'bg-emerald-50', 'bg-pink-50');
            card.classList.add('border-slate-100');
        });
        
        const selectedCard = category === 'MAMAN_BEBE' 
            ? document.querySelector('.category-card:last-child')
            : document.querySelector('.category-card:first-child');
        
        if (selectedCard) {
            selectedCard.classList.remove('border-slate-100');
            selectedCard.classList.add(category === 'MAMAN_BEBE' ? 'border-pink-500' : 'border-emerald-500');
            selectedCard.classList.add(category === 'MAMAN_BEBE' ? 'bg-pink-50' : 'bg-emerald-50');
        }
        
        UI.vibrate('success');
        
        // Passer automatiquement à l'étape suivante après un petit délai
        setTimeout(() => {
            window.nextAuthStep();
        }, 500);
    }
};

// Effacer la sélection (pour modifier)
window.clearCategorySelection = () => {
    registrationData.categorie = null;
    const displayDiv = document.getElementById('selected-category-display');
    if (displayDiv) displayDiv.classList.add('hidden');
    
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('border-emerald-500', 'border-pink-500', 'bg-emerald-50', 'bg-pink-50');
        card.classList.add('border-slate-100');
    });
};


/**
 * 💸 GÉNÉRATEUR DE PACKS (Selon le PDF)
 */
function renderPricingPacks() {
    const isSenior = registrationData.categorie === 'SENIOR';
    
    // Intégration des vrais tarifs des PDF
    const packs = isSenior ? [
        { id: 'PONCTUEL', label: 'Intervention Ponctuelle', desc: 'Rdv médical, besoin urgent', price: '10.000' },
        { id: 'REGULIER', label: 'Suivi Régulier', desc: '2 à 3 visites / semaine', price: '60.000' },
        { id: 'COMPLET', label: 'Accompagnement Complet', desc: 'Présence soutenue & Famille à distance', price: '150.000' }
    ] : [
        { id: 'ESSENTIEL', label: 'Pack Essentiel', desc: '2 visites / semaine', price: '50.000' },
        { id: 'CONFORT', label: 'Pack Confort', desc: '3 à 4 visites / semaine', price: '85.000' },
        { id: 'SERENITE', label: 'Pack Sérénité', desc: 'Présence quasi quotidienne', price: '150.000' },
        { id: 'MATERNITE', label: 'Spécial Sortie Maternité', desc: 'Suivi intensif sur 2 semaines', price: '70.000' }
    ];

    return `
        <div class="text-center mb-6">
            <h3 class="text-base font-black text-slate-800">Choix de la formule</h3>
            <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Tarifs mensuels indicatifs en CFA</p>
        </div>
        <div class="space-y-3 max-h-80 overflow-y-auto custom-scroll pr-2">
            ${packs.map(p => `
                <button onclick="window.setElitePlan('${p.id}', '${p.price}')" class="w-full p-5 rounded-[1.5rem] border-2 ${registrationData.type_pack === p.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-100 bg-white'} text-left transition-all">
                    <h4 class="font-black text-slate-800 text-xs uppercase">${p.label} <span class="text-emerald-600 float-right">${p.price} F</span></h4>
                    <p class="text-[9px] text-slate-400 mt-1 font-bold">${p.desc}</p>
                </button>
            `).join('')}
        </div>`;
}

// --- LOGIQUE DE PILOTAGE ---

window.selectCategory = (cat) => {
    registrationData.categorie = cat;
    window.nextAuthStep();
};

window.setElitePlan = (packId, price) => {
    registrationData.type_pack = packId;
    registrationData.montant_prevu = price;
    window.nextAuthStep();
};

window.nextAuthStep = () => {
    // Validation spécifique pour l'étape 5 (pack)
    if (currentStep === 5 && !registrationData.type_pack) {
        UI.vibrate('error');
        Swal.fire({
            title: "Sélection requise",
            text: "Veuillez choisir une formule d'accompagnement",
            icon: "warning",
            confirmButtonText: "OK",
            customClass: { popup: 'rounded-2xl' }
        });
        return;
    }
    
    if (currentStep === 1) {
        registrationData.nom_famille = document.getElementById('f-nom')?.value;
        registrationData.email = document.getElementById('f-email')?.value;
        registrationData.password = document.getElementById('f-pass')?.value;
        registrationData.tel_famille = document.getElementById('f-tel')?.value || "";
    }
    if (currentStep === 2) {
        registrationData.nom_patient = document.getElementById('p-nom')?.value;
        registrationData.adresse_patient = document.getElementById('p-addr')?.value;
        registrationData.contact_urgence = document.getElementById('p-urgence')?.value;
    }
    if (currentStep === 3) {
        const meds = Array.from(document.querySelectorAll('.med-hist:checked')).map(el => el.value);
        registrationData.pathologies = meds;
        registrationData.notes_medicales = document.getElementById('p-notes')?.value;
    }
    if (currentStep === 6) { 
        if(!document.getElementById('legal-check')?.checked) {
            UI.vibrate('error');
            Swal.fire({
                title: "Confirmation requise",
                text: "Veuillez accepter les conditions d'engagement",
                icon: "warning",
                customClass: { popup: 'rounded-2xl' }
            });
            return;
        }
        registrationData.engagement_non_medical = true;
        submitRegistration();
        return;
    }

    currentStep++;
    renderAuthView('register', currentStep);
};



/**
 * 🚶 LOGIQUE DU STEPPER & INSCRIPTION
 */
function setPlan(plan) {
    registrationData.formule = plan;
    renderAuthView('register', 4);
}


function prevAuthStep() {
    if (currentStep > 1) {
        currentStep--;
        renderAuthView('register', currentStep);
    }
}

async function submitRegistration() {
    // ✅ CORRECTION : On vérifie 'type_pack' au lieu de 'formule'
    if(!registrationData.type_pack) return Swal.fire("Erreur", "Veuillez choisir une formule", "warning");
    
    // On s'assure de copier 'type_pack' dans 'formule' pour que le backend le comprenne sans erreur
    registrationData.formule = registrationData.type_pack;

    registrationData.email = registrationData.email.trim().toLowerCase();

    Swal.fire({ title: 'Création du dossier...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, customClass: { popup: 'rounded-[2.5rem]' } });

    try {
        const res = await fetch(`${CONFIG.API_URL}/auth/register-family-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const data = await res.json(); 

            if (res.ok) {
                localStorage.setItem("user_categorie", registrationData.categorie);
                localStorage.setItem("user_is_maman", registrationData.categorie === 'MAMAN_BEBE');
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
 * 📱 HUB DE NAVIGATION MOBILE (Interface par Blocs)
 */

function renderMobileHub() {
    const userRole = localStorage.getItem("user_role");
    const userName = localStorage.getItem("user_name");
    const container = document.getElementById("view-container");
    
    // Pour savoir si c'est une famille Maman (on peut détecter via le rôle ou stocker en local)
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    
    const menuItems = [
        { id: 'map', label: 'Radar', desc: 'Tracking Live', icon: 'fa-location-dot', color: 'text-indigo-500', bg: 'bg-indigo-50', roles: ['COORDINATEUR'] },
        { id: 'patients', label: 'Dossiers', desc: 'Gestion Clients', icon: 'fa-hospital-user', color: 'text-emerald-500', bg: 'bg-emerald-50', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'planning', label: 'Planning', desc: 'Mon Agenda', icon: 'fa-calendar-days', color: 'text-purple-500', bg: 'bg-purple-50', roles: ['COORDINATEUR', 'AIDANT'] },
        { id: 'commandes', label: 'Pharmacie', desc: 'Médicaments', icon: 'fa-pills', color: 'text-cyan-500', bg: 'bg-cyan-50', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', label: 'Visites', desc: 'Interventions', icon: 'fa-calendar-check', color: 'text-blue-500', bg: 'bg-blue-50', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'feed', label: 'Journal', desc: 'Live Feed', icon: 'fa-rss', color: 'text-orange-500', bg: 'bg-orange-50', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'billing', label: 'Factures', desc: 'Paiements', icon: 'fa-file-invoice-dollar', color: 'text-rose-500', bg: 'bg-rose-50', roles: ['COORDINATEUR', 'FAMILLE'] },
        { id: 'aidants', label: 'Équipe', desc: 'Ressources', icon: 'fa-user-nurse', color: 'text-slate-600', bg: 'bg-slate-100', roles: ['COORDINATEUR'] },
        { id: 'rh-dashboard', label: 'RH', desc: 'Équipe & Assignations', icon: 'fa-users', color: 'text-indigo-500', bg: 'bg-indigo-50', roles: ['COORDINATEUR'] }
    ];

    const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

    container.innerHTML = `
        <div class="animate-fadeIn pb-32">
            <!-- ============================================ -->
            <!-- BANNIÈRE DE BIENVENUE COLORÉE (AJOUTÉE ICI) -->
            <!-- ============================================ -->
            <div class="${isMaman ? 'maman-banner' : 'premium-banner'} p-5 rounded-2xl mb-8 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-black uppercase tracking-wider opacity-80">
                            ${isMaman ? '👶 Programme Maman & Bébé' : '⭐ Programme Premium'}
                        </p>
                        <p class="text-lg font-black mt-1 ${isMaman ? 'text-rose-primary' : 'text-slate-deep'}">
                            ${userName?.split(' ')[0] || 'Utilisateur'} 👋
                        </p>
                        <p class="text-[10px] font-medium opacity-70 mt-0.5">
                            ${isMaman ? 'Accompagnement personnalisé' : 'Accès prioritaire aux soins'}
                        </p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <i class="fa-solid ${isMaman ? 'fa-baby-carriage' : 'fa-crown'} text-xl text-white"></i>
                    </div>
                </div>
            </div>

            <!-- Barre de recherche -->
            <div class="bg-white border border-slate-100 p-3 rounded-xl flex items-center gap-3 mb-8 shadow-sm">
                <i class="fa-solid fa-magnifying-glass text-slate-300 text-sm"></i>
                <input type="text" placeholder="Rechercher un dossier..." class="bg-transparent border-none outline-none text-sm font-medium w-full">
            </div>

            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4 ml-1">Menu Principal</h4>

            <!-- GRILLE DE BLOCS -->
            <div class="menu-grid">
                ${filteredMenu.map(item => `
                    <div onclick="window.switchView('${item.id}')" class="menu-tile cursor-pointer">
                        <div class="${item.bg} w-12 h-12 rounded-xl flex items-center justify-center">
                            <i class="fa-solid ${item.icon} ${item.color} text-xl"></i>
                        </div>
                        <div>
                            <p class="font-black text-slate-800 text-sm">${item.label}</p>
                            <p class="text-[10px] text-slate-400 font-medium mt-0.5">${item.desc}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
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
        
        <!-- 🖥️ SIDEBAR DESKTOP (Inchangée, garde le look SaaS Pro) -->
        <aside class="hidden lg:flex flex-col w-80 bg-[#0F172A] text-white p-8 shadow-[10px_0_40px_rgba(0,0,0,0.04)] z-50">
            <div class="flex items-center gap-4 mb-14 px-2">
                <div class="w-12 h-12 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <img src="https://cdn-icons-png.flaticon.com/512/8206/8206334.png" class="w-8 h-8">
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
                    <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs border border-white/20">
                        ${userName ? userName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-xs font-black truncate">${userName || 'Utilisateur'}</p>
                        <p class="text-[9px] text-slate-500 uppercase font-black tracking-widest">${userRole}</p>
                    </div>
                </div>
                <button onclick="window.logout()" class="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2">
                    <i class="fa-solid fa-power-off"></i> Fermer la session
                </button>
            </div>
        </aside>

        <!-- 🚀 CONTENEUR DE CONTENU -->
        <div class="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden">
            
            <!-- HEADER GLOBAL (Glassmorphism) -->
                        <header class="h-20 lg:h-24 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-6 lg:px-12 shrink-0 z-40">
                            <div class="lg:hidden flex items-center">
                                <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl rotate-[-5deg]">
                                    <img src="https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png" class="w-6 h-6">
                                </div>
                            </div>
                            
                            <div class="flex flex-col">
                                <h2 id="view-title" class="text-xl lg:text-3xl font-[900] text-slate-900 tracking-tight leading-none">Tableau de bord</h2>
                                <p class="hidden lg:block text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Santé Plus • Protocole de confiance</p>
                            </div>
                        
                            <div class="flex items-center gap-3">
                                <button class="relative w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-green-600 transition-all shadow-sm group">
                                    <i class="fa-solid fa-bell text-sm"></i>
                                    <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                                </button>
                                <button onclick="window.openProfileMenu()" class="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 active:scale-95 transition-all lg:ml-2">
                                    <i class="fa-solid fa-user-gear text-sm"></i>
                                </button>
                            </div>
                        </header>

            <!-- ARRIÈRE-PLAN DÉCORATIF -->
            <div class="absolute top-40 left-[-5%] w-[500px] h-[500px] bg-green-200/20 rounded-full blur-[120px] pointer-events-none z-0 animate-blob"></div>
            <div class="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none z-0 animate-blob animation-delay-2000"></div>

            <!-- 📥 ZONE DE RENDU -->
            <main id="main-content" class="flex-1 overflow-y-auto custom-scroll p-6 lg:p-12 z-10 relative">
                <div id="view-container" class="max-w-7xl mx-auto min-h-full"></div>
            </main>

            <!-- 📱 NAVIGATION MOBILE : Design "Floating Hub" Premium -->
            <footer class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-2 z-50 flex justify-between items-center shadow-lg">
                
                <!-- BOUTON HOME -->
                <button onclick="window.switchView('home')" data-view="home" class="nav-btn flex flex-col items-center gap-0.5 transition-all active:scale-95">
                    <i class="fa-solid fa-house-chimney text-lg text-slate-400"></i>
                    <span class="text-[8px] font-black uppercase tracking-wider text-slate-400">Accueil</span>
                </button>
            
                <!-- BOUTON ACTION CENTRAL -->
                <button onclick="window.openAddPatient()" class="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl -mt-6 border-4 border-white active:scale-95 transition-all duration-200">
                    <i class="fa-solid fa-plus text-xl"></i>
                </button>
            
                <!-- BOUTON RADAR -->
                <button onclick="window.switchView('map')" data-view="map" class="nav-btn flex flex-col items-center gap-0.5 transition-all active:scale-95">
                    <i class="fa-solid fa-location-dot text-lg text-slate-400"></i>
                    <span class="text-[8px] font-black uppercase tracking-wider text-slate-400">Radar</span>
                </button>
            
            </footer>
        </div>
    </div>`;
}


window.selectPack = (packId, price) => {
    registrationData.type_pack = packId;
    registrationData.montant_prevu = price;
    
    const isMamanFlow = registrationData.categorie === 'MAMAN_BEBE';
    const themeColor = isMamanFlow ? 'pink' : 'emerald';
    const themeBgClass = isMamanFlow ? 'bg-pink-50 border-pink-200' : 'bg-emerald-50 border-emerald-200';
    const themeColorClass = isMamanFlow ? 'text-pink-600' : 'text-emerald-600';
    const borderColorClass = isMamanFlow ? 'border-pink-500' : 'border-emerald-500';
    const bgColorClass = isMamanFlow ? 'bg-pink-500' : 'bg-emerald-500';
    
    // Mettre à jour l'apparence des cartes
    document.querySelectorAll('.pack-card').forEach(card => {
        const cardPackId = card.dataset.packId;
        if (cardPackId === packId) {
            // Ajouter les classes une par une
            card.classList.add(borderColorClass);
            card.classList.add(isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50');
            card.classList.add(isMamanFlow ? 'border-pink-200' : 'border-emerald-200');
            card.classList.remove('border-slate-100');
            
            // Mettre à jour l'icône
            const iconDiv = card.querySelector('.w-12.h-12');
            if (iconDiv) {
                iconDiv.classList.add(isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50');
                iconDiv.classList.add(isMamanFlow ? 'border-pink-200' : 'border-emerald-200');
                iconDiv.classList.remove('bg-slate-50');
                const icon = iconDiv.querySelector('i');
                if (icon) {
                    icon.classList.add(themeColorClass);
                    icon.classList.remove('text-slate-400');
                }
            }
            
            // Mettre à jour le radio button
            const radioDiv = card.querySelector('.w-5.h-5');
            if (radioDiv) {
                radioDiv.classList.add(borderColorClass);
                radioDiv.classList.add(bgColorClass);
                radioDiv.classList.remove('border-slate-300', 'bg-transparent');
                radioDiv.innerHTML = '<i class="fa-solid fa-check text-white text-[8px]"></i>';
            }
        } else {
            // Supprimer les classes une par une
            card.classList.remove(borderColorClass);
            card.classList.remove(isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50');
            card.classList.remove(isMamanFlow ? 'border-pink-200' : 'border-emerald-200');
            card.classList.add('border-slate-100');
            
            // Réinitialiser l'icône
            const iconDiv = card.querySelector('.w-12.h-12');
            if (iconDiv) {
                iconDiv.classList.remove(isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50');
                iconDiv.classList.remove(isMamanFlow ? 'border-pink-200' : 'border-emerald-200');
                iconDiv.classList.add('bg-slate-50');
                const icon = iconDiv.querySelector('i');
                if (icon) {
                    icon.classList.remove(themeColorClass);
                    icon.classList.add('text-slate-400');
                }
            }
            
            // Réinitialiser le radio button
            const radioDiv = card.querySelector('.w-5.h-5');
            if (radioDiv) {
                radioDiv.classList.remove(borderColorClass);
                radioDiv.classList.remove(bgColorClass);
                radioDiv.classList.add('border-slate-300');
                radioDiv.innerHTML = '';
            }
        }
    });
    
    // Activer le bouton continuer
    const continueBtn = document.getElementById('pack-continue-btn');
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
        continueBtn.classList.add(isMamanFlow ? 'bg-pink-500' : 'bg-emerald-500');
        continueBtn.classList.add(isMamanFlow ? 'hover:bg-pink-600' : 'hover:bg-emerald-600');
    }
    
    UI.vibrate('success');
};


function getNavLinks(role, mode) {
    const isMobile = mode === 'mobile';
    const tabs =[
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', roles: ['COORDINATEUR'] },
        { id: 'map', icon: 'fa-location-dot', label: 'Radar', roles: ['COORDINATEUR'] }, 
        { id: 'patients', icon: 'fa-hospital-user', label: 'Dossiers', roles:['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', icon: 'fa-calendar-check', label: 'Visites', roles:['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'rh-dashboard', label: 'RH', desc: 'Équipe & Assignations', icon: 'fa-users', color: 'text-indigo-500', bg: 'bg-indigo-50', roles: ['COORDINATEUR'] },
        
        { id: 'planning', icon: 'fa-calendar-days', label: 'Planning', roles: ['COORDINATEUR', 'AIDANT'] },
        { id: 'commandes', icon: 'fa-pills', label: 'Pharmacie', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },

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

// ============================================
// TRANSITION FLUIDE AVEC LOADER LOCAL
// ============================================
// ============================================
// TRANSITION FLUIDE (VERSION CORRIGÉE)
// ============================================

let isTransitioning = false;
let pendingView = null;

window.switchView = async function(viewName) {
    // Évite les doubles transitions
    if (isTransitioning) {
        pendingView = viewName;
        return;
    }
    
    isTransitioning = true;
    
    const container = document.getElementById("view-container");
    
    if (!container) {
        isTransitioning = false;
        return;
    }
    
    // 1. Animation de sortie
    container.style.transition = "opacity 0.1s ease";
    container.style.opacity = "0";
    await new Promise(r => setTimeout(r, 80));
    
    // 2. Afficher un loader simple (pas besoin de fonction externe)
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 min-h-[200px]">
            <div class="relative w-12 h-12">
                <div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <img src="https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png" 
                     class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 animate-pulse">
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-3">Chargement...</p>
        </div>
    `;
    
    try {
        // 3. Exécuter le changement de vue
        await performViewSwitch(viewName);
        
        // 4. Animation d'entrée
        container.style.opacity = "1";
        setTimeout(() => {
            if (container) container.style.transition = "";
        }, 100);
        
    } catch (err) {
        console.error("❌ Erreur switchView:", err);
        container.innerHTML = `
            <div class="p-10 text-center bg-white rounded-2xl border border-rose-100 shadow-sm">
                <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-4"></i>
                <h3 class="text-rose-500 font-black text-lg uppercase">Erreur de chargement</h3>
                <p class="text-xs text-slate-500 mt-2">${err.message || "Le serveur n'a pas pu répondre."}</p>
                <button onclick="window.switchView('${viewName}')" 
                        class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">
                    Réessayer
                </button>
            </div>`;
        container.style.opacity = "1";
    }
    
    isTransitioning = false;
    
    // Traiter la vue en attente
    if (pendingView) {
        const next = pendingView;
        pendingView = null;
        window.switchView(next);
    }
};

// ============================================
//  :
// ============================================

async function performViewSwitch(viewName) {
    const container = document.getElementById("view-container");
    const titleElement = document.getElementById("view-title");
    if (!container) return;

    const userRole = localStorage.getItem("user_role");
    const paymentStatus = localStorage.getItem("payment_status");

    // 🛡️ SÉCURITÉ PAIEMENT
    const restrictedViews = ["feed", "visits", "commandes"];
    if (userRole === "FAMILLE" && paymentStatus === "En retard" && restrictedViews.includes(viewName)) {
        UI.vibrate("error");
        Swal.fire({
            icon: "warning",
            title: `<span class="text-rose-600 font-black">Accès Suspendu</span>`,
            html: `<p class="text-sm text-slate-500">Merci de régulariser votre abonnement pour accéder au suivi en direct de votre proche.</p>`,
            confirmButtonText: "VOIR MA FACTURE",
            confirmButtonColor: "#0F172A",
            customClass: { popup: 'rounded-[2.5rem]' }
        }).then(() => window.switchView("billing"));
        return;
    }

    // 🎨 MISE À JOUR DE L'INTERFACE (ACTIVE TABS)
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
        dashboard: "Aperçu Analytique", 
        map: "Radar Terrain Live", 
        patients: "Gestion des Dossiers",
        visits: "Suivi des Interventions", 
        feed: "Journal de Soins Live", 
        billing: "Centre de Facturation",
        aidants: "Gestion de l'Équipe", 
        commandes: "Pharmacie & Logistique",
        planning: "Agenda des Soins",
        home: "Accueil",
        "rh-dashboard": "RH & Assignations",
        "add-patient": "Nouveau Patient",
        "link-family": "Lier une Famille",
        "add-aidant": "Nouvel Aidant",
        "end-visit": "Clôturer la visite",
        "start-visit": "Démarrer la visite"
    };
    
    if (titleElement) titleElement.innerText = viewTitles[viewName] || "Santé Plus";

    localStorage.setItem("last_view", viewName);
    AppState.currentView = viewName;

    // 📍 AFFICHAGE DU LOADER LOCAL
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 min-h-[300px]">
            <div class="relative w-12 h-12">
                <div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <img src="https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png" 
                     class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 animate-pulse">
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-4">Chargement ${viewTitles[viewName] || viewName}...</p>
        </div>
    `;

    try {
        switch (viewName) {
            case "dashboard": 
                container.innerHTML = document.getElementById("template-dashboard").innerHTML;
                await Dashboard.loadAdminDashboard(); 
                break;
                
            case "map": 
                await MapModule.initLiveMap(); 
                break;
                
            case "patients": 
                container.innerHTML = `
                    <div class="animate-slideIn pb-32">
                        <div class="flex justify-between items-center mb-8">
                            <div>
                                <h3 class="font-black text-2xl text-slate-800 tracking-tight">Dossiers Clients</h3>
                                <p class="text-xs text-slate-400 font-bold uppercase mt-1">Base de données active</p>
                            </div>
                            ${userRole === "COORDINATEUR" ? `<button onclick="window.openAddPatient()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all"><i class="fa-solid fa-plus"></i></button>` : ""}
                        </div>
                        <div id="patients-list" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
                    </div>`;
                await Patients.loadPatients();
                refreshMicroInteractions();
                break;
                
            case "visits": 
                container.innerHTML = `<div class="animate-slideIn pb-32">` + document.getElementById("template-visits").innerHTML + `</div>`;
                await Visites.loadVisits(); 
                break;
                
            case "feed": 
                if (!AppState.currentPatient && userRole === "FAMILLE") {
                    window.switchView("patients");
                    return;
                }
                await Messages.loadFeed(); 
                break;
                
            case "billing": 
                container.innerHTML = `<div class="animate-slideIn pb-32">` + document.getElementById("template-billing").innerHTML + `</div>`;
                await Billing.loadBilling(); 
                break;
                
            case "aidants": 
                container.innerHTML = `
                    <div class="animate-slideIn pb-32">
                        <div class="flex justify-between items-center mb-8">
                            <div>
                                <h3 class="font-black text-2xl text-slate-800 tracking-tight">Équipe & RH</h3>
                                <p class="text-xs text-slate-400 font-bold uppercase mt-1">Gestion des collaborateurs</p>
                            </div>
                            ${userRole === 'COORDINATEUR' ? `
                                <button onclick="window.switchView('add-aidant')" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center">
                                    <i class="fa-solid fa-user-plus text-lg"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div id="aidants-list" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
                    </div>`;
                await Aidants.loadAidants(); 
                break;
                
            case "planning":
                container.innerHTML = `
                    <div class="animate-slideIn pb-32">
                        <div class="flex justify-between items-center mb-8">
                            <div>
                                <h3 class="font-black text-2xl text-slate-800 tracking-tight">Agenda des Soins</h3>
                                <p class="text-xs text-slate-400 font-bold uppercase mt-1">Planification des interventions</p>
                            </div>
                            ${userRole === "COORDINATEUR" ? `
                                <button onclick="window.openAssignModal()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all">
                                    <i class="fa-solid fa-calendar-plus"></i>
                                </button>` : ""}
                        </div>
                        <div id="planning-list" class="space-y-4"></div>
                    </div>`;
                await Planning.loadPlanning();
                break;
                
            case "commandes":
                container.innerHTML = `
                    <div class="animate-slideIn pb-32">
                        <div class="flex justify-between items-center mb-8">
                            <div>
                                <h3 class="font-black text-2xl text-slate-800 tracking-tight">Pharmacie & Logistique</h3>
                                <p class="text-xs text-slate-400 font-bold uppercase mt-1">Commandes et Livraisons</p>
                            </div>
                            ${userRole === "FAMILLE" ? `
                                <button onclick="window.openOrderModal()" class="w-12 h-12 bg-green-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all">
                                    <i class="fa-solid fa-plus"></i>
                                </button>` : ""}
                        </div>
                        <div id="commandes-list" class="space-y-4"></div>
                    </div>`;
                await Commandes.loadCommandes(); 
                break;
                
            case "add-patient": 
                await Patients.renderAddPatientView(); 
                break;
                
            case "link-family": 
                await Patients.renderLinkFamilyView(); 
                break;
                
            case "add-aidant": 
                await Aidants.renderAddAidantView(); 
                break;
                
            case "end-visit": 
                await Visites.renderEndVisitView(); 
                break;
                
            case "start-visit":
                await Visites.renderStartVisitView(AppState.currentPatient);
                break;
                
            case "home": 
                container.innerHTML = document.getElementById("template-home").innerHTML;
                renderMobileHub(); 
                break;

            case "rh-dashboard":
                await Admin.renderRHDashboard();
                break;
        }
        
        // Animation d'entrée après chargement réussi
        container.style.opacity = "0";
        container.style.transform = "translateY(8px)";
        container.style.transition = "opacity 0.15s ease, transform 0.15s ease";
        
        setTimeout(() => {
            container.style.opacity = "1";
            container.style.transform = "translateY(0)";
            setTimeout(() => {
                if (container) container.style.transition = "";
            }, 150);
        }, 10);
        
    } catch (err) {
        console.error("DEBUG VIEW ERROR:", err);
        container.innerHTML = `
            <div class="p-10 text-center bg-white rounded-[2rem] border border-rose-100 shadow-sm animate-fadeIn">
                <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-4"></i>
                <h3 class="text-rose-500 font-black text-lg uppercase">Erreur de chargement</h3>
                <p class="text-xs text-slate-500 mt-2">${err.message || "Le serveur n'a pas pu répondre à cette requête."}</p>
                <button onclick="window.switchView('${viewName}')" class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Réessayer</button>
            </div>`;
        container.style.opacity = "1";
    }
}


window.openProfileMenu = () => {
    const userName = localStorage.getItem("user_name");
    const userRole = localStorage.getItem("user_role");
    const soundsEnabled = localStorage.getItem('sounds_enabled') === 'true';
    
    Swal.fire({
        title: `<div class="text-sm font-black uppercase text-slate-400 tracking-widest mb-1">Mon Compte</div><div class="text-xl font-black text-slate-800">${userName}</div>`,
        html: `
            <div class="text-center p-4">
                <div class="inline-block px-4 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase mb-6">${userRole}</div>
                <div class="space-y-3">
                    <!-- Option Sons -->
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-volume-high text-slate-400"></i>
                            <span class="text-xs font-bold text-slate-700">Effets sonores</span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="sound-toggle" class="sr-only peer" ${soundsEnabled ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>
                    <button onclick="window.logout()" class="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold text-sm active:scale-95 transition-transform">
                        Déconnexion
                    </button>
                </div>
            </div>`,
        showConfirmButton: false,
        customClass: { popup: 'rounded-3xl p-6' },
        didOpen: () => {
            const soundToggle = document.getElementById('sound-toggle');
            if (soundToggle) {
                soundToggle.addEventListener('change', (e) => {
                    const enabled = e.target.checked;
                    setSoundsEnabled(enabled);
                    // Jouer un son test si activé
                    if (enabled) {
                        playSound('success');
                        showToast("Sons activés", "success", 1500);
                    } else {
                        showToast("Sons désactivés", "info", 1500);
                    }
                });
            }
        }
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
window.markAsDelivered = Commandes.markAsDelivered;


window.viewPatientFeed = async (id) => { 
    const userRole = localStorage.getItem("user_role");
    const titleElement = document.getElementById("view-title");
    
    // Sauvegarde en mémoire
    localStorage.setItem("current_patient_id", id);
    AppState.currentPatient = id;

    // Si c'est un Aidant, on l'envoie sur la fiche de Briefing
    if (userRole === 'AIDANT') {
        UI.vibrate();
        if (titleElement) titleElement.innerText = "Briefing Patient";
        
        // ⚠️ PLUS AUCUN LOADER MANUEL - Le loader global s'en charge
        await Patients.renderPatientDetailsView(id);
    } 
    // Si c'est une Famille ou Coordinateur, on va direct au journal
    else {
        window.switchView("feed"); 
    }
};

window.switchView = switchView;
window.viewPatientDetails = Patients.renderPatientDetailsView;

// Inscription In-Card
// Remplace le bloc inscription par :
window.renderAuthView = renderAuthView; 
window.nextAuthStep = nextAuthStep;
window.prevAuthStep = prevAuthStep;
window.setPlan = setPlan;
window.submitRegistration = submitRegistration; 

// Onboarding
window.startOnboarding = startOnboarding;
window.finishOnboarding = finishOnboarding;
window.nextOnboarding = nextOnboarding;
window.setPatientHomeDirect = Patients.setPatientHomeDirect;
window.openAssignModal = Planning.openAssignModal;
window.openOrderModal = Commandes.openOrderModal;
window.loadPlanning = Planning.loadPlanning; 
window.loadCommandes = Commandes.loadCommandes;
window.openMissionBriefing = Planning.openMissionBriefing;
window.loadRegistrations = Admin.loadRegistrations;
window.confirmActivation = Admin.confirmActivation;
window.fetchStats = Dashboard.fetchStats;
window.openOrderModal = Commandes.openOrderModal; 
window.openActivationPage = Admin.openActivationPage;
window.processValidation = Admin.processValidation;
window.confirmStartVisit = Visites.startVisit; 
window.setThemeColor = setThemeColor;
window.openModernSelector = openModernSelector;
window.showToast = showToast;
window.UI = UI;
window.playSound = playSound;


initApp();
