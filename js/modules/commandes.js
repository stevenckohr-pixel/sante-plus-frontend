import { secureFetch } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { UI, compressImage } from "../core/utils.js";




function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    const isAidant = role === "AIDANT";
    const isCoordinateur = role === "COORDINATEUR";
    const currentUserId = localStorage.getItem("user_id");

    if (!list.length) {
        let emptyMessage = "Aucune commande";
        if (isFamily && isMaman) emptyMessage = "Aucune commande bébé";
        else if (isFamily && !isMaman) emptyMessage = "Aucune commande médicale";
        
        container.innerHTML = `<div class="text-center py-20"><i class="fa-solid fa-box-open text-5xl text-slate-300"></i><p class="text-xs font-black uppercase mt-2 text-slate-400">${emptyMessage}</p></div>`;
        return;
    }

    container.innerHTML = list.map((c, index) => {
        const isPending = c.statut === "En attente";
        const isInProgress = c.statut === "En cours";
        const isDelivered = c.statut === "Livrée";
        const isValidated = c.statut === "Validée";
        
        let statusColor = "bg-slate-100 text-slate-700";
        let statusText = "En attente";
        let statusIcon = "⏳";
        
        if (isValidated) {
            statusColor = "bg-emerald-100 text-emerald-700";
            statusText = "Validée ✅";
            statusIcon = "✅";
        } else if (isDelivered) {
            statusColor = "bg-amber-100 text-amber-700";
            statusText = "Livrée - À valider";
            statusIcon = "📦";
        } else if (isInProgress) {
            statusColor = "bg-blue-100 text-blue-700";
            statusText = "En cours de livraison";
            statusIcon = "🚚";
        }
        
        const urgentBadge = c.urgent ? `<span class="ml-2 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[8px] font-black uppercase"><i class="fa-solid fa-bell"></i> Urgent</span>` : '';
        
        const typeLabels = {
            'MEDICAMENTS': '💊 Médicaments',
            'MATERIEL': '🩺 Matériel médical',
            'ALIMENTATION': '🍎 Alimentation',
            'PUERICULTURE': '🍼 Puériculture',
            'AUTRE': '📦 Autre'
        };
        const typeLabel = typeLabels[c.type_commande] || '📦 Commande';
        
        const imagesHtml = c.images && c.images.length > 0 ? `
            <div class="mt-3">
                <p class="text-[9px] font-black text-slate-400 mb-2">📸 Documents joints (${c.images.length}) :</p>
                <div class="flex flex-wrap gap-2">
                    ${c.images.map(img => `
                        <div class="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group" onclick="window.openImageGallery('${c.id}', ${JSON.stringify(c.images)})">
                            <img src="${img}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <i class="fa-solid fa-eye text-white text-xs"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        
        const notesHtml = c.notes_coordinateur ? `
            <div class="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <p class="text-[9px] font-black text-blue-600">📋 Note :</p>
                <p class="text-xs text-slate-600">${escapeHtml(c.notes_coordinateur)}</p>
            </div>
        ` : '';
        
        // Photos de livraison (multiples)
        const deliveryPhotosHtml = c.photos_livraison && c.photos_livraison.length > 0 ? `
            <div class="mt-3 pt-3 border-t border-slate-100">
                <p class="text-[9px] font-black text-slate-400 mb-2">📸 Preuves de livraison (${c.photos_livraison.length}) :</p>
                <div class="flex flex-wrap gap-2">
                    ${c.photos_livraison.map(img => `
                        <div class="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group" onclick="window.open('${img}', '_blank')">
                            <img src="${img}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <i class="fa-solid fa-magnifying-glass-plus text-white text-xs"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${c.notes_livraison ? `<p class="text-xs text-slate-500 mt-2"><i class="fa-solid fa-pen"></i> ${escapeHtml(c.notes_livraison)}</p>` : ''}
            </div>
        ` : (c.photo_livraison ? `
            <div class="mt-3 pt-3 border-t border-slate-100">
                <p class="text-[9px] font-black text-slate-400 mb-1">📸 Preuve de livraison</p>
                <img src="${c.photo_livraison}" class="w-full h-32 object-cover rounded-xl border cursor-pointer" onclick="window.open('${c.photo_livraison}')">
            </div>
        ` : '');

        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn list-item-animate mb-4" style="animation-delay: ${index * 0.03}s">
                <!-- En-tête -->
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">#${c.id?.substring(0, 8)}</span>
                            ${urgentBadge}
                        </div>
                        <h4 class="font-black text-slate-800 text-sm mt-1">${c.patient?.nom_complet || 'Patient inconnu'}</h4>
                        <p class="text-[9px] text-slate-400">${typeLabel}</p>
                    </div>
                    <span class="px-2 py-1 rounded-md text-[9px] font-black uppercase ${statusColor}">${statusIcon} ${statusText}</span>
                </div>

                <!-- Description -->
                <div class="p-4 bg-slate-50 rounded-xl mb-4">
                    <p class="text-xs font-medium text-slate-700 leading-relaxed">📦 "${escapeHtml(c.liste_medocs || 'Aucune description')}"</p>
                </div>
                
                <!-- Images de la commande -->
                ${imagesHtml}
                
                <!-- Notes coordinateur -->
                ${notesHtml}

                <!-- Demandeur -->
                <div class="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <i class="fa-solid fa-user"></i>
                    <span>Demandeur: ${c.demandeur?.nom || 'Inconnu'}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                </div>

                <!-- BOUTON POUR AIDANT - Livrer directement -->
                ${isAidant && (isPending || isInProgress) && (!c.aidant_id || c.aidant_id === currentUserId) ? `
                    <button onclick="window.deliverCommand('${c.id}')" 
                            class="w-full mt-4 py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                        📸 Confirmer la livraison (avec photos)
                    </button>
                ` : ''}

                <!-- BOUTON POUR COORDINATEUR - Valider livraison -->
                ${isCoordinateur && isDelivered ? `
                    <button onclick="window.validateDelivery('${c.id}')" 
                            class="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all">
                        ✅ Valider la livraison
                    </button>
                ` : ''}

                <!-- BOUTON POUR COORDINATEUR - Assigner (si pas encore assignée) -->
                ${isCoordinateur && isPending ? `
                    <div class="space-y-3 mt-4 pt-3 border-t border-slate-100">
                        <div>
                            <label class="text-[9px] font-black text-slate-400">👨‍⚕️ Assigner à un aidant</label>
                            <select id="aidant-${c.id}" class="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                <option value="">Choisir un aidant</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-slate-400">📝 Instructions (optionnel)</label>
                            <textarea id="notes-${c.id}" rows="2" class="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Instructions pour l'aidant..."></textarea>
                        </div>
                        <button onclick="window.assignCommand('${c.id}')" 
                                class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-emerald-700 transition">
                            📋 Assigner à l'aidant
                        </button>
                    </div>
                ` : ''}

                <!-- PREUVE DE LIVRAISON -->
                ${deliveryPhotosHtml}
            </div>
        `;
    }).join("");
    
    // Bouton "Faire le point du jour" pour le coordinateur
    if (isCoordinateur) {
        const todayBtn = document.createElement('div');
        todayBtn.className = 'mb-4 flex justify-end';
        todayBtn.innerHTML = `
            <button onclick="window.validateAllDeliveries()" 
                    class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-emerald-700 transition">
                📋 Faire le point du jour
            </button>
        `;
        container.parentNode.insertBefore(todayBtn, container);
        
        loadAidantsForSelect();
    }
}

