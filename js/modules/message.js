import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI, compressImage } from "../core/utils.js";
import { syncService } from "../core/syncService.js";

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let unreadMessagesCount = 0;
let isUserAtBottom = true;
let newMessageBadge = null;
let readSubscribed = false;
let activeTab = 'STORY';
let currentReplyTo = null;
let currentReplyToName = null;
let currentEmojiMessageId = null;
let emojiPickerVisible = false;

if (!AppState.unreadByPatient) {
    AppState.unreadByPatient = {};
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFC')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function playNotificationBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.08;
        oscillator.type = 'sine';
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
        setTimeout(() => audioContext.close(), 300);
    } catch(e) {}
}

function scrollToBottom() {
    setTimeout(() => {
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.scrollTo({ top: mainContent.scrollHeight, behavior: 'smooth' });
        }
    }, 100);
}

function cleanupRealtime() {
    if (window.Realtime) {
        window.Realtime.unsubscribe();
        console.log("🧹 [Realtime] Nettoyé");
    }
}

// ============================================================
// GESTION DES FICHIERS (IMAGES & DOCUMENTS)
// ============================================================

function getFileInfo(url, filename) {
    const extension = (filename || url).split('.').pop()?.toLowerCase();
    const fileTypes = {
        pdf: { icon: 'fa-file-pdf', color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' },
        doc: { icon: 'fa-file-word', color: 'text-blue-500', bg: 'bg-blue-50', label: 'DOC' },
        docx: { icon: 'fa-file-word', color: 'text-blue-500', bg: 'bg-blue-50', label: 'DOCX' },
        jpg: { icon: 'fa-file-image', color: 'text-green-500', bg: 'bg-green-50', label: 'IMAGE' },
        jpeg: { icon: 'fa-file-image', color: 'text-green-500', bg: 'bg-green-50', label: 'IMAGE' },
        png: { icon: 'fa-file-image', color: 'text-green-500', bg: 'bg-green-50', label: 'IMAGE' },
        gif: { icon: 'fa-file-image', color: 'text-green-500', bg: 'bg-green-50', label: 'IMAGE' },
        webp: { icon: 'fa-file-image', color: 'text-green-500', bg: 'bg-green-50', label: 'IMAGE' },
        mp4: { icon: 'fa-file-video', color: 'text-purple-500', bg: 'bg-purple-50', label: 'VIDEO' },
        mp3: { icon: 'fa-file-audio', color: 'text-amber-500', bg: 'bg-amber-50', label: 'AUDIO' }
    };
    return fileTypes[extension] || { icon: 'fa-file', color: 'text-slate-500', bg: 'bg-slate-50', label: 'FICHIER' };
}

function renderDocumentCard(url, filename) {
    const fileInfo = getFileInfo(url, filename);
    const displayName = filename || url.split('/').pop() || 'Document';
    const shortName = displayName.length > 30 ? displayName.substring(0, 27) + '...' : displayName;
    return `
        <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white shadow-sm active:scale-98 transition-all cursor-pointer" 
             onclick="window.open('${url}', '_blank')">
            <div class="w-10 h-10 rounded-xl ${fileInfo.bg} flex items-center justify-center">
                <i class="fa-solid ${fileInfo.icon} ${fileInfo.color} text-lg"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-800 truncate">${escapeHtml(shortName)}</p>
                <p class="text-[9px] text-slate-400">${fileInfo.label} • Cliquer pour ouvrir</p>
            </div>
            <i class="fa-solid fa-download text-slate-300 text-xs"></i>
        </div>
    `;
}

function isImageUrl(url) {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

// ============================================================
// RENDU DES CARTES
// ============================================================

function renderDocCard(msg) {
    let iconClass = 'fa-file-pdf';
    let iconColor = 'text-red-500';
    let bgColor = 'bg-red-50';
    let fileType = 'PDF';
    
    const filename = msg.titre_media || msg.content?.split('/').pop() || 'Document';
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
        iconClass = 'fa-file-pdf';
        iconColor = 'text-red-500';
        bgColor = 'bg-red-50';
        fileType = 'PDF';
    } else if (extension === 'doc' || extension === 'docx') {
        iconClass = 'fa-file-word';
        iconColor = 'text-blue-500';
        bgColor = 'bg-blue-50';
        fileType = 'DOC';
    } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'gif' || extension === 'webp') {
        iconClass = 'fa-file-image';
        iconColor = 'text-green-500';
        bgColor = 'bg-green-50';
        fileType = 'IMAGE';
    } else {
        iconClass = 'fa-file';
        iconColor = 'text-slate-500';
        bgColor = 'bg-slate-50';
        fileType = 'FICHIER';
    }
    
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
    const previewHtml = isImage ? `
        <div class="mt-3">
            <img src="${msg.content}" class="w-full max-h-48 object-cover rounded-xl cursor-pointer border border-slate-200" onclick="window.open('${msg.content}')">
        </div>
    ` : '';
    
    return `
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 mb-3 document-card">
            <div class="p-4">
                <div class="flex items-start gap-3">
                    <div class="w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0">
                        <i class="fa-solid ${iconClass} ${iconColor} text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center flex-wrap gap-2 mb-1">
                            <span class="text-[9px] font-black px-2 py-0.5 rounded-full ${bgColor} ${iconColor} uppercase">${fileType}</span>
                            <span class="text-[9px] text-slate-400">${UI.formatDate(msg.created_at)}</span>
                        </div>
                        <h4 class="font-bold text-slate-800 text-sm truncate" title="${escapeHtml(filename)}">${escapeHtml(filename.length > 40 ? filename.substring(0, 40) + '...' : filename)}</h4>
                        <p class="text-[10px] text-slate-400 mt-1">Envoyé par ${escapeHtml(msg.sender_name || 'Système')}</p>
                    </div>
                    <button onclick="window.open('${msg.content}')" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all active:scale-95 shrink-0" title="Télécharger">
                        <i class="fa-solid fa-download text-sm"></i>
                    </button>
                </div>
                ${previewHtml}
            </div>
        </div>
    `;
}

