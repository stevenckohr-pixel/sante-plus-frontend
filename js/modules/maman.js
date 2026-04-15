import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

// Stockage des données Maman
let mamanData = {
    babyMetrics: {
        lastFeeding: null,
        sleep: null,
        diapers: null,
        weight: null
    },
    nextVisit: null,
    packs: []
};

/**
 * 📊 CHARGER LE DASHBOARD MAMAN
 */
export async function loadMamanDashboard() {
    const container = document.getElementById("view-container");
    if (!container) return;

    const userName = localStorage.getItem("user_name") || "Maman";
    const isMaman = localStorage.getItem("user_is_maman") === "true";

    if (!isMaman) {
        window.switchView('home');
        return;
    }

    // Récupérer les données
    await fetchMamanData();

    container.innerHTML = `
        <div class="maman-dashboard-container">
            <!-- Header avec salutation -->
            <div class="maman-header">
                <div>
                    <p class="text-[10px] font-bold text-pink-300 uppercase tracking-wider">Bonjour</p>
                    <h2 class="text-2xl font-black text-white">${escapeHtml(userName)}</h2>
                </div>
                <div class="relative">
                    <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <i class="fa-solid fa-bell text-white text-lg"></i>
                    </div>
                    <span id="maman-notif-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold hidden">0</span>
                </div>
            </div>

            <!-- Prochaine visite -->
            <div class="maman-next-visit">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[9px] font-bold text-pink-600 uppercase tracking-wider">Prochaine visite</p>
                        <h3 class="text-lg font-black text-slate-800">${formatVisitDate(mamanData.nextVisit?.date)}</h3>
                        <p class="text-xs text-slate-500">${mamanData.nextVisit?.time || 'Horaire non défini'} - ${mamanData.nextVisit?.location || 'À domicile'}</p>
                    </div>
                    <div class="bg-emerald-100 px-3 py-1 rounded-full">
                        <span class="text-[9px] font-bold text-emerald-600">${mamanData.nextVisit?.status || 'Planifié'}</span>
                    </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5">
                    <div class="bg-pink-500 h-1.5 rounded-full transition-all" style="width: ${calculateProgress()}%"></div>
                </div>
            </div>

            <!-- Baby Metrics (4 cartes) -->
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="maman-metric-card" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-baby-bottle text-pink-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dernière tétée</p>
                    <p class="text-xl font-black text-slate-800">${formatFeedingTime(mamanData.babyMetrics.lastFeeding)}</p>
                </div>
                <div class="maman-metric-card" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-moon text-blue-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sommeil</p>
                    <p class="text-xl font-black text-slate-800">${formatSleepHours(mamanData.babyMetrics.sleep)}</p>
                </div>
                <div class="maman-metric-card" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-droplet text-amber-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Couches</p>
                    <p class="text-xl font-black text-slate-800">${mamanData.babyMetrics.diapers || '0'}</p>
                </div>
                <div class="maman-metric-card" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-chart-line text-emerald-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Croissance</p>
                    <p class="text-xl font-black text-slate-800">${formatWeight(mamanData.babyMetrics.weight)}</p>
                </div>
            </div>


            <!-- Tracker d'humeur -->
<div class="maman-mood-tracker mb-6">
    <div class="flex justify-between items-center mb-3">
        <h4 class="font-bold text-slate-800 text-sm">Comment vous sentez-vous ?</h4>
        <button onclick="window.showMoodHistory()" class="text-[9px] text-pink-500">Historique</button>
    </div>
    <div class="flex justify-around gap-2">
        <button onclick="window.saveMood('excellent')" class="mood-btn" data-mood="excellent">
            <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl transition-all active:scale-95">😊</div>
            <span class="text-[9px] text-slate-500 mt-1">Excellent</span>
        </button>
        <button onclick="window.saveMood('bien')" class="mood-btn" data-mood="bien">
            <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl transition-all active:scale-95">😐</div>
            <span class="text-[9px] text-slate-500 mt-1">Bien</span>
        </button>
        <button onclick="window.saveMood('fatigue')" class="mood-btn" data-mood="fatigue">
            <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl transition-all active:scale-95">😴</div>
            <span class="text-[9px] text-slate-500 mt-1">Fatiguée</span>
        </button>
        <button onclick="window.saveMood('triste')" class="mood-btn" data-mood="triste">
            <div class="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-2xl transition-all active:scale-95">😔</div>
            <span class="text-[9px] text-slate-500 mt-1">Triste</span>
        </button>
    </div>
</div>

            <!-- Section Forfaits -->
            <div class="mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-slate-800 text-sm">Nos Forfaits</h4>
                    <button onclick="window.switchView('subscription')" class="text-[9px] font-bold text-pink-500">Voir tout</button>
                </div>
                <div id="maman-packs-list" class="space-y-3">
                    ${renderPacks()}
                </div>
            </div>

            <!-- Navigation rapide -->
            <div class="grid grid-cols-4 gap-2 mt-4">
                <button onclick="window.switchView('feed')" class="maman-nav-btn">
                    <i class="fa-regular fa-message text-pink-500 text-lg"></i>
                    <span>Messages</span>
                </button>
                <button onclick="window.switchView('planning')" class="maman-nav-btn">
                    <i class="fa-regular fa-calendar text-pink-500 text-lg"></i>
                    <span>Planning</span>
                </button>
                <button onclick="window.switchView('commandes')" class="maman-nav-btn">
                    <i class="fa-solid fa-box text-pink-500 text-lg"></i>
                    <span>Commandes</span>
                </button>
                <button onclick="window.switchView('profile')" class="maman-nav-btn">
                    <i class="fa-regular fa-user text-pink-500 text-lg"></i>
                    <span>Profil</span>
                </button>
            </div>
        </div>
    `;

    // Mettre à jour le badge des notifications
    await updateMamanNotifications();
}

