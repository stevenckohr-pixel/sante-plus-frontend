import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 📥 CHARGER LES INSCRIPTIONS EN ATTENTE (Coordinateur)
 */
export async function loadRegistrations() {
    const tableBody = document.getElementById('pending-table-body');
    const mobileList = document.getElementById('pending-mobile-list');
    
    if (!tableBody && !mobileList) return;

    try {
        const res = await secureFetch('/admin/pending-registrations');
        const pending = await res.json();

        if (pending.length === 0) {
            // Version Desktop
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-slate-400 italic">Aucune inscription en attente.</td></tr>';
            }
            // Version Mobile
            if (mobileList) {
                mobileList.innerHTML = '<div class="p-6 text-center text-slate-400 italic bg-white rounded-2xl border border-slate-100">Aucune inscription en attente.</div>';
            }
            return;
        }

        // ============================================
        // VERSION DESKTOP (TABLEAU)
        // ============================================
        if (tableBody) {
            tableBody.innerHTML = pending.map(req => {
                const patient = req.patients && req.patients[0];
                return `
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                                    ${req.nom?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <p class="font-bold text-slate-800 text-sm">${req.nom || 'Inconnu'}</p>
                                    <p class="text-[10px] text-slate-400">${req.email || ''}</p>
                                </div>
                            </div>
                        </td>
                        <td class="p-4">
                            <span class="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase">${req.role || 'FAMILLE'}</span>
                        </td>
                        <td class="p-4">
                            ${patient ? `
                                <div>
                                    <p class="font-bold text-slate-800 text-xs">${patient.nom_complet || '-'}</p>
                                    <p class="text-[9px] text-green-600 font-bold mt-0.5">${patient.formule || 'Standard'}</p>
                                </div>
                            ` : '<span class="text-slate-300 text-xs">Aucun patient lié</span>'}
                        </td>
                        <td class="p-4 text-[11px] text-slate-400">
                            ${new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td class="p-4 text-right">
                            <button onclick="window.openActivationPage('${req.id}', '${req.email}', '${req.nom}', '${req.role}')" 
                                    class="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all">
                                Activer
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ============================================
        // VERSION MOBILE (CARTES)
        // ============================================
        if (mobileList) {
            mobileList.innerHTML = pending.map(req => {
                const patient = req.patients && req.patients[0];
                return `
                    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-3">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <p class="font-black text-slate-800 text-sm">${req.nom || 'Inconnu'}</p>
                                <p class="text-[10px] text-slate-400 mt-0.5">${req.email || ''}</p>
                            </div>
                            <span class="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase">${req.role || 'FAMILLE'}</span>
                        </div>
                        
                        ${patient ? `
                            <div class="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <p class="font-bold text-slate-700 text-xs">👤 Patient: ${patient.nom_complet || '-'}</p>
                                        <p class="text-[9px] text-green-600 font-bold mt-0.5">📦 Formule: ${patient.formule || 'Standard'}</p>
                                    </div>
                                    <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <i class="fa-solid fa-user text-emerald-600 text-xs"></i>
                                    </div>
                                </div>
                            </div>
                        ` : '<div class="bg-slate-50 p-3 rounded-xl mb-4 text-center text-slate-400 text-xs">Aucun patient lié</div>'}

                        <div class="flex items-center justify-between text-[10px] text-slate-400 mb-4">
                            <span><i class="fa-regular fa-calendar mr-1"></i> ${new Date(req.created_at).toLocaleDateString()}</span>
                        </div>

                        <button onclick="window.openActivationPage('${req.id}', '${req.email}', '${req.nom}', '${req.role}')" 
                                class="w-full bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all">
                            ✅ Activer le dossier
                        </button>
                    </div>
                `;
            }).join('');
        }

    } catch (e) { 
        console.error("Erreur chargement admin:", e);
        
        // Version Desktop - erreur
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-rose-500">Erreur de chargement</td></tr>';
        }
        
        // Version Mobile - erreur
        if (mobileList) {
            mobileList.innerHTML = '<div class="p-6 text-center text-rose-500 bg-white rounded-2xl border border-rose-100">Erreur de chargement</div>';
        }
    }
}


export async function openActivationPage(id, email, nom, role) {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-slideIn max-w-lg mx-auto pb-24">
            <!-- Header avec retour -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('dashboard')" class="w-12 h-12 bg-white rounded-2xl shadow-sm border flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Validation Dossier</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Activation & Accès</p>
                </div>
            </div>

            <!-- Carte de Validation -->
            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidat</p>
                    <h2 class="text-xl font-black text-slate-800">${nom}</h2>
                    <p class="text-xs text-blue-600 font-bold">${email} • ${role}</p>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label class="text-[10px] font-black text-slate-400 uppercase block mb-2">Instructions pour l'email de bienvenue</label>
                    <textarea id="val-notes" class="w-full h-32 bg-transparent text-sm font-medium outline-none" placeholder="Ex: Bienvenue... votre compte sera actif dès réception de votre premier virement."></textarea>
                </div>

                <div class="flex gap-4 pt-4">
                    <button onclick="window.switchView('dashboard')" class="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-100">Annuler</button>
                    <button onclick="window.processValidation('${id}', '${email}', '${nom}', '${role}')" class="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-200">Activer le profil</button>
                </div>
            </div>
        </div>
    `;
}



window.confirmActivation = (id, email, nom, role) => {
    window.openActivationPage(id, email, nom, role);
};

window.processValidation = async (id, email, nom, role) => {
    const notes = document.getElementById('val-notes').value;
    Swal.fire({ title: 'Traitement...', didOpen: () => Swal.showLoading() });

    try {
        await secureFetch('/api/admin/validate-member', {
            method: 'POST',
            body: JSON.stringify({ user_id: id, email, nom, role, notes })
        });
        window.switchView('dashboard');
        Swal.fire("Succès", "Collaborateur activé.", "success");
    } catch(e) {
        Swal.fire("Erreur", e.message, "error");
    }
};




/**
 * 👥 AFFICHER LA PAGE DE GESTION DES ASSIGNATIONS
 */
export async function renderAssignmentsPage() {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-fadeIn pb-32">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Gestion des Assignations</h3>
                    <p class="text-xs text-slate-400 font-bold uppercase mt-1">Lier/Délier un aidant à un patient</p>
                </div>
                <button onclick="window.openAssignModal()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>

            <!-- Liste des assignations actives -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-50">
                    <h4 class="font-black text-slate-800">Assignations actives</h4>
                </div>
                <div id="assignments-list" class="divide-y divide-slate-100">
                    <div class="p-10 text-center text-slate-400">Chargement...</div>
                </div>
            </div>
        </div>
    `;

    await loadAssignments();
}

async function loadAssignments() {
    const list = document.getElementById("assignments-list");
    try {
        const res = await secureFetch("/assignments");
        const assignments = await res.json();

        if (assignments.length === 0) {
            list.innerHTML = '<div class="p-10 text-center text-slate-400">Aucune assignation active</div>';
            return;
        }

        list.innerHTML = assignments.map(a => `
            <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <i class="fa-solid fa-user-nurse text-emerald-600"></i>
                    </div>
                    <div>
                        <p class="font-black text-slate-800">${a.aidant?.nom || 'Inconnu'}</p>
                        <p class="text-xs text-slate-500">AIDANT</p>
                    </div>
                    <div class="mx-4 text-slate-300">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                    <div>
                        <p class="font-black text-slate-800">${a.patient?.nom_complet || 'Inconnu'}</p>
                        <p class="text-xs text-slate-500">PATIENT</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-bold uppercase">
                        ${a.statut || 'Actif'}
                    </span>
                    <button onclick="window.unassignPatient('${a.id}', '${a.aidant?.nom}', '${a.patient?.nom_complet}')" 
                            class="text-rose-500 hover:text-rose-700 transition-colors">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        list.innerHTML = `<div class="p-10 text-center text-rose-500">Erreur: ${err.message}</div>`;
    }
}

// Modale d'assignation
window.openAssignModal = async () => {
    // Charger les aidants et patients non assignés
    const [aidantsRes, patientsRes] = await Promise.all([
        secureFetch("/assignments/available-aidants"),
        secureFetch("/assignments/unassigned-patients")
    ]);
    
    const aidants = await aidantsRes.json();
    const patients = await patientsRes.json();

    const { value: formValues } = await Swal.fire({
        title: "Assigner un patient",
        html: `
            <div class="space-y-4 text-left">
                <div>
                    <label class="text-xs font-bold text-slate-600">Aidant</label>
                    <select id="assign-aidant" class="w-full p-3 rounded-xl border border-slate-200 mt-1">
                        <option value="">-- Choisir un aidant --</option>
                        ${aidants.map(a => `<option value="${a.id}">${a.nom}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-600">Patient</label>
                    <select id="assign-patient" class="w-full p-3 rounded-xl border border-slate-200 mt-1">
                        <option value="">-- Choisir un patient --</option>
                        ${patients.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-600">Notes (optionnel)</label>
                    <textarea id="assign-notes" class="w-full p-3 rounded-xl border border-slate-200 mt-1" rows="2" placeholder="Instructions pour l'aidant..."></textarea>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Assigner",
        confirmButtonColor: "#10B981",
        preConfirm: () => {
            const aidant_id = document.getElementById("assign-aidant").value;
            const patient_id = document.getElementById("assign-patient").value;
            const notes = document.getElementById("assign-notes").value;
            
            if (!aidant_id || !patient_id) {
                Swal.showValidationMessage("Veuillez sélectionner un aidant et un patient");
                return false;
            }
            return { aidant_id, patient_id, notes };
        }
    });

    if (formValues) {
        Swal.fire({ title: "Assignation...", didOpen: () => Swal.showLoading() });
        try {
            await secureFetch("/assignments/assign", {
                method: "POST",
                body: JSON.stringify({
                    patient_id: formValues.patient_id,
                    aidant_id: formValues.aidant_id,
                    notes: formValues.notes
                })
            });
            Swal.fire("Succès", "Patient assigné avec succès", "success");
            renderAssignmentsPage();
        } catch (err) {
            Swal.fire("Erreur", err.message, "error");
        }
    }
};

// Désassignation
window.unassignPatient = async (assignmentId, aidantNom, patientNom) => {
    const { value: raison } = await Swal.fire({
        title: "Délier le patient",
        text: `Retirer ${patientNom} de ${aidantNom} ?`,
        input: "textarea",
        inputPlaceholder: "Raison (optionnel)",
        showCancelButton: true,
        confirmButtonText: "Oui, délier",
        confirmButtonColor: "#F43F5E"
    });

    if (raison !== undefined) {
        Swal.fire({ title: "Traitement...", didOpen: () => Swal.showLoading() });
        try {
            await secureFetch("/assignments/unassign", {
                method: "POST",
                body: JSON.stringify({ assignment_id: assignmentId, raison: raison || "" })
            });
            Swal.fire("Succès", "Patient délié avec succès", "success");
            renderAssignmentsPage();
        } catch (err) {
            Swal.fire("Erreur", err.message, "error");
        }
    }
};





/**
 * 📊 PAGE : TABLEAU DE BORD RH (Coordinateur)
 * Design cohérent : Blanc, Noir, Rose, Or
 */
export async function renderRHDashboard() {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-fadeIn pb-32">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h3 class="font-black text-2xl text-slate-900 tracking-tight">👥 Gestion de l'équipe</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Aidants • Patients • Assignations</p>
                </div>
                <button onclick="window.openAssignModal()" 
                        class="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all">
                    <i class="fa-solid fa-plus text-xs"></i> Nouvelle assignation
                </button>
            </div>

            <!-- Cartes stats (design épuré) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aidants</p>
                        <i class="fa-solid fa-user-nurse text-slate-300 text-sm"></i>
                    </div>
                    <h3 id="stat-aidants" class="text-2xl font-black text-slate-900 mt-1">-</h3>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Patients</p>
                        <i class="fa-solid fa-hospital-user text-slate-300 text-sm"></i>
                    </div>
                    <h3 id="stat-patients" class="text-2xl font-black text-slate-900 mt-1">-</h3>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Assignations</p>
                        <i class="fa-solid fa-link text-slate-300 text-sm"></i>
                    </div>
                    <h3 id="stat-assignments" class="text-2xl font-black text-emerald-600 mt-1">-</h3>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Non assignés</p>
                        <i class="fa-solid fa-user-slash text-slate-300 text-sm"></i>
                    </div>
                    <h3 id="stat-non-assignes" class="text-2xl font-black text-amber-600 mt-1">-</h3>
                </div>
            </div>

            <!-- Switcher de vues (style iOS) -->
            <div class="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 mb-6 max-w-xs mx-auto sm:mx-0">
                <button id="tab-aidants" class="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all bg-white text-slate-900 shadow-sm">
                    👨‍⚕️ Aidants
                </button>
                <button id="tab-patients" class="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-slate-400">
                    📋 Patients
                </button>
            </div>

            <!-- Contenu dynamique -->
            <div id="rh-content"></div>
        </div>
    `;

    await loadRHDashboardData();

    document.getElementById("tab-aidants").onclick = () => showRHTab('aidants');
    document.getElementById("tab-patients").onclick = () => showRHTab('patients');
}

let rhData = null;
let currentRHTab = 'aidants';

async function loadRHDashboardData() {
    const contentDiv = document.getElementById("rh-content");
    contentDiv.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
            <div class="relative">
                <div class="w-10 h-10 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <p class="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-4">Chargement...</p>
        </div>
    `;

    try {
        const res = await secureFetch("/assignments/full-dashboard");
        rhData = await res.json();

        document.getElementById("stat-aidants").innerText = rhData.total_aidants || 0;
        document.getElementById("stat-patients").innerText = rhData.total_patients || 0;
        document.getElementById("stat-assignments").innerText = rhData.total_assignments || 0;
        document.getElementById("stat-non-assignes").innerText = rhData.patients_non_assignes || 0;

        showRHTab('aidants');

    } catch (err) {
        contentDiv.innerHTML = `
            <div class="bg-white rounded-2xl p-10 text-center border border-rose-100">
                <i class="fa-solid fa-circle-exclamation text-rose-400 text-3xl mb-3"></i>
                <p class="text-sm font-bold text-rose-500">Erreur de chargement</p>
                <p class="text-[10px] text-slate-400 mt-1">${err.message}</p>
                <button onclick="renderRHDashboard()" class="mt-4 px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Réessayer</button>
            </div>
        `;
    }
}

function showRHTab(tab) {
    currentRHTab = tab;
    
    const tabAidants = document.getElementById("tab-aidants");
    const tabPatients = document.getElementById("tab-patients");
    
    if (tab === 'aidants') {
        tabAidants.classList.add("bg-white", "text-slate-900", "shadow-sm");
        tabAidants.classList.remove("text-slate-400");
        tabPatients.classList.remove("bg-white", "text-slate-900", "shadow-sm");
        tabPatients.classList.add("text-slate-400");
        renderAidantsList();
    } else {
        tabPatients.classList.add("bg-white", "text-slate-900", "shadow-sm");
        tabPatients.classList.remove("text-slate-400");
        tabAidants.classList.remove("bg-white", "text-slate-900", "shadow-sm");
        tabAidants.classList.add("text-slate-400");
        renderPatientsList();
    }
}

function renderAidantsList() {
    const container = document.getElementById("rh-content");
    
    if (!rhData?.aidants?.length) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl p-10 text-center border border-slate-100">
                <i class="fa-solid fa-user-slash text-slate-300 text-4xl mb-3"></i>
                <p class="text-sm font-bold text-slate-500">Aucun aidant trouvé</p>
                <p class="text-[10px] text-slate-400 mt-1">Commencez par ajouter un aidant</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-4">
            ${rhData.aidants.map(aidant => `
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <!-- En-tête avec dégradé noir -->
                    <div class="px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-900">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <i class="fa-solid fa-user-nurse text-white text-lg"></i>
                                </div>
                                <div>
                                    <h4 class="font-black text-white text-base">${aidant.nom}</h4>
                                    <p class="text-[10px] text-slate-300 mt-0.5">📧 ${aidant.email || 'Non renseigné'}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="bg-emerald-500/20 px-3 py-1 rounded-full">
                                    <span class="text-[10px] font-black text-emerald-300">${aidant.nb_patients} patient${aidant.nb_patients > 1 ? 's' : ''}</span>
                                </span>
                                ${aidant.telephone ? `
                                    <a href="tel:${aidant.telephone}" class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                                        <i class="fa-solid fa-phone text-white text-xs"></i>
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Corps de la carte -->
                    <div class="p-4">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <i class="fa-solid fa-users text-[8px]"></i> Patients assignés
                        </p>
                        
                        ${aidant.patients_assignes.length === 0 ? `
                            <div class="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                                <i class="fa-solid fa-user-plus text-slate-300 text-2xl mb-2"></i>
                                <p class="text-xs text-slate-400">Aucun patient assigné</p>
                                <button onclick="window.openAssignModalWithAidant('${aidant.id}')" 
                                        class="mt-3 text-[10px] text-emerald-600 font-black uppercase hover:text-emerald-700 transition">
                                    + Assigner un patient
                                </button>
                            </div>
                        ` : `
                            <div class="space-y-2">
                                ${aidant.patients_assignes.map(assign => {
                                    const patient = rhData.patients.find(p => p.id === assign.patient_id);
                                    return `
                                        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div class="flex-1">
                                                <p class="font-bold text-slate-800 text-sm">${patient?.nom_complet || 'Patient inconnu'}</p>
                                                <div class="flex items-center gap-3 mt-1">
                                                    <span class="text-[9px] font-bold ${patient?.formule === 'Premium' ? 'text-gold-primary' : 'text-emerald-600'}">
                                                        ${patient?.formule || 'Standard'}
                                                    </span>
                                                    <span class="text-[9px] text-slate-400">📅 ${assign.date_prevue || 'Date non définie'}</span>
                                                </div>
                                            </div>
                                            <button onclick="window.unassignPatient('${assign.assignment_id}', '${aidant.nom}', '${patient?.nom_complet || ''}')" 
                                                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-colors flex items-center justify-center">
                                                <i class="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPatientsList() {
    const container = document.getElementById("rh-content");
    
    if (!rhData?.patients?.length) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl p-10 text-center border border-slate-100">
                <i class="fa-solid fa-hospital-user text-slate-300 text-4xl mb-3"></i>
                <p class="text-sm font-bold text-slate-500">Aucun patient trouvé</p>
                <p class="text-[10px] text-slate-400 mt-1">Ajoutez des patients pour commencer</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-4">
            ${rhData.patients.map(patient => `
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <!-- En-tête avec code couleur (vert si assigné, orange si non) -->
                    <div class="px-5 py-4 ${patient.aidant_assigne ? 'bg-gradient-to-r from-emerald-700 to-emerald-800' : 'bg-gradient-to-r from-slate-600 to-slate-700'}">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <i class="fa-solid fa-user text-white text-lg"></i>
                                </div>
                                <div>
                                    <h4 class="font-black text-white text-base">${patient.nom_complet}</h4>
                                    <div class="flex flex-wrap items-center gap-2 mt-0.5">
                                        <span class="text-[9px] text-white/70">📌 ${patient.adresse?.substring(0, 30) || 'Adresse non renseignée'}</span>
                                        <span class="text-[9px] font-bold ${patient.formule === 'Premium' ? 'text-gold-primary' : 'text-emerald-300'}">
                                            ${patient.formule || 'Standard'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-1 rounded-full ${patient.aidant_assigne ? 'bg-emerald-500/30 text-emerald-100' : 'bg-amber-500/30 text-amber-100'} text-[9px] font-bold">
                                    ${patient.aidant_assigne ? '✅ Assigné' : '⚠️ Non assigné'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-4">
                        ${patient.aidant_assigne ? `
                            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <i class="fa-solid fa-user-nurse text-emerald-600 text-sm"></i>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aidant assigné</p>
                                        <p class="font-bold text-slate-800 text-sm">${patient.aidant_assigne.nom}</p>
                                        <p class="text-[10px] text-slate-500">📞 ${patient.aidant_assigne.telephone || 'Non renseigné'}</p>
                                    </div>
                                </div>
                                <button onclick="window.unassignPatientFromPatient('${patient.id}')" 
                                        class="px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors text-xs font-bold flex items-center gap-1">
                                    <i class="fa-solid fa-link-slash"></i> Délier
                                </button>
                            </div>
                        ` : `
                            <div class="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                                <i class="fa-solid fa-user-plus text-slate-300 text-2xl mb-2"></i>
                                <p class="text-xs text-slate-400 mb-3">Aucun aidant assigné</p>
                                <button onclick="window.openAssignModalWithPatient('${patient.id}', '${patient.nom_complet.replace(/'/g, "\\'")}')" 
                                        class="bg-emerald-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition">
                                    + Assigner un aidant
                                </button>
                            </div>
                        `}
                        
                        <!-- Infos famille (style plus élégant) -->
                        ${patient.famille ? `
                            <div class="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fa-solid fa-family text-blue-500 text-xs"></i>
                                    <p class="text-[9px] font-black text-blue-600 uppercase tracking-wider">Famille / Payeur</p>
                                </div>
                                <p class="font-bold text-slate-800 text-sm">${patient.famille.nom || 'Inconnu'}</p>
                                <p class="text-[10px] text-slate-500 mt-0.5">📧 ${patient.famille.email || ''}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Helper pour ouvrir la modale avec un aidant pré-sélectionné
window.openAssignModalWithAidant = (aidantId) => {
    localStorage.setItem("pre_selected_aidant", aidantId);
    window.openAssignModal();
};

window.openAssignModalWithPatient = (patientId, patientNom) => {
    localStorage.setItem("pre_selected_patient", patientId);
    window.openAssignModal();
};

// Délier depuis la vue patient
window.unassignPatientFromPatient = async (patientId) => {
    const assignment = rhData?.assignments?.find(a => a.patient_id === patientId);
    if (!assignment) {
        Swal.fire({ title: "Erreur", text: "Assignation introuvable", icon: "error", customClass: { popup: 'rounded-2xl' } });
        return;
    }
    
    const aidant = rhData?.aidants?.find(a => a.id === assignment.aidant_id);
    
    const result = await Swal.fire({
        title: "Délier le patient",
        text: `Retirer ${patientId} de ${aidant?.nom || "l'aidant"} ?`,
        input: "textarea",
        inputPlaceholder: "Raison (optionnel)",
        showCancelButton: true,
        confirmButtonText: "Oui, délier",
        confirmButtonColor: "#F43F5E",
        cancelButtonText: "Annuler",
        customClass: { popup: 'rounded-2xl', input: 'rounded-xl' }
    });

    if (result.isConfirmed) {
        Swal.fire({ title: "Traitement...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        try {
            await secureFetch("/assignments/unassign", {
                method: "POST",
                body: JSON.stringify({ assignment_id: assignment.id, raison: result.value || "" })
            });
            Swal.fire({ icon: "success", title: "Succès", text: "Patient délié avec succès", timer: 2000, showConfirmButton: false });
            renderRHDashboard(); // Recharger
        } catch (err) {
            Swal.fire({ title: "Erreur", text: err.message, icon: "error", customClass: { popup: 'rounded-2xl' } });
        }
    }
};