function renderStoryCard(msg, isReply = false) {
    const isPhoto = msg.is_photo || msg.photo_url;
    let content = msg.content || '';
    let humeurBadge = "";
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeLightBg = isMaman ? 'bg-pink-50' : 'bg-emerald-50';

    const fileUrl = msg.photo_url || (isPhoto ? msg.content : null);
    const isImage = fileUrl && isImageUrl(fileUrl);
    const currentUserId = localStorage.getItem("user_id");
    const isOwnMessage = String(msg.sender_id) === String(currentUserId);
    
    if (!isPhoto && content && content.includes('|')) {
        const parts = content.split('|');
        const humeur = parts[0];
        const notes = parts.slice(1).join('|');
        const emojis = { "Très Joyeux": "😊", "Calme": "😐", "Fatigué": "😴", "Triste": "😔" };
        humeurBadge = `<span class="text-xs mr-1">${emojis[humeur] || '✨'}</span>`;
        content = notes;
    }
    
    const rawDate = msg.created_at || msg.createdAt || new Date().toISOString();
    const safeDate = new Date(rawDate);
    const timeStr = isNaN(safeDate) ? "Maintenant" : safeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let parentMessageHtml = '';
    if (msg.reply_to_id && !isOwnMessage) {
        const parentMsg = AppState.messages?.find(m => m.id === msg.reply_to_id);
        if (parentMsg) {
            const parentContent = parentMsg.is_photo ? '📷 Photo' : (parentMsg.content?.substring(0, 50) + (parentMsg.content?.length > 50 ? '...' : ''));
            parentMessageHtml = `
                <div class="text-[9px] text-amber-600 mb-1 flex items-center gap-1">
                    <i class="fa-solid fa-reply-all text-[8px]"></i>
                    <span class="truncate">↳ ${escapeHtml(parentMsg.sender_name || 'message')}: ${escapeHtml(parentContent)}</span>
                </div>
            `;
        }
    }

    const isTemp = msg.is_temp === true;
    const tempClass = isTemp ? 'opacity-70' : '';

    if (isOwnMessage) {
        let statusIcon = '';
        if (!isTemp) {
            statusIcon = msg.read ? '<i class="fa-solid fa-check-double text-[10px] text-[#53bdeb]"></i>' : '<i class="fa-solid fa-check-double text-[10px] text-[#8696a0]"></i>';
        } else {
            statusIcon = '<i class="fa-solid fa-spinner fa-spin text-[10px] text-[#8696a0]"></i>';
        }
        
        return `
            <div class="flex justify-end mb-2 ${isReply ? 'ml-8' : ''} ${tempClass} animate-fadeIn" data-message-id="${msg.id}">
                <div class="max-w-[75%] sm:max-w-[65%]">
                    ${fileUrl ? (isImage ? `
                        <img src="${fileUrl}" class="rounded-2xl max-w-[200px] max-h-48 object-cover cursor-pointer mb-1" 
                             onclick="window.open('${fileUrl}')" loading="lazy"
                             onerror="this.onerror=null; this.src='https://placehold.co/400x300?text=Image+non+chargée'">
                    ` : renderDocumentCard(fileUrl, msg.titre_media)) : ''}
                    ${content ? `
                        <div class="chat-message-sent" style="background: var(--role-primary); border-bottom-right-radius: 4px;">
                            <p class="text-white text-sm break-words">${escapeHtml(content)} ${humeurBadge}</p>
                        </div>
                    ` : ''}
                    <div class="flex justify-end items-center gap-1 mt-0.5">
                        <span class="text-[9px] text-slate-400">${timeStr}</span>
                        <span class="message-status">${statusIcon}</span>
                    </div>
                </div>
            </div>
        `;
    }

    const isAidant = msg.sender_role === 'AIDANT';
    const isFamily = msg.sender_role === 'FAMILLE';
    const isCoordinator = msg.sender_role === 'COORDINATEUR';
    
    let avatarBg = 'bg-slate-100';
    let roleIcon = 'fa-user';
    let roleColor = 'text-slate-500';
    let roleInitial = '';
    let roleBadge = '';
    
    if (isAidant) {
        avatarBg = themeLightBg;
        roleIcon = 'fa-user-nurse';
        roleColor = isMaman ? 'text-pink-600' : 'text-emerald-600';
        roleInitial = msg.sender_name?.charAt(0).toUpperCase() || 'A';
        roleBadge = `<span class="text-[8px] font-medium ${roleColor} ml-1"><i class="fa-solid fa-shield-check"></i></span>`;
    } else if (isFamily) {
        avatarBg = 'bg-blue-100';
        roleIcon = 'fa-user';
        roleColor = 'text-blue-600';
        roleInitial = msg.sender_name?.charAt(0).toUpperCase() || 'F';
    } else if (isCoordinator) {
        avatarBg = 'bg-purple-100';
        roleIcon = 'fa-user-tie';
        roleColor = 'text-purple-600';
        roleInitial = msg.sender_name?.charAt(0).toUpperCase() || 'C';
    }

    return `
        <div class="flex items-start gap-2 mb-2 ${isReply ? 'ml-8' : ''} ${tempClass} animate-fadeIn" data-message-id="${msg.id}">
            <div class="w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center flex-shrink-0">
                ${msg.sender_photo ? `<img src="${msg.sender_photo}" class="w-full h-full rounded-full object-cover">` : `<span class="text-xs font-bold ${roleColor}">${roleInitial}</span>`}
            </div>
            <div class="max-w-[75%] sm:max-w-[65%]">
                <div class="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span class="font-semibold text-slate-700 text-xs">${escapeHtml(msg.sender_name || 'Inconnu')}</span>
                    ${roleBadge}
                </div>
                ${parentMessageHtml}
                ${fileUrl ? (isImage ? `
                    <div class="relative rounded-xl overflow-hidden mb-1 max-w-[200px]">
                        <img src="${fileUrl}" class="rounded-xl max-h-48 object-cover cursor-pointer w-full" 
                             onclick="window.open('${fileUrl}')" loading="lazy"
                             onerror="this.onerror=null; this.src='https://placehold.co/400x300?text=Image+non+chargée'">
                        <div class="absolute bottom-2 right-2 bg-black/50 backdrop-blur px-1.5 py-0.5 rounded-lg">
                            <i class="fa-regular fa-image text-white text-[8px]"></i>
                        </div>
                    </div>
                ` : renderDocumentCard(fileUrl, msg.titre_media)) : ''}
                ${content ? `
                    <div class="chat-message-received" style="background: #F1F5F9; border-bottom-left-radius: 4px;">
                        <p class="text-slate-700 text-sm break-words">${escapeHtml(content)} ${humeurBadge}</p>
                    </div>
                ` : ''}
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[9px] text-slate-400">${timeStr}</span>
                    <button onclick="window.replyToMessage('${msg.id}', '${escapeHtml(msg.sender_name || "l'utilisateur")}')" class="text-[9px] text-slate-400 hover:text-amber-500 transition">
                        <i class="fa-solid fa-reply text-[8px]"></i>
                    </button>
                    <button onclick="window.showEmojiPickerForMessage('${msg.id}', this)" class="text-[9px] text-slate-400 hover:text-amber-500 transition">
                        <i class="fa-regular fa-face-smile"></i>
                    </button>
                    ${isAidant && msg.id && !msg.is_temp ? `
                        <button onclick="window.reportIssue('${msg.id}')" class="text-[9px] text-slate-400 hover:text-rose-500 transition">
                            <i class="fa-regular fa-flag"></i>
                        </button>
                    ` : ''}
                </div>
                ${Object.keys(msg.reactions || {}).length > 0 ? `
                    <div class="flex gap-1 mt-1">
                        ${Object.entries(msg.reactions || {}).map(([emoji, count]) => `
                            <button onclick="window.sendReaction('${msg.id}', '${emoji}')" class="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs transition">
                                <span class="text-sm">${emoji}</span>
                                <span class="text-[9px] font-medium text-slate-500">${count}</span>
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
                ${fileUrl && isImage && isAidant && !msg.is_temp ? `
                    <div class="mt-0.5">
                        <span class="text-[7px] text-slate-400"><i class="fa-regular fa-camera"></i> Photo</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderFeed() {
    const content = document.getElementById('care-feed-content');
    const inputArea = document.getElementById('input-area');
    const btnStory = document.getElementById('tab-story');
    const btnDoc = document.getElementById('tab-doc');

    if (!content) return;
    content.classList.add('updating');

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

    let filtered = (AppState.messages || []).filter(m => {
        if (activeTab === 'DOCUMENT') return m.type_media === 'DOCUMENT';
        return m.type_media !== 'DOCUMENT';
    });
    
    if (activeTab === 'STORY') {
        const sortedMessages = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        content.innerHTML = sortedMessages.map(msg => renderStoryCard(msg, false)).join('');
    } else {
        content.innerHTML = filtered.map(msg => renderDocCard(msg)).join('');
    }

    if (filtered.length === 0 && activeTab === 'STORY') {
        content.innerHTML = `
            <div class="text-center py-20 opacity-50">
                <i class="fa-solid fa-feather-pointed text-4xl mb-4 text-slate-300"></i>
                <p class="font-black uppercase text-[10px] tracking-wider text-slate-400">Aucun message dans cette section</p>
            </div>`;
    }

    setTimeout(() => {
        content.classList.remove('updating');
    }, 50);
}

// ============================================================
// RÉPONSES AUX MESSAGES
// ============================================================

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

window.cancelReply = () => {
    currentReplyTo = null;
    currentReplyToName = null;
    
    const indicator = document.getElementById('reply-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
    
    UI.vibrate('light');
};

// ============================================================
// ENVOI DE PHOTO
// ============================================================

async function sendPhotoMessage() {
    const photoInput = document.getElementById('photo-input');
    const file = photoInput?.files?.[0];
    
    if (!file) {
        console.log("❌ Aucun fichier sélectionné");
        return;
    }
    
    console.log("📸 Fichier sélectionné:", file.name, file.size, file.type);
    
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
        let fileToSend = file;
        if (file.size > 2 * 1024 * 1024) {
            console.log("🔄 Compression de l'image...");
            fileToSend = await compressImage(file, 1024, 0.7);
            console.log("✅ Image compressée:", fileToSend.size, "bytes");
        }
        
        const formData = new FormData();
        formData.append('patient_id', AppState.currentPatient);
        formData.append('photo', fileToSend, fileToSend.name || 'photo.jpg');
        
        if (currentReplyTo) {
            formData.append('reply_to_id', currentReplyTo);
        }
        
        if (currentReplyToName) {
            formData.append('caption', "Réponse à " + currentReplyToName);
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error("Token d'authentification manquant");
        }
        
        const response = await fetch(window.CONFIG.API_URL + "/messages/send-photo", {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erreur " + response.status);
        }
        
        photoInput.value = '';
        window.cancelReply();
        
        Swal.fire({ icon: "success", title: "Photo envoyée", timer: 1500, showConfirmButton: false });
        await loadFeed();
        
    } catch (err) {
        console.error("❌ Erreur sendPhotoMessage:", err);
        Swal.close();
        UI.error(err.message || "Erreur lors de l'envoi de la photo");
        photoInput.value = '';
    }
}

// ============================================================
// ENVOI DE DOCUMENT
// ============================================================

async function sendDocumentMessage() {
    const docInput = document.getElementById('document-input');
    const file = docInput?.files?.[0];
    
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        UI.error("Document trop lourd (max 10MB)");
        docInput.value = '';
        return;
    }
    
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        UI.error("Format non supporté. Utilisez PDF, DOC ou image");
        docInput.value = '';
        return;
    }
    
    Swal.fire({
        title: "Envoi du document...",
        text: "Veuillez patienter",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const formData = new FormData();
        formData.append('patient_id', AppState.currentPatient);
        formData.append('document', file);
        formData.append('type_media', 'DOCUMENT');
        
        if (currentReplyTo) {
            formData.append('reply_to_id', currentReplyTo);
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch(window.CONFIG.API_URL + "/messages/send-document", {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Erreur d'envoi");
        }
        
        docInput.value = '';
        window.cancelReply();
        
        Swal.fire({ icon: "success", title: "Document envoyé", timer: 1500, showConfirmButton: false });
        await loadFeed();
        
    } catch (err) {
        console.error("❌ Erreur:", err);
        Swal.close();
        UI.error(err.message);
        docInput.value = '';
    }
}

// ============================================================
// AFFICHAGE DES RÉPONSES (THREADS)
// ============================================================

window.showAllReplies = (parentMessageId) => {
    const container = document.querySelector(`.replies-container[data-parent="${parentMessageId}"]`);
    if (!container) return;
    
    const allReplies = (AppState.messages || [])
        .filter(m => m.reply_to_id === parentMessageId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    if (allReplies.length === 0) return;
    
    const allRepliesHtml = allReplies.map(reply => renderStoryCard(reply, true)).join('');
    container.innerHTML = allRepliesHtml + `
        <button onclick="window.collapseReplies('${parentMessageId}', ${allReplies.length})" 
                class="ml-8 mt-2 text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-all flex items-center gap-1">
            <i class="fa-solid fa-chevron-up text-[8px]"></i>
            Réduire (${allReplies.length} réponse${allReplies.length > 1 ? 's' : ''})
        </button>
    `;
    UI.vibrate('light');
};

window.collapseReplies = (parentMessageId, totalCount) => {
    const container = document.querySelector(`.replies-container[data-parent="${parentMessageId}"]`);
    if (!container) return;
    
    const allReplies = (AppState.messages || [])
        .filter(m => m.reply_to_id === parentMessageId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    const visibleReplies = allReplies.slice(0, 3);
    const hasMore = allReplies.length > 3;
    
    const repliesHtml = visibleReplies.map(reply => renderStoryCard(reply, true)).join('');
    const moreButton = hasMore ? `
        <button onclick="window.showAllReplies('${parentMessageId}')" 
                class="ml-8 mt-2 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-all flex items-center gap-1">
            <i class="fa-solid fa-chevron-down text-[8px]"></i>
            Voir les ${allReplies.length - 3} autre${allReplies.length - 3 > 1 ? 's' : ''} réponse${allReplies.length - 3 > 1 ? 's' : ''}
        </button>
    ` : '';
    
    container.innerHTML = repliesHtml + moreButton;
    UI.vibrate('light');
};

// ============================================================
// FILTRAGE DU FEED
// ============================================================

window.filterFeed = (type) => {
    UI.vibrate();
    activeTab = type;
    
    if (type !== 'STORY') {
        cleanupRealtime();
    } else {
        if (AppState.currentPatient) {
            initRealtimeForCurrentPatient();
        }
    }
    
    renderFeed();
};

// ============================================================
// ENVOI DE MESSAGE RAPIDE (AVEC OPTIMISTIC UI)
// ============================================================

window.sendQuickMessage = async () => {
    const input = document.getElementById('quick-msg');
    const content = input?.value?.trim();
    if (!content) return;

    try {
        UI.vibrate();
        
        const tempId = 'temp_' + Date.now();
        const currentUserId = localStorage.getItem("user_id");
        const currentUserName = localStorage.getItem("user_name");
        
        const tempMessage = {
            id: tempId,
            patient_id: AppState.currentPatient,
            sender_id: currentUserId,
            sender_name: currentUserName,
            sender_role: localStorage.getItem("user_role"),
            content: content,
            is_photo: false,
            type_media: 'STORY',
            created_at: new Date().toISOString(),
            reactions: {},
            is_temp: true
        };
        
        AppState.messages.push(tempMessage);
        
        if (activeTab === 'STORY') {
            const container = document.getElementById('care-feed-content');
            const tempHtml = renderStoryCard(tempMessage, false);
            container.insertAdjacentHTML('beforeend', tempHtml);
            scrollToBottom();
        }
        
        const tempMessageEl = document.querySelector('[data-message-id="' + tempId + '"]');
        if (tempMessageEl) {
            tempMessageEl.classList.add('opacity-50');
            const sendingIndicator = document.createElement('div');
            sendingIndicator.className = 'sending-indicator text-[8px] text-slate-400 mt-1';
            sendingIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi...';
            tempMessageEl.querySelector('.flex-1')?.appendChild(sendingIndicator);
        }
        
        input.value = '';
        window.cancelReply();
        
        const body = {
            patient_id: AppState.currentPatient,
            content: content,
            is_photo: false,
            type_media: 'STORY'
        };
        
        if (currentReplyTo) {
            body.reply_to_id = currentReplyTo;
        }
        
        const result = await secureFetch('/messages/send', { method: 'POST', body: JSON.stringify(body) });
        
        if (tempMessageEl) {
            tempMessageEl.classList.remove('opacity-50');
            const indicator = tempMessageEl.querySelector('.sending-indicator');
            if (indicator) indicator.remove();
        }
        
        if (result && result.id) {
            const index = AppState.messages.findIndex(m => m.id === tempId);
            if (index !== -1) {
                AppState.messages[index].id = result.id;
                AppState.messages[index].is_temp = false;
                const realEl = document.querySelector('[data-message-id="' + tempId + '"]');
                if (realEl) realEl.setAttribute('data-message-id', result.id);
            }
        }
        
        if (localStorage.getItem("user_is_maman") === "true") {
            checkForAlerts(content);
        }
        
        initRealtimeForCurrentPatient();
        
    } catch (err) {
        console.error(err);
        UI.error("Erreur lors de l'envoi du message");
    }
};

// ============================================================
// RÉACTIONS AUX MESSAGES
// ============================================================

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

// ============================================================
// GESTION DES MESSAGES LUS
// ============================================================

function updateSeenStatus(data) {
    const messageAge = Date.now() - new Date(data.created_at).getTime();
    if (messageAge < 2000) {
        console.log("👁️ Message trop récent, on attend avant de marquer comme lu");
        return;
    }
    
    if (!data.read) return;
    const currentUserId = localStorage.getItem("user_id");
    if (!currentUserId) return;
    if (data.sender_id === currentUserId) return;
    
    const messageEl = document.querySelector(`[data-message-id="${data.id}"]`);
    if (!messageEl) return;
    if (messageEl.querySelector('.seen-status')) return;
    
    const container = messageEl.querySelector('.message-status');
    if (!container) return;
    
    const status = document.createElement('span');
    status.className = "seen-status text-[8px] text-blue-500 ml-2";
    status.textContent = "✔✔ Vu";
    status.style.opacity = "0";
    status.style.transition = "opacity 0.3s ease";
    container.appendChild(status);
    setTimeout(() => { status.style.opacity = "1"; }, 10);
}

if (!readSubscribed) {
    readSubscribed = true;
    window.Realtime.subscribeToRead((data) => {
        console.log("👁️ Messages lus (Realtime):", data);
        updateSeenStatus(data);
    });
}

// ============================================================
// EMOJI PICKER
// ============================================================

function showEmojiPicker(messageId, buttonElement) {
    const oldPicker = document.getElementById('emoji-picker-container');
    if (oldPicker) oldPicker.remove();
    
    currentEmojiMessageId = messageId;
    const emojis = ['😊', '❤️', '👍', '😂', '😢', '🎉', '😍', '🔥', '👏', '🙏'];
    const panel = document.createElement('div');
    panel.id = 'emoji-picker-container';
    panel.style.cssText = 'position: fixed; background: white; border-radius: 16px; padding: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); z-index: 99999; display: flex; gap: 8px; flex-wrap: wrap; max-width: 280px; border: 1px solid #ddd;';
    
    const rect = buttonElement.getBoundingClientRect();
    panel.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    panel.style.left = rect.left + 'px';
    
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.style.cssText = 'width: 44px; height: 44px; font-size: 24px; border: none; background: #f1f5f9; border-radius: 12px; cursor: pointer;';
        btn.onclick = () => {
            sendEmojiReaction(messageId, emoji);
            panel.remove();
        };
        panel.appendChild(btn);
    });
    document.body.appendChild(panel);
}

document.addEventListener('click', function(e) {
    const panel = document.getElementById('emoji-picker-container');
    if (panel && !panel.contains(e.target) && !e.target.closest('[onclick*="showEmojiPicker"]')) {
        panel.remove();
    }
});

function closeEmojiPicker() {
    const existingPicker = document.getElementById('emoji-picker-container');
    if (existingPicker) existingPicker.remove();
    currentEmojiMessageId = null;
    emojiPickerVisible = false;
}

async function sendEmojiReaction(messageId, emoji) {
    try {
        UI.vibrate('light');
        await secureFetch('/messages/react', {
            method: 'POST',
            body: JSON.stringify({ message_id: messageId, reaction_type: emoji })
        });
        await loadFeed();
    } catch (err) {
        console.error("Erreur envoi réaction:", err);
        UI.error("Impossible d'ajouter la réaction");
    }
}

window.showEmojiPickerForMessage = (messageId, buttonElement) => {
    showEmojiPicker(messageId, buttonElement);
};

// ============================================================
// AJOUT DE MESSAGES AU FEED SANS RE-RENDU COMPLET
// ============================================================

window.appendMessagesToFeed = (newMessages) => {
    const container = document.getElementById('care-feed-content');
    if (!container) return;
    
    const mainContent = document.querySelector('main');
    const wasAtBottom = mainContent ? mainContent.scrollHeight - mainContent.scrollTop <= mainContent.clientHeight + 100 : false;
    
    const newMessagesHtml = newMessages.map(msg => {
        if (activeTab === 'DOCUMENT') return renderDocCard(msg);
        return renderStoryCard(msg, false);
    }).join('');
    
    container.insertAdjacentHTML('beforeend', newMessagesHtml);
    if (wasAtBottom) scrollToBottom();
    playNotificationBeep();
    console.log(`✅ ${newMessages.length} nouveau(x) message(s) ajouté(s) sans flash`);
};

// ============================================================
// BADGE NOUVEAU MESSAGE
// ============================================================

function showNewMessageBadge() {
    const currentView = AppState?.currentView;
    if (currentView !== 'feed') {
        console.log("📌 Pas dans le feed, badge ignoré");
        return;
    }
    
    if (!newMessageBadge) {
        newMessageBadge = document.createElement('div');
        newMessageBadge.id = 'new-message-badge';
        newMessageBadge.innerHTML = '<div class="bg-emerald-500 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all"><i class="fa-solid fa-message text-xs"></i><span class="text-xs font-black">Nouveau message</span><i class="fa-solid fa-arrow-down text-xs"></i></div>';
        newMessageBadge.style.cssText = 'position: fixed; bottom: 80px; right: 20px; z-index: 1000; transform: translateY(100px); transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);';
        newMessageBadge.onclick = () => { scrollToBottom(); hideNewMessageBadge(); };
        document.body.appendChild(newMessageBadge);
    }
    setTimeout(() => { if (newMessageBadge) newMessageBadge.style.transform = 'translateY(0)'; }, 100);
}

function hideNewMessageBadge() {
    if (newMessageBadge) newMessageBadge.style.transform = 'translateY(100px)';
}

// ============================================================
// DÉTECTION DE SCROLL
// ============================================================

function initScrollDetection() {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;
    mainContent.addEventListener('scroll', () => {
        const isBottom = mainContent.scrollHeight - mainContent.scrollTop <= mainContent.clientHeight + 50;
        isUserAtBottom = isBottom;
        if (isBottom) {
            hideNewMessageBadge();
            unreadMessagesCount = 0;
        }
    });
}

// ============================================================
// BADGES PATIENTS
// ============================================================

function updatePatientBadges() {
    console.log("🔴 [BADGE] Mise à jour des badges patients, unreadByPatient:", AppState.unreadByPatient);
    document.querySelectorAll(".patient-item").forEach(el => {
        const patientId = el.dataset.patientId;
        const badge = el.querySelector(".patient-badge");
        if (!badge) return;
        const count = AppState.unreadByPatient?.[patientId] || 0;
        console.log(`🔴 Patient ${patientId} → ${count} non lus`);
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove("hidden");
            badge.style.animation = 'badgePop 0.3s ease';
        } else {
            badge.classList.add("hidden");
        }
    });
}

// ============================================================
// REALTIME - MESSAGES EN TEMPS RÉEL
// ============================================================

function initRealtimeForCurrentPatient() {
    if (!AppState.currentPatient) return;
    if (!window.Realtime) return;

    window.Realtime.unsubscribe();
    console.log("📡 Realtime initialisé pour:", AppState.currentPatient);

    window.Realtime.subscribe(AppState.currentPatient, async (event, newMessage) => {
        console.log("📨 [REALTIME] Nouveau message reçu brute:", newMessage);
        
        if (!newMessage || typeof newMessage !== "object") {
            console.warn("⚠️ Message invalide ignoré");
            return;
        }

        const currentUserId = localStorage.getItem("user_id");
        const isOwnMessage = newMessage.sender_id && String(newMessage.sender_id) === String(currentUserId);
        
        if (isOwnMessage) console.log("📨 Message envoyé par moi-même - ignoré pour le badge");
        if ((AppState.messages || []).some(m => m.id === newMessage.id)) {
            console.log("📨 Message déjà présent");
            return;
        }

        try {
            const data = await secureFetch(`/messages?message_id=${newMessage.id}`);
            if (!data || !data[0]) {
                console.warn("⚠️ Message enrichi introuvable");
                return;
            }

            const fullMessage = data[0];
            const patientId = fullMessage.patient_id;
            if (!patientId) {
                console.warn("⚠️ patient_id manquant");
                return;
            }

            const isCurrentPatient = String(patientId) === String(AppState.currentPatient);
            const isInFeed = AppState.currentView === "feed";
            const shouldIncrementUnread = !isOwnMessage && (!isCurrentPatient || !isInFeed);
            
            if (shouldIncrementUnread) {
                if (!AppState.unreadByPatient) AppState.unreadByPatient = {};
                if (!AppState.unreadByPatient[patientId]) AppState.unreadByPatient[patientId] = 0;
                AppState.unreadByPatient[patientId]++;
                console.log(`🔴 [COMPTEUR] +1 pour patient ${patientId} → total: ${AppState.unreadByPatient[patientId]} non lus`);
                updatePatientBadges();
                
                if (typeof window.refreshMenuBadges === 'function') {
                    console.log("🔄 Rafraîchissement des badges du menu via refreshMenuBadges");
                    window.refreshMenuBadges();
                } else {
                    console.log("🔄 Rafraîchissement forcé des badges");
                    if (AppState.currentView === 'home') renderMobileHub();
                }
            } else {
                console.log("✅ Message NON compté comme non lu (raison:", {isOwnMessage, isCurrentPatient, isInFeed, shouldIncrementUnread});
            }

            if (!(AppState.messages || []).some(m => m.id === fullMessage.id)) {
                AppState.messages.push(fullMessage);
            }

            if (isCurrentPatient && isInFeed) {
                if (!isOwnMessage) {
                    console.log("📨 Affichage du message dans le feed");
                    window.appendMessagesToFeed([fullMessage]);
                }
                if (isUserAtBottom && !isOwnMessage) scrollToBottom();
            } else if (!isCurrentPatient && !isOwnMessage) {
                console.log(`📨 Message pour un autre patient (${patientId}) - compteur mis à jour`);
            }

            if (!isOwnMessage) {
                playNotificationBeep();
                if (navigator.vibrate) navigator.vibrate(50);
            }

        } catch (err) {
            console.error("❌ Erreur traitement realtime:", err);
        }
    });
}

// ============================================================
// TYPING INDICATOR
// ============================================================

function showTypingIndicator(show, name = '') {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    
    if (show) {
        indicator.classList.remove('hidden');
        const textSpan = indicator.querySelector('.typing-text');
        if (textSpan) textSpan.textContent = name ? (name + ' écrit...') : 'quelqu\'un écrit...';
    } else {
        indicator.classList.add('hidden');
    }
}

if (window.Realtime && window.Realtime.subscribeToTyping) {
    window.Realtime.subscribeToTyping((data) => {
        console.log("✍️ Typing:", data);
        if (data.user_id === localStorage.getItem("user_id")) return;
        showTypingIndicator(true, data.user_name);
        setTimeout(() => showTypingIndicator(false), 3000);
    });
}

// ============================================================
// CHARGEMENT DU FEED
// ============================================================

async function loadFeed() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // 🔥 RÉINITIALISER LES MESSAGES POUR LE NOUVEAU PATIENT
    AppState.messages = [];
    
    // 🔥 NETTOYER L'ANCIEN ABONNEMENT REALTIME
    if (window.cleanupRealtime) {
        window.cleanupRealtime();
    }

    container.style.padding = '0';
    container.style.margin = '0';
    container.style.overflow = 'hidden';
    
    if (!AppState.currentPatient) return window.switchView('patients');

    const isMaman = localStorage.getItem('user_is_maman') === "true";
    const themeBgClass = isMaman ? 'bg-pink-500' : 'bg-emerald-500';
    const themeTextClass = isMaman ? 'text-pink-600' : 'text-emerald-600';
    
            // 🔥 RÉCUPÉRER LES INFOS DU PATIENT COURANT
            let patientInfo = null;
            try {
                // Ne pas utiliser le cache pour être sûr d'avoir le bon patient
                const patients = await secureFetch("/patients", { noCache: true });
                // Trouver le patient correspondant à AppState.currentPatient
                patientInfo = patients.find(p => p.id === AppState.currentPatient);
                
                if (!patientInfo && patients.length > 0) {
                    // Fallback : prendre le premier patient
                    patientInfo = patients[0];
                    AppState.currentPatient = patientInfo.id;
                }
                
                console.log("🔄 [FEED] Patient chargé:", patientInfo?.nom_complet, "ID:", AppState.currentPatient);
                
            } catch(e) {
                console.error("Erreur chargement patient:", e);
            }

    container.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <div class="chat-header-back" onclick="window.switchView('patients')"><i class="fa-solid fa-arrow-left"></i></div>
                <div class="chat-header-avatar">${patientInfo?.nom_complet?.charAt(0).toUpperCase() || '?'}</div>
                <div class="chat-header-info">
                    <div class="chat-header-name">${escapeHtml(patientInfo?.nom_complet || 'Patient')}</div>
                    <div class="chat-header-status" id="chat-status"><span class="online-dot"></span> En ligne</div>
                </div>
                <div class="chat-header-actions"><button id="attach-doc-btn" title="Pièce jointe"><i class="fa-solid fa-paperclip"></i></button></div>
            </div>
            <div id="care-feed-content" class="chat-messages">
                <div class="flex justify-center py-10"><div class="relative w-8 h-8"><div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div></div></div>
            </div>
            <div id="typing-indicator" class="typing-indicator hidden" style="margin: 0 16px 8px 16px;">
                <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                <span class="typing-text">quelqu'un écrit...</span>
            </div>
            <div class="chat-input-area">
                <button class="chat-input-attach" id="attach-photo-btn" title="Photo"><i class="fa-solid fa-camera"></i></button>
                <div class="chat-input-wrapper">
                    <input type="text" id="quick-msg" class="chat-input" placeholder="Message" autocomplete="off">
                    <button class="chat-input-send" id="send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
            <input type="file" id="photo-input" accept="image/*" class="hidden">
            <input type="file" id="document-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden">
        </div>
    `;

    const photoBtn = document.getElementById('attach-photo-btn');
    const photoInput = document.getElementById('photo-input');
    const sendBtn = document.getElementById('send-btn');
    const attachDocBtn = document.getElementById('attach-doc-btn');
    const documentInput = document.getElementById('document-input');
    const input = document.getElementById('quick-msg');

    let typingTimeout;

    if (input) {
        input.addEventListener('input', () => {
            if (!AppState.currentPatient) return;
            window.Realtime.sendTyping({ patient_id: AppState.currentPatient, user_id: localStorage.getItem("user_id") });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => window.Realtime.stopTyping({ patient_id: AppState.currentPatient }), 2000);
        });
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendQuickMessage(); } });
    }
    
    if (attachDocBtn && documentInput) {
        attachDocBtn.onclick = () => documentInput.click();
        documentInput.onchange = () => sendDocumentMessage();
    }
    
    if (photoBtn && photoInput) {
        photoBtn.onclick = () => photoInput.click();
        photoInput.onchange = () => sendPhotoMessage();
    }
    
    if (sendBtn) sendBtn.onclick = () => window.sendQuickMessage();

    cleanupRealtime();

    try {
        const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = data;
        AppState.unreadByPatient = {};
        const currentUserId = localStorage.getItem("user_id");
        
        data.forEach(msg => {
            const patientId = msg.patient_id;
            if (msg.sender_id !== currentUserId && !msg.read) {
                if (!AppState.unreadByPatient[patientId]) AppState.unreadByPatient[patientId] = 0;
                AppState.unreadByPatient[patientId]++;
            }
        });

        console.log("🔴 [COMPTEUR INITIAL] unreadByPatient:", AppState.unreadByPatient);
        updatePatientBadges();
        
        if (window.Realtime) window.Realtime.unsubscribe();
        initRealtimeForCurrentPatient();
        renderFeed();

        const now = new Date().toISOString();
        localStorage.setItem(`last_read_${AppState.currentPatient}`, now);

        try {
            await secureFetch('/messages/mark-read', {
                method: 'POST',
                body: JSON.stringify({ patient_id: AppState.currentPatient, user_id: localStorage.getItem("user_id") })
            });
            console.log("👁️ Messages marqués comme lus (backend)");
            if (AppState.currentPatient && AppState.unreadByPatient) AppState.unreadByPatient[AppState.currentPatient] = 0;
            updatePatientBadges();
            if (typeof window.refreshMenuBadges === 'function') setTimeout(() => window.refreshMenuBadges(), 100);
        } catch (err) { console.error("Erreur mark-read:", err); }
        
        unreadMessagesCount = 0;
        hideNewMessageBadge();
        setTimeout(() => { initScrollDetection(); isUserAtBottom = true; scrollToBottom(); }, 500);
        if (typeof window.refreshMenuBadges === 'function') setTimeout(() => window.refreshMenuBadges(), 500);

    } catch (err) {
        console.error("Erreur Feed:", err);
        const contentDiv = document.getElementById('care-feed-content');
        if (contentDiv) {
            contentDiv.innerHTML = `<div class="flex justify-center py-20"><div class="text-center"><i class="fa-solid fa-circle-exclamation text-rose-400 text-3xl mb-3"></i><p class="text-sm font-bold text-rose-500">Erreur de chargement</p><p class="text-[10px] text-slate-400 mt-1">${err.message}</p></div></div>`;
        }
    }
}

// ============================================================
// EXPORTS GLOBAUX
// ============================================================

window.loadFeed = loadFeed;
window.cleanupRealtime = cleanupRealtime;
window.renderFeed = renderFeed;
