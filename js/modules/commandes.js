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
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const isFamily = role === "FAMILLE";

    // Message personnalisé selon le profil
    let emptyMessage = "Aucune commande";
    if (isFamily && isMaman) {
        emptyMessage = "Aucune commande de pharmacie";
    } else if (isFamily && !isMaman) {
        emptyMessage = "Aucune commande médicale";
    }

    if (!list.length) {
        container.innerHTML = `<div class="text-center py-20"><i class="fa-solid fa-box-open text-5xl text-slate-300"></i><p class="text-xs font-black uppercase mt-2 text-slate-400">${emptyMessage}</p></div>`;
        return;
    }

container.innerHTML = list.map((c, index) => { 
  const isPending = c.statut === "En attente";
        const isConfirmed = c.statut === "Confirmée";
        const isDelivered = c.statut === "Livrée";
        
        let statusColor = "bg-blue-100 text-blue-700";
        let statusText = c.statut || "En attente";
        
        if (isDelivered) {
            statusColor = "bg-emerald-100 text-emerald-700";
            statusText = "Livrée ✅";
        }
        if (isConfirmed) {
            statusColor = "bg-amber-100 text-amber-700";
            statusText = "Confirmée - En livraison";
        }
        if (isPending) {
            statusColor = "bg-slate-100 text-slate-700";
            statusText = "En attente de validation";
        }

        return `
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn list-item-animate" style="animation-delay: ${index * 0.03}s">
              <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">#${c.id?.substring(0, 8)}</span>
                        <h4 class="font-black text-slate-800 text-sm mt-1">${c.patient?.nom_complet || 'Patient inconnu'}</h4>
                    </div>
                    <span class="px-2 py-1 rounded-md text-[9px] font-black uppercase ${statusColor}">${statusText}</span>
                </div>

                <div class="p-4 bg-slate-50 rounded-xl mb-4">
                    <p class="text-xs font-bold text-slate-600 italic">📦 "${c.liste_medocs || 'Aucune description'}"</p>
                    ${c.prix_total ? `<p class="mt-2 text-xs font-black text-emerald-600">💰 Total: ${UI.formatMoney(c.prix_total)}</p>` : ''}
                </div>

                <!-- BOUTONS POUR COORDINATEUR -->
                ${role === "COORDINATEUR" && isPending ? `
                    <div class="space-y-3">
                        <div class="flex gap-2">
                            <input type="number" id="prix-${c.id}" placeholder="Montant total (CFA)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <select id="aidant-${c.id}" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                <option value="">Choisir un aidant</option>
                            </select>
                        </div>
                        <button onclick="window.confirmCommand('${c.id}')" 
                                class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md">
                            ✅ Confirmer et assigner un aidant
                        </button>
                    </div>
                ` : ''}

                <!-- BOUTON POUR AIDANT -->
                ${role === "AIDANT" && isConfirmed && !isDelivered ? `
                    <button onclick="window.markAsDelivered('${c.id}')" 
                            class="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                        📸 Confirmer la Livraison
                    </button>
                ` : ''}

                <!-- PREUVE DE LIVRAISON -->
                ${c.photo_livraison ? `
                    <div class="mt-3">
                        <p class="text-[9px] font-black text-slate-400 mb-1">📸 Preuve de livraison</p>
                        <img src="${c.photo_livraison}" class="w-full h-32 object-cover rounded-xl border cursor-pointer" onclick="window.open('${c.photo_livraison}')">
                    </div>
                ` : ''}
            </div>
        `;
    }).join("");
    
    // Charger la liste des aidants pour les selects (coordinateur)
    if (role === "COORDINATEUR") {
        loadAidantsForSelect();
    }
}

async function loadAidantsForSelect() {
    try {
        const aidants = await secureFetch('/auth/profiles?role=AIDANT');
        document.querySelectorAll('select[id^="aidant-"]').forEach(select => {
            select.innerHTML = '<option value="">Choisir un aidant</option>' +
                aidants.map(a => `<option value="${a.id}">${a.nom}</option>`).join('');
        });
    } catch (err) {
        console.error("Erreur chargement aidants:", err);
    }
}

