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

    // 1. Structure de base avec les Onglets (Tabs)
    container.innerHTML = `
        <div class="animate-fadeIn pb-24">
            <!-- Header avec Retour -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('patients')" class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Suivi en Direct</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dossier Patient : #00${AppState.currentPatient.substring(0,3)}</p>
                </div>
            </div>

            <!-- 🔄 SWITCHER DE VUE (Style iOS Premium) -->
            <div class="bg-slate-100/50 p-1.5 rounded-[2rem] flex items-center gap-1 mb-8 max-w-md mx-auto border border-slate-200/30">
                <button onclick="window.filterFeed('STORY')" id="tab-story" class="flex-1 py-3 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all">
                    Journal de Vie
                </button>
                <button onclick="window.filterFeed('DOCUMENT')" id="tab-doc" class="flex-1 py-3 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all">
                    Pièces Jointes
                </button>
            </div>

            <!-- ZONE DE SAISIE RAPIDE (Uniquement pour le Journal) -->
            <div id="input-area" class="mb-8">
                <div class="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-3">
                    <input id="quick-msg" class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-green-100 transition-all" placeholder="Écrire un message à l'équipe...">
                    <button onclick="window.sendQuickMessage()" class="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- CONTENU DYNAMIQUE -->
            <div id="care-feed-content" class="space-y-8">
                 <div class="flex justify-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-3xl"></i></div>
            </div>
        </div>
    `;

    // 2. Charger les données
    try {
        const res = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = await res.json();
        renderFeed();
    } catch (err) {
        console.error("Erreur Feed:", err);
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

    // Mise à jour visuelle des onglets
    const activeClass = "bg-white text-slate-900 shadow-sm border border-slate-200/50";
    const inactiveClass = "text-slate-400 hover:text-slate-600";
    
    btnStory.className = `flex-1 py-3 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'STORY' ? activeClass : inactiveClass}`;
    btnDoc.className = `flex-1 py-3 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DOCUMENT' ? activeClass : inactiveClass}`;

    // On affiche/cache la zone de texte selon l'onglet
    inputArea.style.display = activeTab === 'STORY' ? 'block' : 'none';

    // Filtrage des données (On suppose que le backend renvoie un champ 'type_media')
    // Si type_media n'existe pas encore, on considère tout comme 'STORY'
    const filtered = AppState.messages.filter(m => {
        if (activeTab === 'DOCUMENT') return m.type_media === 'DOCUMENT';
        return m.type_media !== 'DOCUMENT'; // STORY par défaut
    }).slice().reverse();

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="text-center py-20 opacity-30">
                <i class="fa-solid ${activeTab === 'STORY' ? 'fa-feather-pointed' : 'fa-folder-open'} text-4xl mb-4"></i>
                <p class="font-black uppercase text-[10px] tracking-widest">Aucun élément dans cette section</p>
            </div>`;
        return;
    }

    content.innerHTML = filtered.map(msg => activeTab === 'STORY' ? renderStoryCard(msg) : renderDocCard(msg)).join('');
}

/**
 * 📸 DESIGN : CARTE JOURNAL (Look Instagram)
 */
function renderStoryCard(msg) {
    const isPhoto = msg.is_photo;
    let content = msg.content;
    let humeurBadge = "";

    // --- 🧠 DÉCODAGE DE L'HUMEUR (Logique métier) ---
    if (!isPhoto && content.includes('|')) {
        const [humeur, notes] = content.split('|');
        const emojis = { 
            "Très Joyeux": "😊", 
            "Calme": "😐", 
            "Fatigué": "😴", 
            "Triste": "😔" 
        };
        // Design du badge : Blanc translucide avec bordure Or (Amber)
        humeurBadge = `
            <div class="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-amber-200 flex items-center gap-3 animate-fadeIn">
                <span class="text-lg">${emojis[humeur] || '✨'}</span>
                <div class="flex flex-col">
                    <span class="text-[8px] font-black text-amber-600 uppercase tracking-widest">Humeur du proche</span>
                    <span class="text-[10px] font-black text-slate-800 uppercase">${humeur}</span>
                </div>
            </div>`;
        content = notes;
    }

    // --- 🎨 STYLE SELON LE RÔLE ---
    const isAidant = msg.sender_role === 'AIDANT';
    const roleColorClass = isAidant ? 'text-emerald-500' : 'text-blue-500';
    const avatarBg = isAidant ? 'bg-slate-900' : 'bg-blue-600';

    return `
        <div class="feed-card bg-white rounded-[3rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-50 animate-fadeIn mb-10">
            
            <!-- HEADER : Identité de l'expéditeur -->
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-11 h-11 rounded-[1.2rem] ${avatarBg} text-white flex items-center justify-center text-xs font-black shadow-lg">
                        ${msg.sender_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight">${msg.sender_name}</h4>
                        <div class="flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <p class="text-[9px] font-bold ${roleColorClass} uppercase tracking-[0.2em]">${msg.sender_role}</p>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-black text-slate-300 uppercase">${UI.formatDate(msg.created_at)}</span>
                </div>
            </div>

            <!-- CONTENU : Photo Polaroid ou Message Texte -->
            ${isPhoto ? `
                <div class="relative group rounded-[2.5rem] overflow-hidden shadow-2xl border-[6px] border-white ring-1 ring-slate-100">
                    <img src="${msg.content}" class="w-full h-96 object-cover hover:scale-105 transition-transform duration-1000 cursor-pointer" onclick="window.open('${msg.content}')">
                    
                    <!-- Badge de Certification Or (Gold) -->
                    <div class="absolute top-4 right-4 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
                        <i class="fa-solid fa-certificate text-amber-400 text-[10px]"></i>
                        <span class="text-[8px] font-black text-white uppercase tracking-widest">Rapport Certifié</span>
                    </div>

                    ${humeurBadge}
                </div>
            ` : `
                <div class="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 italic text-slate-600 text-sm leading-relaxed relative overflow-hidden">
                    <i class="fa-solid fa-quote-left absolute -top-2 -left-2 text-slate-200/50 text-6xl"></i>
                    <span class="relative z-10 font-medium">"${content}"</span>
                </div>
            `}

            <!-- FOOTER : Réactions Élite -->
            <div class="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Réagir au rapport :</p>
                <div class="flex gap-3">
                    <button onclick="window.sendReaction('${msg.id}', 'coeur')" 
                        class="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all active:scale-90 border border-rose-100">
                        <i class="fa-solid fa-heart text-xs"></i> 
                        <span class="text-[10px] font-black">${msg.reactions?.coeur || 0}</span>
                    </button>
                    
                    <button onclick="window.sendReaction('${msg.id}', 'merci')" 
                        class="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-all active:scale-90 border border-blue-100">
                        <i class="fa-solid fa-hands-praying text-xs"></i> 
                        <span class="text-[10px] font-black">${msg.reactions?.merci || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 📄 DESIGN : CARTE DOCUMENT (Look Dropbox/Drive)
 */
function renderDocCard(msg) {
    return `
        <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all animate-fadeIn">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl shadow-inner">
                    <i class="fa-solid fa-file-invoice-dollar"></i>
                </div>
                <div>
                    <h4 class="font-black text-slate-800 text-xs uppercase tracking-tight">${msg.titre_media || 'Reçu / Ordonnance'}</h4>
                    <p class="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">${UI.formatDate(msg.created_at)}</p>
                </div>
            </div>
            <button onclick="window.open('${msg.content}')" class="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <i class="fa-solid fa-download text-sm"></i>
            </button>
        </div>
    `;
}

// --- BRANCHEMENTS WINDOW ---

window.filterFeed = (type) => {
    UI.vibrate();
    activeTab = type;
    renderFeed();
};

window.sendQuickMessage = async () => {
    const input = document.getElementById('quick-msg');
    const content = input.value.trim();
    if (!content) return;

    try {
        UI.vibrate();
        const res = await secureFetch('/messages/send', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: AppState.currentPatient,
                content: content,
                is_photo: false,
                type_media: 'STORY' // Toujours STORY pour les messages texte de la famille
            })
        });
        if (res.ok) {
            input.value = '';
            loadFeed(); 
        }
    } catch (err) { console.error(err); }
};

window.sendReaction = async (msgId, type) => {
    try {
        UI.vibrate();
        await secureFetch('/messages/react', {
            method: 'POST',
            body: JSON.stringify({ message_id: msgId, reaction_type: type })
        });
        loadFeed(); 
    } catch (err) { console.error(err); }
};
