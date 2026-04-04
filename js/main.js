// ============================================================
// SANTÉ PLUS SERVICES - APPLICATION PRINCIPALE
// ============================================================
// Version: 1.0
// Description: Application de coordination de soins à domicile
// Auteur: Santé Plus Services
// ============================================================

// ============================================================
// IMPORTS DES MODULES
// ============================================================
import { secureFetch } from "./core/api.js";
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
import { 
    UI, showToast, showSuccessToast, showErrorToast, 
    showWarningToast, showInfoToast, openModernSelector, 
    initMicroInteractions, setSoundsEnabled, getSoundsEnabled, 
    refreshMicroInteractions, playSound, showLocalLoader, 
    hideLocalLoader, initLazyLoading, secureFetchWithCache 
} from "./core/utils.js";
import * as Subscription from "./modules/subscription.js";
import * as Profile from "./modules/profile.js";
import ErrorHandler from './core/errorHandler.js';
import { startKeepAlive } from './core/keepAlive.js';
import * as Notifications from "./modules/notifications.js";
const { updateNotificationBadge } = Notifications;



// Met à jour l'icône PWA selon le thème (Maman ou général)
// Met à jour l'icône PWA selon le thème (Maman ou général)
function updatePWAIcon(isMaman) {
    const iconUrl = isMaman 
        ? CONFIG.LOGO_MAMAN_ICON
        : CONFIG.LOGO_GENERAL_ICON;
    
    // Mettre à jour l'icône apple-touch-icon
    let appleIcon = document.getElementById('apple-touch-icon');
    if (appleIcon) {
        appleIcon.href = iconUrl;
    }
    
    // Mettre à jour le favicon
    let favicon = document.getElementById('favicon');
    if (favicon) {
        favicon.href = iconUrl;
    }
}
// ============================================================
// VARIABLES GLOBALES
// ============================================================
let deferredPrompt = null;          // Stocke l'invite d'installation PWA
let onboardingStep = 0;              // Étape actuelle du tutoriel
let registrationData = {};           // Données d'inscription temporaires
let currentStep = 1;                 // Étape actuelle du formulaire d'inscription
let loaderTimeout = null;            // Timeout pour le loader global

// ============================================================
// DONNÉES DU TUTORIEL D'ACCUEIL (ONBOARDING)
// ============================================================
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

// ============================================================
// LOADER GLOBAL (ÉCRAN DE CHARGEMENT INITIAL)
// ============================================================

function showGlobalLoader() {
    let loader = document.getElementById('global-loader');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'global-loader';
        loader.innerHTML = `
            <div class="mb-4">
                <img id="loader-logo-img" class="w-16 h-16 animate-pulse">
            </div>
            <p class="loader-text">Santé Plus Services</p>
        `;
        document.body.appendChild(loader);
    }
    
    const isMaman = localStorage.getItem('user_is_maman') === 'true';
    // ✅ Utiliser l'icône (cœur) selon le thème
    const logoSrc = isMaman ? CONFIG.LOGO_MAMAN_ICON : CONFIG.LOGO_GENERAL_ICON;
    
    const loaderLogo = document.getElementById('loader-logo-img');
    if (loaderLogo) {
        loaderLogo.src = logoSrc;
    }
    
    if (isMaman) {
        loader.classList.add('rose');
    } else {
        loader.classList.remove('rose');
    }
    
    loader.classList.remove('hidden');
    loader.style.opacity = '1';
}


/**
 * Cache le loader global
 */
function hideGlobalLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.add('hidden');
        loader.style.opacity = '0';
    }
}

/**
 * Cache le loader après un délai (sécurité)
 */
function hideGlobalLoaderWithDelay() {
    if (loaderTimeout) clearTimeout(loaderTimeout);
    loaderTimeout = setTimeout(() => {
        hideGlobalLoader();
    }, 5000);
}

// ============================================================
// CONFIGURATION SWEETALERT
// ============================================================
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: { popup: 'rounded-3xl shadow-2xl border border-slate-100' }
});

/**
 * Affiche une alerte personnalisée
 */
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

// ============================================================
// INITIALISATION DE L'APPLICATION
// ============================================================
/**
 * Point d'entrée principal de l'application
 * Vérifie le token, l'onboarding et charge la bonne vue
 */
async function initApp() {
    const loader = document.getElementById("initial-loader");
    const token = localStorage.getItem("token");
    const onboardingSeen = localStorage.getItem("onboarding_seen");
    updatePWAIcon(localStorage.getItem("user_is_maman") === "true");

    
    console.log("📝 Onboarding vu ?", onboardingSeen);
    
    // Initialisation des services
    initMicroInteractions();      // Feedback haptique
    initLazyLoading();            // Chargement différé des images
    ErrorHandler.init();          // Gestion globale des erreurs
    startKeepAlive();             // Ping
    updateThemeColor();
    updateThemeColor();
    

    
    // ✅ Correction : appeler la fonction depuis le module importé
    Notifications.updateNotificationBadge();
    
    // Récupération des préférences utilisateur
    const savedSoundPref = localStorage.getItem('sounds_enabled');
    if (savedSoundPref !== null) {
        setSoundsEnabled(savedSoundPref === 'true');
    }

    const hideLoader = () => {
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => loader.classList.add("hidden"), 500);
        }
    };

    try {
        if (token) {
            if (!onboardingSeen && !window._onboardingCompleted) {
                hideLoader();
                window.startOnboarding();
                return;
            }
            
            renderLayout();
            await Visites.checkActiveVisitOnStart();
            Visites.resumeTrackingIfActive();
            checkActiveVisit();

            
            const userRole = localStorage.getItem("user_role");
            const defaultView = window.innerWidth < 1024 ? "home" : (userRole === "COORDINATEUR" ? "dashboard" : "patients");
            const lastView = localStorage.getItem("last_view") || defaultView;
            
            await window.switchView(lastView);
            hideLoader();
        } else {
            renderAuthView('login');
            hideLoader();
        }
    } catch (err) {
        console.error("Erreur Init:", err);
        renderAuthView('login');
        hideLoader();
    }
}

// ============================================================
// GESTION DE LA COULEUR DE LA BARRE D'ÉTAT (THEME COLOR)
// ============================================================
function setThemeColor(color) {
    const metaTheme = document.getElementById('theme-color');
    if (metaTheme) {
        metaTheme.setAttribute('content', color);
    }
}


function updateThemeColor() {
    const isMaman = localStorage.getItem('user_is_maman') === 'true';
    const color = isMaman ? '#DB2777' : '#0F172A';
    setThemeColor(color);
}
// ============================================================
// VUES DYNAMIQUES DU FORMULAIRE D'ADMISSION
// ============================================================
/**
 * Génère le HTML des étapes du formulaire d'inscription
 * 6 étapes : Payeur → Patient → Santé → Catégorie → Pack → Validation
 */
