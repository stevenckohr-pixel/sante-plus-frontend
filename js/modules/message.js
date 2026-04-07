import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI, compressImage, showToast } from "../core/utils.js";

let activeTab = 'STORY';
let currentReplyTo = null;
let currentReplyContent = '';

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
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dossier Patient : #${AppState.currentPatient?.substring(0, 8) || '0000'}</p>
                </div>
            </div>

            <!-- Switcher de vues -->
            <div class="bg-slate-100/50 p-1.5 rounded-2xl flex items-center gap-1 mb-6 max-w-md mx-auto border border-slate-200/30">
                <button onclick="window.filterFeed('STORY')" id="tab-story" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
                    💬 Messages
                </button>
                <button onclick="window.filterFeed('PHOTOS')" id="tab-photos" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
                    📸 Photos
                </button>
                <button onclick="window.filterFeed('DOCUMENT')" id="tab-doc" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
                    📄 Documents
                </button>
            </div>

            <!-- Indicateur de réponse ciblée -->
            <div id="reply-indicator" class="mb-4 hidden">
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-reply-all text-emerald-500 text-sm"></i>
                        <span class="text-xs font-medium text-emerald-700">Réponse à :</span>
                        <span id="replying-to-text" class="text-xs text-slate-600 italic max-w-[200px] truncate"></span>
                    </div>
                    <button onclick="window.cancelReply()" class="text-slate-400 hover:text-slate-600">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- Zone de saisie enrichie -->
            <div id="input-area" class="mb-8">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex gap-3">
                        <button id="attach-photo-btn" class="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 transition-all">
                            <i class="fa-solid fa-camera text-lg"></i>
                        </button>
                        <input id="quick-msg" class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Écrire un message...">
                        <button id="send-msg-btn" class="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <i class="fa-solid fa-paper-plane text-sm"></i>
                        </button>
                    </div>
                    <div id="photo-preview-container" class="mt-3 hidden">
                        <div class="flex flex-wrap gap-2">
                            <div id="photo-preview-list" class="flex flex-wrap gap-2"></div>
                            <button id="clear-photos-btn" class="text-[10px] text-rose-500 font-bold">Annuler</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contenu dynamique -->
            <div id="care-feed-content" class="space-y-6">
                <div class="flex justify-center py-20">
                    <div class="relative">
                        <div class="w-10 h-10 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialiser les événements
    initMessageEvents();

    try {
        const messages = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = messages;
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
                    <button onclick="loadFeed()" class="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">Réessayer</button>
                </div>
            `;
        }
    }
}

function initMessageEvents() {
    const attachBtn = document.getElementById('attach-photo-btn');
    const sendBtn = document.getElementById('send-msg-btn');
    const msgInput = document.getElementById('quick-msg');
    const clearPhotosBtn = document.getElementById('clear-photos-btn');

    let selectedFiles = [];

    if (attachBtn) {
        attachBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                selectedFiles = [...selectedFiles, ...files];
                updatePhotoPreview(selectedFiles);
            };
            input.click();
        };
    }

    if (clearPhotosBtn) {
        clearPhotosBtn.onclick = () => {
            selectedFiles = [];
            updatePhotoPreview([]);
        };
    }

    if (sendBtn) {
        sendBtn.onclick = () => sendMessageWithPhotos(selectedFiles);
    }

    if (msgInput) {
        msgInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendMessageWithPhotos(selectedFiles);
            }
        };
    }
}

function updatePhotoPreview(files) {
    const container = document.getElementById('photo-preview-container');
    const previewList = document.getElementById('photo-preview-list');
    
    if (!container || !previewList) return;

    if (files.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    previewList.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-200';
            div.innerHTML = `
                <img src="${e.target.result}" class="w-full h-full object-cover">
                <button onclick="window.removeSelectedPhoto(${index})" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">×</button>
            `;
            previewList.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

window.removeSelectedPhoto = (index) => {
    // À implémenter via une variable globale ou closure
    console.log("Remove photo", index);
};

async function sendMessageWithPhotos(files) {
    const input = document.getElementById('quick-msg');
    const content = input?.value?.trim();
    
    if (!content && files.length === 0) return;

    Swal.fire({ title: "Envoi...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const formData = new FormData();
        formData.append('patient_id', AppState.currentPatient);
        if (content) formData.append('content', content);
        if (currentReplyTo) {
            formData.append('reply_to_id', currentReplyTo);
            console.log("📎 Réponse au message:", currentReplyTo);
        }

        for (const file of files) {
            let fileToSend = file;
            if (file.size > 2 * 1024 * 1024) {
                fileToSend = await compressImage(file, 1024, 0.7);
            }
            formData.append('photos', fileToSend);
        }

        const response = await fetch(`${CONFIG.API_URL}/messages/send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Erreur d'envoi");
        }

        input.value = '';
        document.getElementById('photo-preview-container')?.classList.add('hidden');
        cancelReply();
        await loadFeed();
        Swal.close();

    } catch (err) {
        Swal.close();
        UI.error(err.message);
    }
}

