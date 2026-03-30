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
