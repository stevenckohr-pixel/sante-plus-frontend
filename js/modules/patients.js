import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI, showSkeleton } from "../core/utils.js";
import * as Visites from "./visites.js";
import { secureFetchWithCache } from "../core/utils.js";


/**
 * 📥 1. CHARGER LA LISTE DES PATIENTS
 */
export async function loadPatients() {
    const container = document.getElementById("patients-list");
    if (!container) return;

    showSkeleton(container, 'patient-card');

    try {
        // ✅ Correction : secureFetch retourne déjà les données JSON
        const patients = await secureFetch("/patients");
        AppState.patients = patients;
        
        // ✅ AJOUT - Pour la famille, définir automatiquement le patient
        const userRole = localStorage.getItem("user_role");
        if (userRole === "FAMILLE" && patients && patients.length > 0) {
            AppState.currentPatient = patients[0].id;
            localStorage.setItem("current_patient_id", patients[0].id);
            console.log("✅ Patient famille chargé:", AppState.currentPatient);
        }
        
        renderPatients();
    } catch (err) {
        console.error("Erreur loadPatients:", err);
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

    if (!AppState.patients?.length) {
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100 animate-fadeIn">
                <i class="fa-solid fa-users-slash text-slate-100 text-5xl mb-4"></i>
                <p class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Aucun dossier actif</p>
            </div>`;
        return;
    }

    container.innerHTML = AppState.patients.map((p, index) => {
        const isMaman = p.categorie_service === 'MAMAN_BEBE';
        const isPremium = p.formule === 'Premium';
        const themeColorClass = isMaman ? 'border-pink-200' : 'border-emerald-100';
        const badgeColorClass = isMaman ? 'bg-pink-100 text-pink-600' : 'bg-emerald-50 text-emerald-600';
        const categoryIcon = isMaman ? '🍼' : '👴';
        const categoryLabel = isMaman ? 'Maman & Bébé' : 'Dossier Sénior';
        const premiumCardClass = isPremium ? 'border-2 border-amber-300 shadow-md bg-amber-50/30' : 'border-slate-100 bg-white';
        
        const initials = p.nom_complet?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??';
        const hasGps = p.lat && p.lng;
        const canManageGps = (userRole === 'COORDINATEUR' || userRole === 'AIDANT');
        const animationDelay = `${index * 0.05}s`;

        return `
            <div class="patient-card animate-fadeIn group ${premiumCardClass}" style="animation-delay: ${animationDelay}; animation-duration: 0.3s;">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-base border-2 ${themeColorClass} shadow-sm">
                                ${initials}
                            </div>
                            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${hasGps ? 'bg-emerald-500' : 'bg-slate-300'} shadow-sm" title="${hasGps ? 'Domicile fixé' : 'GPS Manquant'}"></div>
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <h4 class="font-black text-slate-800 text-sm">${p.nom_complet || 'Inconnu'}</h4>
                                ${isPremium ? '<i class="fa-solid fa-crown text-[10px] text-amber-500"></i>' : ''}
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 mt-1">
                                <span class="status-pill ${isPremium ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} text-[9px]">${p.formule || 'Standard'}</span>
                                <span class="status-pill ${badgeColorClass} text-[9px]">${categoryIcon} ${categoryLabel}</span>
                            </div>
                            <p class="text-[9px] font-bold text-slate-400 mt-1.5"><i class="fa-solid fa-map-pin mr-1"></i>${p.adresse || 'Adresse non renseignée'}</p>
                        </div>
                    </div>

                    <div class="flex gap-1.5">
                        ${canManageGps ? `
                            <button onclick="window.setPatientHomeDirect('${p.id}')" 
                                class="w-8 h-8 rounded-lg ${hasGps ? 'bg-slate-50 text-slate-400' : 'bg-amber-50 text-amber-600'} flex items-center justify-center border active:scale-90 transition-all" 
                                title="Fixer le domicile GPS">
                                <i class="fa-solid fa-house-signal text-xs"></i>
                            </button>
                        ` : ''}
                        <button onclick="window.viewPatientFeed('${p.id}')" class="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-sm active:scale-90 transition-all hover:bg-emerald-600">
                            <i class="fa-solid fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div class="flex items-center gap-1.5">
                        <div class="flex -space-x-1">
                            <div class="w-5 h-5 rounded-full border-2 border-white bg-blue-500 text-[7px] flex items-center justify-center text-white font-bold">F</div>
                            <div class="w-5 h-5 rounded-full border-2 border-white bg-emerald-500 text-[7px] flex items-center justify-center text-white font-bold">A</div>
                        </div>
                        <p class="text-[8px] font-black text-slate-400">Famille : <span class="text-slate-700">${p.famille?.nom || 'Non liée'}</span></p>
                    </div>
                    ${userRole === 'COORDINATEUR' && !p.famille_user_id ? `
                        <button onclick="window.openLinkFamilyModal('${p.id}', '${(p.nom_complet || '').replace(/'/g, "\\'")}')" class="text-[8px] font-black text-blue-500 uppercase underline">
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
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('patients')" class="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-95">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nouveau Patient</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Création de dossier médical</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div class="space-y-4">
                    <!-- Identité -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Prénom</label>
                            <input id="form-pat-prenom" class="app-input !py-3 !text-sm" placeholder="Prénom">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Nom</label>
                            <input id="form-pat-nom" class="app-input !py-3 !text-sm" placeholder="Nom">
                        </div>
                    </div>

                    <!-- Âge et sexe -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Âge</label>
                            <input id="form-pat-age" type="number" class="app-input !py-3 !text-sm" placeholder="Âge">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Sexe</label>
                            <select id="form-pat-sex" class="app-input !py-3 !text-sm">
                                <option value="">Sélectionner</option>
                                <option value="Homme">Homme</option>
                                <option value="Femme">Femme</option>
                            </select>
                        </div>
                    </div>

                    <!-- Contact -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Téléphone</label>
                        <div class="relative">
                            <i class="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="form-pat-tel" class="app-input !pl-11 !py-3" placeholder="+229 XX XXX XXX">
                        </div>
                    </div>

                    <!-- Adresse -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Adresse</label>
                        <div class="relative">
                            <i class="fa-solid fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="form-pat-addr" class="app-input !pl-11 !py-3" placeholder="Quartier, rue, repères...">
                        </div>
                    </div>

                    <!-- Contact urgence -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Contact urgence</label>
                        <div class="relative">
                            <i class="fa-solid fa-address-card absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="form-pat-urgence" class="app-input !pl-11 !py-3" placeholder="Nom et téléphone">
                        </div>
                    </div>

                    <!-- Formule -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2 mb-2 block">Formule d'accompagnement</label>
                        <div id="formule-selector-trigger" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer">
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

                    <button id="submit-patient-btn" class="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
                        <i class="fa-solid fa-check"></i> Enregistrer le patient
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("formule-selector-trigger").onclick = () => openFormuleSelector();
    document.getElementById("submit-patient-btn").onclick = () => submitAddPatient();
}

async function submitAddPatient() {
    const prenom = document.getElementById("form-pat-prenom")?.value;
    const nom = document.getElementById("form-pat-nom")?.value;
    const nomComplet = `${prenom} ${nom}`.trim();
    const age = document.getElementById("form-pat-age")?.value;
    const sexe = document.getElementById("form-pat-sex")?.value;
    const tel = document.getElementById("form-pat-tel")?.value;
    const addr = document.getElementById("form-pat-addr")?.value;
    const contactUrgence = document.getElementById("form-pat-urgence")?.value;
    const formule = document.getElementById("form-pat-formule")?.value;

    if (!nomComplet) {
        UI.vibrate('error');
        Swal.fire({ title: "Champ manquant", text: "Le nom est requis", icon: "warning" });
        return;
    }
    if (!formule) {
        UI.vibrate('error');
        Swal.fire({ title: "Formule manquante", text: "Sélectionnez une formule", icon: "warning" });
        return;
    }

    Swal.fire({ title: 'Création...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        await secureFetch("/patients/add", {
            method: "POST",
            body: JSON.stringify({ 
                nom_complet: nomComplet, 
                age, 
                sexe,
                telephone: tel, 
                adresse: addr, 
                contact_urgence: contactUrgence,
                formule 
            })
        });
        UI.success("Patient ajouté");
        window.switchView("patients");
    } catch (err) {
        Swal.fire({ title: "Erreur", text: err.message, icon: "error" });
    }
}

const FORMULES = [
    { id: "Basic", name: "Formule Basic", desc: "1 visite par semaine", price: "50.000 CFA", icon: "fa-seedling", color: "text-emerald-600" },
    { id: "Standard", name: "Formule Standard", desc: "3 visites par semaine", price: "75.000 CFA", icon: "fa-chart-line", color: "text-blue-600" },
    { id: "Premium", name: "Formule Premium", desc: "7 jours sur 7", price: "100.000 CFA", icon: "fa-crown", color: "text-gold-primary" }
];

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
    
    await Swal.fire({
        title: '<span class="text-base font-black text-slate-800">🎁 Choisir une formule</span>',
        html: modalContent,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Fermer",
        cancelButtonColor: "#94A3B8",
        customClass: { popup: 'rounded-2xl p-5', cancelButton: 'rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-wider' },
        didOpen: () => {
            document.querySelectorAll('.formule-item').forEach(el => {
                el.addEventListener('click', () => {
                    Swal.close();
                    const formule = FORMULES.find(f => f.id === el.dataset.id);
                    if (formule) {
                        document.getElementById("selected-formule-name").innerText = formule.name;
                        document.getElementById("selected-formule-desc").innerHTML = `${formule.desc} • ${formule.price}`;
                        document.getElementById("form-pat-formule").value = formule.id;
                        const trigger = document.getElementById("formule-selector-trigger");
                        const icon = trigger?.querySelector('.w-10.h-10 i');
                        if (icon) icon.className = `fa-solid ${formule.icon} ${formule.color} text-base`;
                    }
                });
            });
        }
    });
}


/**
 * 📄 VUE : FICHE PATIENT (Aidant)
 */
export async function renderPatientDetailsView(patientId) {
    const container = document.getElementById("view-container");
    const res = await secureFetch(`/patients/${patientId}`);

    const isMaman = p.categorie_service === 'MAMAN_BEBE';
    const isPremium = p.formule === 'Premium' || p.type_pack === 'Premium';
    const initials = p.nom_complet?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??';

    container.innerHTML = `
        <div class="animate-fadeIn max-w-lg mx-auto pb-32">
            <div class="flex flex-col items-center text-center mb-6">
                <div class="relative">
                    <div class="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-3xl font-black text-slate-300 shadow-xl border-4 border-white mb-4">${initials}</div>
                    ${isPremium ? `<div class="absolute -top-2 -right-2 bg-gold-primary w-8 h-8 rounded-full flex items-center justify-center shadow-md"><i class="fa-solid fa-crown text-xs text-white"></i></div>` : ''}
                </div>
                <h3 class="text-xl font-black text-slate-800">${p.nom_complet}</h3>
                <div class="flex flex-wrap gap-2 mt-2">
                    ${isMaman ? `<span class="badge-pink px-3 py-1 rounded-full text-[10px] font-bold"><i class="fa-solid fa-baby-carriage mr-1"></i> Maman & Bébé</span>` : `<span class="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold"><i class="fa-solid fa-user-plus mr-1"></i> Dossier Sénior</span>`}
                    ${isPremium ? `<span class="badge-gold px-3 py-1 rounded-full text-[10px] font-bold"><i class="fa-solid fa-crown mr-1"></i> Premium</span>` : ''}
                </div>
            </div>

            <div class="${isMaman ? 'maman-banner' : 'premium-banner'} p-4 rounded-xl mb-6 text-center">
                <p class="text-[10px] font-black uppercase tracking-wider">${isMaman ? '👶 Programme Maman & Bébé' : '⭐ Programme Premium'}</p>
                <p class="text-sm font-bold mt-1 ${isMaman ? 'text-rose-primary' : 'text-slate-800'}">${isMaman ? 'Accompagnement personnalisé post-maternité' : 'Accès prioritaire et services exclusifs'}</p>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-white p-4 rounded-xl border border-slate-100">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider"><i class="fa-solid fa-phone mr-1"></i> Urgence</p>
                    <p class="text-xs font-semibold text-slate-700 mt-1">${p.contact_urgence || 'Non renseigné'}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider"><i class="fa-solid fa-box mr-1"></i> Pack</p>
                    <p class="text-xs font-semibold text-slate-700 mt-1">${p.type_pack || 'Standard'}</p>
                </div>
                <div class="col-span-2 ${isMaman ? 'bg-pink-50 border-pink-100' : 'bg-amber-50 border-amber-100'} p-4 rounded-xl border">
                    <p class="text-[9px] font-black ${isMaman ? 'text-pink-500' : 'text-amber-600'} uppercase tracking-wider"><i class="fa-solid fa-heartbeat mr-1"></i> Points d'attention</p>
                    <p class="text-sm text-slate-700 mt-1">"${p.notes_medicales || 'Aucune consigne'}"</p>
                </div>
            </div>

            <div id="aidant-active-area" class="mt-4"></div>

            <button onclick="window.switchView('patients')" class="w-full mt-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-left text-xs"></i> Retour
            </button>
        </div>
    `;

    AppState.currentPatient = p.id;
    Visites.refreshAidantUI(p.id);
}

/**
 * 📄 VUE : LIAISON FAMILLE
 */
export async function renderLinkFamilyView() {
    const container = document.getElementById("view-container");
    const { patientId, patientName } = window.AppState.tempData || {};

    try {
        const response = await secureFetch("/auth/profiles?role=FAMILLE");
        const families = await response.json();

        if (!families?.length) {
            container.innerHTML = `<div class="max-w-2xl mx-auto text-center py-20 bg-white rounded-2xl"><p class="text-sm font-bold text-slate-500">Aucun compte famille trouvé</p><button onclick="window.switchView('patients')" class="mt-4 text-[10px] font-black text-blue-500">Retour</button></div>`;
            return;
        }

        container.innerHTML = `
            <div class="animate-fadeIn max-w-2xl mx-auto pb-32">
                <div class="flex items-center gap-4 mb-8">
                    <button onclick="window.switchView('patients')" class="w-10 h-10 rounded-xl bg-white shadow-sm border flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                    <div><h3 class="font-black text-2xl text-slate-800">Lier une Famille</h3><p class="text-[10px] text-slate-400 mt-1">Dossier : ${patientName}</p></div>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm border">
                    <p class="text-sm font-bold text-slate-500 mb-4">Sélectionnez le responsable :</p>
                    <div class="space-y-2 max-h-96 overflow-y-auto mb-6">
                        ${families.map(f => `
                            <label class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border cursor-pointer hover:border-blue-300">
                                <div><p class="font-bold text-slate-800">${f.nom}</p><p class="text-[10px] text-slate-500">${f.email}</p></div>
                                <input type="radio" name="family_select" value="${f.id}" class="w-5 h-5 accent-blue-500">
                            </label>
                        `).join('')}
                    </div>
                    <button onclick="window.submitLinkFamily('${patientId}')" class="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-md">Confirmer la liaison</button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-center text-rose-500 p-10">Erreur : ${err.message}</p>`;
    }
}

window.submitLinkFamily = async (patientId) => {
    const selected = document.querySelector('input[name="family_select"]:checked');
    if (!selected) return UI.vibrate('error');

    Swal.fire({ title: 'Liaison...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        await secureFetch("/patients/link-family", {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, famille_user_id: selected.value })
        });
        UI.success("Famille liée avec succès");
        window.switchView("patients");
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};

/**
 * 🎯 FIXATION GPS
 */
export async function setPatientHomeDirect(patientId) {
    try {
        UI.vibrate();
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'info', title: 'Calcul de la position...' });

        const pos = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 });
        });

        const res = await secureFetch("/patients/update-gps", {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, lat: pos.coords.latitude, lng: pos.coords.longitude })
        });

        if (res.ok) {
            UI.success("Domicile enregistré !");
            loadPatients();
        }
    } catch (err) {
        UI.error("Erreur GPS");
        Swal.fire("Erreur GPS", "Veuillez autoriser la localisation", "error");
    }
}