function getStepHTML() {
    const isMamanFlow = registrationData.categorie === 'MAMAN_BEBE';
    const themeColor = isMamanFlow ? 'pink' : 'emerald';
    const themeBgClass = isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50';
    const themeBorderClass = isMamanFlow ? 'border-pink-200' : 'border-emerald-200';
    const themeTextClass = isMamanFlow ? 'text-pink-600' : 'text-emerald-600';
    
    switch(currentStep) {
        // ============================================
        // ÉTAPE 0 : CHOIX DU SERVICE (NOUVEAU)
        // ============================================
        case 0: return `
            <div class="text-center mb-8">
                <div class="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4 shadow-md border border-slate-100">
                    <i class="fa-solid fa-hand-holding-heart text-2xl text-emerald-500"></i>
                </div>
                <h3 class="text-xl font-black text-slate-800">Comment pouvons-nous vous aider ?</h3>
                <p class="text-xs text-slate-400 mt-1">Choisissez le profil qui vous correspond</p>
            </div>
            <div class="space-y-4">
                <div onclick="window.selectServiceType('SENIOR')" 
                     class="service-card p-5 bg-white rounded-2xl border-2 border-slate-200 cursor-pointer transition-all hover:border-emerald-400 hover:shadow-lg active:scale-98">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-3xl">👴</div>
                        <div class="flex-1">
                            <h4 class="font-black text-slate-800 text-base">Accompagnement Sénior</h4>
                            <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Maintien à domicile • Soins au quotidien</p>
                        </div>
                        <i class="fa-solid fa-arrow-right text-slate-300"></i>
                    </div>
                </div>
                <div onclick="window.selectServiceType('MAMAN_BEBE')" 
                     class="service-card p-5 bg-white rounded-2xl border-2 border-slate-200 cursor-pointer transition-all hover:border-pink-400 hover:shadow-lg active:scale-98">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-xl bg-pink-50 flex items-center justify-center text-3xl">👶</div>
                        <div class="flex-1">
                            <h4 class="font-black text-slate-800 text-base">Maman & Bébé</h4>
                            <p class="text-[10px] text-pink-500 font-bold uppercase tracking-wider">Post-partum • Nouveau-né • Allaitement</p>
                        </div>
                        <i class="fa-solid fa-arrow-right text-slate-300"></i>
                    </div>
                </div>
            </div>
        `;
        
        // ============================================
        // ÉTAPE 1 : QUI PAYE ?
        // ============================================
                case 1: return `
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 mx-auto ${themeBgClass} rounded-2xl flex items-center justify-center mb-4 shadow-md">
                            <i class="fa-solid fa-user-plus text-2xl ${themeTextClass}"></i>
                        </div>
                        <h3 class="text-xl font-black text-slate-800">Qui fait la demande ?</h3>
                        <p class="text-xs text-slate-400 mt-1">Les informations du responsable</p>
                    </div>
                    <div class="space-y-4">
                        <div class="relative">
                            <i class="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="f-nom" class="app-input !pl-12 !py-3" placeholder="Votre nom complet" value="${registrationData.nom_famille || ''}">
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="f-email" type="email" class="app-input !pl-12 !py-3" placeholder="Votre email" value="${registrationData.email || ''}">
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="f-tel" class="app-input !pl-12 !py-3" placeholder="Votre téléphone" value="${registrationData.tel_famille || ''}">
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="f-pass" type="password" class="app-input !pl-12 !py-3" placeholder="Choisissez un mot de passe">
                        </div>
                    </div>
                `;
        // ============================================
        // ÉTAPE 2 : QUI A BESOIN D'AIDE ?
        // ============================================
                      case 2: return `
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 mx-auto ${themeBgClass} rounded-2xl flex items-center justify-center mb-4 shadow-md">
                            <i class="fa-solid fa-hands-helping text-2xl ${themeTextClass}"></i>
                        </div>
                        <h3 class="text-xl font-black text-slate-800">Pour qui ?</h3>
                        <p class="text-xs text-slate-400 mt-1">Les informations de la personne à accompagner</p>
                    </div>
                    <div class="space-y-4">
                        <div class="relative">
                            <i class="fa-solid fa-user-circle absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="p-nom" class="app-input !pl-12 !py-3" placeholder="Son nom complet" value="${registrationData.nom_patient || ''}">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="relative">
                                <i class="fa-solid fa-cake-candles absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                <input id="p-age" type="number" class="app-input !pl-12 !py-3" placeholder="Âge">
                            </div>
                            <div class="relative">
                                <i class="fa-solid fa-venus-mars absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                <select id="p-sex" class="app-input !pl-12 !py-3">
                                    <option value="">Sexe</option>
                                    <option value="Homme">Homme</option>
                                    <option value="Femme">Femme</option>
                                </select>
                            </div>
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="p-addr" class="app-input !pl-12 !py-3" placeholder="Son adresse (quartier, rue)" value="${registrationData.adresse_patient || ''}">
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="p-tel" class="app-input !pl-12 !py-3" placeholder="Son téléphone (optionnel)">
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-address-card absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="p-urgence" class="app-input !pl-12 !py-3" placeholder="Contact d'urgence (voisin, famille)">
                        </div>
                    </div>
                `;
                        
        // ============================================
        // ÉTAPE 3 : SANTÉ (Adapté selon Sénior ou Maman)
        // ============================================
        case 3: 
            if (isMamanFlow) {
                return `
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 mx-auto bg-pink-50 rounded-2xl flex items-center justify-center mb-4 shadow-md">
                            <i class="fa-solid fa-baby-carriage text-2xl text-pink-500"></i>
                        </div>
                        <h3 class="text-xl font-black text-slate-800">Suivi Maman & Bébé</h3>
                        <p class="text-xs text-slate-400 mt-1">Quelques informations pour mieux vous accompagner</p>
                    </div>
                    <div class="space-y-4">
                        <div class="relative">
                            <i class="fa-solid fa-hospital-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <select id="accouchement" class="app-input !pl-12 !py-3">
                                <option value="">Type d'accouchement</option>
                                <option value="voie_basse">Voie basse</option>
                                <option value="cesarienne">Césarienne</option>
                            </select>
                        </div>
                        <div class="relative">
                            <i class="fa-solid fa-hand-holding-heart absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <select id="allaitement" class="app-input !pl-12 !py-3">
                                <option value="">Allaitement</option>
                                <option value="maternel">Maternel</option>
                                <option value="mixte">Mixte</option>
                                <option value="artificiel">Artificiel</option>
                            </select>
                        </div>
                        <div>
                            <textarea id="p-notes" class="app-input !py-3" rows="3" placeholder="Informations complémentaires (poids du bébé, sommeil, soucis particuliers...)"></textarea>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 mx-auto ${themeBgClass} rounded-2xl flex items-center justify-center mb-4 shadow-md">
                            <i class="fa-solid fa-heartbeat text-2xl ${themeTextClass}"></i>
                        </div>
                        <h3 class="text-xl font-black text-slate-800">Informations de santé</h3>
                        <p class="text-xs text-slate-400 mt-1">Pour un accompagnement adapté</p>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 ml-1 mb-2 block">Pathologies existantes</label>
                            <div class="flex flex-wrap gap-2">
                                <label class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full text-xs"><input type="checkbox" class="med-hist" value="Diabète"> Diabète</label>
                                <label class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full text-xs"><input type="checkbox" class="med-hist" value="Hypertension"> Hypertension</label>
                                <label class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full text-xs"><input type="checkbox" class="med-hist" value="Arthrose"> Arthrose</label>
                                <label class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full text-xs"><input type="checkbox" class="med-hist" value="Alzheimer"> Alzheimer</label>
                            </div>
                        </div>
                        <div>
                            <textarea id="p-traitements" class="app-input !py-3" rows="2" placeholder="Traitements en cours (médicaments, posologies)"></textarea>
                        </div>
                        <div>
                            <textarea id="p-allergies" class="app-input !py-3" rows="2" placeholder="Allergies connues"></textarea>
                        </div>
                        <div>
                            <textarea id="p-notes" class="app-input !py-3" rows="2" placeholder="Autres informations (mobilité, habitudes, précautions)"></textarea>
                        </div>
                    </div>
                `;
            }
        
        // ============================================
        // ÉTAPE 4 : FORFAIT
        // ============================================
        case 4:
            const packs = isMamanFlow ? [
                { id: 'ESSENTIEL', name: 'Essentiel', desc: '2 visites par semaine', price: '50.000', features: ['2 visites/semaine', 'Suivi de base'] },
                { id: 'CONFORT', name: 'Confort', desc: '3 à 4 visites par semaine', price: '85.000', features: ['3-4 visites/semaine', 'Aide à la toilette', 'Préparation repas'] },
                { id: 'SERENITE', name: 'Sérénité', desc: '6 à 7 visites par semaine', price: '150.000', features: ['6-7 visites/semaine', 'Accompagnement complet', 'Urgence 24/7'] },
                { id: 'MATERNITE', name: 'Spécial Maternité', desc: 'Suivi intensif 2 semaines', price: '70.000', features: ['Visite quotidienne', 'Aide bébé', 'Conseils allaitement'] }
            ] : [
                { id: 'PONCTUEL', name: 'Ponctuel', desc: 'À la demande', price: '10.000', features: ['Intervention unique', 'Accompagnement RDV'] },
                { id: 'REGULIER', name: 'Régulier', desc: '2 à 3 visites/semaine', price: '60.000', features: ['2-3 visites/semaine', 'Suivi médical', 'Lien famille'] },
                { id: 'COMPLET', name: 'Complet', desc: '5 à 6 visites/semaine', price: '150.000', features: ['5-6 visites/semaine', 'Présence renforcée', 'Veille sanitaire'] }
            ];
            
            return `
                <div class="text-center mb-8">
                    <div class="w-16 h-16 mx-auto ${themeBgClass} rounded-2xl flex items-center justify-center mb-4 shadow-md">
                        <i class="fa-solid fa-gem text-2xl ${themeTextClass}"></i>
                    </div>
                    <h3 class="text-xl font-black text-slate-800">Choisissez votre formule</h3>
                    <p class="text-xs text-slate-400 mt-1">Tarifs mensuels en CFA</p>
                </div>
                <div id="pack-selector" class="space-y-3 max-h-96 overflow-y-auto">
                    ${packs.map(pack => `
                        <div onclick="window.selectPack('${pack.id}', '${pack.price}')" 
                             class="pack-card p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${registrationData.type_pack === pack.id ? `border-${themeColor}-500 ${themeBgClass}` : 'border-slate-100'}"
                             data-pack-id="${pack.id}">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl ${registrationData.type_pack === pack.id ? themeBgClass : 'bg-slate-50'} flex items-center justify-center">
                                    <i class="fa-solid ${pack.id.includes('CONFORT') || pack.id.includes('REGULIER') ? 'fa-chart-line' : pack.id.includes('SERENITE') || pack.id.includes('COMPLET') ? 'fa-crown' : 'fa-seedling'} ${registrationData.type_pack === pack.id ? themeTextClass : 'text-slate-400'} text-xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="flex justify-between items-center">
                                        <p class="font-black text-slate-800">${pack.name}</p>
                                        <p class="text-base font-black ${themeTextClass}">${pack.price} F</p>
                                    </div>
                                    <p class="text-[10px] text-slate-400">${pack.desc}</p>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        ${pack.features.map(f => `<span class="text-[8px] text-slate-400">✓ ${f}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-6">
                    <button onclick="window.nextAuthStep()" 
                            id="pack-continue-btn"
                            class="w-full py-4 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg transition-all active:scale-95 ${registrationData.type_pack ? (isMamanFlow ? 'bg-pink-500' : 'bg-emerald-500') : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
                            ${!registrationData.type_pack ? 'disabled' : ''}>
                        Continuer
                    </button>
                </div>
            `;
        
        // ============================================
        // ÉTAPE 5 : CONFIRMATION
        // ============================================
        case 5: return `
            <div class="text-center mb-8">
                <div class="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 shadow-md">
                    <i class="fa-solid fa-check-circle text-2xl text-amber-600"></i>
                </div>
                <h3 class="text-xl font-black text-slate-800">Dernière étape</h3>
                <p class="text-xs text-slate-400 mt-1">Validation de votre demande</p>
            </div>
            <div class="bg-amber-50 p-5 rounded-2xl border border-amber-100 mb-6">
                <p class="text-xs text-amber-800 leading-relaxed">
                    <b>⚠️ À savoir :</b> Notre service propose un accompagnement <b>humain et logistique</b> (non médical).
                </p>
            </div>
            <label class="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200 cursor-pointer">
                <input type="checkbox" id="legal-check" class="mt-1 w-5 h-5 accent-emerald-500">
                <span class="text-xs font-medium text-slate-700">Je confirme avoir compris le principe de l'accompagnement non médical.</span>
            </label>
        `;
    }
}



window.selectServiceType = (type) => {
    registrationData.categorie = type;
    registrationData.user_is_maman = (type === 'MAMAN_BEBE');
    currentStep = 1;
    renderAuthView('register', currentStep);
};


// ============================================================
// SÉLECTEUR DE CATÉGORIE (SENIOR / MAMAN)
// ============================================================
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
        
        const displayDiv = document.getElementById('selected-category-display');
        const iconSpan = document.getElementById('selected-category-icon');
        const textSpan = document.getElementById('selected-category-text');
        
        if (displayDiv && iconSpan && textSpan) {
            iconSpan.className = category === 'MAMAN_BEBE' ? 'fa-solid fa-baby-carriage text-pink-500' : 'fa-solid fa-user-plus text-emerald-500';
            textSpan.innerText = `${cat.icon} ${cat.name} sélectionné`;
            displayDiv.classList.remove('hidden');
        }
        
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
        
        setTimeout(() => {
            window.nextAuthStep();
        }, 500);
    }
};

