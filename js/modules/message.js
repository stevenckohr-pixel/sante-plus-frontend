import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

/**
 * Charge le journal de soins pour le patient sélectionné
 */
export async function loadFeed() {
  const container = document.getElementById("care-feed");
  if (!container) return;

  if (!AppState.currentPatient) {
    container.innerHTML = `
            <div class="text-center py-20">
                <i class="fa-solid fa-person-dots-from-line text-slate-200 text-5xl mb-4"></i>
                <p class="text-slate-400 text-xs font-bold uppercase">Sélectionnez un proche pour voir son journal</p>
            </div>`;
    return;
  }

  try {
    const res = await secureFetch(
      `/messages?patient_id=${AppState.currentPatient}`,
    );
    const messages = await res.json();
    AppState.messages = messages;
    renderFeed();
  } catch (err) {
    console.error("Erreur Feed:", err);
  }
}

/**
 * Affiche les messages et les rapports de visite style "WhatsApp/Facebook"
 */
export function renderFeed() {
  const container = document.getElementById("care-feed");
  if (!container) return;

  container.innerHTML = AppState.messages
    .map((msg) => {
      const reactions = msg.reactions || {};

      return `
            <div class="feed-card animate-fadeIn mb-6">
                <!-- En-tête : Qui et Quand -->
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-black">
                            ${msg.sender_name.charAt(0)}
                        </div>
                        <span class="text-[10px] font-black text-slate-700 uppercase">${msg.sender_name}</span>
                    </div>
                    <span class="text-[9px] font-bold text-slate-300">${UI.formatDate(msg.created_at)}</span>
                </div>

                <!-- Contenu : Texte ou Photo -->
                ${
                  msg.is_photo
                    ? `
                    <img src="${msg.content}" class="feed-photo shadow-lg" onclick="window.open('${msg.content}')">
                `
                    : `
                    <p class="text-sm text-slate-600 leading-relaxed font-medium">${msg.content}</p>
                `
                }

                <!-- Zone de Réactions (Innovation n°2) -->
                <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                    <div class="flex gap-1.5" id="react-list-${msg.id}">
                        ${Object.entries(reactions)
                          .map(
                            ([type, count]) => `
                            <span class="bg-slate-50 px-2 py-1 rounded-full text-[10px] font-black border border-slate-100">
                                ${type === "coeur" ? "❤️" : "🙏"} ${count}
                            </span>
                        `,
                          )
                          .join("")}
                    </div>

                    <!-- Boutons d'interaction rapide -->
                    <div class="flex gap-1">
                        <button onclick="window.sendReaction('${msg.id}', 'coeur')" class="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-all">❤️</button>
                        <button onclick="window.sendReaction('${msg.id}', 'merci')" class="w-8 h-8 rounded-full hover:bg-blue-50 flex items-center justify-center transition-all">🙏</button>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * Envoyer un Like/Réaction (Émotionnel)
 */
window.sendReaction = async (msgId, type) => {
  try {
    UI.vibrate();
    await secureFetch("/messages/react", {
      method: "POST",
      body: JSON.stringify({ message_id: msgId, reaction_type: type }),
    });
    loadFeed(); // Rafraîchir pour voir son propre like
  } catch (err) {
    console.error(err);
  }
};
