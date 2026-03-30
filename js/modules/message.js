import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

/**
 * 📥 CHARGER LE JOURNAL DE SOINS
 * Cette fonction récupère le patient lié et affiche son fil d'actualité
 */
export async function loadFeed() {
    const container = document.getElementById('care-feed');
    if (!container) return;

    // 1. Si on est une Famille et qu'on n'a pas encore sélectionné de proche
    if (!AppState.currentPatient) {
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                <i class="fa-solid fa-hand-pointer text-slate-200 text-5xl mb-4"></i>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Choisissez un dossier dans l'onglet "Clients"</p>
            </div>`;
        return;
    }

    try {
        // 2. Récupération des messages (qui incluent les rapports de visites automatisés)
        const res = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        const messages = await res.json();
        AppState.messages = messages;
        renderFeed();
    } catch (err) {
        console.error("Erreur chargement Feed:", err);
    }
}

/**
 * 🎨 RENDU DU JOURNAL (Style WhatsApp / Story)
 */
export function renderFeed() {
    const container = document.getElementById('care-feed');
    if (!container) return;

    if (AppState.messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 opacity-20">
                <i class="fa-solid fa-feather-pointed text-5xl mb-4"></i>
                <p class="font-black uppercase text-xs">Le journal est encore vierge</p>
            </div>`;
        return;
    }

    // On inverse pour avoir le plus récent en haut
    container.innerHTML = AppState.messages.slice().reverse().map(msg => {
        const reactions = msg.reactions || {};
        const isPhoto = msg.is_photo;
        
        // On décode l'humeur si elle est présente dans le contenu (format: "Humeur|Message")
        let content = msg.content;
        let humeurBadge = "";
        
        if (content.includes('|')) {
            const parts = content.split('|');
            const humeur = parts[0];
            content = parts[1];
            
            const emojis = { "Très Joyeux": "😊", "Calme": "😐", "Fatigué": "😴", "Triste": "😔" };
            humeurBadge = `<span class="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] shadow-sm font-black border border-slate-100">${emojis[humeur] || '✨'} ${humeur}</span>`;
        }

        return `
            <div class="feed-card animate-fadeIn mb-8">
                <!-- En-tête de la publication -->
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-green-600 text-white flex items-center justify-center text-xs font-black shadow-lg">
                            ${msg.sender_name.charAt(0)}
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-800 uppercase tracking-tighter">${msg.sender_name}</p>
                            <p class="text-[8px] font-bold text-green-600 uppercase tracking-widest">${msg.sender_role}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-[9px] font-bold text-slate-300 block">${UI.formatDate(msg.created_at)}</span>
                    </div>
                </div>

                <!-- Contenu Principal -->
                <div class="relative">
                    ${isPhoto ? `
                        <div class="relative group">
                            <img src="${msg.content}" class="feed-photo shadow-xl border-4 border-white" onclick="window.open('${msg.content}')">
                            <div class="absolute top-4 left-4">${humeurBadge}</div>
                        </div>
                    ` : `
                        <div class="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <p class="text-sm text-slate-600 leading-relaxed font-medium italic">"${content}"</p>
                        </div>
                    `}
                </div>

                <!-- Barre d'Interaction Diaspora -->
                <div class="flex items-center justify-between mt-4 px-1">
                    <div class="flex gap-2" id="react-list-${msg.id}">
                        ${Object.entries(reactions).map(([type, count]) => `
                            <div class="bg-white px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-slate-100 shadow-sm animate-bounce">
                                <span>${type === 'coeur' ? '❤️' : '🙏'}</span>
                                <span class="text-slate-400">${count}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="flex gap-3">
                        <button onclick="window.sendReaction('${msg.id}', 'coeur')" class="w-10 h-10 rounded-full bg-white border border-slate-50 shadow-sm flex items-center justify-center hover:scale-125 transition-all active:bg-red-50 text-lg">❤️</button>
                        <button onclick="window.sendReaction('${msg.id}', 'merci')" class="w-10 h-10 rounded-full bg-white border border-slate-50 shadow-sm flex items-center justify-center hover:scale-125 transition-all active:bg-blue-50 text-lg">🙏</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * ❤️ ENVOYER UNE RÉACTION (EMPREINTE ÉMOTIONNELLE)
 */
window.sendReaction = async (msgId, type) => {
    try {
        UI.vibrate();
        // On fait clignoter l'élément visuellement avant l'appel API (UI Optimiste)
        await secureFetch('/messages/react', {
            method: 'POST',
            body: JSON.stringify({ message_id: msgId, reaction_type: type })
        });
        loadFeed(); 
    } catch (err) { console.error(err); }
};