/**
 * 📥 RÉCUPÉRER LES DONNÉES MAMAN
 */
async function fetchMamanData() {
    try {
        // Récupérer le patient
        const patients = await secureFetch("/patients");
        const patient = patients?.[0];
        
        if (patient) {
            // Récupérer les dernières données bébé depuis les messages
            const messages = await secureFetch(`/messages?patient_id=${patient.id}`);
            
            // Extraire les métriques des messages récents
            extractBabyMetrics(messages);
            
            // Récupérer la prochaine visite
            const visites = await secureFetch("/visites");
            const nextVisit = visites?.find(v => v.statut === "Planifié" && new Date(v.heure_debut) > new Date());
            if (nextVisit) {
                mamanData.nextVisit = {
                    date: nextVisit.heure_debut,
                    time: nextVisit.heure_prevue,
                    location: patient.adresse,
                    status: nextVisit.statut
                };
            }
        }
        
        // Récupérer les packs
        const packs = await secureFetch("/billing");
        mamanData.packs = packs || [];
        
    } catch (err) {
        console.error("Erreur chargement données Maman:", err);
    }
}

/**
 * 📊 EXTRAIRE LES MÉTRIQUES BÉBÉ DES MESSAGES
 */
function extractBabyMetrics(messages) {
    // Parcourir les 20 derniers messages
    const recentMessages = messages?.slice(-20) || [];
    
    for (const msg of recentMessages) {
        const content = msg.content || '';
        
        // Détection tétée
        if (content.includes('tétée') || content.includes('allaitement')) {
            const match = content.match(/(\d+)\s*(h|heure|min)/i);
            if (match) {
                mamanData.babyMetrics.lastFeeding = parseInt(match[1]);
            }
        }
        
        // Détection sommeil
        if (content.includes('sommeil') || content.includes('dormi')) {
            const match = content.match(/(\d+)\s*(h|heure)/i);
            if (match) {
                mamanData.babyMetrics.sleep = parseInt(match[1]);
            }
        }
        
        // Détection couches
        if (content.includes('couche') || content.includes('change')) {
            const match = content.match(/(\d+)/);
            if (match) {
                mamanData.babyMetrics.diapers = parseInt(match[1]);
            }
        }
        
        // Détection poids
        if (content.includes('poids') || content.includes('gramme')) {
            const match = content.match(/(\d+)\s*(g|gramme)/i);
            if (match) {
                mamanData.babyMetrics.weight = parseInt(match[1]);
            }
        }
    }
}

/**
 * 🎨 AFFICHER LES PACKS
 */
function renderPacks() {
    const packs = [
        { name: 'Essentiel', desc: '2 visites / semaine', price: '45 000', popular: false },
        { name: 'Confort', desc: '3-4 visites / semaine', price: '85 000', popular: true },
        { name: 'Sérénité', desc: '6-7 visites / semaine', price: '150 000', popular: false }
    ];
    
    return packs.map(pack => `
        <div class="maman-pack-card ${pack.popular ? 'border-pink-200 bg-pink-50/30' : ''}" onclick="window.switchView('subscription')">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold text-slate-800">${pack.name}</p>
                    <p class="text-[9px] text-slate-400">${pack.desc}</p>
                </div>
                <p class="font-black text-pink-600">${pack.price} F</p>
            </div>
            ${pack.popular ? '<span class="text-[8px] font-bold text-pink-500 mt-1 block">⭐ Populaire</span>' : ''}
        </div>
    `).join('');
}

