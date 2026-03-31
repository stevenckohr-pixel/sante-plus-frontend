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
    
    return `
        <div class="patient-card animate-fadeIn">
            <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-400 font-extrabold text-lg border-2 border-white shadow-inner">
                        ${initials}
                    </div>
                    <div>
                        <h4 class="font-black text-slate-800 text-sm uppercase leading-none">${p.nom_complet}</h4>
                        <div class="flex items-center gap-2 mt-2">
                             <span class="status-pill ${p.formule === 'Premium' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}">${p.formule}</span>
                             <span class="text-[10px] font-bold text-slate-400"><i class="fa-solid fa-map-pin mr-1"></i>${p.adresse || 'Cotonou'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="window.viewPatientFeed('${p.id}')" class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div class="flex -space-x-2">
                     <!-- Petit clin d'oeil aux avatars de tes refs -->
                     <div class="w-6 h-6 rounded-full border-2 border-white bg-blue-500 text-[8px] flex items-center justify-center text-white font-bold">F</div>
                     <div class="w-6 h-6 rounded-full border-2 border-white bg-emerald-500 text-[8px] flex items-center justify-center text-white font-bold">A</div>
                 </div>
                 <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    Famille : <span class="text-slate-800">${p.famille ? p.famille.nom : 'Non liée'}</span>
                 </p>
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
