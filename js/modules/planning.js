import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";


/**
 * 📥 CHARGER LE PLANNING (Vue liste)
 */
export async function loadPlanning() {
    const listContainer = document.getElementById("planning-list");
    if (!listContainer) return;

    const userRole = localStorage.getItem("user_role");

    try {
        const data = await secureFetch("/planning");

        if (!data?.length) {
            listContainer.innerHTML = `
                <div class="text-center py-20 opacity-50">
                    <i class="fa-solid fa-calendar-xmark text-4xl text-slate-300 mb-3"></i>
                    <p class="text-xs font-black uppercase text-slate-400">Agenda vide</p>
                </div>`;
            return;
        }

        listContainer.innerHTML = data.map(item => {
            const isTerminated = item.statut === 'Terminé';
            const borderColor = isTerminated ? 'border-emerald-500' : 'border-blue-500';
            const statusColor = isTerminated ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
            
            return `
                <div class="bg-white p-5 rounded-xl border-l-4 ${borderColor} shadow-sm animate-fadeIn mb-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-xl font-black text-slate-800">${item.heure_prevue?.substring(0, 5) || '--:--'}</span>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                                ${new Date(item.date_prevue).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                        <span class="px-2 py-1 rounded-lg text-[9px] font-black uppercase ${statusColor}">
                            ${item.statut || 'Planifié'}
                        </span>
                    </div>
                    
                    <div class="mt-4">
                        <h4 class="font-black text-slate-800 text-sm uppercase">${item.patient?.nom_complet || 'Patient inconnu'}</h4>
                        <p class="text-[10px] text-slate-500 mt-0.5">
                            <i class="fa-solid fa-map-pin mr-1"></i> ${item.patient?.adresse || 'Adresse non renseignée'}
                        </p>
                    </div>

                    ${item.notes_coordinateur ? `
                        <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p class="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">📋 Consignes :</p>
                            <p class="text-xs italic text-slate-600">"${escapeHtml(item.notes_coordinateur)}"</p>
                        </div>
                    ` : ''}
                    
                    ${userRole === "AIDANT" && item.statut !== 'Terminé' ? `
                        <button onclick="window.openMissionBriefing('${item.patient_id}', '${item.id}')" 
                                class="w-full mt-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all">
                            📋 Ouvrir le Briefing
                        </button>
                    ` : ''}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Erreur chargement planning:", err);
        listContainer.innerHTML = `<p class="text-rose-500 text-center p-10">Erreur : ${err.message}</p>`;
    }
}


/**
 * 🗓️ PAGE D'ASSIGNATION INDÉPENDANTE (Remplace la modale)
 */
export async function openAssignPage() {
    // Afficher un loader temporaire
    Swal.fire({ 
        title: '<i class="fa-solid fa-circle-notch fa-spin text-emerald-500"></i>',
        showConfirmButton: false,
        allowOutsideClick: false,
        customClass: { popup: 'bg-transparent shadow-none' }
    });
    
    try {
        // ✅ Correction : secureFetch retourne déjà les données
        const aidants = await secureFetch("/assignments/available-aidants");
        const patients = await secureFetch("/assignments/unassigned-patients");
        
        Swal.close();
        
        // Sauvegarder les données globalement
        window._assignData = { aidants, patients };
        
        // Naviguer vers la page d'assignation
        await renderAssignPage();
        
    } catch (err) {
        Swal.close();
        UI.error(err.message);
    }
}

/**
 * 🎨 RENDU DE LA PAGE D'ASSIGNATION
 */

/**
 * 🔧 CONFIGURATION DES FILTRES DE RECHERCHE
 */
function setupDropdownFilters() {
    // Filtre aidants
    const aidantSearch = document.getElementById('aidant-search');
    if (aidantSearch) {
        aidantSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.aidant-item').forEach(item => {
                const name = item.dataset.name?.toLowerCase() || '';
                const email = item.dataset.email?.toLowerCase() || '';
                item.style.display = name.includes(term) || email.includes(term) ? 'flex' : 'none';
            });
        });
    }
    
    // Filtre patients
    const patientSearch = document.getElementById('patient-search');
    if (patientSearch) {
        patientSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.patient-item').forEach(item => {
                const name = item.dataset.name?.toLowerCase() || '';
                item.style.display = name.includes(term) ? 'flex' : 'none';
            });
        });
    }
}

/**
 * 🔽 OUVERTURE/FERMETURE DROPDOWN AIDANT
 */
window.toggleAidantDropdown = () => {
    const dropdown = document.getElementById('aidant-dropdown');
    const chevron = document.getElementById('aidant-chevron');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (chevron) chevron.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        
        // Fermer l'autre dropdown
        const patientDropdown = document.getElementById('patient-dropdown');
        const patientChevron = document.getElementById('patient-chevron');
        if (patientDropdown && !patientDropdown.classList.contains('hidden')) {
            patientDropdown.classList.add('hidden');
            if (patientChevron) patientChevron.style.transform = 'rotate(0deg)';
        }
    }
};

/**
 * 🔽 OUVERTURE/FERMETURE DROPDOWN PATIENT
 */
window.togglePatientDropdown = () => {
    const dropdown = document.getElementById('patient-dropdown');
    const chevron = document.getElementById('patient-chevron');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (chevron) chevron.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        
        // Fermer l'autre dropdown
        const aidantDropdown = document.getElementById('aidant-dropdown');
        const aidantChevron = document.getElementById('aidant-chevron');
        if (aidantDropdown && !aidantDropdown.classList.contains('hidden')) {
            aidantDropdown.classList.add('hidden');
            if (aidantChevron) aidantChevron.style.transform = 'rotate(0deg)';
        }
    }
};




async function renderAssignPage() {
    const container = document.getElementById("view-container");
    const { aidants, patients } = window._assignData || { aidants: [], patients: [] };
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-2xl mx-auto pb-32">
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('rh-dashboard')" 
                        class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95">
                    <i class="fa-solid fa-arrow-left text-lg"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nouvelle Assignation</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lier un aidant à un patient</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <!-- Sélecteur Aidant -->
                <div class="p-6 border-b border-slate-100">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        <i class="fa-solid fa-user-nurse mr-2 text-emerald-500"></i> Aidant
                    </label>
                    <div id="aidant-selector" class="relative">
                        <div onclick="window.toggleAidantDropdown()" 
                             class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <i class="fa-solid fa-user-nurse text-emerald-600"></i>
                                </div>
                                <div>
                                    <p id="selected-aidant-name" class="font-bold text-slate-800 text-sm">Choisir un aidant</p>
                                    <p id="selected-aidant-email" class="text-[10px] text-slate-400">Sélectionnez dans la liste</p>
                                </div>
                            </div>
                            <i class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform" id="aidant-chevron"></i>
                        </div>
                        <div id="aidant-dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                            <div class="p-2 border-b border-slate-100 sticky top-0 bg-white">
                                <div class="relative">
                                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                    <input type="text" id="aidant-search" placeholder="Rechercher..." 
                                           class="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:border-emerald-300">
                                </div>
                            </div>
                            <div id="aidant-list" class="divide-y divide-slate-50">
                                ${aidants.map(a => `
                                    <div class="aidant-item p-3 hover:bg-slate-50 cursor-pointer transition-colors" data-id="${a.id}" data-name="${escapeHtml(a.nom)}" data-email="${a.email || ''}">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                                                ${(a.nom?.charAt(0) || '?').toUpperCase()}
                                            </div>
                                            <div class="flex-1">
                                                <p class="font-bold text-slate-800 text-sm">${escapeHtml(a.nom)}</p>
                                                <p class="text-[10px] text-slate-400">${a.email || 'Email non renseigné'}</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${aidants.length === 0 ? '<div class="p-6 text-center text-slate-400 text-xs">Aucun aidant disponible</div>' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sélecteur Patient -->
                <div class="p-6 border-b border-slate-100">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        <i class="fa-solid fa-hospital-user mr-2 text-blue-500"></i> Patient
                    </label>
                    <div id="patient-selector" class="relative">
                        <div onclick="window.togglePatientDropdown()" 
                             class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <i class="fa-solid fa-user text-blue-600"></i>
                                </div>
                                <div>
                                    <p id="selected-patient-name" class="font-bold text-slate-800 text-sm">Choisir un patient</p>
                                    <p id="selected-patient-formule" class="text-[10px] text-slate-400">Sélectionnez dans la liste</p>
                                </div>
                            </div>
                            <i class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform" id="patient-chevron"></i>
                        </div>
                        <div id="patient-dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                            <div class="p-2 border-b border-slate-100 sticky top-0 bg-white">
                                <div class="relative">
                                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                    <input type="text" id="patient-search" placeholder="Rechercher..." 
                                           class="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:border-emerald-300">
                                </div>
                            </div>
                            <div id="patient-list" class="divide-y divide-slate-50">
                                ${patients.map(p => `
                                    <div class="patient-item p-3 hover:bg-slate-50 cursor-pointer transition-colors" data-id="${p.id}" data-name="${escapeHtml(p.nom_complet)}" data-formule="${p.formule || 'Standard'}">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                                                ${(p.nom_complet?.charAt(0) || '?').toUpperCase()}
                                            </div>
                                            <div class="flex-1">
                                                <p class="font-bold text-slate-800 text-sm">${escapeHtml(p.nom_complet)}</p>
                                                <div class="flex items-center gap-2 mt-0.5">
                                                    <span class="text-[9px] text-slate-400">${p.adresse?.substring(0, 30) || 'Adresse non renseignée'}</span>
                                                    <span class="text-[9px] font-bold ${p.formule === 'Premium' ? 'text-gold-primary' : 'text-emerald-600'}">${p.formule || 'Standard'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${patients.length === 0 ? '<div class="p-6 text-center text-slate-400 text-xs">Aucun patient non assigné</div>' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TYPE D'ASSIGNATION (NOUVEAU) -->
                <div class="p-6 border-b border-slate-100">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        <i class="fa-solid fa-clock mr-2"></i> Type d'assignation
                    </label>
                    <div class="flex gap-3">
                        <label class="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer border-2 transition-all border-emerald-500 bg-emerald-50" id="type-permanente">
                            <input type="radio" name="assign-type" value="permanente" class="hidden" checked>
                            <i class="fa-solid fa-infinity text-emerald-500"></i>
                            <span class="text-xs font-bold">Permanente</span>
                        </label>
                        <label class="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer border-2 border-slate-200 transition-all" id="type-temporelle">
                            <input type="radio" name="assign-type" value="temporelle" class="hidden">
                            <i class="fa-solid fa-calendar-week text-blue-500"></i>
                            <span class="text-xs font-bold">Période définie</span>
                        </label>
                        <label class="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer border-2 border-slate-200 transition-all" id="type-ponctuelle">
                            <input type="radio" name="assign-type" value="ponctuelle" class="hidden">
                            <i class="fa-solid fa-calendar-day text-amber-500"></i>
                            <span class="text-xs font-bold">Ponctuelle</span>
                        </label>
                    </div>
                </div>

                <!-- Période (affiché si temporelle ou ponctuelle) -->
                <div id="period-container" class="p-6 border-b border-slate-100 hidden">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                                <i class="fa-regular fa-calendar mr-1"></i> Date de début
                            </label>
                            <input type="date" id="assign-date-debut" 
                                   class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div id="date-fin-container">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                                <i class="fa-regular fa-calendar-check mr-1"></i> Date de fin
                            </label>
                            <input type="date" id="assign-date-fin" 
                                   class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                        </div>
                    </div>
                    
                    <!-- Pour ponctuelle, heure spécifique -->
                    <div id="heure-container" class="mt-4 hidden">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-regular fa-clock mr-1"></i> Heure de début
                        </label>
                        <input type="time" id="assign-heure" 
                               class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                               value="09:00">
                    </div>
                </div>

                <!-- Instructions -->
                <div class="p-6 border-b border-slate-100">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                        <i class="fa-solid fa-pen mr-1"></i> Instructions pour l'aidant
                    </label>
                    <textarea id="assign-notes" rows="3" 
                              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                              placeholder="Consignes particulières pour cette intervention..."></textarea>
                </div>

                <!-- Actions -->
                <div class="p-6 bg-slate-50 flex gap-3">
                    <button onclick="window.switchView('rh-dashboard')" 
                            class="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all">
                        Annuler
                    </button>
                    <button onclick="window.submitAssignmentEnhanced()" 
                            class="flex-1 py-4 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-link"></i> Assigner
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Initialiser les sélecteurs
    window._selectedAidant = null;
    window._selectedPatient = null;
    
    // Configuration des dropdowns
    setupDropdownFilters();
    
    // Gestionnaire des types d'assignation
    setupAssignTypeHandlers();
}


/**
 * 📤 SOUMISSION AVEC TYPE D'ASSIGNATION
 */
window.submitAssignmentEnhanced = async () => {
    if (!window._selectedAidant) {
        UI.vibrate('error');
        Swal.fire({ title: "Aidant requis", text: "Veuillez sélectionner un aidant", icon: "warning" });
        return;
    }
    if (!window._selectedPatient) {
        UI.vibrate('error');
        Swal.fire({ title: "Patient requis", text: "Veuillez sélectionner un patient", icon: "warning" });
        return;
    }
    
    const assignType = document.querySelector('input[name="assign-type"]:checked')?.value || 'permanente';
    const dateDebut = document.getElementById("assign-date-debut")?.value;
    const dateFin = document.getElementById("assign-date-fin")?.value;
    const heure = document.getElementById("assign-heure")?.value;
    const notes = document.getElementById("assign-notes")?.value || "";
    
    // Validation selon le type
    if (assignType === 'temporelle' && !dateFin) {
        Swal.fire({ title: "Date de fin requise", text: "Veuillez spécifier une date de fin", icon: "warning" });
        return;
    }
    if (assignType === 'ponctuelle' && !dateDebut) {
        Swal.fire({ title: "Date requise", text: "Veuillez spécifier une date", icon: "warning" });
        return;
    }
    
    Swal.fire({ title: "Assignation...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        await secureFetch("/assignments/assign", {
            method: "POST",
            body: JSON.stringify({
                aidant_id: window._selectedAidant.id,
                patient_id: window._selectedPatient.id,
                type_assignation: assignType,
                date_debut: dateDebut || new Date().toISOString().split('T')[0],
                date_fin: assignType === 'temporelle' ? dateFin : null,
                heure_prevue: assignType === 'ponctuelle' ? heure : null,
                notes: notes
            })
        });
        
        Swal.fire({ icon: "success", title: "Succès", text: "Assignation créée avec succès", timer: 2000, showConfirmButton: false });
        window.switchView("rh-dashboard");
        
    } catch (err) {
        Swal.close();
        Swal.fire({ title: "Erreur", text: err.message, icon: "error" });
    }
};

/**
 * 🔧 Gestionnaire des types d'assignation
 */
function setupAssignTypeHandlers() {
    const typePermanente = document.getElementById('type-permanente');
    const typeTemporelle = document.getElementById('type-temporelle');
    const typePonctuelle = document.getElementById('type-ponctuelle');
    const periodContainer = document.getElementById('period-container');
    const dateFinContainer = document.getElementById('date-fin-container');
    const heureContainer = document.getElementById('heure-container');
    
    const setActiveStyle = (element, isActive) => {
        if (isActive) {
            element.classList.add('border-emerald-500', 'bg-emerald-50');
            element.classList.remove('border-slate-200');
        } else {
            element.classList.remove('border-emerald-500', 'bg-emerald-50');
            element.classList.add('border-slate-200');
        }
    };
    
    typePermanente.addEventListener('click', () => {
        typePermanente.querySelector('input').checked = true;
        setActiveStyle(typePermanente, true);
        setActiveStyle(typeTemporelle, false);
        setActiveStyle(typePonctuelle, false);
        periodContainer.classList.add('hidden');
    });
    
    typeTemporelle.addEventListener('click', () => {
        typeTemporelle.querySelector('input').checked = true;
        setActiveStyle(typeTemporelle, true);
        setActiveStyle(typePermanente, false);
        setActiveStyle(typePonctuelle, false);
        periodContainer.classList.remove('hidden');
        dateFinContainer.classList.remove('hidden');
        heureContainer.classList.add('hidden');
    });
    
    typePonctuelle.addEventListener('click', () => {
        typePonctuelle.querySelector('input').checked = true;
        setActiveStyle(typePonctuelle, true);
        setActiveStyle(typePermanente, false);
        setActiveStyle(typeTemporelle, false);
        periodContainer.classList.remove('hidden');
        dateFinContainer.classList.add('hidden');
        heureContainer.classList.remove('hidden');
    });
}

/**
 * 💡 TRANSITION INTELLIGENTE - Briefing
 */
window.openMissionBriefing = (patientId, planningId) => {
    UI.vibrate();
    localStorage.setItem("active_planning_id", planningId);
    window.viewPatientFeed(patientId);
};

// Fonction pour lier le planning au démarrage de la visite
window.startPlannedVisit = (patientId, planningId) => {
    localStorage.setItem("current_planning_id", planningId);
    window.startVisit(patientId);
};

/**
 * 🔧 Échapper les caractères HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


 
/**
 * 🗑️ SUPPRIMER UNE ASSIGNATION (Délier aidant-patient)
 */
window.unassignAidant = async (planningId, patientName, aidantName) => {
    console.log("🔍 ID reçu:", planningId);
    console.log("👤 Patient:", patientName);
    console.log("👨‍⚕️ Aidant:", aidantName);
    
    if (!planningId) {
        Swal.fire("Erreur", "ID d'assignation manquant", "error");
        return;
    }
    
    const result = await Swal.fire({
        title: "Confirmer",
        html: `Retirer <b>${escapeHtml(aidantName)}</b> de <b>${escapeHtml(patientName)}</b> ?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "OUI, SUPPRIMER",
        confirmButtonColor: "#F43F5E"
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({ title: "Suppression...", didOpen: () => Swal.showLoading() });
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/planning/${planningId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Erreur");
        }
        
        Swal.fire({ icon: "success", title: "Assignation supprimée", timer: 1500, showConfirmButton: false });
        
        // Recharger la vue
        if (typeof loadRHAssignments === 'function') {
            loadRHAssignments();
        } else {
            window.switchView('rh-dashboard');
        }
        
    } catch (err) {
        Swal.close();
        console.error("❌ Erreur:", err);
        Swal.fire("Erreur", err.message, "error");
    }
};
