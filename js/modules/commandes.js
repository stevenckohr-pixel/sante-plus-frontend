import { secureFetch } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { UI, compressImage } from "../core/utils.js";

/**
 * 📋 CHARGER LA LISTE DES COMMANDES
 */
export async function loadCommandes() {
  const listContainer = document.getElementById("commandes-list");
  if (!listContainer) return;

  try {
    const data = await secureFetch("/commandes");
    renderCommandes(data);
  } catch (err) {
    console.error("Erreur chargement commandes:", err);
    listContainer.innerHTML = `<p class="text-rose-500 text-center p-10">Erreur : ${err.message}</p>`;
  }
}

/**
 * 🎨 AFFICHER LES COMMANDES
 */
function renderCommandes(list) {
  const container = document.getElementById("commandes-list");
  const role = localStorage.getItem("user_role");

  if (!list.length) {
    container.innerHTML = `<div class="text-center py-20 opacity-50"><i class="fa-solid fa-box-open text-5xl text-slate-300"></i><p class="text-xs font-black uppercase mt-2 text-slate-400">Aucune commande</p></div>`;
    return;
  }

  container.innerHTML = list
    .map((c) => {
      const isConfirmed = c.statut === "Confirmée";
      const isDelivered = c.statut === "Livrée";
      
      let statusColor = "bg-blue-100 text-blue-700";
      if (isDelivered) statusColor = "bg-emerald-100 text-emerald-700";
      if (c.statut === "En attente") statusColor = "bg-amber-100 text-amber-700";

      return `
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn">
          <div class="flex justify-between items-start mb-4">
            <div>
              <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID: ${c.id?.substring(0, 5) || '???'}</span>
              <h4 class="font-black text-slate-800 text-sm mt-1 uppercase">${c.patient?.nom_complet || 'Patient inconnu'}</h4>
            </div>
            <span class="px-2 py-1 rounded-md text-[9px] font-black uppercase ${statusColor}">${c.statut || 'En attente'}</span>
          </div>

          <div class="p-4 bg-slate-50 rounded-xl mb-4">
            <p class="text-xs font-bold text-slate-600 italic">"${c.liste_medocs || 'Aucune description'}"</p>
            ${c.prix_total > 0 ? `<p class="mt-2 text-xs font-black text-emerald-600">Total: ${UI.formatMoney(c.prix_total)}</p>` : ''}
          </div>

          ${isConfirmed && role === "AIDANT" && !isDelivered ? `
            <button onclick="window.markAsDelivered('${c.id}')" class="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
              📸 Confirmer la Livraison
            </button>
          ` : ''}

          ${c.photo_livraison ? `
            <img src="${c.photo_livraison}" class="w-full h-32 object-cover rounded-xl mt-3 border cursor-pointer" onclick="window.open('${c.photo_livraison}')">
          ` : ''}
        </div>
      `;
    })
    .join("");
}

/**
 * 📦 CONFIRMER LA LIVRAISON (Aidant)
 */
window.markAsDelivered = async (commandeId) => {
  const { value: file } = await Swal.fire({
    title: "Preuve de livraison",
    text: "Prenez une photo des médicaments déposés au domicile.",
    input: "file",
    inputAttributes: { accept: "image/*", capture: "camera" },
    confirmButtonText: "VALIDER LA LIVRAISON",
    confirmButtonColor: "#10B981",
    showCancelButton: true,
    cancelButtonText: "Annuler",
    customClass: { popup: 'rounded-2xl' }
  });

  if (!file) return;

  try {
    Swal.fire({
      title: "Envoi de la preuve...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: { popup: 'rounded-2xl' }
    });

    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("commande_id", commandeId);
    fd.append("photo_livraison", compressed);

    const response = await fetch(`${CONFIG.API_URL}/commandes/deliver`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: fd,
    });

    if (!response.ok) throw new Error("Erreur lors de l'envoi");

    UI.success("Livraison confirmée !");
    Swal.fire({
      icon: "success",
      title: "Livré !",
      text: "La famille a été notifiée de la livraison.",
      timer: 2000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
    loadCommandes();
  } catch (err) {
    UI.error(err.message);
    Swal.fire({
      title: "Erreur",
      text: err.message,
      icon: "error",
      customClass: { popup: 'rounded-2xl' }
    });
  }
};


/**
 * 💊 OUVRIR LA MODALE DE COMMANDE (Famille)
 */
export async function openOrderModal() { 
    // ✅ 1. Récupérer le patient de la famille connectée
    let patientId = AppState.currentPatient;
    
    // ✅ 2. Si pas de patient sélectionné, récupérer le premier patient de la famille
    if (!patientId) {
        try {
            const patients = await secureFetch('/patients');
            if (patients && patients.length > 0) {
                patientId = patients[0].id;
                AppState.currentPatient = patientId;
                console.log("📋 Patient chargé automatiquement:", patientId);
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Aucun patient",
                    text: "Vous n'avez aucun patient associé à votre compte.",
                    confirmButtonColor: "#0F172A"
                });
                return;
            }
        } catch (err) {
            console.error("Erreur chargement patient:", err);
            Swal.fire({
                icon: "error",
                title: "Erreur",
                text: "Impossible de charger les informations du patient.",
                confirmButtonColor: "#0F172A"
            });
            return;
        }
    }
    
    // ✅ 3. Demander la liste des médicaments
    const { value: text } = await Swal.fire({
        title: "Commander des médicaments",
        input: "textarea",
        inputPlaceholder: "Listez les médicaments et les quantités...\nEx: Paracétamol 500mg x 2 boîtes\nAspirine x 1 boîte",
        showCancelButton: true,
        confirmButtonText: "Envoyer la commande",
        confirmButtonColor: "#10B981",
        cancelButtonText: "Annuler",
        customClass: { popup: 'rounded-2xl', input: 'rounded-xl' }
    });

    if (!text) return;

    try {
        Swal.fire({
            title: "Envoi...",
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            customClass: { popup: 'rounded-2xl' }
        });

        console.log("📤 Envoi commande pour patient:", patientId);
        console.log("📦 Médicaments:", text);

        await secureFetch("/commandes/add", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                liste_medocs: text,
            }),
        });
        
        UI.success("Commande envoyée");
        Swal.fire({
            icon: "success",
            title: "Envoyé !",
            text: "Votre commande a été transmise au coordinateur.",
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-2xl' }
        });
        
        // Recharger la liste des commandes
        loadCommandes();
        
    } catch(e) {
        console.error("❌ Erreur commande:", e);
        Swal.fire({
            title: "Erreur",
            text: e.message,
            icon: "error",
            confirmButtonColor: "#F43F5E",
            customClass: { popup: 'rounded-2xl' }
        });
    }
}