window.clearCategorySelection = () => {
    registrationData.categorie = null;
    const displayDiv = document.getElementById('selected-category-display');
    if (displayDiv) displayDiv.classList.add('hidden');
    
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('border-emerald-500', 'border-pink-500', 'bg-emerald-50', 'bg-pink-50');
        card.classList.add('border-slate-100');
    });
};

// ============================================================
// GESTION DES PACKS (ABONNEMENTS)
// ============================================================
window.selectPack = (packId, price) => {
    registrationData.type_pack = packId;
    registrationData.montant_prevu = price;
    
    const isMamanFlow = registrationData.categorie === 'MAMAN_BEBE';
    const themeColor = isMamanFlow ? 'pink' : 'emerald';
    const themeBgClass = isMamanFlow ? 'bg-pink-50 border-pink-200' : 'bg-emerald-50 border-emerald-200';
    const themeColorClass = isMamanFlow ? 'text-pink-600' : 'text-emerald-600';
    const borderColorClass = isMamanFlow ? 'border-pink-500' : 'border-emerald-500';
    const bgColorClass = isMamanFlow ? 'bg-pink-500' : 'bg-emerald-500';
    
    document.querySelectorAll('.pack-card').forEach(card => {
        const cardPackId = card.dataset.packId;
        if (cardPackId === packId) {
            card.classList.add(borderColorClass);
            card.classList.add(isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50');
            card.classList.add(isMamanFlow ? 'border-pink-200' : 'border-emerald-200');
            card.classList.remove('border-slate-100');
            
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
            
            const radioDiv = card.querySelector('.w-5.h-5');
            if (radioDiv) {
                radioDiv.classList.add(borderColorClass);
                radioDiv.classList.add(bgColorClass);
                radioDiv.classList.remove('border-slate-300', 'bg-transparent');
                radioDiv.innerHTML = '<i class="fa-solid fa-check text-white text-[8px]"></i>';
            }
        } else {
            card.classList.remove(borderColorClass);
            card.classList.remove(isMamanFlow ? 'bg-pink-50' : 'bg-emerald-50');
            card.classList.remove(isMamanFlow ? 'border-pink-200' : 'border-emerald-200');
            card.classList.add('border-slate-100');
            
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
            
            const radioDiv = card.querySelector('.w-5.h-5');
            if (radioDiv) {
                radioDiv.classList.remove(borderColorClass);
                radioDiv.classList.remove(bgColorClass);
                radioDiv.classList.add('border-slate-300');
                radioDiv.innerHTML = '';
            }
        }
    });
    
    const continueBtn = document.getElementById('pack-continue-btn');
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
        continueBtn.classList.add(isMamanFlow ? 'bg-pink-500' : 'bg-emerald-500');
        continueBtn.classList.add(isMamanFlow ? 'hover:bg-pink-600' : 'hover:bg-emerald-600');
    }
    
    UI.vibrate('success');
};