// ✅ Fonction pour confirmer la commande (Coordinateur)
window.confirmCommand = async (commandeId) => {
    const prix = document.getElementById(`prix-${commandeId}`)?.value;
    const aidantId = document.getElementById(`aidant-${commandeId}`)?.value;
    
    if (!prix || !aidantId) {
        Swal.fire("Champs manquants", "Veuillez entrer le prix et sélectionner un aidant", "warning");
        return;
    }
    
    Swal.fire({ title: "Confirmation...", didOpen: () => Swal.showLoading() });
    
    try {
        await secureFetch("/commandes/confirm", {
            method: "POST",
            body: JSON.stringify({
                commande_id: commandeId,
                aidant_id: aidantId,
                prix_total: parseInt(prix)
            })
        });
        
        Swal.fire("Succès", "Commande confirmée et aidant assigné", "success");
        loadCommandes();
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};

/**
 * 📦 CONFIRMER LA LIVRAISON (Aidant)
 */
export async function markAsDelivered(commandeId) {
    const { value: file } = await Swal.fire({
        title: "Preuve de livraison",
        text: "Prenez une photo",
        input: "file",
        inputAttributes: { accept: "image/*", capture: "camera" },
        confirmButtonText: "VALIDER",
        confirmButtonColor: "#10B981",
        showCancelButton: true,
    });

    if (!file) return;

    // Vérification taille
    if (file.size > 10 * 1024 * 1024) {
        Swal.fire("Image trop lourde", "Maximum 10MB", "warning");
        return;
    }

    Swal.fire({
        title: "Envoi...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
    });

    try {
        // ✅ Compression légère seulement si nécessaire
        let fileToSend = file;
        if (file.size > 2 * 1024 * 1024) {
            fileToSend = await compressImage(file, 1024, 0.7);
        }
        
        const fd = new FormData();
        fd.append("commande_id", commandeId);
        fd.append("photo_livraison", fileToSend);

        // ✅ Timeout plus long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(`${CONFIG.API_URL}/commandes/deliver`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: fd,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const text = await response.text();
            let errorMsg;
            try {
                const json = JSON.parse(text);
                errorMsg = json.error;
            } catch {
                errorMsg = text.substring(0, 200);
            }
            throw new Error(errorMsg || `Erreur ${response.status}`);
        }

        const result = await response.json();
        
        Swal.fire({
            icon: "success",
            title: "Livré !",
            timer: 2000,
            showConfirmButton: false,
        });
        
        loadCommandes();
        
    } catch (err) {
        console.error("❌ Erreur:", err);
        Swal.fire({
            title: "Erreur",
            text: err.name === "AbortError" ? "Délai dépassé" : err.message,
            icon: "error"
        });
    }
}
/**
 * 💊 OUVRIR LA MODALE DE COMMANDE (Famille)
*/ 


export async function openOrderModal() { 
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const isFamily = localStorage.getItem("user_role") === "FAMILLE";
    
    // ✅ Récupérer l'ID du patient
    let patientId = AppState.currentPatient;
    
    // ✅ Si pas défini, le récupérer depuis le serveur
    if (!patientId) {
        try {
            const patients = await secureFetch('/patients');
            if (patients && patients.length > 0) {
                patientId = patients[0].id;
                AppState.currentPatient = patientId;
                localStorage.setItem("current_patient_id", patientId);
                console.log("✅ Patient récupéré:", patientId);
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
            console.error("Erreur:", err);
            Swal.fire({
                icon: "error",
                title: "Erreur",
                text: "Impossible de charger les informations du patient.",
                confirmButtonColor: "#0F172A"
            });
            return;
        }
    }
    
    // ✅ Texte personnalisé selon le profil
    let modalTitle = "Passer une commande";
    let modalPlaceholder = "Décrivez ce que vous souhaitez commander...\nEx: Médicaments, courses, matériel...";
    let confirmButtonText = "Envoyer la commande";
    
    if (isFamily && isMaman) {
        modalTitle = "Commandes bébé";
        modalPlaceholder = "Listez vos besoins (couches, lait, vêtements, médicaments bébé, puériculture...)";
        confirmButtonText = "Commander";
    } else if (isFamily && !isMaman) {
        modalTitle = "Commander";
        modalPlaceholder = "Listez les produits nécessaires (médicaments, matériel médical, courses...)";
        confirmButtonText = "Envoyer";
    }
    
    const { value: text } = await Swal.fire({
        title: modalTitle,
        input: "textarea",
        inputPlaceholder: modalPlaceholder,
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        confirmButtonColor: isMaman ? "#DB2777" : "#10B981",
        cancelButtonText: "Annuler",
        customClass: { popup: 'rounded-2xl', input: 'rounded-xl' }
    });

    if (!text) return;

    try {
        Swal.fire({
            title: "Envoi...",
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
        });

        console.log("📤 Envoi commande - Patient ID:", patientId);
        console.log("📦 Contenu:", text);

        await secureFetch("/commandes/add", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                liste_medocs: text,  // Le champ reste liste_medocs dans la base
            }),
        });
        
        UI.success("Commande envoyée");
        Swal.fire({
            icon: "success",
            title: "Envoyé !",
            text: "Votre commande a été transmise.",
            timer: 2000,
            showConfirmButton: false,
        });
        
        if (typeof loadCommandes === 'function') {
            loadCommandes();
        }
        
    } catch(e) {
        console.error("❌ Erreur:", e);
        Swal.fire({
            title: "Erreur",
            text: e.message,
            icon: "error",
            confirmButtonColor: "#F43F5E"
        });
    }
}