/**
 * 📅 FORMATER LA DATE DE VISITE
 */
function formatVisitDate(dateStr) {
    if (!dateStr) return 'À venir';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * 📊 CALCULER LA PROGRESSION (exemple)
 */
function calculateProgress() {
    // À améliorer avec de vraies données
    return 70;
}

/**
 * 🍼 FORMATER L'HEURE DE LA DERNIÈRE TÉTÉE
 */
function formatFeedingTime(hours) {
    if (!hours) return '--';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours}h`;
}

/**
 * 😴 FORMATER LES HEURES DE SOMMEIL
 */
function formatSleepHours(hours) {
    if (!hours) return '--';
    return `${hours}h`;
}

/**
 * ⚖️ FORMATER LE POIDS
 */
function formatWeight(grams) {
    if (!grams) return '--';
    if (grams < 1000) return `${grams}g`;
    return `${(grams / 1000).toFixed(1)} kg`;
}

/**
 * 🔔 METTRE À JOUR LES NOTIFICATIONS MAMAN
 */
async function updateMamanNotifications() {
    try {
        const notifications = await secureFetch("/notifications", { noCache: true });
        const unreadCount = notifications.filter(n => !n.read).length;
        
        const badge = document.getElementById('maman-notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error("Erreur notifications:", err);
    }
}

/**
 * 🔧 ESCAPE HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}



/**
 * 😊 SAUVEGARDER L'HUMEUR
 */
window.saveMood = async (mood) => {
    const moodEmojis = {
        excellent: '😊',
        bien: '😐',
        fatigue: '😴',
        triste: '😔'
    };
    
    try {
        // Envoyer l'humeur comme un message spécial dans le feed
        await secureFetch('/messages/send', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: AppState.currentPatient,
                content: `${moodEmojis[mood]} Humeur: ${mood}`,
                is_photo: false,
                type_media: 'MOOD'
            })
        });
        
        // Feedback visuel
        const btn = document.querySelector(`[data-mood="${mood}"] div`);
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 200);
        }
        
        UI.success("Humeur enregistrée !");
        
        // Rafraîchir le dashboard
        setTimeout(() => loadMamanDashboard(), 500);
        
    } catch (err) {
        console.error("Erreur sauvegarde humeur:", err);
        UI.error("Impossible d'enregistrer l'humeur");
    }
};

/**
 * 📊 AFFICHER L'HISTORIQUE DES HUMEURS
 */
window.showMoodHistory = async () => {
    try {
        const messages = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        const moods = messages.filter(m => m.type_media === 'MOOD' || m.content?.includes('Humeur:'));
        
        if (moods.length === 0) {
            Swal.fire({
                title: "Pas encore d'humeur",
                text: "Utilisez le tracker pour enregistrer votre humeur",
                icon: "info",
                confirmButtonColor: "#DB2777"
            });
            return;
        }
        
        const lastWeekMoods = moods.slice(-7).reverse();
        
        Swal.fire({
            title: "📊 Mon évolution",
            html: `
                <div class="space-y-2 max-h-96 overflow-y-auto">
                    ${lastWeekMoods.map(m => `
                        <div class="flex justify-between items-center p-3 bg-pink-50 rounded-xl">
                            <span class="text-lg">${m.content?.split(' ')[0] || '😊'}</span>
                            <span class="text-xs text-slate-500">${new Date(m.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                    `).join('')}
                </div>
            `,
            confirmButtonText: "Fermer",
            confirmButtonColor: "#DB2777",
            customClass: { popup: 'rounded-2xl' }
        });
        
    } catch (err) {
        console.error(err);
    }
};



/**
 * 📊 EXTRAIRE LES MÉTRIQUES BÉBÉ DES MESSAGES (AMÉLIORÉ)
 */
function extractBabyMetrics(messages) {
    // Initialiser avec des valeurs par défaut
    let lastFeeding = null;
    let sleepHours = null;
    let diaperCount = 0;
    let lastWeight = null;
    
    // Parcourir les 30 derniers messages
    const recentMessages = [...(messages || [])].slice(-30);
    
    for (const msg of recentMessages) {
        const content = msg.content?.toLowerCase() || '';
        
        // Détection tétée - cherche "tétée", "allaitement", "biberon"
        if (content.includes('tétée') || content.includes('allaitement') || content.includes('biberon')) {
            // Cherche un nombre suivi de h, heure, min
            const patterns = [/(\d+)\s*h/, /(\d+)\s*heure/, /(\d+)\s*min/];
            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match) {
                    let value = parseInt(match[1]);
                    if (pattern.toString().includes('min')) {
                        value = value / 60; // Convertir minutes en heures
                    }
                    if (!lastFeeding || value < lastFeeding) {
                        lastFeeding = value; // Prendre la valeur la plus récente (la plus petite)
                    }
                    break;
                }
            }
        }
        
        // Détection sommeil
        if (content.includes('sommeil') || content.includes('dormi') || content.includes('nuit')) {
            const match = content.match(/(\d+)\s*(h|heure)/);
            if (match) {
                sleepHours = parseInt(match[1]);
            }
        }
        
        // Détection couches
        if (content.includes('couche') || content.includes('change') || content.includes('pipi') || content.includes('caca')) {
            const match = content.match(/(\d+)/);
            if (match) {
                diaperCount = parseInt(match[1]);
            }
        }
        
        // Détection poids
        if (content.includes('poids') || content.includes('gramme') || content.includes('kg')) {
            const match = content.match(/(\d+)\s*(g|gramme|kg)/i);
            if (match) {
                let weight = parseInt(match[1]);
                if (match[2] === 'kg') {
                    weight = weight * 1000;
                }
                lastWeight = weight;
            }
        }
    }
    
    // Mettre à jour les données
    mamanData.babyMetrics.lastFeeding = lastFeeding;
    mamanData.babyMetrics.sleep = sleepHours;
    mamanData.babyMetrics.diapers = diaperCount || mamanData.babyMetrics.diapers;
    mamanData.babyMetrics.weight = lastWeight || mamanData.babyMetrics.weight;
    
    // Sauvegarder dans localStorage pour persistance
    if (lastFeeding) localStorage.setItem('maman_last_feeding', lastFeeding);
    if (sleepHours) localStorage.setItem('maman_sleep', sleepHours);
    if (diaperCount) localStorage.setItem('maman_diapers', diaperCount);
    if (lastWeight) localStorage.setItem('maman_weight', lastWeight);
}





/**
 * 🚨 DÉTECTION DES ALERTES (saignements, douleurs, fièvre)
 */
function checkForAlerts(content) {
    const alertKeywords = {
        'saignement': { level: 'urgent', message: '⚠️ Saignement signalé - Contacter immédiatement' },
        'douleur': { level: 'warning', message: '📢 Douleur signalée - Suivi nécessaire' },
        'fièvre': { level: 'warning', message: '🌡️ Fièvre détectée - Surveiller la température' },
        'malaise': { level: 'urgent', message: '🚨 Malaise signalé - Intervention urgente' },
        'vertige': { level: 'warning', message: '🎢 Vertiges - Repos recommandé' }
    };
    
    const lowerContent = content.toLowerCase();
    
    for (const [keyword, alert] of Object.entries(alertKeywords)) {
        if (lowerContent.includes(keyword)) {
            // Créer une notification d'alerte
            createMamanAlert(keyword, alert.message, alert.level);
            return true;
        }
    }
    return false;
}

/**
 * 🔔 CRÉER UNE ALERTE MAMAN
 */
async function createMamanAlert(type, message, level) {
    try {
        // Envoyer une notification au coordinateur
        await secureFetch('/notifications/send', {
            method: 'POST',
            body: JSON.stringify({
                userId: localStorage.getItem("user_id"),
                title: level === 'urgent' ? '🚨 ALERTE MAMAN' : '⚠️ Attention Maman',
                message: `${type.toUpperCase()}: ${message}`,
                type: 'alert',
                url: '/#feed'
            })
        });
        
        // Afficher une alerte visuelle
        Swal.fire({
            title: level === 'urgent' ? '🚨 Alerte Santé' : '⚠️ Attention',
            text: message,
            icon: level === 'urgent' ? 'error' : 'warning',
            confirmButtonColor: '#DB2777',
            timer: 5000
        });
        
        // Journaliser l'alerte
        console.log(`📋 Alerte ${level}: ${type} - ${message}`);
        
    } catch (err) {
        console.error("Erreur création alerte:", err);
    }
}


export { loadMamanDashboard, updateMamanNotifications, checkForAlerts };