// ============================================================
// LOGIQUE DU FORMULAIRE D'ADMISSION (STEPPER)
// ============================================================
window.nextAuthStep = () => {
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
        registrationData.lien_parente = document.getElementById('f-lien')?.value || "";
    }
    if (currentStep === 2) {
        registrationData.nom_patient = document.getElementById('p-nom')?.value;
        registrationData.adresse_patient = document.getElementById('p-addr')?.value;
        registrationData.contact_urgence = document.getElementById('p-urgence')?.value;
        registrationData.age_patient = document.getElementById('p-age')?.value || "";
        registrationData.sexe_patient = document.getElementById('p-sex')?.value || "";
        registrationData.tel_patient = document.getElementById('p-tel')?.value || "";
        registrationData.contact_urgence_tel = document.getElementById('p-urgence-tel')?.value || "";
    }
        if (currentStep === 3) {
            const meds = Array.from(document.querySelectorAll('.med-hist:checked')).map(el => el.value);
            registrationData.pathologies = meds;  
            registrationData.traitements = document.getElementById('p-traitements')?.value || "";
            registrationData.allergies = document.getElementById('p-allergies')?.value || "";
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

window.prevAuthStep = () => {
    if (currentStep > 1) {
        currentStep--;
        renderAuthView('register', currentStep);
    }
};
async function submitRegistration() {
    if(!registrationData.type_pack) return Swal.fire("Erreur", "Veuillez choisir une formule", "warning");
    
    registrationData.formule = registrationData.type_pack;
    registrationData.email = registrationData.email.trim().toLowerCase();
    
    // ✅ Assure-toi que pathologies est bien un tableau
    if (registrationData.pathologies && !Array.isArray(registrationData.pathologies)) {
        registrationData.pathologies = registrationData.pathologies.split(',').map(s => s.trim());
    }
    
    // ✅ Ne pas stringifier manuellement, laisse fetch le faire
    const payload = {
        ...registrationData,
        pathologies: registrationData.pathologies || []
    };
    
    Swal.fire({ title: 'Création du dossier...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const res = await fetch(`${CONFIG.API_URL}/auth/register-family-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)  // ← fetch stringifie automatiquement
        });

        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem("user_categorie", registrationData.categorie);
            localStorage.setItem("user_is_maman", registrationData.categorie === 'MAMAN_BEBE');
            
            Swal.fire({
                icon: "success",
                title: "Dossier Transmis !",
                text: "Un coordinateur va valider vos informations sous 24h.",
                confirmButtonText: "RETOUR À L'ACCUEIL",
                confirmButtonColor: "#16a34a"
            }).then(() => window.location.reload());
        } else {
            throw new Error(data.error || "Erreur lors de l'inscription");
        }
    } catch (e) {
        console.error("Erreur inscription:", e);
        Swal.fire("Erreur", e.message, "error");
    }
}
// ============================================================
// VUE AUTHENTIFICATION (LOGIN / REGISTER / OTP)
// ============================================================
function renderAuthView(mode = 'login', stepSource = 1) {
    const app = document.getElementById("app");
    currentStep = typeof stepSource === 'number' ? stepSource : 1; 
    const otpEmail = mode === 'otp' ? stepSource : null;

    const isMamanFlow = registrationData.categorie === 'MAMAN_BEBE';
    const accentBgClass = isMamanFlow ? 'bg-rose-primary' : 'bg-gold-primary';
    const accentHoverClass = isMamanFlow ? 'hover:bg-rose-600' : 'hover:bg-amber-500';
    const accentShadowClass = isMamanFlow ? 'shadow-rose-200' : 'shadow-amber-200';
    const progressColor = isMamanFlow ? 'bg-rose-primary' : 'bg-gold-primary';

    let dynamicContent = "";
    let stepTitle = mode === 'login' ? "Espace Sécurisé" : 
                (mode === 'otp' ? "Sécurité Avancée" : 
                (currentStep === 0 ? "Bienvenue" : `Étape ${currentStep} / 6`));
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
                    <button onclick="window.renderAuthView('register', 0)" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
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
        app.innerHTML = `
        <div class="fixed inset-0 w-full h-[100dvh] flex items-center justify-center bg-[#F8FAFC] p-4 lg:p-8 z-50">
            <div class="absolute -top-20 -left-20 w-96 h-96 bg-emerald-200 rounded-full filter blur-[100px] opacity-40 animate-blob pointer-events-none z-0"></div>
            <div class="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-100 rounded-full filter blur-[100px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>
            <div class="auth-card relative w-full max-w-md bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] border border-white z-10 flex flex-col h-[600px] max-h-[85dvh]">
                <div class="shrink-0 text-center pt-8 pb-4">
                     <div class="w-14 h-14 mx-auto bg-slate-900 text-white rounded-[1.2rem] flex items-center justify-center text-xl shadow-xl mb-3">
                        <img src="/sante-plus-frontend/assets/images/logo-general-icon.png" class="w-8 h-8 object-contain">
                    </div>
                    <h1 class="text-xl font-[900] text-slate-900 tracking-tight leading-none uppercase">Santé Plus</h1>
                    <p id="auth-step-title" class="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em] mt-1.5">${stepTitle}</p>
                </div>
                <div id="auth-tabs" class="shrink-0 px-8 mb-4 animate-fadeIn" style="display: ${mode !== 'otp' ? 'block' : 'none'}">
                    <div class="bg-slate-100/50 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200/30">
                        <button onclick="window.renderAuthView('login')" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            Connexion
                        </button>
                        <button onclick="window.renderAuthView('register', 0)" class="flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-[800] uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
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

// ============================================================
// HUB DE NAVIGATION MOBILE
// ============================================================
function renderMobileHub() {
    const userRole = localStorage.getItem("user_role");
    const userName = localStorage.getItem("user_name");
    const container = document.getElementById("view-container");
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const isSenior = !isMaman && userRole === "FAMILLE";
    
    // Couleurs de branding (PAS DE BLEU)
    const primaryColor = isMaman ? '#DB2777' : '#10B981';
    const primaryLight = isMaman ? '#FDF2F8' : '#ECFDF5';
    const primaryText = isMaman ? 'text-pink-600' : 'text-emerald-600';
    const primaryBg = isMaman ? 'bg-pink-50' : 'bg-emerald-50';
    const goldColor = '#D4AF37';
    
    // Texte de la bannière
    let bannerText = "";
    let bannerIcon = "";
    let bannerDesc = "";
    let bannerBg = "";
    
    if (isMaman) {
        bannerText = "🌸 Programme Maman & Bébé";
        bannerIcon = "fa-baby-carriage";
        bannerDesc = "Soutien et bien-être pour maman et bébé";
        bannerBg = "bg-gradient-to-r from-pink-50 to-pink-100 border-pink-200";
    } else if (isSenior) {
        bannerText = "⭐ Programme Sénior";
        bannerIcon = "fa-crown";
        bannerDesc = "Maintien à domicile et soins au quotidien";
        bannerBg = "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200";
    } else {
        bannerText = "⭐ Programme Premium";
        bannerIcon = "fa-crown";
        bannerDesc = "Accès prioritaire aux soins";
        bannerBg = "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200";
    }
    
    // Menu avec BRANDING UNIQUEMENT (Vert/Rose + Or)
    const menuItems = [
        { id: 'map', label: 'Radar', desc: 'Localisation GPS', icon: 'fa-location-dot', color: isMaman ? 'text-pink-500' : 'text-emerald-500', bg: primaryBg, roles: ['COORDINATEUR', 'AIDANT', 'FAMILLE'] },
        { id: 'patients', label: isMaman ? 'Mon suivi' : (isSenior ? 'Mon proche' : 'Dossiers'), desc: isMaman ? 'Carnet de santé' : 'Dossier médical', icon: 'fa-folder-open', color: isMaman ? 'text-pink-500' : 'text-emerald-500', bg: primaryBg, roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', label: 'Visites', desc: 'Historique', icon: 'fa-calendar-check', color: 'text-amber-600', bg: 'bg-amber-50', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'feed', label: isMaman ? 'Journal' : 'Journal', desc: 'Photos et messages', icon: 'fa-newspaper', color: isMaman ? 'text-pink-500' : 'text-emerald-500', bg: primaryBg, roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'commandes', label: isMaman ? 'Commandes' : 'Commandes', desc: 'Produits', icon: 'fa-box', color: isMaman ? 'text-pink-500' : 'text-emerald-500', bg: primaryBg, roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'billing', label: 'Factures', desc: 'Paiements', icon: 'fa-receipt', color: 'text-amber-600', bg: 'bg-amber-50', roles: ['COORDINATEUR', 'FAMILLE'] },
        { id: 'subscription', label: 'Abonnement', desc: 'Formules', icon: 'fa-ticket', color: 'text-amber-600', bg: 'bg-amber-50', roles: ['FAMILLE'] },
        { id: 'profile', label: 'Profil', desc: 'Mon compte', icon: 'fa-user-circle', color: isMaman ? 'text-pink-500' : 'text-emerald-500', bg: primaryBg, roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] }
    ];

    const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

    container.innerHTML = `
        <div class="animate-fadeIn pb-32">
            <!-- Bannière Branding -->
            <div class="${bannerBg} p-5 rounded-2xl mb-8 shadow-md border">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                                <i class="fa-solid ${bannerIcon} ${isMaman ? 'text-pink-500' : 'text-emerald-500'} text-sm"></i>
                            </div>
                            <span class="text-[8px] font-black uppercase tracking-wider text-slate-500">${bannerText}</span>
                        </div>
                        <p class="text-xl font-black ${isMaman ? 'text-pink-600' : 'text-emerald-700'}">
                            ${userName?.split(' ')[0] || 'Utilisateur'}
                        </p>
                        <p class="text-[10px] text-slate-500 mt-0.5">
                            ${bannerDesc}
                        </p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br ${isMaman ? 'from-pink-400 to-pink-600' : 'from-emerald-400 to-emerald-600'} flex items-center justify-center shadow-lg">
                        <i class="fa-solid fa-gem text-white text-lg"></i>
                    </div>
                </div>
            </div>
            
            <!-- Barre de recherche -->
            <div class="bg-white border border-slate-100 p-3 rounded-xl flex items-center gap-3 mb-8 shadow-sm">
                <i class="fa-solid fa-magnifying-glass text-slate-300 text-sm"></i>
                <input type="text" placeholder="Rechercher..." class="bg-transparent border-none outline-none text-sm font-medium w-full">
            </div>
            
            <!-- Titre menu avec couleur brand -->
            <h4 class="text-[10px] font-black uppercase tracking-wider mb-4 ml-1 ${isMaman ? 'text-pink-400' : 'text-emerald-400'}">
                MENU PRINCIPAL
            </h4>
            
            <!-- Grille menu -->
            <div class="menu-grid">
                ${filteredMenu.map((item, index) => `
                    <div onclick="window.switchView('${item.id}')" class="menu-tile cursor-pointer hover-lift border border-slate-100" style="animation: cardAppear 0.3s ease-out ${index * 0.03}s forwards; opacity: 0;">
                        <div class="${item.bg} w-12 h-12 rounded-xl flex items-center justify-center transition-all">
                            <i class="fa-solid ${item.icon} ${item.color} text-xl"></i>
                        </div>
                        <div>
                            <p class="font-black text-slate-800 text-sm">${item.label}</p>
                            <p class="text-[10px] text-slate-400 font-medium mt-0.5">${item.desc}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Badge de marque -->
            <div class="text-center mt-8 pt-4 border-t border-slate-100">
                <p class="text-[8px] font-black uppercase tracking-wider text-slate-300">
                    Santé Plus Services — <span class="${isMaman ? 'text-pink-400' : 'text-emerald-400'}">Élite</span>
                </p>
            </div>
        </div>
    `;
}
// ============================================================
// NOTIFICATIONS PUSH
// ============================================================
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

// ============================================================
// LAYOUT PRINCIPAL (HEADER, SIDEBAR, FOOTER)
// ============================================================
function renderLayout() {
    const userRole = localStorage.getItem("user_role");
    const userName = localStorage.getItem("user_name");
    const userPhoto = localStorage.getItem("user_photo");
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeColor = isMaman ? 'pink' : 'emerald';

    document.getElementById("app").innerHTML = `
        <div class="flex h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans select-none">
            <aside class="hidden lg:flex flex-col w-80 bg-[#0F172A] text-white p-8 shadow-[10px_0_40px_rgba(0,0,0,0.04)] z-50">
                <div class="flex items-center gap-4 mb-14 px-2">
                    <div class="w-12 h-12 ${isMaman ? 'bg-pink-500' : 'bg-gradient-to-tr from-green-500 to-emerald-400'} rounded-2xl flex items-center justify-center shadow-lg ${isMaman ? 'shadow-pink-500/20' : 'shadow-green-500/20'}">
                        <img src="${isMaman ? CONFIG.LOGO_MAMAN_ICON : CONFIG.LOGO_GENERAL_ICON}" class="w-8 h-8 object-contain">
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
                        <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs border border-white/20 overflow-hidden">
                            ${userPhoto ? `<img src="${userPhoto}" class="w-full h-full object-cover">` : `<span>${userName ? userName.charAt(0).toUpperCase() : 'S'}</span>`}
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
            <div class="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden">
                <header class="h-20 lg:h-24 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-4 lg:px-8 shrink-0 z-40">
                        <div class="lg:hidden flex items-center">
                            <div class="lg:hidden flex items-center">
                                <div class="w-10 h-10 ${isMaman ? 'bg-pink-500' : 'bg-slate-900'} rounded-xl flex items-center justify-center text-white shadow-xl rotate-[-5deg]">
                                    <img src="${isMaman ? CONFIG.LOGO_MAMAN_ICON : CONFIG.LOGO_GENERAL_ICON}" class="w-6 h-6 object-contain">
                                </div>
                            </div>
                        </div>
                    <div class="flex flex-col">
                        <h2 id="view-title" class="text-xl lg:text-3xl font-[900] text-slate-900 tracking-tight leading-none">Tableau de bord</h2>
                        <p class="hidden lg:block text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Santé Plus • Protocole de confiance</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.switchView('notifications')" 
                                class="relative w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-emerald-600 transition-all shadow-sm group">
                            <i class="fa-solid fa-bell text-sm"></i>
                            <span id="notification-badge" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white hidden">0</span>
                        </button>
                        <button onclick="window.switchView('profile')" class="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-3 py-2 shadow-sm hover:shadow-md transition-all active:scale-95">
                            <div class="flex flex-col items-end">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden lg:block">Mon compte</span>
                                <span class="text-xs font-black text-slate-800 hidden lg:block">${userName?.split(' ')[0] || 'Profil'}</span>
                            </div>
                            <div class="relative">
                                <div class="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-${themeColor}-100 to-${themeColor}-200 flex items-center justify-center shadow-md">
                                    ${userPhoto ? `<img src="${userPhoto}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user-${userRole === 'AIDANT' ? 'nurse' : userRole === 'FAMILLE' ? 'family' : 'tie'} text-${themeColor}-600 text-lg"></i>`}
                                </div>
                                <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                            </div>
                        </button>
                    </div>
                </header>
                <div class="absolute top-40 left-[-5%] w-[500px] h-[500px] bg-green-200/20 rounded-full blur-[120px] pointer-events-none z-0 animate-blob"></div>
                <div class="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none z-0 animate-blob animation-delay-2000"></div>
                <main id="main-content" class="flex-1 overflow-y-auto custom-scroll p-6 lg:p-12 z-10 relative">
                    <div id="view-container" class="max-w-7xl mx-auto min-h-full"></div>
                </main>

<footer class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-2 z-50 flex justify-between items-center shadow-lg">
    <button onclick="window.switchView('home')" data-view="home" class="nav-btn flex flex-col items-center gap-0.5 transition-all">
        <i class="fa-solid fa-house-chimney text-lg text-slate-400 group-[.active]:text-emerald-500"></i>
        <span class="text-[8px] font-black uppercase tracking-wider text-slate-400 group-[.active]:text-emerald-500">Accueil</span>
    </button>
    
    ${(userRole === 'AIDANT' || userRole === 'FAMILLE') ? `
    <button onclick="window.switchView('map')" data-view="map" class="nav-btn flex flex-col items-center gap-0.5 transition-all">
        <i class="fa-solid fa-location-dot text-lg text-slate-400"></i>
        <span class="text-[8px] font-black uppercase tracking-wider text-slate-400">Radar</span>
    </button>
    ` : ''}
    
    ${userRole === 'COORDINATEUR' ? `
    <button onclick="window.switchView('rh-dashboard')" data-view="rh-dashboard" class="nav-btn flex flex-col items-center gap-0.5 transition-all">
        <i class="fa-solid fa-users text-lg text-slate-400"></i>
        <span class="text-[8px] font-black uppercase tracking-wider text-slate-400">RH</span>
    </button>
    ` : ''}
    
    <button onclick="window.openAddPatient()" class="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl -mt-6 border-4 border-white active:scale-95 transition-all duration-200">
        <i class="fa-solid fa-plus text-xl"></i>
    </button>
    
    <button onclick="window.switchView('profile')" data-view="profile" class="nav-btn flex flex-col items-center gap-0.5 transition-all">
        <div class="w-6 h-6 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
            ${userPhoto ? `<img src="${userPhoto}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-slate-400 text-xs"></i>`}
        </div>
        <span class="text-[8px] font-black uppercase tracking-wider text-slate-400">Profil</span>
    </button>
</footer>

             
            </div>
        </div>
    `;
}

// ============================================================
// LIENS DE NAVIGATION (DESKTOP)
// ============================================================
function getNavLinks(role, mode) {
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const isSenior = !isMaman && role === "FAMILLE";
    
    const tabs = [
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', roles: ['COORDINATEUR'] },
        { id: 'map', icon: 'fa-location-dot', label: 'Radar', roles: ['COORDINATEUR', 'AIDANT', 'FAMILLE'] },
        { id: 'patients', icon: 'fa-hospital-user', label: isMaman ? 'Mon suivi' : (isSenior ? 'Mon proche' : 'Dossiers'), roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'visits', icon: 'fa-calendar-check', label: 'Visites', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'feed', icon: 'fa-rss', label: isMaman ? 'Journal de bord' : (isSenior ? 'Journal de soins' : 'Journal'), roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },
        { id: 'commandes', icon: 'fa-box', label: isMaman ? 'Commandes bébé' : 'Commandes', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] },        { id: 'billing', icon: 'fa-file-invoice-dollar', label: 'Factures', roles: ['COORDINATEUR', 'FAMILLE'] },
        { id: 'subscription', icon: 'fa-ticket', label: 'Abonnement', roles: ['FAMILLE'] },
        { id: 'planning', icon: 'fa-calendar-days', label: 'Planning', roles: ['COORDINATEUR', 'AIDANT'] },
        { id: 'aidants', icon: 'fa-user-nurse', label: 'Équipe', roles: ['COORDINATEUR'] },
        { id: 'rh-dashboard', icon: 'fa-users', label: 'RH', roles: ['COORDINATEUR'] },
        { id: 'profile', icon: 'fa-user-circle', label: 'Profil', roles: ['COORDINATEUR', 'FAMILLE', 'AIDANT'] }
    ];

    return tabs.filter(tab => tab.roles.includes(role)).map(tab => {
        if (mode === 'mobile') {
            return `<button onclick="window.switchView('${tab.id}')" data-view="${tab.id}" class="nav-btn flex flex-col items-center gap-1 flex-1 text-slate-400 transition-all">
                        <i class="fa-solid ${tab.icon} text-lg"></i>
                        <span class="text-[8px] font-black uppercase tracking-tighter">${tab.label}</span>
                    </button>`;
        } else {
            return `<button onclick="window.switchView('${tab.id}')" data-view="${tab.id}" class="sidebar-link w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-slate-400 transition-all text-sm mb-1">
                        <i class="fa-solid ${tab.icon} text-lg"></i>
                        <span>${tab.label}</span>
                    </button>`;
        }
    }).join('');
}

// ============================================================
// TRANSITION ENTRE LES VUES (SWITCHVIEW)
// ============================================================
let isTransitioning = false;
let pendingView = null;

window.switchView = async function(viewName) {
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
    
    // Animation de sortie
    container.style.transition = "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    container.style.opacity = "0";
    container.style.transform = "translateY(10px)";
    await new Promise(r => setTimeout(r, 150));
    
        // Loader élégant avec logo local
        const isMaman = localStorage.getItem('user_is_maman') === 'true';
        const loaderIcon = isMaman ? CONFIG.LOGO_MAMAN_ICON : CONFIG.LOGO_GENERAL_ICON;
        
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 min-h-[300px]">
                <img src="${loaderIcon}" class="w-12 h-12 animate-pulse">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-3">Chargement...</p>
            </div>
        `;
    await new Promise(r => setTimeout(r, 50));
    
    try {
        await performViewSwitch(viewName);
        container.style.opacity = "1";
        container.style.transform = "translateY(0)";
        setTimeout(() => {
            if (container) {
                container.style.transition = "";
                container.style.transform = "";
            }
        }, 250);
    } catch (err) {
        console.error("❌ Erreur switchView:", err);
        container.innerHTML = `<div class="p-10 text-center bg-white rounded-2xl border border-rose-100 shadow-sm">
                                    <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-4"></i>
                                    <h3 class="text-rose-500 font-black text-lg uppercase">Erreur de chargement</h3>
                                    <p class="text-xs text-slate-500 mt-2">${err.message || "Le serveur n'a pas pu répondre."}</p>
                                    <button onclick="window.switchView('${viewName}')" class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Réessayer</button>
                                </div>`;
        container.style.opacity = "1";
    }
    
    isTransitioning = false;
    if (pendingView) {
        const next = pendingView;
        pendingView = null;
        window.switchView(next);
    }
};

// ============================================================
// CHARGEMENT D'UNE VUE SPÉCIFIQUE
// ============================================================
async function performViewSwitch(viewName) {
    const container = document.getElementById("view-container");
    const titleElement = document.getElementById("view-title");
    if (!container) return;

    const userRole = localStorage.getItem("user_role");
    const paymentStatus = localStorage.getItem("payment_status");
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const isFamily = userRole === "FAMILLE";

    // Sécurité paiement : accès restreint si impayé
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

    // Mise à jour des onglets actifs
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

    // ✅ Titres dynamiques selon le profil
    let patientsTitle = "Gestion des Dossiers";
    let feedTitle = "Journal de Soins Live";
    let commandesTitle = "Commandes";
    let commandesDesc = "Produits et livraisons";
    let commandesBtnColor = "emerald-600";
    
    if (isFamily) {
        if (isMaman) {
            patientsTitle = "Mon accompagnement";
            feedTitle = "Mon journal";
            commandesTitle = "Commandes bébé";
            commandesDesc = "Couches, lait, puériculture";
            commandesBtnColor = "pink-500";
        } else {
            patientsTitle = "Mon proche";
            feedTitle = "Journal de soins";
            commandesTitle = "Commandes";
            commandesDesc = "Médicaments et matériel médical";
            commandesBtnColor = "emerald-600";
        }
    }
    
    const viewTitles = {
        dashboard: "Aperçu Analytique", 
        map: "Radar Terrain Live", 
        patients: patientsTitle,
        visits: "Suivi des Interventions", 
        feed: feedTitle, 
        billing: "Centre de Facturation",
        aidants: "Gestion de l'Équipe", 
        commandes: commandesTitle,
        planning: "Agenda des Soins",
        home: "Accueil",
        "rh-dashboard": "RH & Assignations",
        "add-patient": "Nouveau Patient",
        "link-family": "Lier une Famille",
        "add-aidant": "Nouvel Aidant",
        "end-visit": "Clôturer la visite",
        "start-visit": "Démarrer la visite",
        "subscription": "Nos Formules",
        "profile": "Mon Profil"
    };
    
    if (titleElement) titleElement.innerText = viewTitles[viewName] || "Santé Plus";
    localStorage.setItem("last_view", viewName);
    AppState.currentView = viewName;

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
                                <h3 class="font-black text-2xl text-slate-800 tracking-tight">${patientsTitle}</h3>
                                <p class="text-xs text-slate-400 font-bold uppercase mt-1">${isFamily ? (isMaman ? "Santé maman et bébé" : "Suivi médical") : "Base de données active"}</p>
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
                            ${userRole === 'COORDINATEUR' ? `<button onclick="window.switchView('add-aidant')" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center"><i class="fa-solid fa-user-plus text-lg"></i></button>` : ''}
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
                            ${userRole === "COORDINATEUR" ? `<button onclick="window.openAssignPage()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all"><i class="fa-solid fa-calendar-plus"></i></button>` : ""}
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
                                <h3 class="font-black text-2xl text-slate-800 tracking-tight">${commandesTitle}</h3>
                                <p class="text-xs text-slate-400 font-bold uppercase mt-1">${commandesDesc}</p>
                            </div>
                            ${userRole === "FAMILLE" ? `
                                <button onclick="window.openOrderModal()" 
                                        class="w-12 h-12 bg-${commandesBtnColor} text-white rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-plus text-xl"></i>
                                </button>
                            ` : ""}
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
            case "subscription":
                await Subscription.renderSubscriptionPage();
                break;
            case "rh-dashboard":
                await Admin.renderRHDashboard();
                break;
            case "profile":
                await Profile.renderProfilePage();
                break;
            case "notifications":
                await Notifications.renderNotificationsPage();
                break;
        }
        
        // Animation d'entrée
        container.style.opacity = "0";
        container.style.transform = "translateY(8px)";
        container.style.transition = "opacity 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1), transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1)";
        setTimeout(() => {
            container.style.opacity = "1";
            container.style.transform = "translateY(0)";
            updateActiveNavButtons(viewName);
            setTimeout(() => {
                if (container) container.style.transition = "";
            }, 150);
        }, 10);

    } catch (err) {
        console.error("DEBUG VIEW ERROR:", err);
        container.innerHTML = `<div class="p-10 text-center bg-white rounded-[2rem] border border-rose-100 shadow-sm animate-fadeIn">
                                    <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-4"></i>
                                    <h3 class="text-rose-500 font-black text-lg uppercase">Erreur de chargement</h3>
                                    <p class="text-xs text-slate-500 mt-2">${err.message || "Le serveur n'a pas pu répondre à cette requête."}</p>
                                    <button onclick="window.switchView('${viewName}')" class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Réessayer</button>
                                </div>`;
        container.style.opacity = "1";
    }
}
// ============================================================
// MENU PROFIL (COMPTE UTILISATEUR)
// ============================================================
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
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-download text-slate-400"></i>
                            <span class="text-xs font-bold text-slate-700">Installer l'application</span>
                        </div>
                        <button onclick="window.installPWA(); Swal.close();" class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Installer</button>
                    </div>
                    <button onclick="window.logout()" class="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Déconnexion</button>
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