/**
 * 🎨 RENDU AVEC THREADING
 */
export function renderFeed() {
    const content = document.getElementById('care-feed-content');
    const inputArea = document.getElementById('input-area');
    const btnStory = document.getElementById('tab-story');
    const btnPhotos = document.getElementById('tab-photos');
    const btnDoc = document.getElementById('tab-doc');

    if (!content) return;

    const activeClass = "bg-white text-slate-900 shadow-sm border border-slate-200/50";
    const inactiveClass = "text-slate-400 hover:text-slate-600";

    if (btnStory) btnStory.className = `flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'STORY' ? activeClass : inactiveClass}`;
    if (btnPhotos) btnPhotos.className = `flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'PHOTOS' ? activeClass : inactiveClass}`;
    if (btnDoc) btnDoc.className = `flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'DOCUMENT' ? activeClass : inactiveClass}`;
    
    if (inputArea) inputArea.style.display = activeTab === 'STORY' ? 'block' : 'none';

    let filtered = AppState.messages || [];
    
    if (activeTab === 'PHOTOS') {
        filtered = filtered.filter(m => m.is_photo === true);
    } else if (activeTab === 'DOCUMENT') {
        filtered = filtered.filter(m => m.type_media === 'DOCUMENT');
    }

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="text-center py-20 opacity-50">
                <i class="fa-solid ${activeTab === 'STORY' ? 'fa-comments' : activeTab === 'PHOTOS' ? 'fa-images' : 'fa-folder-open'} text-4xl mb-4 text-slate-300"></i>
                <p class="font-black uppercase text-[10px] tracking-wider text-slate-400">
                    ${activeTab === 'STORY' ? 'Aucun message' : activeTab === 'PHOTOS' ? 'Aucune photo' : 'Aucun document'}
                </p>
            </div>`;
        return;
    }

    content.innerHTML = filtered.map(msg => renderMessageThread(msg, 0)).join('');
}

function renderMessageThread(msg, depth) {
    const isReply = depth > 0;
    const marginClass = isReply ? 'ml-8 border-l-2 border-emerald-200 pl-4' : '';
    
    return `
        <div class="message-thread ${marginClass}" data-message-id="${msg.id}">
            ${renderMessageCard(msg, isReply)}
            ${msg.replies && msg.replies.length > 0 ? 
                `<div class="replies-container mt-2">
                    ${msg.replies.map(reply => renderMessageThread(reply, depth + 1)).join('')}
                </div>` : ''
            }
        </div>
    `;
}

function renderMessageCard(msg, isReply) {
    const isPhoto = msg.is_photo === true;
    const hasPhotos = msg.photos && msg.photos.length > 0;
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
        roleBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase ml-2">Aidant</span>`;
    } else if (isFamily) {
        roleColorClass = 'text-blue-600';
        avatarBg = 'bg-blue-100';
        roleIcon = 'fa-users';
        roleBadge = `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[8px] font-black uppercase ml-2">Famille</span>`;
    } else if (isCoordinator) {
        roleColorClass = 'text-purple-600';
        avatarBg = 'bg-purple-100';
        roleIcon = 'fa-user-tie';
        roleBadge = `<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[8px] font-black uppercase ml-2">Coordination</span>`;
    }

    const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    // Galerie photos
    let photosHtml = '';
    if (hasPhotos && msg.photos.length > 0) {
        photosHtml = `
            <div class="flex flex-wrap gap-2 mt-3">
                ${msg.photos.map(photo => `
                    <div class="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:scale-105 transition-transform" onclick="window.openImageModal('${photo}', '📸 Photo')">
                        <img src="${photo}" class="w-full h-full object-cover">
                    </div>
                `).join('')}
            </div>
        `;
    } else if (isPhoto && msg.content) {
        photosHtml = `
            <div class="relative rounded-xl overflow-hidden shadow-lg border border-slate-100 mt-2">
                <img src="${msg.content}" class="w-full max-h-96 object-cover cursor-pointer" onclick="window.open('${msg.content}')">
            </div>
        `;
    }

    // Badge de réponse
    let replyBadge = '';
    if (msg.reply_to_id && !isReply) {
        replyBadge = `
            <div class="text-[9px] text-slate-400 mb-2 flex items-center gap-1">
                <i class="fa-solid fa-reply fa-flip-horizontal text-[8px]"></i>
                <span>Réponse à un message</span>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow mb-3">
            ${replyBadge}
            
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${avatarBg} flex items-center justify-center">
                        ${msg.sender_photo ? 
                            `<img src="${msg.sender_photo}" class="w-full h-full object-cover rounded-xl">` : 
                            `<i class="fa-solid ${roleIcon} text-lg ${roleColorClass}"></i>`
                        }
                    </div>
                    <div>
                        <div class="flex items-center flex-wrap gap-1">
                            <h4 class="font-black text-slate-800 text-sm">${escapeHtml(msg.sender_name || 'Système')}</h4>
                            ${roleBadge}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[9px] font-bold ${roleColorClass} uppercase tracking-wider">${msg.sender_role || 'COORDINATEUR'}</span>
                            <span class="text-[9px] text-slate-400">${dateStr} à ${timeStr}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contenu du message -->
            ${!isPhoto && msg.content ? `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-600 text-sm leading-relaxed">
                    <span class="font-medium">${escapeHtml(msg.content)}</span>
                </div>
            ` : ''}
            
            ${photosHtml}

            <!-- Boutons d'action -->
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <div class="flex gap-2">
                    <button onclick="window.replyToMessage('${msg.id}', '${escapeHtml(msg.content?.substring(0, 50) || 'Message')}')" 
                            class="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95">
                        <i class="fa-solid fa-reply text-xs"></i>
                        <span class="text-[10px] font-bold">Répondre</span>
                    </button>
                    <button onclick="window.sendReaction('${msg.id}', 'like')" 
                            class="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95">
                        <i class="fa-regular fa-thumbs-up text-xs"></i>
                        <span class="text-[10px] font-bold">${msg.reactions?.like || 0}</span>
                    </button>
                    <button onclick="window.sendReaction('${msg.id}', 'coeur')" 
                            class="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95">
                        <i class="fa-regular fa-heart text-xs"></i>
                        <span class="text-[10px] font-bold">${msg.reactions?.coeur || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.replyToMessage = (messageId, messageText) => {
    currentReplyTo = messageId;
    currentReplyContent = messageText;
    
    const indicator = document.getElementById('reply-indicator');
    const replyingToText = document.getElementById('replying-to-text');
    
    if (indicator && replyingToText) {
        replyingToText.innerText = messageText.substring(0, 60) + (messageText.length > 60 ? '...' : '');
        indicator.classList.remove('hidden');
    }
    
    const input = document.getElementById('quick-msg');
    if (input) {
        input.focus();
        input.placeholder = `Répondre à : "${messageText.substring(0, 40)}..."`;
    }
    
    UI.vibrate('light');
};

window.cancelReply = () => {
    currentReplyTo = null;
    currentReplyContent = '';
    
    const indicator = document.getElementById('reply-indicator');
    if (indicator) indicator.classList.add('hidden');
    
    const input = document.getElementById('quick-msg');
    if (input) input.placeholder = 'Écrire un message...';
};

window.filterFeed = (type) => {
    UI.vibrate();
    activeTab = type;
    renderFeed();
};

window.sendReaction = async (msgId, type) => {
    try {
        UI.vibrate('light');
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

window.openImageModal = (imageUrl, title) => {
    Swal.fire({
        title: title,
        imageUrl: imageUrl,
        imageAlt: 'Photo',
        imageWidth: '90%',
        imageHeight: 'auto',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl bg-black/95', title: 'text-white text-sm' }
    });
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
