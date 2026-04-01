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

        if (data.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-20 opacity-20"><i class="fa-solid fa-calendar-xmark text-5xl"></i><p class="text-xs font-black uppercase mt-2">Agenda vide</p></div>`;
            return;
        }

        listContainer.innerHTML = data.map(item => `
            <div class="bg-white p-5 rounded-[2rem] border-l-4 ${item.statut === 'Terminé' ? 'border-emerald-500' : 'border-blue-500'} shadow-sm animate-slideIn mb-4">
                <div class="flex justify-between items-start">
                    <div class="flex flex-col">
                        <span class="text-lg font-black text-slate-800">${item.heure_prevue.substring(0, 5)}</span>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${new Date(item.date_prevue).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'})}</span>
                    </div>
                    <span class="px-2 py-1 rounded-lg text-[9px] font-black uppercase ${item.statut === 'Terminé' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">
                        ${item.statut}
                    </span>
                </div>
                
                <div class="mt-4">
                    <h4 class="font-black text-slate-800 uppercase text-sm">${item.patient.nom_complet}</h4>
                    <p class="text-[11px] text-slate-500"><i class="fa-solid fa-map-pin mr-1"></i> ${item.patient.adresse}</p>
                </div>

                ${item.notes_coordinateur ? `
                    <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Consignes :</p>
                        <p class="text-xs italic text-slate-600">"${item.notes_coordinateur}"</p>
                    </div>
                ` : ''}
                
                ${userRole === "AIDANT" && item.statut !== "Terminé" ? `
                    <button onclick="window.viewPatientFeed('${item.patient_id}')" class="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">
                        Ouvrir le dossier
                    </button>
                ` : ''}
            </div>
        `).join("");

    } catch (err) {
        listContainer.innerHTML = `<p class="text-rose-500 text-center p-10">${err.message}</p>`;
    }
}

/**
 * 🗓️ MODALE D'ASSIGNATION (Coordinateur)
 * Exportée pour être branchée sur window dans main.js
 */
export async function openAssignModal() {
    try {
        UI.vibrate();
        
        // 1. Charger les patients et les aidants pour les menus déroulants
        Swal.fire({ title: 'Chargement...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

        const [resPatients, resAidants] = await Promise.all([
            secureFetch('/patients'),
            secureFetch('/auth/profiles?role=AIDANT')
        ]);
        
        const patients = await resPatients.json();
        const aidants = await resAidants.json();
        Swal.close();

        const { value: formValues } = await Swal.fire({
            title: '<span class="text-xl font-black uppercase tracking-tight">Planifier une visite</span>',
            html: `
                <div class="text-left space-y-4 pt-4">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Patient concerné</label>
                        <select id="swal-patient" class="swal2-input !mt-1">
                            <option value="">-- Choisir le Patient --</option>
                            ${patients.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Aidant assigné</label>
                        <select id="swal-aidant" class="swal2-input !mt-1">
                            <option value="">-- Choisir l'Aidant --</option>
                            ${aidants.map(a => `<option value="${a.id}">${a.nom}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Date</label>
                            <input id="swal-date" type="date" class="swal2-input !mt-1" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Heure</label>
                            <input id="swal-heure" type="time" class="swal2-input !mt-1" value="09:00">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Instructions (Optionnel)</label>
                        <textarea id="swal-notes" class="swal2-textarea !mt-1" placeholder="Ex: Vérifier la tension..."></textarea>
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'CONFIRMER LA MISSION',
            confirmButtonColor: '#0F172A',
            cancelButtonText: 'Annuler',
            customClass: { popup: 'rounded-[3rem] p-8' },
            preConfirm: () => {
                const patient_id = document.getElementById('swal-patient').value;
                const aidant_id = document.getElementById('swal-aidant').value;
                if (!patient_id || !aidant_id) {
                    Swal.showValidationMessage('Merci de choisir un patient et un aidant');
                    return false;
                }
                return {
                    patient_id,
                    aidant_id,
                    date_prevue: document.getElementById('swal-date').value,
                    heure_prevue: document.getElementById('swal-heure').value,
                    notes: document.getElementById('swal-notes').value
                };
            }
        });

        if (formValues) {
            Swal.fire({ title: 'Enregistrement...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            
            await secureFetch('/planning/add', {
                method: 'POST',
                body: JSON.stringify(formValues)
            });
            
            UI.vibrate("success");
            Swal.fire("Mission Programmée", "L'aidant a été notifié de sa nouvelle mission.", "success");
            loadPlanning(); // Recharge la vue liste
        }
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
}


// Fonction pour lier le planning au démarrage de la visite
window.startPlannedVisit = (patientId, planningId) => {
  localStorage.setItem("current_planning_id", planningId);
  window.startVisit(patientId); // Appelle ta fonction existante dans visites.js
};