window.installPWA = () => {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast("Application installée !", "success");
            }
            window.deferredPrompt = null;
        });
    } else {
        showToast("L'installation est déjà disponible ou non supportée", "info");
    }
};

// ============================================================
// ONBOARDING (TUTORIEL D'ACCUEIL)
// ============================================================
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
                ${!isLast ? `<button onclick="window.finishOnboarding()" class="absolute top-10 right-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-white tracking-widest border border-white/30 z-50">Ignorer</button>` : ''}
            </div>
            <div class="flex-1 flex flex-col items-center text-center px-10 pb-10">
                <h2 class="text-3xl font-[900] text-slate-900 tracking-tight mb-4 leading-tight">${step.title}</h2>
                <p class="text-slate-400 text-sm leading-relaxed mb-auto">${step.desc}</p>
                <div class="flex gap-2 mb-8">
                    ${ONBOARDING_STEPS.map((_, i) => `<div class="onboarding-dot ${i === onboardingStep ? 'active' : ''}"></div>`).join('')}
                </div>
                <button onclick="${isLast ? 'window.finishOnboarding()' : 'window.nextOnboarding()'}" class="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 transition-all">
                    ${isLast ? 'Démarrer SPS Élite' : 'Continuer'}
                </button>
            </div>
        </div>
    `;
}



// Vérifier si une visite est en cours au chargement
async function checkActiveVisit() {
    const activeVisitId = localStorage.getItem("active_visit_id");
    if (activeVisitId) {
        // Vérifier si la visite existe toujours en backend
        try {
            const visits = await secureFetch("/visites");
            const activeVisit = visits.find(v => v.id === activeVisitId && v.statut === "En cours");
            if (!activeVisit) {
                // La visite n'existe plus ou est terminée, nettoyer
                localStorage.removeItem("active_visit_id");
                localStorage.removeItem("geo_watch_id");
            }
        } catch (err) {
            console.error("Erreur vérification visite active:", err);
        }
    }
}


window.nextOnboarding = () => {
    onboardingStep++;
    renderOnboarding();
};

window.finishOnboarding = () => {
    localStorage.setItem("onboarding_seen", "true");
    console.log("✅ Onboarding marqué comme vu", localStorage.getItem("onboarding_seen"));
    window.location.reload(); 
};

// ============================================================
// ÉVÉNEMENTS GLOBAUX
// ============================================================
// ============================================================
// ÉVÉNEMENTS GLOBAUX
// ============================================================
window.CONFIG = CONFIG;
window.AppState = AppState;
window.login = Auth.handleLogin;
window.logout = Auth.handleLogout;
window.verifyOTP = Auth.verifyOTP;
window.openAddPatient = () => window.switchView('add-patient');
window.openEndVisit = () => window.switchView('end-visit');
window.submitEndVisit = Visites.submitEndVisit;
window.submitAddAidant = Aidants.submitAddAidant;
window.openLinkFamilyModal = (id, name) => {
    AppState.tempData = { patientId: id, patientName: name }; 
    window.switchView('link-family');
};
window.openAddAidantModal = Aidants.openAddAidantModal;
window.markAsDelivered = Commandes.markAsDelivered;
window.viewPatientFeed = async (id) => { 
    const userRole = localStorage.getItem("user_role");
    const titleElement = document.getElementById("view-title");
    localStorage.setItem("current_patient_id", id);
    AppState.currentPatient = id;
    if (userRole === 'AIDANT') {
        UI.vibrate();
        if (titleElement) titleElement.innerText = "Briefing Patient";
        await Patients.renderPatientDetailsView(id);
    } else {
        window.switchView("feed"); 
    }
};
window.viewPatientDetails = Patients.renderPatientDetailsView;
window.renderAuthView = renderAuthView;
window.nextAuthStep = nextAuthStep;
window.prevAuthStep = prevAuthStep;
window.setPlan = (plan) => {
    registrationData.formule = plan;
    renderAuthView('register', 4);
};
window.submitRegistration = submitRegistration;
window.startOnboarding = startOnboarding;
window.finishOnboarding = finishOnboarding;
window.nextOnboarding = nextOnboarding;
window.setPatientHomeDirect = Patients.setPatientHomeDirect;
window.openAssignModal = Planning.openAssignModal;
window.openAssignPage = Planning.openAssignPage;
window.openOrderModal = Commandes.openOrderModal;
window.loadPlanning = Planning.loadPlanning;
window.loadCommandes = Commandes.loadCommandes;
window.openMissionBriefing = Planning.openMissionBriefing;
window.loadRegistrations = Admin.loadRegistrations;
window.confirmActivation = Admin.confirmActivation;
window.fetchStats = Dashboard.fetchStats;
window.openActivationPage = Admin.openActivationPage;
window.confirmCommand = Commandes.confirmCommand;
window.processValidation = Admin.processValidation;

window.confirmStartVisit = Visites.startVisit;
window.setThemeColor = setThemeColor;
window.openModernSelector = openModernSelector;
window.showToast = showToast;
window.UI = UI;
window.playSound = playSound;
window.renderRHDashboard = Admin.renderRHDashboard;


// Événements pour la page d'assignation (dropdowns)
document.addEventListener('click', (e) => {
    const aidantItem = e.target.closest('.aidant-item');
    if (aidantItem) {
        const id = aidantItem.dataset.id;
        const name = aidantItem.dataset.name;
        const email = aidantItem.dataset.email;
        window._selectedAidant = { id, name, email };
        const nameEl = document.getElementById('selected-aidant-name');
        const emailEl = document.getElementById('selected-aidant-email');
        if (nameEl) nameEl.innerText = name;
        if (emailEl) emailEl.innerHTML = email || '<span class="text-slate-400">Email non renseigné</span>';
        const dropdown = document.getElementById('aidant-dropdown');
        const chevron = document.getElementById('aidant-chevron');
        if (dropdown) dropdown.classList.add('hidden');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        document.querySelectorAll('.aidant-item').forEach(el => el.classList.remove('bg-emerald-50'));
        aidantItem.classList.add('bg-emerald-50');
        UI.vibrate('click');
    }
    
    const patientItem = e.target.closest('.patient-item');
    if (patientItem) {
        const id = patientItem.dataset.id;
        const name = patientItem.dataset.name;
        const formule = patientItem.dataset.formule;
        window._selectedPatient = { id, name, formule };
        const nameEl = document.getElementById('selected-patient-name');
        const formuleEl = document.getElementById('selected-patient-formule');
        if (nameEl) nameEl.innerText = name;
        if (formuleEl) formuleEl.innerHTML = formule || 'Standard';
        const dropdown = document.getElementById('patient-dropdown');
        const chevron = document.getElementById('patient-chevron');
        if (dropdown) dropdown.classList.add('hidden');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        document.querySelectorAll('.patient-item').forEach(el => el.classList.remove('bg-blue-50'));
        patientItem.classList.add('bg-blue-50');
        UI.vibrate('click');
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#aidant-selector')) {
        const dropdown = document.getElementById('aidant-dropdown');
        const chevron = document.getElementById('aidant-chevron');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    }
    if (!e.target.closest('#patient-selector')) {
        const dropdown = document.getElementById('patient-dropdown');
        const chevron = document.getElementById('patient-chevron');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    }
});

// Détection de l'installation PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('📱 PWA installable détectée');
});

// Met à jour la couleur des icônes du menu du bas
function updateActiveNavButtons(viewName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const btnView = btn.getAttribute('data-view');
        if (btnView === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}
// ============================================================
// VALIDATION D'ACTIVATION DE COMPTE
// ============================================================
window.processValidation = async (id, email, nom, role) => {
    console.log("🔵 Activation déclenchée pour:", { id, email, nom, role });
    
    const notes = document.getElementById('val-notes')?.value || '';
    
    Swal.fire({ 
        title: 'Activation en cours...', 
        didOpen: () => Swal.showLoading(), 
        allowOutsideClick: false 
    });

    try {
        // ✅ secureFetch est maintenant importé
        const result = await secureFetch('/admin/validate-member', {
            method: 'POST',
            body: JSON.stringify({ 
                user_id: id, 
                email: email, 
                nom: nom, 
                role: role, 
                notes: notes 
            })
        });
        
        console.log("✅ Réponse serveur:", result);
        
        Swal.fire({
            icon: "success",
            title: "✅ Activation réussie !",
            text: `Le compte de ${nom} a été activé.`,
            confirmButtonColor: "#10B981",
            timer: 2000,
            showConfirmButton: false
        });
        
        setTimeout(() => {
            window.switchView('dashboard');
        }, 500);
        
    } catch(error) {
        console.error("❌ Erreur activation:", error);
        Swal.fire({
            icon: "error",
            title: "Erreur",
            text: error.message,
            confirmButtonColor: "#F43F5E"
        });
    }
};
// Lancement de l'application
initApp();
