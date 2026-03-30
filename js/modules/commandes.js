import { secureFetch } from "../core/api.js";
import { UI, compressImage } from "../core/utils.js";

export async function loadCommandes() {
  const listContainer = document.getElementById("commandes-list");
  if (!listContainer) return;

  try {
    const res = await secureFetch("/commandes");
    const data = await res.json();
    renderCommandes(data);
  } catch (err) {
    listContainer.innerHTML = `<p class="text-red-500 text-center">Erreur : ${err.message}</p>`;
  }
}

function renderCommandes(list) {
  const container = document.getElementById("commandes-list");
  const role = localStorage.getItem("user_role");

  if (list.length === 0) {
    container.innerHTML = `<div class="text-center py-20 opacity-20"><i class="fa-solid fa-box-open text-5xl"></i><p class="text-xs font-black uppercase mt-2">Aucune commande</p></div>`;
    return;
  }

  container.innerHTML = list
    .map((c) => {
      const isPending = c.statut === "En attente";
      const isConfirmed = c.statut === "Confirmée";

      return `
            <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm animate-fadeIn">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID: ${c.id.substring(0, 5)}</span>
                        <h4 class="font-black text-slate-800 text-sm mt-1 uppercase">${c.patient.nom_complet}</h4>
                    </div>
                    <span class="px-2 py-1 rounded-md text-[9px] font-black uppercase ${c.statut === "Livrée" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}">${c.statut}</span>
                </div>

                <div class="p-4 bg-slate-50 rounded-2xl mb-4">
                    <p class="text-xs font-bold text-slate-600 italic">"${c.liste_medocs}"</p>
                    ${c.prix_total > 0 ? `<p class="mt-2 text-xs font-black text-green-600">Total: ${UI.formatMoney(c.prix_total)}</p>` : ""}
                </div>

                ${
                  isConfirmed && role === "AIDANT"
                    ? `
                    <button onclick="window.markAsDelivered('${c.id}')" class="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                        📸 Confirmer la Livraison
                    </button>
                `
                    : ""
                }

                ${
                  c.photo_livraison
                    ? `
                    <img src="${c.photo_livraison}" class="w-full h-32 object-cover rounded-2xl border" onclick="window.open('${c.photo_livraison}')">
                `
                    : ""
                }
            </div>
        `;
    })
    .join("");
}

/**
 * 📦 Confirmer la livraison (Aidant)
 */
window.markAsDelivered = async (commandeId) => {
  const { value: file } = await Swal.fire({
    title: "Preuve de livraison",
    text: "Prenez une photo des médicaments déposés au domicile.",
    input: "file",
    inputAttributes: { accept: "image/*", capture: "camera" },
    confirmButtonText: "VALIDER LA LIVRAISON",
    confirmButtonColor: "#16a34a",
    showCancelButton: true,
  });

  if (file) {
    try {
      Swal.fire({
        title: "Envoi de la preuve...",
        didOpen: () => Swal.showLoading(),
      });

      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("commande_id", commandeId);
      fd.append("photo_livraison", compressed);

      await fetch(`${window.CONFIG.API_URL}/commandes/deliver`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });

      UI.vibrate("success");
      Swal.fire(
        "Livré !",
        "La famille a été notifiée de la livraison.",
        "success",
      );
      loadCommandes();
    } catch (err) {
      Swal.fire("Erreur", err.message, "error");
    }
  }
};

window.openOrderModal = async () => {
  const { value: text } = await Swal.fire({
    title: "Commander des médicaments",
    input: "textarea",
    inputPlaceholder: "Listez les médicaments et les quantités...",
    showCancelButton: true,
    confirmButtonColor: "#16a34a",
  });
  if (text) {
    await secureFetch("/commandes/add", {
      method: "POST",
      body: JSON.stringify({
        patient_id: window.AppState.currentPatient,
        liste_medocs: text,
      }),
    });
    loadCommandes();
  }
};
