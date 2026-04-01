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
                
                ${userRole === "AIDANT" && item.statut !== 'Terminé' ? `
                    <button onclick="window.openMissionBriefing('${item.patient_id}', '${item.id}')" class="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">
                        Ouvrir le Briefing
                    </button>
                ` : ''}
            </div>
        `).join("");

    } catch (err) {
        listContainer.innerHTML = `<p class="text-rose-500 text-center p-10">${err.message}</p>`;
    }
}


/**
 * 🗓️ MODALE D'ASSIGNATION PREMIUM
 */
export async function openAssignModal() {
    try {
        UI.vibrate();
        
        // 1. Chargement discret
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

        // 🎨 LE NOUVEAU DESIGN ÉLITE
        const { value: formValues } = await Swal.fire({
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: 'CONFIRMER LA MISSION',
            cancelButtonText: 'ANNULER',
            confirmButtonColor: '#0F172A', // Navy
            customClass: {
                popup: 'rounded-[3rem] p-10 lg:p-14 border-none shadow-2xl',
                confirmButton: 'rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all',
                cancelButton: 'rounded-2xl px-8 py-4 font-bold uppercase text-[10px] tracking-widest text-slate-400'
            },
            html: `
                <div class="text-left animate-fadeIn">
                    <!-- HEADER -->
                    <div class="flex items-center gap-4 mb-10">
                        <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner">
                            <i class="fa-solid fa-calendar-circle-plus"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-[900] text-slate-800 tracking-tight leading-none">Nouvelle Mission</h3>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Planification Élite</p>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <!-- PATIENT -->
                        <div class="group">
                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">Dossier Patient</label>
                            <div class="relative">
                                <i class="fa-solid fa-hospital-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                                <select id="swal-patient" class="app-input !pl-12 !py-4 font-bold text-slate-700 appearance-none cursor-pointer">
                                    <option value="">-- Sélectionner le patient --</option>
                                    ${patients.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- AIDANT -->
                        <div class="group">
                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">Aidant Mobile</label>
                            <div class="relative">
                                <i class="fa-solid fa-user-nurse absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                                <select id="swal-aidant" class="app-input !pl-12 !py-4 font-bold text-slate-700 appearance-none cursor-pointer">
                                    <option value="">-- Choisir un intervenant --</option>
                                    ${aidants.map(a => `<option value="${a.id}">${a.nom}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- DATE & HEURE -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">Date prévue</label>
                                <input id="swal-date" type="date" class="app-input font-bold !py-4" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">Heure</label>
                                <input id="swal-heure" type="time" class="app-input font-bold !py-4" value="09:00">
                            </div>
                        </div>

                        <!-- NOTES -->
                        <div>
                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">Instructions particulières</label>
                            <textarea id="swal-notes" class="app-input !rounded-[1.5rem] h-28 !py-4" placeholder="Ex: Rappeler la prise de médicaments à 10h..."></textarea>
                        </div>
                    </div>
                </div>`,
            preConfirm: () => {
                const patient_id = document.getElementById('swal-patient').value;
                const aidant_id = document.getElementById('swal-aidant').value;
                if (!patient_id || !aidant_id) {
                    Swal.showValidationMessage('Veuillez remplir tous les champs');
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
            Swal.fire({ title: 'Planification...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, customClass: { popup: 'rounded-[3rem]' } });
            
            const res = await secureFetch('/planning/add', {
                method: 'POST',
                body: JSON.stringify(formValues)
            });
            
            if (res.ok) {
                UI.vibrate("success");
                Swal.fire({
                    icon: 'success',
                    title: 'Mission Enregistrée',
                    text: "L'aidant recevra une notification pour son intervention.",
                    confirmButtonColor: '#10B981',
                    customClass: { popup: 'rounded-[2.5rem]' }
                });
                loadPlanning();
            }
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


/**
 * 💡 TRANSITION INTELLIGENTE
 * Lie la mission du planning à la visite qui va démarrer
 */
window.openMissionBriefing = (patientId, planningId) => {
    UI.vibrate();
    // On mémorise quelle mission du planning on traite
    localStorage.setItem("active_planning_id", planningId);
    // On redirige vers la fiche patient habituelle
    window.viewPatientFeed(patientId);
};

