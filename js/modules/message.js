import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI, compressImage } from "../core/utils.js";

// État local pour gérer l'onglet actif
let activeTab = 'STORY';
let currentReplyTo = null;        // ✅ NOUVEAU : stocke l'ID du message auquel on répond
let currentReplyToName = null;    // ✅ NOUVEAU : stocke le nom de l'auteur



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
 * 📥 CHARGER LE JOURNAL DE SOINS
 */
export async function loadFeed() {
    const container = document.getElementById('view-container');
    if (!container) return;

    if (!AppState.currentPatient) {
        return window.switchView('patients');
    }

    container.innerHTML = `
        <div class="animate-fadeIn pb-32">
            <!-- Header avec Retour -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('patients')" class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Suivi en Direct</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dossier Patient : #${AppState.currentPatient?.substring(0, 4) || '0000'}</p>
                </div>
            </div>

            <!-- Switcher de vues -->
            <div class="bg-slate-100/50 p-1.5 rounded-2xl flex items-center gap-1 mb-8 max-w-md mx-auto border border-slate-200/30">
                <button onclick="window.filterFeed('STORY')" id="tab-story" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
                    Journal de Vie
                </button>
                <button onclick="window.filterFeed('DOCUMENT')" id="tab-doc" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
                    Pièces Jointes
                </button>
            </div>

            <!-- Zone de saisie rapide (MODIFIÉE) -->
            <div id="input-area" class="mb-8">
                <!-- Indicateur de réponse (NOUVEAU) -->
                <div id="reply-indicator" class="hidden mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-reply-all text-amber-500 text-sm"></i>
                        <span class="text-xs font-medium text-amber-700">Réponse à <span id="replying-to-name" class="font-black"></span></span>
                    </div>
                    <button onclick="window.cancelReply()" class="text-amber-500 hover:text-amber-700">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <!-- Zone de saisie avec bouton photo -->
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center gap-3">
                        <button id="photo-btn" class="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 transition-all flex items-center justify-center">
                            <i class="fa-solid fa-camera text-base"></i>
                        </button>
                        <input id="quick-msg" class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Écrire un message à l'équipe...">
                        <button id="send-btn" class="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <i class="fa-solid fa-paper-plane text-xs"></i>
                        </button>
                    </div>
                    <input type="file" id="photo-input" accept="image/*" class="hidden">
                </div>
            </div>

            <!-- Contenu dynamique -->
            <div id="care-feed-content" class="space-y-8">
                <div class="flex justify-center py-20">
                    <div class="relative">
                        <div class="w-10 h-10 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ✅ NOUVEAU : Brancher les événements
    const photoBtn = document.getElementById('photo-btn');
    const photoInput = document.getElementById('photo-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (photoBtn && photoInput) {
        photoBtn.onclick = () => photoInput.click();
        photoInput.onchange = () => sendPhotoMessage();
    }
    
    if (sendBtn) {
        sendBtn.onclick = () => window.sendQuickMessage();
    }

    try {
        const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = data;
        renderFeed();
    } catch (err) {
        console.error("Erreur Feed:", err);
        const contentDiv = document.getElementById('care-feed-content');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="text-center py-20">
                    <i class="fa-solid fa-circle-exclamation text-rose-400 text-3xl mb-3"></i>
                    <p class="text-sm font-bold text-rose-500">Erreur de chargement</p>
                    <p class="text-[10px] text-slate-400 mt-1">${err.message}</p>
                </div>
            `;
        }
    }
}

/**
 * 🎨 RENDU FILTRÉ (MODIFIÉ pour organiser les réponses en cascade)
 */
