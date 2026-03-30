import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

/**
 * 📥 CHARGER LE JOURNAL DE SOINS
 */
export async function loadFeed() {
    const container = document.getElementById('care-feed');
    if (!container) return;

    if (!AppState.currentPatient) {
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-fadeIn">
                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-fingerprint text-slate-200 text-3xl"></i>
                </div>
                <p class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Sélectionnez un dossier patient</p>
            </div>`;
        return;
    }

    try {
        const res = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        const messages = await res.json();
        AppState.messages = messages;
        renderFeed();
    } catch (err) {
        console.error("Erreur Feed:", err);
    }
}

/**
 * 🎨 RENDU DU JOURNAL (Design Story & Polaroid)
 */
export function renderFeed() {
    const container = document.getElementById('care-feed');
    if (!container) return;

    // Ajout de la zone de message rapide en haut (Nouveau !)
    let html = `
        <div class="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex items-center gap-3 animate-fadeIn">
            <input id="quick-msg" class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-green-100 transition-all" placeholder="Envoyer un message à l'équipe...">
            <button onclick="window.sendQuickMessage()" class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <i class="fa-solid fa-paper-plane text-xs"></i>
            </button>
        </div>
    `;

    if (AppState.messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 animate-fadeIn">
                <div class="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-calendar-plus text-3xl"></i>
                </div>
                <p class="font-black uppercase text-xs text-slate-800">Aucun journal pour l'instant</p>
                <p class="text-[10px] text-slate-400 mt-2 font-medium">Le premier rapport sera généré dès la première visite.</p>
            </div>`;
        return;
    }

    // Rendu des cartes de la plus récente à la plus ancienne
    html += AppState.messages.slice().reverse().map(msg => {
        const reactions = msg.reactions || {};
        const isPhoto = msg.is_photo;
        const roleColor = msg.sender_role === 'COORDINATEUR' ? 'text-blue-500' : 'text-green-600';
        
        // Décodage intelligent de l'humeur
        let content = msg.content;
        let humeurBadge = "";
        
        if (!isPhoto && content.includes('|')) {
            const [humeur, notes] = content.split('|');
            const emojis = { "Très Joyeux": "😊", "Calme": "😐", "Fatigué": "😴", "Triste": "😔" };
            humeurBadge = `
                <div class="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-100 mb-3 w-fit">
                    <span class="text-sm">${emojis[humeur] || '✨'}</span>
                    <span class="text-[9px] font-black uppercase text-slate-700 tracking-tighter">${humeur}</span>
                </div>
            `;
            content = notes;
        }

        return `
            <div class="feed-card bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-50 mb-8 animate-fadeIn relative overflow-hidden">
                <!-- En-tête -->
                <div class="flex justify-between items-center mb-5">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg">
                            ${msg.sender_name.charAt(0)}
                        </div>
                        <div>
                            <h4 class="text-[11px] font-black text-slate-800 uppercase leading-none">${msg.sender_name}</h4>
                            <p class="text-[8px] font-bold ${roleColor} uppercase tracking-widest mt-1">${msg.sender_role}</p>
                        </div>
                    </div>
                    <span class="text-[9px] font-bold text-slate-300">${UI.formatDate(msg.created_at)}</span>
                </div>

                <!-- Contenu -->
                <div class="relative">
                    ${isPhoto ? `
                        <div class="group relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white mb-2">
                            <img src="${msg.content}" class="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer" onclick="window.open('${msg.content}')">
                            <div class="absolute bottom-4 left-4">
                                ${humeurBadge}
                            </div>
                        </div>
                    ` : `
                        <div class="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative">
                            <i class="fa-solid fa-quote-left absolute top-4 left-4 text-slate-100 text-3xl"></i>
                            <p class="text-sm text-slate-600 leading-relaxed font-medium italic relative z-10">"${content}"</p>
                            <div class="mt-4">${humeurBadge}</div>
                        </div>
                    `}
                </div>

                <!-- Interactions (Style Diaspora) -->
                <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                    <div class="flex -space-x-1">
                        ${Object.entries(reactions).map(([type, count]) => count > 0 ? `
                            <div class="bg-white h-7 px-2 rounded-full border border-slate-100 shadow-sm flex items-center gap-1 animate-bounce">
                                <span class="text-xs">${type === 'coeur' ? '❤️' : '🙏'}</span>
                                <span class="text-[9px] font-black text-slate-400">${count}</span>
                            </div>
                        ` : '').join('')}
                    </div>

                    <div class="flex gap-2">
                        <button onclick="window.sendReaction('${msg.id}', 'coeur')" class="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-125">
                            <i class="fa-solid fa-heart"></i>
                        </button>
                        <button onclick="window.sendReaction('${msg.id}', 'merci')" class="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-125">
                            <i class="fa-solid fa-hands-praying"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * ✉️ ENVOYER UN MESSAGE RAPIDE (Famille <-> Équipe)
 */
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
                is_photo: false
            })
        });

        if (res.ok) {
            input.value = '';
            loadFeed(); // Rafraîchir
        }
    } catch (err) { console.error(err); }
};

/**
 * ❤️ RÉACTIONS ÉMOTIONNELLES
 */
window.sendReaction = async (msgId, type) => {
    try {
        UI.vibrate();
        await secureFetch('/messages/react', {
            method: 'POST',
            body: JSON.stringify({ message_id: msgId, reaction_type: type })
        });
        // On ne recharge pas tout le feed pour une simple réaction (UI Optimiste)
        loadFeed(); 
    } catch (err) { console.error(err); }
};