// ✅ Fonction pour assigner une commande (Coordinateur)
window.assignCommand = async (commandeId) => {
    const aidantId = document.getElementById(`aidant-${commandeId}`)?.value;
    const notes = document.getElementById(`notes-${commandeId}`)?.value;
    
    if (!aidantId) {
        Swal.fire("Champs manquants", "Veuillez sélectionner un aidant", "warning");
        return;
    }
    
    Swal.fire({ title: "Assignation...", didOpen: () => Swal.showLoading() });
    
    try {
        await secureFetch("/commandes/assign", {
            method: "POST",
            body: JSON.stringify({
                commande_id: commandeId,
                aidant_id: aidantId,
                notes: notes
            })
        });
        
        Swal.fire("Succès", "Commande assignée à l'aidant", "success");
        loadCommandes();
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};

// ✅ Fonction pour accepter une commande (Aidant)
window.acceptCommand = async (commandeId) => {
    const result = await Swal.fire({
        title: "Prendre en charge",
        text: "Voulez-vous prendre cette commande en charge ?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "OUI, JE PRENDS",
        confirmButtonColor: "#10B981"
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({ title: "Assignation...", didOpen: () => Swal.showLoading() });
    
    try {
        await secureFetch("/commandes/accept", {
            method: "POST",
            body: JSON.stringify({ commande_id: commandeId })
        });
        
        Swal.fire("Succès", "Commande prise en charge", "success");
        loadCommandes();
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};

// ✅ Fonction pour valider la livraison (Coordinateur)
window.validateDelivery = async (commandeId) => {
    const result = await Swal.fire({
        title: "Valider la livraison",
        text: "Confirmez-vous que cette livraison est conforme ?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "OUI, VALIDER",
        confirmButtonColor: "#10B981"
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({ title: "Validation...", didOpen: () => Swal.showLoading() });
    
    try {
        await secureFetch("/commandes/validate", {
            method: "POST",
            body: JSON.stringify({ commande_id: commandeId })
        });
        
        Swal.fire("Succès", "Livraison validée", "success");
        loadCommandes();
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};


/**
 * ✅ COORDINATEUR - VALIDATION RAPIDE DES LIVRAISONS DU JOUR
 */
window.validateAllDeliveries = async () => {
    const result = await Swal.fire({
        title: "📋 Point des livraisons du jour",
        text: "Voulez-vous valider toutes les livraisons en attente ?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "✅ OUI, TOUT VALIDER",
        confirmButtonColor: "#10B981",
        cancelButtonText: "Annuler"
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({ title: "Validation...", didOpen: () => Swal.showLoading() });
    
    try {
        await secureFetch("/commandes/validate-all", { method: "POST" });
        Swal.fire({ icon: "success", title: "Point effectué !", timer: 2000, showConfirmButton: false });
        loadCommandes();
    } catch (err) {
        Swal.fire({ title: "Erreur", text: err.message, icon: "error" });
    }
};


window.acceptCommand = async (commandeId) => {
    const result = await Swal.fire({
        title: "Prendre en charge",
        text: "Voulez-vous prendre cette commande en charge ?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "OUI, JE PRENDS",
        confirmButtonColor: "#10B981"
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({ title: "Assignation...", didOpen: () => Swal.showLoading() });
    
    try {
        await secureFetch("/commandes/accept", {
            method: "POST",
            body: JSON.stringify({ commande_id: commandeId })
        });
        
        Swal.fire("Succès", "Commande prise en charge", "success");
        loadCommandes();
    } catch (err) {
        Swal.fire("Erreur", err.message, "error");
    }
};

// ✅ Fonction pour ouvrir la galerie d'images
window.openImageGallery = (commandeId, images) => {
    Swal.fire({
        title: '📸 Documents de la commande',
        html: `
            <div class="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                ${images.map(img => `
                    <div class="relative group cursor-pointer" onclick="window.open('${img}', '_blank')">
                        <img src="${img}" class="w-full h-32 object-cover rounded-xl border border-slate-200">
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl">
                            <i class="fa-solid fa-magnifying-glass-plus text-white text-xl"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `,
        showConfirmButton: true,
        confirmButtonText: "Fermer",
        confirmButtonColor: "#10B981",
        width: '600px',
        customClass: { popup: 'rounded-2xl' }
    });
};


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

// ✅ Ajouter commandeId comme paramètre
export async function confirmCommand(commandeId) {
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
}

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


/**
 * 💊 OUVRIR LA MODALE DE COMMANDE (Version Pro avec Upload)
 */
export async function openOrderModal() { 
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const isFamily = localStorage.getItem("user_role") === "FAMILLE";
    const userRole = localStorage.getItem("user_role");
    
    // Récupérer l'ID du patient
    let patientId = AppState.currentPatient;
    
    if (!patientId) {
        try {
            const patients = await secureFetch('/patients');
            if (patients && patients.length > 0) {
                patientId = patients[0].id;
                AppState.currentPatient = patientId;
                localStorage.setItem("current_patient_id", patientId);
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
    
    // Texte personnalisé selon le profil
    let modalTitle = "📦 Nouvelle commande";
    let modalSubtitle = "Décrivez ce que vous souhaitez commander";
    let confirmButtonText = "Envoyer la commande";
    let placeholder = "Décrivez précisément votre commande...\n\nExemples:\n- Médicaments: (nom, dosage, quantité)\n- Matériel médical\n- Produits de puériculture\n- Aliments spécifiques\n- Autres besoins...";
    
    if (isFamily && isMaman) {
        modalTitle = "🍼 Commandes bébé";
        modalSubtitle = "Couches, lait, puériculture, médicaments bébé";
        placeholder = "Listez vos besoins pour bébé...\n\nExemples:\n- Couches taille M (x2 paquets)\n- Lait 1er âge (x3 boîtes)\n- Vêtements naissance\n- Produits de toilette bébé\n- Ordonnance médicale (joindre photo)";
        confirmButtonText = "🛒 Commander";
    } else if (isFamily && !isMaman) {
        modalTitle = "💊 Pharmacie & Matériel";
        modalSubtitle = "Médicaments, matériel médical, courses";
        placeholder = "Listez les produits nécessaires...\n\nExemples:\n- Médicaments (joindre ordonnance)\n- Matériel médical\n- Aliments spécifiques\n- Produits d'hygiène";
        confirmButtonText = "📤 Envoyer";
    }
    
    // HTML du formulaire avec upload d'images
    const modalHtml = `
        <div class="text-left">
            <p class="text-xs text-slate-500 mb-4">${modalSubtitle}</p>
            
            <!-- Description de la commande -->
            <div class="mb-4">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                    📝 Description de la commande
                </label>
                <textarea id="order-description" 
                          class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                          rows="4"
                          placeholder="${placeholder}"></textarea>
            </div>
            
            <!-- Upload d'images -->
            <div class="mb-4">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                    📸 Photos (ordonnance, produits, etc.)
                </label>
                <div id="image-upload-area" 
                     class="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 transition-all bg-slate-50/50">
                    <input type="file" id="order-images" accept="image/*" multiple class="hidden" />
                    <div id="upload-placeholder">
                        <i class="fa-solid fa-cloud-upload-alt text-3xl text-slate-300 mb-2"></i>
                        <p class="text-xs text-slate-500">Cliquez ou glissez des images</p>
                        <p class="text-[9px] text-slate-400 mt-1">JPG, PNG - Max 5MB par image</p>
                    </div>
                    <div id="image-preview-list" class="flex flex-wrap gap-2 mt-3 hidden"></div>
                </div>
            </div>
            
            <!-- Type de commande (optionnel) -->
            <div class="mb-4">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                    🏷️ Type de commande
                </label>
                <select id="order-type" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="MEDICAMENTS">💊 Médicaments</option>
                    <option value="MATERIEL">🩺 Matériel médical</option>
                    <option value="ALIMENTATION">🍎 Alimentation</option>
                    <option value="PUERICULTURE">🍼 Puériculture (bébé)</option>
                    <option value="AUTRE">📦 Autre</option>
                </select>
            </div>
            
            <!-- Urgence -->
            <div class="mb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="order-urgent" class="w-4 h-4 accent-rose-500">
                    <span class="text-xs font-medium text-slate-600">⚠️ Commande urgente (traitement prioritaire)</span>
                </label>
            </div>
        </div>
    `;
    
    // Afficher la modale
    const result = await Swal.fire({
        title: `<span class="text-lg font-black text-slate-800">${modalTitle}</span>`,
        html: modalHtml,
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: "Annuler",
        confirmButtonColor: isMaman ? "#DB2777" : "#10B981",
        cancelButtonColor: "#94A3B8",
        width: '500px',
        customClass: {
            popup: 'rounded-2xl p-4',
            confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider',
            cancelButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
        },
        didOpen: () => {
            // Gestion de l'upload d'images
            const uploadArea = document.getElementById('image-upload-area');
            const fileInput = document.getElementById('order-images');
            const previewList = document.getElementById('image-preview-list');
            const placeholder = document.getElementById('upload-placeholder');
            let selectedFiles = [];
            
            // Fonction pour afficher les aperçus
            const updatePreviews = () => {
                previewList.innerHTML = '';
                if (selectedFiles.length === 0) {
                    previewList.classList.add('hidden');
                    placeholder.classList.remove('hidden');
                    return;
                }
                previewList.classList.remove('hidden');
                placeholder.classList.add('hidden');
                
                selectedFiles.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewDiv = document.createElement('div');
                        previewDiv.className = 'relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-200 group';
                        previewDiv.innerHTML = `
                            <img src="${e.target.result}" class="w-full h-full object-cover">
                            <button type="button" data-index="${index}" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center hover:bg-red-600 transition">×</button>
                        `;
                        previewDiv.querySelector('button').onclick = () => {
                            selectedFiles.splice(index, 1);
                            updatePreviews();
                            // Mettre à jour le file input
                            const dt = new DataTransfer();
                            selectedFiles.forEach(f => dt.items.add(f));
                            fileInput.files = dt.files;
                        };
                        previewList.appendChild(previewDiv);
                    };
                    reader.readAsDataURL(file);
                });
            };
            
            // Clic sur la zone d'upload
            uploadArea.onclick = () => fileInput.click();
            
            // Sélection des fichiers
            fileInput.onchange = (e) => {
                const files = Array.from(e.target.files);
                const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
                if (validFiles.length !== files.length) {
                    showToast("Certaines images dépassent 5MB et ont été ignorées", "warning");
                }
                selectedFiles = [...selectedFiles, ...validFiles];
                updatePreviews();
                // Mettre à jour le file input
                const dt = new DataTransfer();
                selectedFiles.forEach(f => dt.items.add(f));
                fileInput.files = dt.files;
            };
            
            // Drag & drop
            uploadArea.ondragover = (e) => {
                e.preventDefault();
                uploadArea.classList.add('border-emerald-500', 'bg-emerald-50');
            };
            uploadArea.ondragleave = () => {
                uploadArea.classList.remove('border-emerald-500', 'bg-emerald-50');
            };
            uploadArea.ondrop = (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-emerald-500', 'bg-emerald-50');
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
                selectedFiles = [...selectedFiles, ...validFiles];
                updatePreviews();
                const dt = new DataTransfer();
                selectedFiles.forEach(f => dt.items.add(f));
                fileInput.files = dt.files;
            };
            
            // Stocker les fichiers pour l'envoi
            window._orderFiles = selectedFiles;
        },
        preConfirm: () => {
            const description = document.getElementById('order-description')?.value.trim();
            const orderType = document.getElementById('order-type')?.value;
            const isUrgent = document.getElementById('order-urgent')?.checked;
            
            if (!description) {
                Swal.showValidationMessage("Veuillez décrire votre commande");
                return false;
            }
            
            return {
                description: description,
                type: orderType,
                urgent: isUrgent,
                files: window._orderFiles || []
            };
        }
    });
    
    if (!result.value) return;
    
    const { description, type, urgent, files } = result.value;
    
    // Envoyer la commande avec les images
    Swal.fire({
        title: "Envoi en cours...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });
    
    try {
        // D'abord, uploader les images si présentes
        let uploadedImages = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("patient_id", patientId);
            
            const uploadRes = await fetch(`${CONFIG.API_URL}/commandes/upload-image`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });
            
            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                uploadedImages.push(uploadData.url);
            }
        }
        
        // Envoyer la commande
        await secureFetch("/commandes/add", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                liste_medocs: description,
                type_commande: type,
                urgent: urgent,
                images: uploadedImages
            })
        });
        
        UI.success("Commande envoyée avec succès !");
        Swal.fire({
            icon: "success",
            title: "✅ Commande envoyée",
            text: files.length > 0 ? `Votre commande et ${files.length} photo(s) ont été transmises.` : "Votre commande a été transmise.",
            timer: 2000,
            showConfirmButton: false
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
}window.deliverCommand = async (commandeId) => {
    const { value: formData } = await Swal.fire({
        title: "📸 Livraison de la commande",
        html: `
            <div class="text-left">
                <div class="mb-4">
                    <label class="text-[10px] font-black text-slate-400 block mb-2">Photos de livraison (max 5)</label>
                    <input type="file" id="delivery-photos" accept="image/*" multiple class="w-full p-2 border border-slate-200 rounded-lg">
                    <div id="photo-preview" class="flex flex-wrap gap-2 mt-2"></div>
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 block mb-2">Notes de livraison</label>
                    <textarea id="delivery-notes" rows="3" class="w-full p-2 border border-slate-200 rounded-lg" placeholder="État de la livraison, observations..."></textarea>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "✅ Confirmer la livraison",
        confirmButtonColor: "#10B981",
        didOpen: () => {
            const fileInput = document.getElementById('delivery-photos');
            const previewDiv = document.getElementById('photo-preview');
            
            fileInput.onchange = () => {
                previewDiv.innerHTML = '';
                const files = Array.from(fileInput.files).slice(0, 5); // Max 5 photos
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const div = document.createElement('div');
                        div.className = 'relative';
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'w-16 h-16 object-cover rounded-lg border';
                        div.appendChild(img);
                        previewDiv.appendChild(div);
                    };
                    reader.readAsDataURL(file);
                });
            };
        },
        preConfirm: () => {
            const photos = document.getElementById('delivery-photos').files;
            const notes = document.getElementById('delivery-notes').value;
            
            if (!photos || photos.length === 0) {
                Swal.showValidationMessage("Veuillez ajouter au moins une photo");
                return false;
            }
            
            return { photos, notes };
        }
    });
    
    if (!formData) return;
    
    Swal.fire({ title: "Envoi en cours...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        const fd = new FormData();
        fd.append("commande_id", commandeId);
        fd.append("notes_livraison", formData.notes);
        for (let i = 0; i < formData.photos.length; i++) {
            fd.append("photos", formData.photos[i]);
        }
        
        // Important: N'ajoutez PAS 'Content-Type' header avec FormData
        // Le navigateur le définit automatiquement avec la boundary
        const response = await fetch(`${CONFIG.API_URL}/commandes/${commandeId}/deliver`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${localStorage.getItem("token")}`
                // NE PAS mettre 'Content-Type': 'multipart/form-data'
            },
            body: fd
        });
        
        // Vérifiez si la réponse est du JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Réponse non-JSON:", text.substring(0, 500));
            throw new Error(`Le serveur a retourné ${response.status} (page HTML au lieu de JSON). Vérifiez l'URL de l'API.`);
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || "Erreur lors de la livraison");
        }
        
        const data = await response.json();
        Swal.fire({ icon: "success", title: "Livré !", timer: 2000, showConfirmButton: false });
        
        if (typeof loadCommandes === 'function') {
            loadCommandes();
        }
        
    } catch (err) {
        console.error("Erreur deliverCommand:", err);
        Swal.fire({ 
            title: "Erreur", 
            text: err.message, 
            icon: "error",
            confirmButtonText: "OK"
        });
    }
};


/**
 * 📦 AIDANT - LIVRAISON AVEC MULTIPLES PHOTOS
 */
window.deliverCommand = async (commandeId) => {
    const { value: formData } = await Swal.fire({
        title: "📸 Livraison de la commande",
        html: `
            <div class="text-left">
                <div class="mb-4">
                    <label class="text-[10px] font-black text-slate-400 block mb-2">Photos de livraison (max 5)</label>
                    <input type="file" id="delivery-photos" accept="image/*" multiple class="w-full p-2 border border-slate-200 rounded-lg">
                    <div id="photo-preview" class="flex flex-wrap gap-2 mt-2"></div>
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 block mb-2">Notes de livraison</label>
                    <textarea id="delivery-notes" rows="3" class="w-full p-2 border border-slate-200 rounded-lg" placeholder="État de la livraison, observations..."></textarea>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "✅ Confirmer la livraison",
        confirmButtonColor: "#10B981",
        didOpen: () => {
            const fileInput = document.getElementById('delivery-photos');
            const previewDiv = document.getElementById('photo-preview');
            
            fileInput.onchange = () => {
                previewDiv.innerHTML = '';
                const files = Array.from(fileInput.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'w-16 h-16 object-cover rounded-lg border';
                        previewDiv.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            };
        },
        preConfirm: () => {
            const photos = document.getElementById('delivery-photos').files;
            const notes = document.getElementById('delivery-notes').value;
            
            if (!photos || photos.length === 0) {
                Swal.showValidationMessage("Veuillez ajouter au moins une photo");
                return false;
            }
            
            return { photos, notes };
        }
    });
    
    if (!formData) return;
    
    Swal.fire({ title: "Envoi en cours...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        const fd = new FormData();
        fd.append("commande_id", commandeId);
        fd.append("notes_livraison", formData.notes);
        for (let i = 0; i < formData.photos.length; i++) {
            fd.append("photos", formData.photos[i]);
        }
        
        const response = await fetch(`${CONFIG.API_URL}/commandes/deliver`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: fd
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Erreur");
        }
        
        Swal.fire({ icon: "success", title: "Livré !", timer: 2000, showConfirmButton: false });
        loadCommandes();
        
    } catch (err) {
        Swal.fire({ title: "Erreur", text: err.message, icon: "error" });
    }
};