export function renderFeed() {
    const content = document.getElementById('care-feed-content');
    const inputArea = document.getElementById('input-area');
    const btnStory = document.getElementById('tab-story');
    const btnDoc = document.getElementById('tab-doc');

    if (!content) return;

    const activeClass = "bg-white text-slate-900 shadow-sm border border-slate-200/50";
    const inactiveClass = "text-slate-400 hover:text-slate-600";

    if (btnStory) {
        btnStory.className = `flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'STORY' ? activeClass : inactiveClass}`;
    }
    if (btnDoc) {
        btnDoc.className = `flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'DOCUMENT' ? activeClass : inactiveClass}`;
    }
    if (inputArea) {
        inputArea.style.display = activeTab === 'STORY' ? 'block' : 'none';
    }

    // Filtrer les messages selon l'onglet
    let filtered = (AppState.messages || []).filter(m => {
        if (activeTab === 'DOCUMENT') return m.type_media === 'DOCUMENT';
        return m.type_media !== 'DOCUMENT';
    });
    
    // ✅ NOUVEAU : Organiser les messages en threads (messages principaux + réponses)
    if (activeTab === 'STORY') {
        // Séparer les messages principaux (sans reply_to_id) et les réponses
        const mainMessages = filtered.filter(m => !m.reply_to_id);
        const replies = filtered.filter(m => m.reply_to_id);
        
        // Créer un Map des réponses par parent
        const repliesByParent = new Map();
        replies.forEach(reply => {
            if (!repliesByParent.has(reply.reply_to_id)) {
                repliesByParent.set(reply.reply_to_id, []);
            }
            repliesByParent.get(reply.reply_to_id).push(reply);
        });
        
        // Trier les réponses par date
        for (let [key, value] of repliesByParent) {
            value.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
        
        // Générer le HTML avec les réponses imbriquées
        content.innerHTML = mainMessages.map(msg => {
            const repliesHtml = (repliesByParent.get(msg.id) || [])
                .map(reply => renderStoryCard(reply, true))
                .join('');
            return renderStoryCard(msg, false) + repliesHtml;
        }).join('');
    } else {
        // Pour l'onglet DOCUMENT, affichage simple
        content.innerHTML = filtered.map(msg => renderDocCard(msg)).join('');
    }

    if (filtered.length === 0 && activeTab === 'STORY') {
        content.innerHTML = `
            <div class="text-center py-20 opacity-50">
                <i class="fa-solid fa-feather-pointed text-4xl mb-4 text-slate-300"></i>
                <p class="font-black uppercase text-[10px] tracking-wider text-slate-400">Aucun message dans cette section</p>
            </div>`;
    }
}

/**
 * 📸 CARTE JOURNAL (Story) - MODIFIÉE pour ajouter le bouton "Répondre"
 * @param {Object} msg - Le message
 * @param {boolean} isReply - Si c'est une réponse (style indenté)
 */
function renderStoryCard(msg, isReply = false) {
    const isPhoto = msg.is_photo || msg.photo_url;
    let content = msg.content || '';
    let humeurBadge = "";

    // Utiliser photo_url si disponible
    const imageUrl = msg.photo_url || (isPhoto ? msg.content : null);
    
    // Décodage de l'humeur (inchangé)
    if (!isPhoto && content && content.includes('|')) {
        const parts = content.split('|');
        const humeur = parts[0];
        const notes = parts.slice(1).join('|');
        const emojis = {
            "Très Joyeux": "😊",
            "Calme": "😐",
            "Fatigué": "😴",
            "Triste": "😔"
        };
        humeurBadge = `
            <div class="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-amber-200 flex items-center gap-3 animate-fadeIn">
                <span class="text-lg">${emojis[humeur] || '✨'}</span>
                <div class="flex flex-col">
                    <span class="text-[8px] font-black text-amber-600 uppercase tracking-wider">Humeur du proche</span>
                    <span class="text-[10px] font-black text-slate-800 uppercase">${humeur}</span>
                </div>
            </div>`;
        content = notes;
    }

    const isAidant = msg.sender_role === 'AIDANT';
    const isFamily = msg.sender_role === 'FAMILLE';
    const isCoordinator = msg.sender_role === 'COORDINATEUR';
    
    let roleColorClass = 'text-slate-500';
    let avatarBg = 'bg-slate-100';
    let roleIcon = 'fa-user';
    let roleBadge = '';
    
    if (isAidant) {
        roleColorClass = 'text-emerald-600';
        avatarBg = 'bg-emerald-100';
        roleIcon = 'fa-user-nurse';
        roleBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase ml-2">
                        <i class="fa-solid fa-shield-check mr-1"></i> Aidant certifié
                    </span>`;
    } else if (isFamily) {
        roleColorClass = 'text-blue-600';
        avatarBg = 'bg-blue-100';
        roleIcon = 'fa-family';
        roleBadge = `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[8px] font-black uppercase ml-2">
                        <i class="fa-regular fa-heart mr-1"></i> Famille
                    </span>`;
    } else if (isCoordinator) {
        roleColorClass = 'text-purple-600';
        avatarBg = 'bg-purple-100';
        roleIcon = 'fa-user-tie';
        roleBadge = `<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[8px] font-black uppercase ml-2">
                        <i class="fa-solid fa-star mr-1"></i> Coordination
                    </span>`;
    }
    
    const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    // ✅ Style différent pour les réponses (indentation)
    const replyClass = isReply ? 'ml-6 mt-3 border-l-4 border-l-amber-200 pl-4' : '';

    return `
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-fadeIn mb-5 hover:shadow-md transition-shadow ${replyClass}" data-message-id="${msg.id}">
            <!-- Header avec photo et identité -->
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="w-12 h-12 rounded-xl overflow-hidden ${avatarBg} flex items-center justify-center">
                            ${msg.sender_photo ? 
                                `<img src="${msg.sender_photo}" class="w-full h-full object-cover">` : 
                                `<i class="fa-solid ${roleIcon} text-${isAidant ? 'emerald' : isFamily ? 'blue' : 'purple'}-500 text-xl"></i>`
                            }
                        </div>
                        ${isAidant ? `
                            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" title="Aidant vérifié"></div>
                        ` : ''}
                        ${isFamily ? `
                            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm" title="Membre de la famille"></div>
                        ` : ''}
                    </div>
                    
                    <div>
                        <div class="flex items-center flex-wrap gap-1">
                            <h4 class="font-black text-slate-800 text-sm">${escapeHtml(msg.sender_name || 'Système')}</h4>
                            ${roleBadge}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full ${isAidant ? 'bg-emerald-500' : isFamily ? 'bg-blue-500' : 'bg-purple-500'}"></span>
                            <p class="text-[9px] font-bold ${roleColorClass} uppercase tracking-wider">${msg.sender_role || 'COORDINATEUR'}</p>
                            <span class="text-[9px] text-slate-300">•</span>
                            <span class="text-[9px] text-slate-400">${dateStr} à ${timeStr}</span>
                        </div>
                    </div>
                </div>
                
                ${isAidant ? `
                    <div class="bg-emerald-50 px-2 py-1 rounded-full">
                        <span class="text-[8px] font-black text-emerald-600 uppercase tracking-wider">
                            <i class="fa-solid fa-circle-check text-[8px] mr-1"></i> Intervention certifiée
                        </span>
                    </div>
                ` : ''}
            </div>

            <!-- Contenu du message -->
            ${imageUrl ? `
                <div class="relative rounded-xl overflow-hidden shadow-lg border border-slate-100 mt-2">
                    <img src="${imageUrl}" class="w-full max-h-96 object-cover cursor-pointer" onclick="window.open('${imageUrl}')">
                    <div class="absolute top-3 right-3 bg-slate-900/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <span class="text-[8px] font-black text-white uppercase tracking-wider">Photo</span>
                    </div>
                    ${humeurBadge}
                </div>
            ` : content ? `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-600 text-sm leading-relaxed mt-2">
                    <i class="fa-solid fa-quote-left text-slate-200 text-lg mr-2 float-left"></i>
                    <span class="font-medium">${escapeHtml(content)}</span>
                </div>
            ` : ''}

            <!-- Réactions et interactions (MODIFIÉ : ajout du bouton Répondre) -->
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div class="flex gap-2">
                    <button onclick="window.sendReaction('${msg.id}', 'coeur')" 
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all active:scale-95">
                        <i class="fa-solid fa-heart text-xs"></i>
                        <span class="text-[10px] font-bold">${msg.reactions?.coeur || 0}</span>
                    </button>
                    <button onclick="window.sendReaction('${msg.id}', 'merci')" 
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-all active:scale-95">
                        <i class="fa-solid fa-hands-praying text-xs"></i>
                        <span class="text-[10px] font-bold">${msg.reactions?.merci || 0}</span>
                    </button>
                    <button onclick="window.sendReaction('${msg.id}', 'like')" 
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-200 transition-all active:scale-95">
                        <i class="fa-regular fa-thumbs-up text-xs"></i>
                        <span class="text-[10px] font-bold">${msg.reactions?.like || 0}</span>
                    </button>
                </div>
                
                <!-- ✅ NOUVEAU : Bouton Répondre -->
                <button onclick="window.replyToMessage('${msg.id}', '${escapeHtml(msg.sender_name || 'l\'utilisateur')}')" 
                        class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-amber-50 hover:text-amber-600 transition-all active:scale-95">
                    <i class="fa-solid fa-reply text-xs"></i>
                    <span class="text-[10px] font-medium">Répondre</span>
                </button>
                
                ${isAidant && msg.id ? `
                    <button onclick="window.reportIssue('${msg.id}')" 
                            class="text-[9px] text-slate-400 hover:text-amber-500 transition">
                        <i class="fa-regular fa-flag mr-1"></i> Signaler
                    </button>
                ` : ''}
            </div>
            
            ${imageUrl && isAidant ? `
                <div class="mt-3 text-right">
                    <span class="text-[8px] text-slate-400">
                        <i class="fa-regular fa-camera mr-1"></i> Photo prise par ${msg.sender_name}
                    </span>
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// ✅ NOUVELLES FONCTIONS
// ============================================

/**
 * ↩️ Répondre à un message spécifique
 */
window.replyToMessage = (messageId, senderName) => {
    currentReplyTo = messageId;
    currentReplyToName = senderName;
    
    const indicator = document.getElementById('reply-indicator');
    const replyingToName = document.getElementById('replying-to-name');
    
    if (indicator && replyingToName) {
        replyingToName.textContent = senderName;
        indicator.classList.remove('hidden');
        document.getElementById('quick-msg')?.focus();
    }
    
    UI.vibrate('light');
};

/**
 * ❌ Annuler la réponse
 */
window.cancelReply = () => {
    currentReplyTo = null;
    currentReplyToName = null;
    
    const indicator = document.getElementById('reply-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
    
    UI.vibrate('light');
};

/**
 * 📸 Envoyer une photo
 */
async function sendPhotoMessage() {
    const photoInput = document.getElementById('photo-input');
    const file = photoInput?.files?.[0];
    
    if (!file) {
        console.log("❌ Aucun fichier sélectionné");
        return;
    }
    
    console.log("📸 Fichier sélectionné:", file.name, file.size, file.type);
    
    // Vérifier la taille
    if (file.size > 5 * 1024 * 1024) {
        UI.error("Photo trop lourde (max 5MB)");
        photoInput.value = '';
        return;
    }
    
    Swal.fire({
        title: "Envoi de la photo...",
        text: "Veuillez patienter",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        // Compression si nécessaire
        let fileToSend = file;
        if (file.size > 2 * 1024 * 1024) {
            console.log("🔄 Compression de l'image...");
            fileToSend = await compressImage(file, 1024, 0.7);
            console.log("✅ Image compressée:", fileToSend.size, "bytes");
        }
        
        // ✅ CRÉATION CORRECTE DU FormData
        const formData = new FormData();
        formData.append('patient_id', AppState.currentPatient);
        formData.append('photo', fileToSend, fileToSend.name || 'photo.jpg');
        
        if (currentReplyTo) {
            formData.append('reply_to_id', currentReplyTo);
        }
        
        if (currentReplyToName) {
            formData.append('caption', `Réponse à ${currentReplyToName}`);
        }
        
        // ✅ AFFICHER LE CONTENU DU FormData POUR DEBUG
        console.log("📤 Envoi du FormData:");
        for (let pair of formData.entries()) {
            console.log("   ", pair[0], pair[1] instanceof File ? `[Fichier: ${pair[1].name}, ${pair[1].size} bytes]` : pair[1]);
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error("Token d'authentification manquant");
        }
        
        const response = await fetch(`${window.CONFIG.API_URL}/messages/send-photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // ⚠️ NE PAS mettre 'Content-Type' - le navigateur le fait automatiquement avec le boundary
            },
            body: formData
        });
        
        console.log("📥 Réponse status:", response.status);
        
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `Erreur ${response.status}`;
            } catch (e) {
                errorMessage = `Erreur serveur ${response.status}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log("✅ Réponse serveur:", result);
        
        // Réinitialiser
        photoInput.value = '';
        window.cancelReply();
        
        Swal.fire({
            icon: "success",
            title: "Photo envoyée",
            timer: 1500,
            showConfirmButton: false
        });
        
        await loadFeed();
        
    } catch (err) {
        console.error("❌ Erreur sendPhotoMessage:", err);
        Swal.close();
        UI.error(err.message || "Erreur lors de l'envoi de la photo");
        photoInput.value = '';
    }
}

// ============================================
// BRANCHEMENTS WINDOW (INCHANGÉS mais avec reply_to_id ajouté)
// ============================================

window.filterFeed = (type) => {
    UI.vibrate();
    activeTab = type;
    renderFeed();
};

window.sendQuickMessage = async () => {
    const input = document.getElementById('quick-msg');
    const content = input?.value?.trim();
    if (!content) return;

    try {
        UI.vibrate();
        
        // ✅ Ajout de reply_to_id si on répond à un message
        const body = {
            patient_id: AppState.currentPatient,
            content: content,
            is_photo: false,
            type_media: 'STORY'
        };
        
        if (currentReplyTo) {
            body.reply_to_id = currentReplyTo;
        }
        
        const res = await secureFetch('/messages/send', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        if (res.status === "success" || res.ok) {
            input.value = '';
            window.cancelReply();
            await loadFeed();
        }
    } catch (err) {
        console.error(err);
        UI.error("Erreur lors de l'envoi du message");
    }
};

window.sendReaction = async (msgId, type) => {
    try {
        UI.vibrate();
        await secureFetch('/messages/react', {
            method: 'POST',
            body: JSON.stringify({ message_id: msgId, reaction_type: type })
        });
        await loadFeed();
    } catch (err) {
        console.error(err);
        UI.error("Erreur lors de l'envoi de la réaction");
    }
};

// ✅ Exporter la fonction cancelReply pour qu'elle soit accessible
window.cancelReply = window.cancelReply || cancelReply;
