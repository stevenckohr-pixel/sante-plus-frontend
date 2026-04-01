import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

export async function loadPlanning() {
  const container = document.getElementById("view-container");
  container.innerHTML = document.getElementById("template-planning").innerHTML;

  const listContainer = document.getElementById("planning-list");
  const role = localStorage.getItem("user_role");

  if (role === "COORDINATEUR") {
    document.getElementById("planning-header").innerHTML += `
            <button onclick="window.openAssignModal()" class="w-10 h-10 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center">
                <i class="fa-solid fa-calendar-plus"></i>
            </button>`;
  }

  try {
    const res = await secureFetch("/planning");
    const data = await res.json();

    if (data.length === 0) {
      listContainer.innerHTML = `<p class="text-center py-10 text-slate-400 italic">Rien de prévu pour le moment.</p>`;
      return;
    }

    listContainer.innerHTML = data
      .map(
        (item) => `
            <div class="bg-white p-5 rounded-[2rem] border-l-4 border-l-green-500 shadow-sm animate-fadeIn">
                <div class="flex justify-between items-start">
                    <span class="text-[14px] font-black text-green-600">${item.heure_prevue.substring(0, 5)}</span>
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 uppercase">${item.statut}</span>
                </div>
                <h4 class="font-black text-slate-800 mt-2 uppercase text-sm">${item.patient.nom_complet}</h4>
                <p class="text-[11px] text-slate-500 mb-3"><i class="fa-solid fa-map-pin mr-1"></i> ${item.patient.adresse}</p>
                
                ${
                  role === "AIDANT" && item.statut === "Prévu"
                    ? `
                    <button onclick="window.startPlannedVisit('${item.patient_id}', '${item.id}')" class="w-full py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                        Démarrer la visite
                    </button>
                `
                    : ""
                }
            </div>
        `,
      )
      .join("");
  } catch (err) {
    listContainer.innerHTML = `<p class="text-red-500 text-center">${err.message}</p>`;
  }
}

// Fonction pour lier le planning au démarrage de la visite
window.startPlannedVisit = (patientId, planningId) => {
  localStorage.setItem("current_planning_id", planningId);
  window.startVisit(patientId); // Appelle ta fonction existante dans visites.js
};




/**
 * 🗓️ MODALE D'ASSIGNATION (Coordinateur)
 */
window.openAssignModal = async () => {
    try {
        // 1. Charger les patients et les aidants pour les menus déroulants
        const [resPatients, resAidants] = await Promise.all([
            secureFetch('/patients'),
            secureFetch('/auth/profiles?role=AIDANT')
        ]);
        
        const patients = await resPatients.json();
        const aidants = await resAidants.json();

        const { value: formValues } = await Swal.fire({
            title: '<span class="text-lg font-black uppercase">Planifier une visite</span>',
            html: `
                <div class="text-left space-y-4">
                    <select id="swal-patient" class="swal2-input">
                        <option value="">-- Choisir le Patient --</option>
                        ${patients.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('')}
                    </select>
                    <select id="swal-aidant" class="swal2-input">
                        <option value="">-- Choisir l'Aidant --</option>
                        ${aidants.map(a => `<option value="${a.id}">${a.nom}</option>`).join('')}
                    </select>
                    <div class="grid grid-cols-2 gap-2">
                        <input id="swal-date" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                        <input id="swal-heure" type="time" class="swal2-input" value="09:00">
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'CONFIRMER',
            confirmButtonColor: '#0F172A',
            preConfirm: () => {
                return {
                    patient_id: document.getElementById('swal-patient').value,
                    aidant_id: document.getElementById('swal-aidant').value,
                    date_prevue: document.getElementById('swal-date').value,
                    heure_prevue: document.getElementById('swal-heure').value
                };
            }
        });

        if (formValues) {
            if (!formValues.patient_id || !formValues.aidant_id) throw new Error("Sélectionnez un patient et un aidant");
            
            await secureFetch('/planning/add', {
                method: 'POST',
                body: JSON.stringify(formValues)
            });
            
            Swal.fire("Succès", "Mission ajoutée au planning.", "success");
            loadPlanning(); // Recharge la vue
        }
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};
