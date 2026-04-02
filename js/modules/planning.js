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
        const res = await secureFetch("/planning");
        const data = await res.json();

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
 * 🗓️ MODALE D'ASSIGNATION
 */
export async function openAssignModal() {
    try {
        UI.vibrate();
        
        Swal.fire({ 
            title: '<i class="fa-solid fa-circle-notch fa-spin text-emerald-500"></i>',
            showConfirmButton: false,
            allowOutsideClick: false,
            customClass: { popup: 'bg-transparent shadow-none' }
        });

        const [resPatients, resAidants] = await Promise.all([
            secureFetch('/patients'),
            secureFetch('/auth/profiles?role=AIDANT')
        ]);
        
        const patients = await resPatients.json();
        const aidants = await resAidants.json();
        Swal.close();

        const { value: formValues } = await Swal.fire({
            title: '<span class="text-xl font-black text-slate-800">➕ Nouvelle Mission</span>',
            html: `
                <div class="text-left space-y-5 max-h-[70vh] overflow-y-auto px-1">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">👤 Patient</label>
                        <select id="swal-patient" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-300 outline-none">
                            <option value="">-- Sélectionner --</option>
                            ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.nom_complet)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">👨‍⚕️ Aidant</label>
                        <select id="swal-aidant" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-300 outline-none">
                            <option value="">-- Sélectionner --</option>
                            ${aidants.map(a => `<option value="${a.id}">${escapeHtml(a.nom)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">📅 Date</label>
                            <input id="swal-date" type="date" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">⏰ Heure</label>
                            <input id="swal-heure" type="time" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value="09:00">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">📝 Instructions</label>
                        <textarea id="swal-notes" rows="3" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Consignes pour l'aidant..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "CONFIRMER",
            confirmButtonColor: "#0F172A",
            cancelButtonText: "Annuler",
            cancelButtonColor: "#94A3B8",
            customClass: {
                popup: 'rounded-2xl p-6',
                confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider',
                cancelButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
            },
            preConfirm: () => {
                const patient_id = document.getElementById('swal-patient')?.value;
                const aidant_id = document.getElementById('swal-aidant')?.value;
                if (!patient_id || !aidant_id) {
                    Swal.showValidationMessage('Veuillez sélectionner un patient et un aidant');
                    return false;
                }
                return {
                    patient_id,
                    aidant_id,
                    date_prevue: document.getElementById('swal-date')?.value,
                    heure_prevue: document.getElementById('swal-heure')?.value,
                    notes: document.getElementById('swal-notes')?.value || ''
                };
            }
        });

        if (formValues) {
            Swal.fire({ title: 'Planification...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            
            const res = await secureFetch('/planning/add', {
                method: 'POST',
                body: JSON.stringify(formValues)
            });
            
            if (res.ok) {
                UI.success("Mission planifiée");
                Swal.fire({
                    icon: 'success',
                    title: 'Mission Enregistrée',
                    text: "L'aidant recevra une notification",
                    timer: 2000,
                    showConfirmButton: false
                });
                loadPlanning();
            } else {
                const err = await res.json();
                throw new Error(err.error || "Erreur lors de la planification");
            }
        }
    } catch (err) {
        UI.error(err.message);
        Swal.fire({ title: "Erreur", text: err.message, icon: "error", customClass: { popup: 'rounded-2xl' } });
    }
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
