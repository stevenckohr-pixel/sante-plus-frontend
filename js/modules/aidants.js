import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * Charge et affiche la liste des aidants
 */
export async function loadAidants() {
  const container = document.getElementById("view-container");

  // Structure de la vue
  container.innerHTML = `
        <div class="animate-fadeIn">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-black text-xl text-slate-800">Équipe Terrain</h3>
                <button onclick="window.openAddAidantModal()" class="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase shadow-lg">
                    + Recruter
                </button>
            </div>
            <div id="aidants-list" class="grid grid-cols-1 gap-4">
                <div class="flex justify-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-3xl"></i></div>
            </div>
        </div>
    `;

  try {
    const res = await secureFetch("/aidants");
    const aidants = await res.json();
    renderAidants(aidants);
  } catch (err) {
    console.error(err);
  }
}

/**
 * Rendu des cartes aidants
 */
async function renderAidants(aidants) {
  const list = document.getElementById("aidants-list");
  if (!list) return;

  if (aidants.length === 0) {
    list.innerHTML = `<p class="text-center py-10 text-slate-400 italic text-xs">Aucun aidant dans l'équipe.</p>`;
    return;
  }

  // On génère le HTML pour chaque aidant
  const cards = await Promise.all(
    aidants.map(async (a) => {
      // Optionnel : Récupérer les stats en temps réel pour chaque carte
      const statRes = await secureFetch(`/aidants/stats/${a.id}`);
      const stats = await statRes.json();

      return `
            <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-green-500 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src="${a.photo_url || "https://ui-avatars.com/api/?name=" + a.nom}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h4 class="font-black text-slate-800 uppercase text-xs">${a.nom}</h4>
                        <p class="text-[10px] text-slate-400 font-bold">${a.telephone || "Pas de numéro"}</p>
                        <div class="flex items-center gap-3 mt-2">
                            <span class="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">${stats.total_visites} Visites</span>
                            <span class="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">${stats.taux_validation}% Score</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2">
                    <button onclick="window.viewAidantDetails('${a.id}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
            </div>
        `;
    }),
  );

  list.innerHTML = cards.join("");
}
