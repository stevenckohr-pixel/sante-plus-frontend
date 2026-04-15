import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";
import supabase from "../core/supabaseClient.js";

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

    // Récupérer l'ID du patient
    let patientId = null;
    try {
        const { data: patients, error } = await supabase
            .from("patients")
            .select("id")
            .eq("famille_user_id", localStorage.getItem("user_id"))
            .maybeSingle();
        
        if (error) throw error;
        patientId = patients?.id;
        
        if (!patientId) {
            console.error("Aucun patient trouvé pour cette famille");
            container.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Aucun patient associé à votre compte</p></div>`;
            return;
        }
    } catch (err) {
        console.error("Erreur récupération patient:", err);
        container.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Erreur de chargement</p></div>`;
        return;
    }

    // Charger toutes les données en parallèle
    const [babyMetrics, nextVisit, progress, todayMood] = await Promise.all([
        fetchBabyMetrics(patientId),
        fetchNextVisit(patientId),
        calculateProgress(patientId),
        fetchTodayMood(patientId)
    ]);

    // Formater les données
    const formattedMetrics = {
        lastFeeding: babyMetrics.lastFeeding,
        sleep: babyMetrics.sleep,
        diapers: babyMetrics.diapers,
        weight: babyMetrics.weight
    };

    // Fonctions de formatage
    const formatFeedingTime = (hours) => {
        if (!hours) return '--';
        if (hours < 1) return `${Math.round(hours * 60)} min`;
        return `${hours}h`;
    };

    const formatSleepHours = (hours) => {
        if (!hours) return '--';
        return `${hours}h`;
    };

    const formatWeight = (grams) => {
        if (!grams) return '--';
        if (grams < 1000) return `${grams}g`;
        return `${(grams / 1000).toFixed(1)} kg`;
    };

    const formatVisitDate = (dateStr) => {
        if (!dateStr) return 'À venir';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Rendu du HTML avec les vraies données
    container.innerHTML = `
        <div class="maman-dashboard-container">
            <!-- Header -->
            <div class="dashboard-card" style="background: linear-gradient(135deg, #E11D48 0%, #BE123C 100%); padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 600;">Bonjour</p>
                        <h2 style="color: white; font-size: 24px; font-weight: 800; margin-top: 4px;">${escapeHtml(userName)}</h2>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); width: 48px; height: 48px; border-radius: 24px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-bell" style="color: white; font-size: 20px;"></i>
                        <span id="maman-notif-badge" class="badge-notification" style="position: absolute; top: -5px; right: -5px; display: none;">0</span>
                    </div>
                </div>
            </div>

            <!-- Prochaine visite -->
            <div class="dashboard-card" style="background: linear-gradient(135deg, #FFF1F2 0%, white 100%); margin-bottom: 20px;">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[10px] font-bold text-pink-600 uppercase tracking-wider">PROCHAINE VISITE</p>
                        <h3 class="text-lg font-black text-slate-800 mt-1">${formatVisitDate(nextVisit?.date)}</h3>
                        <p class="text-xs text-slate-500 mt-0.5">${nextVisit?.time || 'Horaire non défini'} • ${nextVisit?.location || 'À domicile'}</p>
                    </div>
                    <div style="background: #FFF1F2; padding: 6px 12px; border-radius: 20px;">
                        <span class="text-[10px] font-bold text-pink-600">${nextVisit?.status || 'Planifié'}</span>
                    </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="h-2 rounded-full bg-pink-500 transition-all" style="width: ${progress}%"></div>
                </div>
            </div>

            <!-- Baby Metrics -->
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="dashboard-card" style="cursor: pointer;" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-baby-bottle text-pink-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dernière tétée</p>
                    <p class="text-2xl font-black text-slate-800 mt-1">${formatFeedingTime(formattedMetrics.lastFeeding)}</p>
                    <p class="text-[10px] text-slate-400">depuis dernier repas</p>
                </div>
                
                <div class="dashboard-card" style="cursor: pointer;" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-moon text-blue-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sommeil</p>
                    <p class="text-2xl font-black text-slate-800 mt-1">${formatSleepHours(formattedMetrics.sleep)}</p>
                    <p class="text-[10px] text-slate-400">aujourd'hui</p>
                </div>
                
                <div class="dashboard-card" style="cursor: pointer;" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-droplet text-amber-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Couches</p>
                    <p class="text-2xl font-black text-slate-800 mt-1">${formattedMetrics.diapers || '0'}</p>
                    <p class="text-[10px] text-slate-400">changées aujourd'hui</p>
                </div>
                
                <div class="dashboard-card" style="cursor: pointer;" onclick="window.switchView('feed')">
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-chart-line text-emerald-500 text-lg"></i>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Croissance</p>
                    <p class="text-2xl font-black text-slate-800 mt-1">${formatWeight(formattedMetrics.weight)}</p>
                    <p class="text-[10px] text-slate-400">cette semaine</p>
                </div>
            </div>

            <!-- Humeur -->
            <div class="dashboard-card" style="margin-bottom: 20px;">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-slate-800 text-sm">Comment vous sentez-vous ?</h4>
                    <button onclick="window.showMoodHistoryFromDB()" class="text-[11px] font-semibold text-pink-500">Historique</button>
                </div>
                <div class="grid grid-cols-4 gap-2">
                    <button onclick="window.saveMoodToDB('excellent')" class="mood-btn">
                        <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl transition-all active:scale-95 mx-auto">😊</div>
                        <span class="text-[9px] text-slate-500 mt-1 block text-center">Excellent</span>
                    </button>
                    <button onclick="window.saveMoodToDB('bien')" class="mood-btn">
                        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl transition-all active:scale-95 mx-auto">😐</div>
                        <span class="text-[9px] text-slate-500 mt-1 block text-center">Bien</span>
                    </button>
                    <button onclick="window.saveMoodToDB('fatigue')" class="mood-btn">
                        <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl transition-all active:scale-95 mx-auto">😴</div>
                        <span class="text-[9px] text-slate-500 mt-1 block text-center">Fatiguée</span>
                    </button>
                    <button onclick="window.saveMoodToDB('triste')" class="mood-btn">
                        <div class="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-2xl transition-all active:scale-95 mx-auto">😔</div>
                        <span class="text-[9px] text-slate-500 mt-1 block text-center">Triste</span>
                    </button>
                </div>
            </div>

            <!-- Forfaits -->
            <div class="mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-slate-800 text-sm">Nos Forfaits</h4>
                    <button onclick="window.switchView('subscription')" class="text-[11px] font-semibold text-pink-500">Voir tout</button>
                </div>
                <div class="space-y-3">
                    <div class="bg-white rounded-xl p-4 border border-slate-100" onclick="window.switchView('subscription')">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-slate-800">Essentiel</p>
                                <p class="text-[9px] text-slate-400">2 visites / semaine</p>
                            </div>
                            <p class="font-black text-pink-600">45 000 F</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-4 border border-pink-200 bg-pink-50/30" onclick="window.switchView('subscription')">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-slate-800">Confort</p>
                                <p class="text-[9px] text-slate-400">3-4 visites / semaine</p>
                            </div>
                            <p class="font-black text-pink-600">85 000 F</p>
                        </div>
                        <span class="text-[8px] font-bold text-pink-500 mt-1 block">⭐ Populaire</span>
                    </div>
                    <div class="bg-white rounded-xl p-4 border border-slate-100" onclick="window.switchView('subscription')">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-slate-800">Sérénité</p>
                                <p class="text-[9px] text-slate-400">6-7 visites / semaine</p>
                            </div>
                            <p class="font-black text-pink-600">150 000 F</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation -->
            <div class="grid grid-cols-4 gap-2 mt-4">
                <button onclick="window.switchView('feed')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-regular fa-message text-lg"></i>
                    <span class="text-[9px] font-bold">Messages</span>
                </button>
                <button onclick="window.switchView('planning')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-regular fa-calendar text-lg"></i>
                    <span class="text-[9px] font-bold">Planning</span>
                </button>
                <button onclick="window.switchView('commandes')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-solid fa-box text-lg"></i>
                    <span class="text-[9px] font-bold">Commandes</span>
                </button>
                <button onclick="window.switchView('profile')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-regular fa-user text-lg"></i>
                    <span class="text-[9px] font-bold">Profil</span>
                </button>
            </div>
        </div>
    `;

    // Mettre à jour le badge des notifications
    await updateMamanNotifications();
}
/**
 * 📥 RÉCUPÉRER LES DONNÉES MAMAN DEPUIS LA BDD
 */
async function fetchMamanDataFromDB() {
    try {
        // Récupérer le patient
        const patients = await secureFetch("/patients");
        const patient = patients?.[0];
        
        if (!patient) return;
        
        // Récupérer les métriques bébé depuis la BDD
        const metrics = await secureFetch(`/educational/baby-metrics/${patient.id}?limit=1`);
        if (metrics && metrics.length > 0) {
            const latest = metrics[0];
            if (latest.metric_type === 'feeding') mamanData.babyMetrics.lastFeeding = latest.value;
            if (latest.metric_type === 'sleep') mamanData.babyMetrics.sleep = latest.value;
            if (latest.metric_type === 'diapers') mamanData.babyMetrics.diapers = latest.value;
            if (latest.metric_type === 'weight') mamanData.babyMetrics.weight = latest.value;
        }
        
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
        
    } catch (err) {
        console.error("Erreur chargement données Maman:", err);
    }
}

/**
 * 😊 SAUVEGARDER L'HUMEUR DANS LA BDD
 */
window.saveMoodToDB = async (mood) => {
    const moodEmojis = {
        excellent: '😊',
        bien: '😐',
        fatigue: '😴',
        triste: '😔'
    };
    
    try {
        const patients = await secureFetch("/patients");
        const patient = patients?.[0];
        
        if (!patient) {
            UI.error("Patient non trouvé");
            return;
        }
        
        await secureFetch('/educational/mood', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: patient.id,
                mood: mood,
                notes: null
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
 * 📊 AFFICHER L'HISTORIQUE DES HUMEURS DEPUIS LA BDD
 */
window.showMoodHistoryFromDB = async () => {
    try {
        const patients = await secureFetch("/patients");
        const patient = patients?.[0];
        
        if (!patient) return;
        
        const moods = await secureFetch(`/educational/moods/${patient.id}`);
        
        if (moods.length === 0) {
            Swal.fire({
                title: "Pas encore d'humeur",
                text: "Utilisez le tracker pour enregistrer votre humeur",
                icon: "info",
                confirmButtonColor: "#DB2777"
            });
            return;
        }
        
        Swal.fire({
            title: "📊 Mon évolution",
            html: `
                <div class="space-y-2 max-h-96 overflow-y-auto">
                    ${moods.map(m => `
                        <div class="flex justify-between items-center p-3 bg-pink-50 rounded-xl">
                            <span class="text-lg">${getMoodEmoji(m.mood)}</span>
                            <span class="text-xs text-slate-500">${new Date(m.recorded_at).toLocaleDateString('fr-FR')}</span>
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
        UI.error("Impossible de charger l'historique");
    }
};

function getMoodEmoji(mood) {
    const emojis = {
        excellent: '😊',
        bien: '😐',
        fatigue: '😴',
        triste: '😔'
    };
    return emojis[mood] || '😊';
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
 * 📊 CALCULER LA PROGRESSION
 */

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
 * 🚨 DÉTECTION DES ALERTES
 */
export function checkForAlerts(content) {
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
        
        Swal.fire({
            title: level === 'urgent' ? '🚨 Alerte Santé' : '⚠️ Attention',
            text: message,
            icon: level === 'urgent' ? 'error' : 'warning',
            confirmButtonColor: '#DB2777',
            timer: 5000
        });
        
        console.log(`📋 Alerte ${level}: ${type} - ${message}`);
        
    } catch (err) {
        console.error("Erreur création alerte:", err);
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
 * 📥 RÉCUPÉRER LES MÉTRIQUES BÉBÉ DEPUIS LA BDD
 */
async function fetchBabyMetrics(patientId) {
    try {
        const { data, error } = await supabase
            .from("baby_metrics")
            .select("metric_type, value, unit, recorded_at")
            .eq("patient_id", patientId)
            .order("recorded_at", { ascending: false });
        
        if (error) throw error;
        
        const metrics = {
            lastFeeding: null,
            sleep: null,
            diapers: null,
            weight: null
        };
        
        // Prendre la dernière valeur pour chaque type
        const latestByType = {};
        for (const item of data || []) {
            if (!latestByType[item.metric_type]) {
                latestByType[item.metric_type] = item;
            }
        }
        
        if (latestByType.feeding) metrics.lastFeeding = latestByType.feeding.value;
        if (latestByType.sleep) metrics.sleep = latestByType.sleep.value;
        if (latestByType.diapers) metrics.diapers = latestByType.diapers.value;
        if (latestByType.weight) metrics.weight = latestByType.weight.value;
        
        return metrics;
    } catch (err) {
        console.error("Erreur fetch baby metrics:", err);
        return { lastFeeding: null, sleep: null, diapers: null, weight: null };
    }
}

/**
 * 📥 RÉCUPÉRER LA PROCHAINE VISITE
 */
async function fetchNextVisit(patientId) {
    try {
        const { data, error } = await supabase
            .from("planning")
            .select("date_prevue, heure_prevue, patient:patients(adresse)")
            .eq("patient_id", patientId)
            .eq("est_actif", true)
            .gte("date_prevue", new Date().toISOString().split('T')[0])
            .order("date_prevue", { ascending: true })
            .limit(1)
            .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
            return {
                date: data.date_prevue,
                time: data.heure_prevue,
                location: data.patient?.adresse || "À domicile",
                status: "Planifié"
            };
        }
        return null;
    } catch (err) {
        console.error("Erreur fetch next visit:", err);
        return null;
    }
}

/**
 * 📥 RÉCUPÉRER L'HUMEUR DU JOUR
 */
async function fetchTodayMood(patientId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from("mama_moods")
            .select("mood")
            .eq("patient_id", patientId)
            .gte("recorded_at", `${today}T00:00:00`)
            .lte("recorded_at", `${today}T23:59:59`)
            .maybeSingle();
        
        if (error) throw error;
        return data?.mood || null;
    } catch (err) {
        console.error("Erreur fetch mood:", err);
        return null;
    }
}

/**
 * 📊 CALCULER LA PROGRESSION (visites validées / total visites)
 */
async function calculateProgress(patientId) {
    try {
        const { data, error } = await supabase
            .from("visites")
            .select("statut")
            .eq("patient_id", patientId);
        
        if (error) throw error;
        
        const total = data?.length || 0;
        const completed = data?.filter(v => v.statut === "Validé").length || 0;
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    } catch (err) {
        console.error("Erreur calcul progression:", err);
        return 0;
    }
}
// Export
export {updateMamanNotifications};
