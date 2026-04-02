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
