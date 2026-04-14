    import { secureFetch } from "../core/api.js";
    import { AppState } from "../core/state.js";
    import { UI, compressImage } from "../core/utils.js";
    import { syncService } from "../core/syncService.js";
    
    
        let unreadMessagesCount = 0;
        let isUserAtBottom = true;
        let newMessageBadge = null;
        let readSubscribed = false;
        if (!AppState.unreadByPatient) {
            AppState.unreadByPatient = {};
        }
    // ============================================
    // 🟢 REALTIME - MESSAGES EN TEMPS RÉEL
    // ============================================
    
    /**
     * Initialiser l'écoute des nouveaux messages pour le patient actuel
     */
function initRealtimeForCurrentPatient() {
    if (!AppState.currentPatient) return;
    if (!window.Realtime) return;

    // 🔄 nettoyer ancien abonnement
    window.Realtime.unsubscribe();

    console.log("📡 Realtime initialisé pour:", AppState.currentPatient);

    window.Realtime.subscribe(AppState.currentPatient, async (event, newMessage) => {
        console.log("STEP 1 - realtime déclenché");
        console.log("📨 [Realtime] Nouveau message reçu:", newMessage);

        // ====================================================
        // 🔒 1. VALIDATION
        // ====================================================
        if (!newMessage || typeof newMessage !== "object") {
            console.warn("⚠️ Message realtime invalide ignoré:", newMessage);
            return;
        }

        const currentUserId = localStorage.getItem("user_id");

        // ====================================================
        // 🚫 2. IGNORER SES PROPRES MESSAGES
        // ====================================================
        const isOwnMessage =
            newMessage.sender_id &&
            String(newMessage.sender_id) === String(currentUserId);
        
        // 🔥 on ignore SEULEMENT l'affichage, pas le traitement
        if (isOwnMessage) {
            console.log("📨 Message envoyé par nous (traité sans affichage)");
        }

        // ====================================================
        // 🚫 3. ANTI DOUBLON
        // ====================================================
        if ((AppState.messages || []).some(m => m.id === newMessage.id)) {
            console.log("📨 Message déjà présent");
            return;
        }

        try {
            // ====================================================
            // 🔄 4. FETCH MESSAGE ENRICHI
            // ====================================================
            const data = await secureFetch(
                `/messages?message_id=${newMessage.id}`
            );
            console.log("STEP FETCH:", data);
            if (!data || !data[0]) {
                console.warn("⚠️ Message enrichi introuvable");
                return;
            }

            const fullMessage = data[0];
            console.log("STEP A - message récupéré", fullMessage);

            // ====================================================
            // 🔴 5. COMPTEUR PAR PATIENT (FIX SAFE)
            // ====================================================
            const patientId = fullMessage.patient_id;

            if (!patientId) {
                console.warn("⚠️ patient_id manquant → ignoré");
                return;
            }

            const isCurrentPatient =
                String(patientId) === String(AppState.currentPatient);

            const isInFeed = AppState.currentView === "feed";

if (!isCurrentPatient || !isInFeed) {
    if (!AppState.unreadByPatient[patientId]) {
                    AppState.unreadByPatient[patientId] = 0;
                }

                AppState.unreadByPatient[patientId]++;
                console.log("DEBUG compteur:", AppState.unreadByPatient);
                updatePatientBadges();

                console.log(
                    "🔴 compteur patient:",
                    patientId,
                    AppState.unreadByPatient[patientId]
                );
            } else {
                console.log("✅ message lu en direct → pas compté");
            }

            // ====================================================
            // 🎯 6. FILTRE PATIENT
            // ====================================================
            if (!isCurrentPatient) {
                console.log("📩 Message reçu (autre patient)");

                if (AppState.currentView === "feed") {
                    console.log("⚡ Forcer affichage");

                    if (!(AppState.messages || []).some(m => m.id === fullMessage.id)) {
                        AppState.messages.push(fullMessage);
                    }

                    window.appendMessagesToFeed([fullMessage]);
                    playNotificationBeep();
                } else {
                    unreadMessagesCount++;
                    showNewMessageBadge();
                }

                return;
            }

            // ====================================================
            // ➕ 7. AJOUT STATE
            // ====================================================
            if (!(AppState.messages || []).some(m => m.id === fullMessage.id)) {
                AppState.messages.push(fullMessage);
            }

            // ====================================================
            // ⚡ 8. AFFICHAGE DIRECT
            // ====================================================
            if (!isOwnMessage) {
                window.appendMessagesToFeed([fullMessage]);
            }
            if (!document.querySelector(`[data-message-id="${fullMessage.id}"]`)) {
                console.warn("⚠️ fallback renderFeed");
                renderFeed();
            }

            // ====================================================
            // 🔔 9. FEEDBACK
            // ====================================================
            playNotificationBeep();
            if (navigator.vibrate) navigator.vibrate(100);

            // ====================================================
            // 📍 10. SCROLL / BADGE
            // ====================================================
            if (isUserAtBottom) {
                scrollToBottom();
            } else {
                unreadMessagesCount++;
                showNewMessageBadge();
            }

            console.log("✅ Message affiché en temps réel");

        } catch (err) {
            console.error("❌ Erreur traitement realtime:", err);
        }
    });
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
        // ✅ TRIER PAR DATE (plus récent en bas)
        const sortedMessages = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // ✅ AFFICHAGE PLAT - TOUS LES MESSAGES AU MÊME NIVEAU
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
    
    /**
     * 📚 Afficher toutes les réponses d'un message
     */
    window.showAllReplies = (parentMessageId) => {
        const container = document.querySelector(`.replies-container[data-parent="${parentMessageId}"]`);
        if (!container) return;
        
        // Trouver toutes les réponses à ce message
        const allReplies = (AppState.messages || [])
            .filter(m => m.reply_to_id === parentMessageId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        if (allReplies.length === 0) return;
        
        // Générer le HTML de toutes les réponses
        const allRepliesHtml = allReplies.map(reply => renderStoryCard(reply, true)).join('');
        
        // Remplacer le contenu
        container.innerHTML = allRepliesHtml + `
            <button onclick="window.collapseReplies('${parentMessageId}', ${allReplies.length})" 
                    class="ml-8 mt-2 text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-all flex items-center gap-1">
                <i class="fa-solid fa-chevron-up text-[8px]"></i>
                Réduire (${allReplies.length} réponse${allReplies.length > 1 ? 's' : ''})
            </button>
        `;
        
        UI.vibrate('light');
    };
    
    /**
     * 📚 Réduire l'affichage des réponses (afficher seulement les 3 premières)
     */
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
    
    
    /**
     * Bip de notification
     */
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
        } catch(e) {
            // Silencieux si erreur
        }
    }
    
    /**
     * Scroll automatique vers le bas
     */
    function scrollToBottom() {
        setTimeout(() => {
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.scrollTo({
                    top: mainContent.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
    
    /**
     * Nettoyer Realtime (à appeler quand on quitte le feed)
     */
    function cleanupRealtime() {
        if (window.Realtime) {
            window.Realtime.unsubscribe();
            console.log("🧹 [Realtime] Nettoyé");
        }
    }
    
    // État local pour gérer l'onglet actif
    let activeTab = 'STORY';
    let currentReplyTo = null;        // ✅ NOUVEAU : stocke l'ID du message auquel on répond
    let currentReplyToName = null;    // ✅ NOUVEAU : stocke le nom de l'auteur
    
    let currentEmojiMessageId = null;
    let emojiPickerVisible = false;
    
    /**
     * 😊 Créer et afficher l'émoji picker pour un message
     */
    // Version SIMPLE qui fonctionne sans bibliothèque externe
    function showEmojiPicker(messageId, buttonElement) {
        // Fermer l'ancien picker
        const oldPicker = document.getElementById('emoji-picker-container');
        if (oldPicker) oldPicker.remove();
        
        currentEmojiMessageId = messageId;
        
        // Liste des émojis (tous universels)
        const emojis = ['😊', '❤️', '👍', '😂', '😢', '🎉', '😍', '🔥', '👏', '🙏'];
        
        // Créer le panneau
        const panel = document.createElement('div');
        panel.id = 'emoji-picker-container';
        panel.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 16px;
            padding: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 99999;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            max-width: 280px;
            border: 1px solid #ddd;
        `;
        
        // Positionner près du bouton
        const rect = buttonElement.getBoundingClientRect();
        panel.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        panel.style.left = rect.left + 'px';
        
        // Ajouter les émojis
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.style.cssText = `
                width: 44px;
                height: 44px;
                font-size: 24px;
                border: none;
                background: #f1f5f9;
                border-radius: 12px;
                cursor: pointer;
            `;
            btn.onclick = () => {
                sendEmojiReaction(messageId, emoji);
                panel.remove();
            };
            panel.appendChild(btn);
        });
        
        document.body.appendChild(panel);
    }
    
    // Fonction pour fermer (optionnelle, mais utile)
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('emoji-picker-container');
        if (panel && !panel.contains(e.target) && !e.target.closest('[onclick*="showEmojiPicker"]')) {
            panel.remove();
        }
    });
    
    /**
     * Fermer l'émoji picker
     */
    function closeEmojiPicker() {
        const existingPicker = document.getElementById('emoji-picker-container');
        if (existingPicker) {
            existingPicker.remove();
        }
        currentEmojiMessageId = null;
        emojiPickerVisible = false;
    }
    
    /**
     * Envoyer une réaction avec émoji
     */
    async function sendEmojiReaction(messageId, emoji) {
        try {
            UI.vibrate('light');
            
            await secureFetch('/messages/react', {
                method: 'POST',
                body: JSON.stringify({ 
                    message_id: messageId, 
                    reaction_type: emoji 
                })
            });
            
            // Recharger le feed pour afficher la nouvelle réaction
            await loadFeed();
            
        } catch (err) {
            console.error("Erreur envoi réaction:", err);
            UI.error("Impossible d'ajouter la réaction");
        }
    }
    
    
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
     * 📎 Envoyer un document (PDF, DOC, etc.)
     */
    async function sendDocumentMessage() {
        const docInput = document.getElementById('document-input');
        const file = docInput?.files?.[0];
        
        if (!file) return;
        
        // Vérifier la taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            UI.error("Document trop lourd (max 10MB)");
            docInput.value = '';
            return;
        }
        
        // Types acceptés
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
            
            const response = await fetch(`${window.CONFIG.API_URL}/messages/send-document`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erreur d'envoi");
            }
            
            docInput.value = '';
            window.cancelReply();
            
            Swal.fire({
                icon: "success",
                title: "Document envoyé",
                timer: 1500,
                showConfirmButton: false
            });
            
            await loadFeed();

            window.dispatchEvent(new CustomEvent('app-data-updated', {
                detail: { endpoint: '/messages', method: 'POST', resourceType: 'message_sent' }
            }));
            
        } catch (err) {
            console.error("❌ Erreur:", err);
            Swal.close();
            UI.error(err.message);
            docInput.value = '';
        }
    }
    
    /**
     * 📥 CHARGER LE JOURNAL DE SOINS
     */

 async function loadFeed() {
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

            <!-- Zone de saisie rapide -->
            <div id="input-area" class="mb-8">
                <!-- Indicateur de réponse -->
                <div id="reply-indicator" class="hidden mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-reply-all text-amber-500 text-sm"></i>
                        <span class="text-xs font-medium text-amber-700">Réponse à <span id="replying-to-name" class="font-black"></span></span>
                    </div>
                    <button onclick="window.cancelReply()" class="text-amber-500 hover:text-amber-700">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <!-- Zone de saisie avec boutons -->
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center gap-2">
                        <button id="photo-btn" class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 transition-all flex items-center justify-center" title="Photo">
                            <i class="fa-solid fa-camera text-base"></i>
                        </button>
                        
                        <button id="document-btn" class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-all flex items-center justify-center" title="Joindre un document">
                            <i class="fa-solid fa-paperclip text-base"></i>
                        </button>
                        
                        <input id="quick-msg" class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Écrire un message à l'équipe...">
                        
                        <button id="send-btn" class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <i class="fa-solid fa-paper-plane text-xs"></i>
                        </button>
                    </div>
                    <input type="file" id="photo-input" accept="image/*" class="hidden">
                    <input type="file" id="document-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden">
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

    // Brancher les événements
    const photoBtn = document.getElementById('photo-btn');
    const photoInput = document.getElementById('photo-input');
    const sendBtn = document.getElementById('send-btn');
    const documentBtn = document.getElementById('document-btn');
    const documentInput = document.getElementById('document-input');

    const input = document.getElementById('quick-msg');

    let typingTimeout;

        if (input) {
            input.addEventListener('input', () => {
                if (!AppState.currentPatient) return;
        
                window.Realtime.sendTyping({
                    patient_id: AppState.currentPatient,
                    user_id: localStorage.getItem("user_id")
                });
        
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    window.Realtime.stopTyping({
                        patient_id: AppState.currentPatient
                    });
                }, 2000);
            });
        }
    
    if (documentBtn && documentInput) {
        documentBtn.onclick = () => documentInput.click();
        documentInput.onchange = () => sendDocumentMessage();
    }
    
    if (photoBtn && photoInput) {
        photoBtn.onclick = () => photoInput.click();
        photoInput.onchange = () => sendPhotoMessage();
    }
    
    if (sendBtn) {
        sendBtn.onclick = () => window.sendQuickMessage();
    }

    cleanupRealtime();

    try {
        const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = data;
        // 🔴 INITIALISER LES NON LUS AU CHARGEMENT
        AppState.unreadByPatient = {};
        
        data.forEach(msg => {
            const patientId = msg.patient_id;
            const currentUserId = localStorage.getItem("user_id");
        
            if (msg.sender_id !== currentUserId) {
                if (!AppState.unreadByPatient[patientId]) {
                    AppState.unreadByPatient[patientId] = 0;
                }
                AppState.unreadByPatient[patientId]++;
            }
        });
        
        updatePatientBadges();
        
        initRealtimeForCurrentPatient();
        renderFeed();

        // ✅ Marquer les messages comme lus
        const now = new Date().toISOString();
        localStorage.setItem(`last_read_${AppState.currentPatient}`, now);

try {
    await secureFetch('/messages/mark-read', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: AppState.currentPatient,
            user_id: localStorage.getItem("user_id")
        })
    });

    console.log("👁️ Messages marqués comme lus (backend)");
    const patientId = AppState.currentPatient;

if (patientId && AppState.unreadByPatient) {
    AppState.unreadByPatient[patientId] = 0;
}

updatePatientBadges();
} catch (err) {
    console.error("Erreur read:", err);
}
        
        // ✅ Réinitialiser le compteur de messages non lus
        unreadMessagesCount = 0;
        hideNewMessageBadge();

        // ✅ Initialiser la détection de scroll
        setTimeout(() => {
            initScrollDetection();
            isUserAtBottom = true;
        }, 500);
        
        // ✅ Rafraîchir les badges du menu
        if (typeof window.refreshMenuBadges === 'function') {
            setTimeout(() => window.refreshMenuBadges(), 500);
        }

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


if (!readSubscribed) {
    readSubscribed = true;

    window.Realtime.subscribeToRead((data) => {
        console.log("👁️ Messages lus:", data);
        updateSeenStatus(data);
    });
}

function updateSeenStatus(data) {
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

    // 🔥 animation pro
    status.style.opacity = "0";
    status.style.transition = "opacity 0.3s ease";

    container.appendChild(status);

    setTimeout(() => {
        status.style.opacity = "1";
    }, 10);
}



    /**
     * 🎨 RENDU FILTRÉ (MODIFIÉ pour organiser les réponses en cascade)
     */
    
    
    
    
    /**
     * 📄 CARTE DOCUMENT (améliorée)
     */
    /**
     * 📄 CARTE DOCUMENT (Version corrigée avec affichage propre)
     */
    function renderDocCard(msg) {
        // Déterminer l'icône selon le type de fichier
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
        const fileSize = formatFileSize(msg.file_size); // Si vous avez la taille
        
        // Pour les images, afficher un aperçu
        const previewHtml = isImage ? `
            <div class="mt-3">
                <img src="${msg.content}" class="w-full max-h-48 object-cover rounded-xl cursor-pointer border border-slate-200" onclick="window.open('${msg.content}')">
            </div>
        ` : '';
        
        return `
            <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 mb-3 document-card">
                <div class="p-4">
                    <div class="flex items-start gap-3">
                        <!-- Icône document -->
                        <div class="w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0">
                            <i class="fa-solid ${iconClass} ${iconColor} text-xl"></i>
                        </div>
                        
                        <!-- Infos document -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center flex-wrap gap-2 mb-1">
                                <span class="text-[9px] font-black px-2 py-0.5 rounded-full ${bgColor} ${iconColor} uppercase">
                                    ${fileType}
                                </span>
                                <span class="text-[9px] text-slate-400">${UI.formatDate(msg.created_at)}</span>
                            </div>
                            <h4 class="font-bold text-slate-800 text-sm truncate" title="${escapeHtml(filename)}">
                                ${escapeHtml(filename.length > 40 ? filename.substring(0, 40) + '...' : filename)}
                            </h4>
                            <p class="text-[10px] text-slate-400 mt-1">
                                Envoyé par ${escapeHtml(msg.sender_name || 'Système')}
                            </p>
                        </div>
                        
                        <!-- Bouton téléchargement -->
                        <button onclick="window.open('${msg.content}')" 
                                class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all active:scale-95 shrink-0"
                                title="Télécharger">
                            <i class="fa-solid fa-download text-sm"></i>
                        </button>
                    </div>
                    
                    ${previewHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Formater la taille du fichier
     */
    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
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
    
        const rawDate = msg.created_at || msg.createdAt || new Date().toISOString();
        const safeDate = new Date(rawDate);
        
        const timeStr = isNaN(safeDate)
            ? "Maintenant"
            : safeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        const dateStr = isNaN(safeDate)
            ? ""
            : safeDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    // ✅ NOUVEAU : Récupérer le message parent si c'est une réponse
    let parentMessageHtml = '';
    if (msg.reply_to_id) {
        const parentMsg = AppState.messages?.find(m => m.id === msg.reply_to_id);
        if (parentMsg) {
            const parentContent = parentMsg.is_photo ? '📷 Photo' : (parentMsg.content?.substring(0, 80) + (parentMsg.content?.length > 80 ? '...' : ''));
            parentMessageHtml = `
                <div class="mb-3 p-3 bg-slate-100 rounded-xl border-l-3 border-l-amber-400">
                    <div class="flex items-center gap-2 text-[9px] text-slate-500 mb-1">
                        <i class="fa-solid fa-reply-all text-amber-500 text-[10px]"></i>
                        <span class="font-black">Réponse à ${escapeHtml(parentMsg.sender_name || 'un message')}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 italic">"${escapeHtml(parentContent)}"</p>
                </div>
            `;
        }
    }

    return `
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-fadeIn mb-5 hover:shadow-md transition-shadow" data-message-id="${msg.id}">
            <div class="message-status"></div>
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

            <!-- ✅ INDICATEUR DE RÉPONSE (si c'est une réponse) -->
            ${parentMessageHtml}

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
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-600 text-sm leading-relaxed mt-2 break-words whitespace-normal overflow-hidden">
                    <i class="fa-solid fa-quote-left text-slate-200 text-lg mr-2 float-left"></i>
                    <span class="font-medium break-words">${escapeHtml(content)}</span>
                </div>
            ` : ''}
            
            <!-- Réactions et interactions -->
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="flex gap-1">
                        ${Object.entries(msg.reactions || {}).map(([emoji, count]) => `
                            <button onclick="window.sendReaction('${msg.id}', '${emoji}')" 
                                    class="flex items-center gap-0.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-full text-sm transition-all active:scale-95">
                                <span class="text-base">${emoji}</span>
                                <span class="text-[10px] font-bold text-slate-500">${count}</span>
                            </button>
                        `).join('')}
                    </div>
                    
                    <button onclick="window.showEmojiPickerForMessage('${msg.id}', this)" 
                            class="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-95">
                        <i class="fa-solid fa-plus text-xs"></i>
                    </button>
                    
                    <button onclick="window.replyToMessage('${msg.id}', '${escapeHtml(msg.sender_name || 'l\'utilisateur')}')" 
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full hover:bg-amber-50 hover:text-amber-600 transition-all active:scale-95">
                        <i class="fa-solid fa-reply text-xs"></i>
                        <span class="text-[10px] font-medium">Répondre</span>
                    </button>
                    
                    ${isAidant && msg.id ? `
                        <button onclick="window.reportIssue('${msg.id}')" 
                                class="text-[9px] text-slate-400 hover:text-amber-500 transition">
                            <i class="fa-regular fa-flag mr-1"></i>
                        </button>
                    ` : ''}
                </div>
                
                ${imageUrl && isAidant ? `
                    <div class="mt-3 text-right">
                        <span class="text-[8px] text-slate-400">
                            <i class="fa-regular fa-camera mr-1"></i>
                            Photo prise par ${msg.sender_name}
                        </span>
                    </div>
                ` : ''}
            </div>
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

            window.dispatchEvent(new CustomEvent('app-data-updated', {
                detail: { endpoint: '/messages', method: 'POST', resourceType: 'message_sent' }
            }));
    
            
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
        
        // Si on quitte l'onglet STORY, nettoyer Realtime
        if (type !== 'STORY') {
            cleanupRealtime();
        } else {
            // Si on revient à STORY, réinitialiser
            if (AppState.currentPatient) {
                initRealtimeForCurrentPatient();
            }
        }
        
        renderFeed();
    };
    
    
    window.sendQuickMessage = async () => {
        const input = document.getElementById('quick-msg');
        const content = input?.value?.trim();
        if (!content) return;
    
        try {
            UI.vibrate();
            
            const body = {
                patient_id: AppState.currentPatient,
                content: content,
                is_photo: false,
                type_media: 'STORY'
            };
            
            if (currentReplyTo) {
                body.reply_to_id = currentReplyTo;
            }
            
            await secureFetch('/messages/send', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            
            input.value = '';
            window.cancelReply();
            initRealtimeForCurrentPatient();
            // ✅ FORCER LE RAFRAÎCHISSEMENT IMMÉDIAT
            await loadFeed();
            
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
    
    
function showTypingIndicator(data) {
    let indicator = document.getElementById('typing-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = "text-xs text-slate-400 px-4 py-2";
        document.getElementById('care-feed-content')?.appendChild(indicator);
    }

    indicator.textContent = "✍️ Quelqu’un est en train d’écrire...";

    setTimeout(() => {
        indicator.remove();
    }, 2000);
}

window.Realtime.subscribeToTyping((data) => {
    console.log("✍️ Typing:", data);

    if (data.user_id === localStorage.getItem("user_id")) return;

    showTypingIndicator(data);
});


    // Exposer la fonction d'émoji picker globalement
    window.showEmojiPickerForMessage = (messageId, buttonElement) => {
        showEmojiPicker(messageId, buttonElement);
    };
    
    // Fermer le picker quand on clique ailleurs
    document.addEventListener('click', (e) => {
        if (emojiPickerVisible && !e.target.closest('#emoji-picker-container')) {
            closeEmojiPicker();
        }
    });

/**
 * Ajouter des messages au feed sans re-rendu complet
 */
window.appendMessagesToFeed = (newMessages) => {
    const container = document.getElementById('care-feed-content');
    if (!container) return;
    
    // ✅ Sauvegarder la position de scroll actuelle
    const mainContent = document.querySelector('main');
    const wasAtBottom = mainContent 
        ? mainContent.scrollHeight - mainContent.scrollTop <= mainContent.clientHeight + 100
        : false;
    
    // Générer le HTML des nouveaux messages
    const newMessagesHtml = newMessages.map(msg => {
        if (activeTab === 'DOCUMENT') {
            return renderDocCard(msg);
        } else {
            return renderStoryCard(msg, false);
        }
    }).join('');
    
    // Ajouter à la fin du conteneur
    container.insertAdjacentHTML('beforeend', newMessagesHtml);
    
    // ✅ Scroll uniquement si l'utilisateur était déjà en bas
    if (wasAtBottom) {
        scrollToBottom();
    }
    
    // Notification sonore (optionnel)
    playNotificationBeep();
    
    console.log(`✅ ${newMessages.length} nouveau(x) message(s) ajouté(s) sans flash`);
};


/**
 * 🔔 Afficher le badge "Nouveau message"
 */
function showNewMessageBadge() {
    // ✅ Vérifier qu'on est bien dans la vue feed
    const currentView = AppState?.currentView;
    if (currentView !== 'feed') {
        console.log("📌 Pas dans le feed, badge ignoré");
        return;
    }
    
    // Créer le badge s'il n'existe pas
    if (!newMessageBadge) {
        newMessageBadge = document.createElement('div');
        newMessageBadge.id = 'new-message-badge';
        newMessageBadge.innerHTML = `
            <div class="bg-emerald-500 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
                <i class="fa-solid fa-message text-xs"></i>
                <span class="text-xs font-black">Nouveau message</span>
                <i class="fa-solid fa-arrow-down text-xs"></i>
            </div>
        `;
        newMessageBadge.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 1000;
            transform: translateY(100px);
            transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        `;
        newMessageBadge.onclick = () => {
            scrollToBottom();
            hideNewMessageBadge();
        };
        document.body.appendChild(newMessageBadge);
    }
    
    // Afficher avec animation
    setTimeout(() => {
        if (newMessageBadge) {
            newMessageBadge.style.transform = 'translateY(0)';
        }
    }, 100);
}
/**
 * 🙈 Cacher le badge "Nouveau message"
 */
function hideNewMessageBadge() {
    if (newMessageBadge) {
        newMessageBadge.style.transform = 'translateY(100px)';
    }
}

/**
 * 📜 Détecter si l'utilisateur est en bas du scroll
 */
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



function updatePatientBadges() {
    document.querySelectorAll(".patient-item").forEach(el => {
        const patientId = el.dataset.patientId;
        const badge = el.querySelector(".patient-badge");

        if (!badge) return;

        const count = AppState.unreadByPatient?.[patientId] || 0;

        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    });
}

    window.loadFeed = loadFeed;
    window.cleanupRealtime = cleanupRealtime;
    window.renderFeed = renderFeed;
