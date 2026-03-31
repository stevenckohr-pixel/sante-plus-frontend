import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

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
    container.innerHTML = `<p class="text-red-500 text-center">Erreur: ${err.message}</p>`;
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
    const initials = p.nom_complet.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
    
    // 🏠 LOGIQUE GPS : On vérifie si le domicile est déjà enregistré
    const hasGps = p.lat && p.lng;
    
    // 🔐 DROITS : Seuls le Coordinateur et l'Aidant peuvent fixer le GPS
    const canManageGps = (userRole === 'COORDINATEUR' || userRole === 'AIDANT');

    return `
        <div class="patient-card animate-fadeIn group">
            <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-4">
                    <!-- Avatar avec indicateur GPS (Vert si fixé, Gris si manquant) -->
                    <div class="relative">
                        <div class="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-400 font-[900] text-lg border-2 border-slate-50 shadow-inner group-hover:border-green-100 transition-colors">
                            ${initials}
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${hasGps ? 'bg-emerald-500' : 'bg-slate-300'} shadow-sm" title="${hasGps ? 'Domicile fixé' : 'GPS Manquant'}"></div>
                    </div>

                    <div>
                        <h4 class="font-black text-slate-800 text-sm uppercase leading-none">${p.nom_complet}</h4>
                        <div class="flex items-center gap-2 mt-2">
                             <span class="status-pill ${p.formule === 'Premium' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}">${p.formule}</span>
                             <span class="text-[10px] font-bold text-slate-400 truncate max-w-[120px]"><i class="fa-solid fa-map-pin mr-1"></i>${p.adresse || 'Cotonou'}</span>
                        </div>
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

                    <button onclick="window.viewPatientFeed('${p.id}')" class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div class="flex items-center gap-2">
                     <div class="flex -space-x-2">
                        <div class="w-6 h-6 rounded-full border-2 border-white bg-blue-500 text-[8px] flex items-center justify-center text-white font-bold">F</div>
                        <div class="w-6 h-6 rounded-full border-2 border-white bg-emerald-500 text-[8px] flex items-center justify-center text-white font-bold">A</div>
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
        <div class="animate-fadeIn max-w-2xl mx-auto pb-24">
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

            <!-- Formulaire Native App -->
            <div class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div class="space-y-6">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nom complet</label>
                        <div class="relative group">
                            <i class="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                            <input id="form-pat-nom" class="app-input !pl-12" placeholder="Ex: Jean Gnonlonfoun">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Téléphone au Bénin</label>
                        <div class="relative group">
                            <i class="fa-solid fa-phone absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                            <input id="form-pat-tel" class="app-input !pl-12" placeholder="+229 ...">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Adresse exacte</label>
                        <div class="relative group">
                            <i class="fa-solid fa-map-location-dot absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                            <input id="form-pat-addr" class="app-input !pl-12" placeholder="Quartier, Rue, Repères...">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Formule d'accompagnement</label>
                        <select id="form-pat-formule" class="app-input cursor-pointer font-bold text-slate-700">
                            <option value="Basic">Formule Basic (1 visite/sem) - 50k</option>
                            <option value="Standard">Formule Standard (3 visites/sem) - 75k</option>
                            <option value="Premium">Formule Premium (7j/7) - 100k</option>
                        </select>
                    </div>

                    <div class="pt-6 border-t border-slate-50 mt-8">
                        <button onclick="window.submitAddPatient()" class="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                            Enregistrer le dossier <i class="fa-solid fa-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// L'action d'enregistrement
window.submitAddPatient = async () => {
    const nom = document.getElementById("form-pat-nom").value;
    const tel = document.getElementById("form-pat-tel").value;
    const addr = document.getElementById("form-pat-addr").value;
    const formule = document.getElementById("form-pat-formule").value;

    if (!nom) return UI.vibrate('error');

    Swal.fire({ title: 'Création...', didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2.5rem]' } });

    try {
        await secureFetch("/patients/add", {
            method: "POST",
            body: JSON.stringify({ nom_complet: nom, telephone: tel, adresse: addr, formule })
        });
        UI.vibrate("success");
        Swal.close();
        window.switchView("patients"); // Retour automatique à la liste
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
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
    const initials = p.nom_complet.split(' ').map(n => n[0]).join('').toUpperCase();

    container.innerHTML = `
        <div class="animate-fadeIn max-w-lg mx-auto pb-24">
            <!-- Header Profil -->
            <div class="flex flex-col items-center text-center mb-8">
                <div class="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-3xl font-black text-slate-300 shadow-xl border-4 border-white mb-4">
                    ${initials}
                </div>
                <h3 class="text-2xl font-[900] text-slate-800 tracking-tight">${p.nom_complet}</h3>
                <span class="px-4 py-1.5 rounded-full ${isMaman ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-600'} text-[10px] font-black uppercase tracking-widest mt-2">
                    ${isMaman ? '🍼 Maman & Bébé' : '👴 Dossier Sénior'}
                </span>
            </div>

            <!-- Grille Bento des infos vitales -->
            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-black text-slate-400 uppercase mb-2">Urgence Locale</p>
                    <p class="text-xs font-bold text-slate-700">${p.contact_urgence || 'Non renseigné'}</p>
                </div>
                <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-black text-slate-400 uppercase mb-2">Pack Actif</p>
                    <p class="text-xs font-bold text-slate-700">${p.type_pack || 'Standard'}</p>
                </div>
                <div class="col-span-2 bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                    <p class="text-[9px] font-black text-amber-600 uppercase mb-2">Points d'attention / Santé</p>
                    <p class="text-sm font-medium text-slate-700 leading-relaxed italic">"${p.notes_medicales || 'Aucune consigne particulière.'}"</p>
                </div>
            </div>

            <!-- Zone d'action dynamique -->
            <div id="aidant-active-area">
                <!-- Le bouton Démarrer sera injecté par Visites.refreshAidantUI -->
            </div>

            <button onclick="window.switchView('patients')" class="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                <i class="fa-solid fa-arrow-left mr-1"></i> Retour à la liste
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
window.setPatientHomeDirect = async (patientId) => {
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
};
