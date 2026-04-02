import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

// État local pour gérer l'onglet actif
let activeTab = 'STORY';

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

            <!-- Zone de saisie rapide -->
            <div id="input-area" class="mb-8">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <input id="quick-msg" class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Écrire un message à l'équipe...">
                    <button onclick="window.sendQuickMessage()" class="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
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

    try {
        const res = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = await res.json();
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
 * 🎨 RENDU FILTRÉ
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

    const filtered = (AppState.messages || []).filter(m => {
        if (activeTab === 'DOCUMENT') return m.type_media === 'DOCUMENT';
        return m.type_media !== 'DOCUMENT';
    }).slice().reverse();

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="text-center py-20 opacity-50">
                <i class="fa-solid ${activeTab === 'STORY' ? 'fa-feather-pointed' : 'fa-folder-open'} text-4xl mb-4 text-slate-300"></i>
                <p class="font-black uppercase text-[10px] tracking-wider text-slate-400">Aucun élément dans cette section</p>
            </div>`;
        return;
    }

    content.innerHTML = filtered.map(msg => {
        return activeTab === 'STORY' ? renderStoryCard(msg) : renderDocCard(msg);
    }).join('');
}

/**
 * 📸 CARTE JOURNAL (Story)
 */
function renderStoryCard(msg) {
    const isPhoto = msg.is_photo;
    let content = msg.content || '';
    let humeurBadge = "";

    // Décodage de l'humeur
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
    const roleColorClass = isAidant ? 'text-emerald-500' : 'text-blue-500';
    const avatarBg = isAidant ? 'bg-slate-900' : 'bg-blue-600';

    return `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-fadeIn mb-6">
            <!-- Header -->
            <div class="flex justify-between items-center mb-5">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${avatarBg} text-white flex items-center justify-center text-sm font-black shadow-md">
                        ${msg.sender_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                        <h4 class="text-sm font-black text-slate-800">${msg.sender_name || 'Système'}</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <p class="text-[9px] font-bold ${roleColorClass} uppercase tracking-wider">${msg.sender_role || 'COORDINATEUR'}</p>
                        </div>
                    </div>
                </div>
                <span class="text-[10px] font-black text-slate-400">${UI.formatDate(msg.created_at)}</span>
            </div>

            <!-- Contenu -->
            ${isPhoto ? `
                <div class="relative rounded-xl overflow-hidden shadow-lg border border-slate-100">
                    <img src="${msg.content}" class="w-full max-h-96 object-cover cursor-pointer" onclick="window.open('${msg.content}')">
                    <div class="absolute top-3 right-3 bg-slate-900/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <span class="text-[8px] font-black text-white uppercase tracking-wider">Certifié</span>
                    </div>
                    ${humeurBadge}
                </div>
            ` : `
                <div class="bg-slate-50 p-5 rounded-xl border border-slate-100 text-slate-600 text-sm leading-relaxed">
                    <i class="fa-solid fa-quote-left text-slate-200 text-2xl mr-2 float-left"></i>
                    <span class="font-medium">${escapeHtml(content)}</span>
                </div>
            `}

            <!-- Réactions -->
            <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Réagir :</p>
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
                </div>
            </div>
        </div>
    `;
}

/**
 * 📄 CARTE DOCUMENT
 */
function renderDocCard(msg) {
    return `
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all animate-fadeIn">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl">
                    <i class="fa-solid fa-file-pdf"></i>
                </div>
                <div>
                    <h4 class="font-black text-slate-800 text-xs uppercase">${msg.titre_media || 'Document'}</h4>
                    <p class="text-[9px] text-slate-400 font-bold mt-0.5">${UI.formatDate(msg.created_at)}</p>
                </div>
            </div>
            <button onclick="window.open('${msg.content}')" class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <i class="fa-solid fa-download text-sm"></i>
            </button>
        </div>
    `;
}

/**
 * 🔧 Échapper les caractères HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// BRANCHEMENTS WINDOW
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
        const res = await secureFetch('/messages/send', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: AppState.currentPatient,
                content: content,
                is_photo: false,
                type_media: 'STORY'
            })
        });
        if (res.ok) {
            input.value = '';
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
