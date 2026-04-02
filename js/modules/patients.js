import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";
import * as Visites from "./visites.js"; 


/**
 * 📥 1. CHARGER LA LISTE DES PATIENTS
 */
export async function loadPatients() {
  const container = document.getElementById("patients-list");
  if (!container) return;

  try {
    const response = await secureFetch("/patients");
    const data = await response.json();

    AppState.patients = data;
    renderPatients();
  } catch (err) {
    container.innerHTML = `<p class="text-rose-500 text-center p-10 font-bold">Erreur: ${err.message}</p>`;
    throw err; 
  }
}

/**
 * 🎨 2. RENDU DE LA LISTE
 */
export function renderPatients() {
  const container = document.getElementById("patients-list");
  const userRole = localStorage.getItem("user_role");
  if (!container) return;

  if (AppState.patients.length === 0) {
    container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <i class="fa-solid fa-users-slash text-slate-100 text-5xl mb-4"></i>
                <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aucun dossier actif</p>
            </div>`;
    return;
  }

  container.innerHTML = AppState.patients.map((p) => {
    // --- 🧠 LOGIQUE DE THÉMATISATION (DEMANDE CLIENTE) ---
    const isMaman = p.categorie_service === 'MAMAN_BEBE';
    const isPremium = p.formule === 'Premium';

    // 1. Couleurs et icônes selon la catégorie
    const themeColorClass = isMaman ? 'border-pink-200' : 'border-emerald-100';
    const badgeColorClass = isMaman ? 'bg-pink-100 text-pink-600' : 'bg-emerald-50 text-emerald-600';
    const categoryIcon = isMaman ? '🍼' : '👴';
    const categoryLabel = isMaman ? 'Maman & Bébé' : 'Dossier Sénior';

    // 2. Style Premium (Bordure Gold)
    const premiumCardClass = isPremium ? 'border-2 border-amber-300 shadow-[0_10px_30px_rgba(212,175,55,0.1)] bg-[#FFFEFA]' : 'border-slate-100 bg-white';

    // --- 📐 LOGIQUE TECHNIQUE EXISTANTE ---
    const initials = p.nom_complet.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
    const hasGps = p.lat && p.lng;
    const canManageGps = (userRole === 'COORDINATEUR' || userRole === 'AIDANT');

    return `
        <div class="patient-card animate-fadeIn group ${premiumCardClass}">
            <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-4">
                    <!-- Avatar avec indicateur GPS et thème dynamique -->
                    <div class="relative">
                        <div class="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-400 font-[900] text-lg border-2 ${themeColorClass} shadow-inner group-hover:border-amber-400 transition-colors">
                            ${initials}
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${hasGps ? 'bg-emerald-500' : 'bg-slate-300'} shadow-sm" title="${hasGps ? 'Domicile fixé' : 'GPS Manquant'}"></div>
                    </div>

                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-black text-slate-800 text-sm uppercase leading-none">${p.nom_complet}</h4>
                            ${isPremium ? '<i class="fa-solid fa-crown text-[10px] text-amber-500 animate-bounce"></i>' : ''}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                             <!-- Badge Formule (Gold si Premium) -->
                             <span class="status-pill ${isPremium ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}">${p.formule}</span>
                             <!-- Badge Catégorie (Nouveau) -->
                             <span class="status-pill ${badgeColorClass}">${categoryIcon} ${categoryLabel}</span>
                        </div>
                        <p class="text-[10px] font-bold text-slate-400 mt-2"><i class="fa-solid fa-map-pin mr-1"></i>${p.adresse || 'Cotonou'}</p>
                    </div>
                </div>

                <!-- ACTIONS RAPIDES -->
                <div class="flex gap-2">
                    ${canManageGps ? `
                        <button onclick="window.setPatientHomeDirect('${p.id}')" 
                            class="w-10 h-10 rounded-2xl ${hasGps ? 'bg-slate-50 text-slate-400' : 'bg-amber-50 text-amber-600'} flex items-center justify-center border border-transparent hover:border-amber-200 transition-all active:scale-90" 
                            title="Fixer le domicile GPS actuel">
                            <i class="fa-solid fa-house-signal"></i>
                        </button>
                    ` : ''}

                    <button onclick="window.viewPatientFeed('${p.id}')" class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-green-600">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div class="flex items-center gap-2">
                     <div class="flex -space-x-2">
                        <div class="w-6 h-6 rounded-full border-2 border-white bg-blue-500 text-[8px] flex items-center justify-center text-white font-bold" title="Compte Famille">F</div>
                        <div class="w-6 h-6 rounded-full border-2 border-white bg-emerald-500 text-[8px] flex items-center justify-center text-white font-bold" title="Aidant Assigné">A</div>
                     </div>
                     <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                        Famille : <span class="text-slate-700">${p.famille ? p.famille.nom : 'Non liée'}</span>
                     </p>
                 </div>
                 
                 <!-- Bouton de liaison pour l'Admin -->
                 ${userRole === 'COORDINATEUR' && !p.famille_user_id ? `
                    <button onclick="window.openLinkFamilyModal('${p.id}', '${p.nom_complet.replace(/'/g, "\\'")}')" class="text-[9px] font-black text-blue-600 uppercase underline decoration-2 underline-offset-4">
                        Lier Famille
                    </button>
                 ` : ''}
            </div>
        </div>
    `;
  }).join("");
}


/**
 * 📄 VUE : PAGE D'AJOUT D'UN PATIENT
 */
export async function renderAddPatientView() {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-2xl mx-auto pb-32">
            <!-- Header de Page -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('patients')" class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:scale-95">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nouveau Patient</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Création de dossier d'accompagnement</p>
                </div>
            </div>

            <!-- Formulaire -->
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div class="space-y-5">
                    <!-- Nom complet -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">
                            <i class="fa-solid fa-user mr-1"></i> Nom complet
                        </label>
                        <div class="relative">
                            <i class="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="form-pat-nom" class="app-input !pl-11" placeholder="Ex: Jean Gnonlonfoun">
                        </div>
                    </div>

                    <!-- Téléphone -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">
                            <i class="fa-solid fa-phone mr-1"></i> Téléphone au Bénin
                        </label>
                        <div class="relative">
                            <i class="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="form-pat-tel" class="app-input !pl-11" placeholder="+229 XX XXX XXX">
                        </div>
                    </div>

                    <!-- Adresse -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">
                            <i class="fa-solid fa-location-dot mr-1"></i> Adresse exacte
                        </label>
                        <div class="relative">
                            <i class="fa-solid fa-map-pin absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="form-pat-addr" class="app-input !pl-11" placeholder="Quartier, Rue, Repères...">
                        </div>
                    </div>

                    <!-- Formule (SELECTEUR MODERNE) -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">
                            <i class="fa-solid fa-gem mr-1"></i> Formule d'accompagnement
                        </label>
                        
                        <!-- Clickeur moderne -->
                        <div id="formule-selector-trigger" 
                             class="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer active:scale-98 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <i class="fa-solid fa-box text-emerald-600 text-base"></i>
                                </div>
                                <div>
                                    <p id="selected-formule-name" class="font-bold text-slate-800 text-sm">Choisir une formule</p>
                                    <p id="selected-formule-desc" class="text-[10px] text-slate-400 mt-0.5">Sélectionnez le niveau d'accompagnement</p>
                                </div>
                            </div>
                            <i class="fa-solid fa-chevron-down text-slate-300 text-xs"></i>
                        </div>
                        <input type="hidden" id="form-pat-formule" value="">
                    </div>

                    <!-- Bouton validation -->
                    <div class="pt-4 border-t border-slate-100 mt-6">
                        <button id="submit-patient-btn" class="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-check"></i> Enregistrer le dossier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Lier l'événement du sélecteur moderne
    document.getElementById("formule-selector-trigger").onclick = () => openFormuleSelector();
    document.getElementById("submit-patient-btn").onclick = () => submitAddPatient();
}

// Liste des formules disponibles
const FORMULES = [
    { 
        id: "Basic", 
        name: "Formule Basic", 
        desc: "1 visite par semaine", 
        price: "50.000 CFA",
        icon: "fa-seedling",
        color: "text-emerald-600"
    },
    { 
        id: "Standard", 
        name: "Formule Standard", 
        desc: "3 visites par semaine", 
        price: "75.000 CFA",
        icon: "fa-chart-line",
        color: "text-blue-600"
    },
    { 
        id: "Premium", 
        name: "Formule Premium", 
        desc: "7 jours sur 7", 
        price: "100.000 CFA",
        icon: "fa-crown",
        color: "text-gold-primary"
    }
];

// Ouvre le sélecteur de formule
async function openFormuleSelector() {
    const modalContent = `
        <div class="space-y-2 max-h-[60vh] overflow-y-auto">
            ${FORMULES.map(f => `
                <div class="formule-item p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all hover:border-emerald-200 active:scale-98" data-id="${f.id}">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                            <i class="fa-solid ${f.icon} ${f.color} text-xl"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between items-center">
                                <p class="font-black text-slate-800 text-sm">${f.name}</p>
                                <p class="text-[11px] font-black text-emerald-600">${f.price}</p>
                            </div>
                            <p class="text-[10px] text-slate-400 mt-0.5">${f.desc}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    const { value: selectedId } = await Swal.fire({
        title: '<span class="text-base font-black text-slate-800">🎁 Choisir une formule</span>',
        html: modalContent,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Fermer",
        cancelButtonColor: "#94A3B8",
        customClass: {
            popup: 'rounded-2xl p-5',
            cancelButton: 'rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-wider'
        },
        didOpen: () => {
            document.querySelectorAll('.formule-item').forEach(el => {
                el.addEventListener('click', () => {
                    Swal.close();
                    const formule = FORMULES.find(f => f.id === el.dataset.id);
                    if (formule) {
                        // Mettre à jour l'affichage
                        document.getElementById("selected-formule-name").innerText = formule.name;
                        document.getElementById("selected-formule-desc").innerHTML = `${formule.desc} • ${formule.price}`;
                        document.getElementById("form-pat-formule").value = formule.id;
                        
                        // Mettre à jour le style du déclencheur
                        const trigger = document.getElementById("formule-selector-trigger");
                        const iconContainer = trigger.querySelector('.w-10.h-10');
                        const icon = iconContainer.querySelector('i');
                        icon.className = `fa-solid ${formule.icon} ${formule.color} text-base`;
                    }
                });
            });
        }
    });
}

// Soumission du formulaire (inchangée mais utilise la valeur cachée)
window.submitAddPatient = async () => {
    const nom = document.getElementById("form-pat-nom")?.value;
    const tel = document.getElementById("form-pat-tel")?.value;
    const addr = document.getElementById("form-pat-addr")?.value;
    const formule = document.getElementById("form-pat-formule")?.value;

    if (!nom) {
        UI.vibrate('error');
        Swal.fire({ title: "Champ manquant", text: "Le nom du patient est requis", icon: "warning", customClass: { popup: 'rounded-2xl' } });
        return;
    }
    
    if (!formule) {
        UI.vibrate('error');
        Swal.fire({ title: "Formule manquante", text: "Veuillez sélectionner une formule d'accompagnement", icon: "warning", customClass: { popup: 'rounded-2xl' } });
        return;
    }

    Swal.fire({ title: 'Création...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, customClass: { popup: 'rounded-2xl' } });

    try {
        await secureFetch("/patients/add", {
            method: "POST",
            body: JSON.stringify({ 
                nom_complet: nom, 
                telephone: tel, 
                adresse: addr, 
                formule: formule 
            })
        });
        UI.vibrate("success");
        Swal.fire({ icon: "success", title: "Patient ajouté", text: "Le dossier a été créé avec succès", timer: 1500, showConfirmButton: false });
        window.switchView("patients");
    } catch (err) {
        Swal.fire({ title: "Erreur", text: err.message, icon: "error", customClass: { popup: 'rounded-2xl' } });
    }
};



/**
 * 📄 VUE : FICHE PATIENT ÉLITE (Consultation Aidant)
 */
export async function renderPatientDetailsView(patientId) {
    const container = document.getElementById("view-container");
    
    // On récupère les infos complètes du patient
    const res = await secureFetch(`/patients/${patientId}`);
    const p = await res.json();

    const isMaman = p.categorie_service === 'MAMAN_BEBE';
    const isPremium = p.formule === 'Premium' || p.type_pack === 'Premium';
    const initials = p.nom_complet.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    container.innerHTML = `
        <div class="animate-fadeIn max-w-lg mx-auto pb-32">
            <!-- Header Profil avec badge premium -->
            <div class="flex flex-col items-center text-center mb-6">
                <div class="relative">
                    <div class="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-3xl font-black text-slate-300 shadow-xl border-4 border-white mb-4">
                        ${initials}
                    </div>
                    ${isPremium ? `
                        <div class="absolute -top-2 -right-2 bg-gold-primary w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                            <i class="fa-solid fa-crown text-xs text-white"></i>
                        </div>
                    ` : ''}
                </div>
                <h3 class="text-xl font-black text-slate-deep tracking-tight">${p.nom_complet}</h3>
                <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
                    ${isMaman ? `
                        <span class="badge-pink px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <i class="fa-solid fa-baby-carriage text-[10px] mr-1"></i> Maman & Bébé
                        </span>
                    ` : `
                        <span class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <i class="fa-solid fa-user-plus text-[10px] mr-1"></i> Dossier Sénior
                        </span>
                    `}
                    ${isPremium ? `
                        <span class="badge-gold px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <i class="fa-solid fa-crown text-[10px] mr-1"></i> Premium
                        </span>
                    ` : ''}
                </div>
            </div>

            <!-- Bannière Premium ou Maman -->
            <div class="${isMaman ? 'maman-banner' : 'premium-banner'} p-4 rounded-xl mb-6 text-center">
                <p class="text-[10px] font-black uppercase tracking-wider">
                    ${isMaman ? '👶 Programme Maman & Bébé' : '⭐ Programme Premium'}
                </p>
                <p class="text-sm font-bold mt-1 ${isMaman ? 'text-rose-primary' : 'text-slate-deep'}">
                    ${isMaman ? 'Accompagnement personnalisé post-maternité' : 'Accès prioritaire et services exclusifs'}
                </p>
            </div>

            <!-- Grille Bento des infos vitales (cartes modernisées) -->
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <i class="fa-solid fa-phone mr-1"></i> Urgence Locale
                    </p>
                    <p class="text-xs font-semibold text-slate-700">${p.contact_urgence || 'Non renseigné'}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <i class="fa-solid fa-box mr-1"></i> Pack Actif
                    </p>
                    <p class="text-xs font-semibold text-slate-700">${p.type_pack || 'Standard'}</p>
                </div>
                <div class="col-span-2 ${isMaman ? 'bg-rose-soft border-rose-primary/20' : 'bg-gold-soft border-gold-primary/20'} p-5 rounded-xl border">
                    <p class="text-[9px] font-black ${isMaman ? 'text-rose-primary' : 'text-gold-primary'} uppercase tracking-wider mb-2">
                        <i class="fa-solid fa-heartbeat mr-1"></i> Points d'attention
                    </p>
                    <p class="text-sm font-medium text-slate-700 leading-relaxed">"${p.notes_medicales || 'Aucune consigne particulière.'}"</p>
                </div>
            </div>

            <!-- Zone d'action dynamique pour l'aidant -->
            <div id="aidant-active-area" class="mt-4"></div>

            <!-- Bouton retour stylisé -->
            <button onclick="window.switchView('patients')" class="w-full mt-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-deep transition-colors flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-left text-xs"></i> Retour à la liste
            </button>
        </div>
    `;

    // On branche la logique de visite
    window.AppState.currentPatient = p.id;
    Visites.refreshAidantUI(p.id);
}


/**
 * 📄 VUE : PAGE LIAISON FAMILLE (DUO PACK)
 */
export async function renderLinkFamilyView() {
    const container = document.getElementById("view-container");
    const { patientId, patientName } = window.AppState.tempData; // Récupéré depuis main.js

    container.innerHTML = `<div class="flex justify-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-3xl"></i></div>`;

    try {
        const response = await secureFetch("/auth/profiles?role=FAMILLE");
        const families = await response.json();

        if (families.length === 0) {
            container.innerHTML = `
                <div class="max-w-2xl mx-auto text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                    <i class="fa-solid fa-users-slash text-slate-200 text-5xl mb-4"></i>
                    <p class="text-sm font-bold text-slate-500">Aucun compte famille inscrit dans l'application.</p>
                    <button onclick="window.switchView('patients')" class="mt-6 text-[10px] font-black uppercase text-blue-500 tracking-widest">Retour aux dossiers</button>
                </div>`;
            return;
        }

        const familyOptions = families.map(f => `
            <label class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-300 transition-colors mb-3">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">${f.nom.charAt(0)}</div>
                    <div>
                        <p class="font-black text-slate-800 text-sm">${f.nom}</p>
                        <p class="text-[10px] text-slate-500 font-bold">${f.email}</p>
                    </div>
                </div>
                <input type="radio" name="family_select" value="${f.id}" class="w-5 h-5 accent-blue-600">
            </label>
        `).join('');

        container.innerHTML = `
            <div class="animate-fadeIn max-w-2xl mx-auto pb-24">
                <div class="flex items-center gap-4 mb-8">
                    <button onclick="window.switchView('patients')" class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:scale-95">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h3 class="font-black text-2xl text-slate-800 tracking-tight">Lier une Famille</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dossier : ${patientName}</p>
                    </div>
                </div>

                <div class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                    <p class="text-sm font-bold text-slate-500 mb-6">Sélectionnez le responsable financier (Diaspora) pour ce dossier :</p>
                    
                    <div class="max-h-96 overflow-y-auto custom-scroll pr-2 mb-6">
                        ${familyOptions}
                    </div>

                    <button onclick="window.submitLinkFamily('${patientId}')" class="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                        Confirmer la liaison <i class="fa-solid fa-link"></i>
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-center text-rose-500">Erreur : ${err.message}</p>`;
    }
};

window.submitLinkFamily = async (patientId) => {
    const selected = document.querySelector('input[name="family_select"]:checked');
    if (!selected) return UI.vibrate('error');

    Swal.fire({ title: 'Liaison...', didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2.5rem]' } });

    try {
        await secureFetch("/patients/link-family", {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, famille_user_id: selected.value })
        });
        UI.vibrate("success");
        Swal.close();
        window.switchView("patients"); // Retour à la liste
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};


/**
 * 🎯 FIXATION DIRECTE DU GPS (One-Click)
 */
export async function setPatientHomeDirect(patientId) { 
    try {
        UI.vibrate();
        
        // Loader discret et rapide
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        Toast.fire({ icon: 'info', title: 'Calcul de la position...' });

        // 1. Capture GPS (Haute précision)
        const pos = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { 
                enableHighAccuracy: true, 
                timeout: 10000 
            });
        });

        // 2. Envoi direct au backend
        const res = await secureFetch("/patients/update-gps", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            })
        });

        if (res.ok) {
            UI.vibrate("success");
            Toast.fire({ icon: 'success', title: 'Domicile enregistré !' });
            loadPatients(); // Rafraîchir pour voir le statut
        }

    } catch (err) {
        UI.vibrate("error");
        Swal.fire("Erreur GPS", "Veuillez autoriser la localisation sur votre téléphone.", "error");
    }
}
