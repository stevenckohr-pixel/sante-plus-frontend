// js/modules/maman.js
import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";
import supabase from "../core/supabaseClient.js";

/**
 * 📱 DASHBOARD MAMAN COMPLET (Accueil unique)
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
        let patients = await secureFetch("/patients");
        if (!Array.isArray(patients)) patients = patients?.data || [];
        patientId = patients[0]?.id;
        
        if (!patientId) {
            container.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Aucun patient associé</p></div>`;
            return;
        }
    } catch (err) {
        console.error("Erreur récupération patient:", err);
    }

    // Charger toutes les données
    const [babyMetrics, nextVisit, progress] = await Promise.all([
        fetchBabyMetrics(patientId),
        fetchNextVisit(patientId),
        calculateProgress(patientId)
    ]);

    // Formater les données
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
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    };

    container.innerHTML = `
        <div class="maman-dashboard-container animate-fadeIn pb-24">
            <!-- HEADER ROSE -->
            <div class="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 mb-5 text-white">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-[10px] font-bold opacity-80">Bonjour</p>
                        <h2 class="text-2xl font-black">${escapeHtml(userName.split(' ')[0])}</h2>
                        <p class="text-sm opacity-90 mt-1">Suivi maman & bébé</p>
                    </div>
                    <div class="relative">
                        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <i class="fa-regular fa-bell text-white text-lg"></i>
                        </div>
                        <span id="maman-notif-badge" class="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] text-white flex items-center justify-center hidden">0</span>
                    </div>
                </div>
            </div>

            <!-- PROCHAINE VISITE -->
            <div class="bg-white rounded-xl p-4 mb-5 shadow-sm border border-pink-100">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-[9px] font-bold text-pink-500 uppercase tracking-wider">📅 PROCHAINE VISITE</p>
                        <h3 class="text-base font-black text-slate-800">${formatVisitDate(nextVisit?.date)}</h3>
                        <p class="text-xs text-slate-500">${nextVisit?.time || 'Horaire non défini'} • ${nextVisit?.location || 'À domicile'}</p>
                    </div>
                    <div class="bg-pink-50 px-3 py-1 rounded-full">
                        <span class="text-[9px] font-bold text-pink-600">${nextVisit?.status || 'Planifié'}</span>
                    </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div class="h-1.5 rounded-full bg-pink-500 transition-all" style="width: ${progress}%"></div>
                </div>
            </div>

            <!-- MÉTRIQUES BÉBÉ (4 cartes cliquables) -->
            <div class="grid grid-cols-2 gap-3 mb-5">
                <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 active:scale-95 transition-all" onclick="window.openAddMetricModal('feeding')">
                    <div class="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-baby-bottle text-pink-500 text-base"></i>
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">Dernière tétée</p>
                    <p class="text-xl font-black text-slate-800">${formatFeedingTime(babyMetrics?.lastFeeding)}</p>
                    <p class="text-[9px] text-slate-400">depuis dernier repas</p>
                </div>
                
                <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 active:scale-95 transition-all" onclick="window.openAddMetricModal('sleep')">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-moon text-blue-500 text-base"></i>
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">Sommeil</p>
                    <p class="text-xl font-black text-slate-800">${formatSleepHours(babyMetrics?.sleep)}</p>
                    <p class="text-[9px] text-slate-400">aujourd'hui</p>
                </div>
                
                <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 active:scale-95 transition-all" onclick="window.openAddMetricModal('diapers')">
                    <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-droplet text-amber-500 text-base"></i>
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">Couches</p>
                    <p class="text-xl font-black text-slate-800">${babyMetrics?.diapers || '0'}</p>
                    <p class="text-[9px] text-slate-400">changées aujourd'hui</p>
                </div>
                
                <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 active:scale-95 transition-all" onclick="window.openAddMetricModal('weight')">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-chart-line text-emerald-500 text-base"></i>
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">Croissance</p>
                    <p class="text-xl font-black text-slate-800">${formatWeight(babyMetrics?.weight)}</p>
                    <p class="text-[9px] text-slate-400">cette semaine</p>
                </div>
            </div>

            <!-- TRACKER D'HUMEUR -->
            <div class="bg-white rounded-xl p-4 mb-5 shadow-sm border border-pink-100">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-slate-800 text-sm">💝 Comment vous sentez-vous ?</h4>
                    <button onclick="window.showMoodHistoryFromDB()" class="text-[10px] font-semibold text-pink-500">Historique</button>
                </div>
                <div class="grid grid-cols-4 gap-2">
                    <button onclick="window.saveMoodToDB('excellent')" class="mood-btn flex flex-col items-center active:scale-95 transition-all">
                        <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">😊</div>
                        <span class="text-[8px] text-slate-500 mt-1">Excellent</span>
                    </button>
                    <button onclick="window.saveMoodToDB('bien')" class="mood-btn flex flex-col items-center active:scale-95 transition-all">
                        <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">😐</div>
                        <span class="text-[8px] text-slate-500 mt-1">Bien</span>
                    </button>
                    <button onclick="window.saveMoodToDB('fatigue')" class="mood-btn flex flex-col items-center active:scale-95 transition-all">
                        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl">😴</div>
                        <span class="text-[8px] text-slate-500 mt-1">Fatiguée</span>
                    </button>
                    <button onclick="window.saveMoodToDB('triste')" class="mood-btn flex flex-col items-center active:scale-95 transition-all">
                        <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-xl">😔</div>
                        <span class="text-[8px] text-slate-500 mt-1">Triste</span>
                    </button>
                </div>
            </div>

            <!-- FORFAITS -->
            <div class="mb-5">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-slate-800 text-sm">🎁 Nos Forfaits</h4>
                    <button onclick="window.switchView('subscription')" class="text-[10px] font-semibold text-pink-500">Voir tout</button>
                </div>
                <div class="space-y-2">
                    <div class="bg-white rounded-xl p-3 border border-slate-100 active:scale-98 transition-all" onclick="window.switchView('subscription')">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-slate-800 text-sm">Essentiel</p>
                                <p class="text-[9px] text-slate-400">2 visites / semaine</p>
                            </div>
                            <p class="font-black text-pink-600">45 000 F</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-3 border border-pink-200 bg-pink-50/30 active:scale-98 transition-all" onclick="window.switchView('subscription')">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-slate-800 text-sm">Confort</p>
                                <p class="text-[9px] text-slate-400">3-4 visites / semaine</p>
                            </div>
                            <p class="font-black text-pink-600">85 000 F</p>
                        </div>
                        <span class="text-[7px] font-bold text-pink-500 mt-1 block">⭐ Populaire</span>
                    </div>
                    <div class="bg-white rounded-xl p-3 border border-slate-100 active:scale-98 transition-all" onclick="window.switchView('subscription')">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-slate-800 text-sm">Sérénité</p>
                                <p class="text-[9px] text-slate-400">6-7 visites / semaine</p>
                            </div>
                            <p class="font-black text-pink-600">150 000 F</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- NAVIGATION RAPIDE -->
            <div class="grid grid-cols-4 gap-2">
                <button onclick="window.switchView('feed')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-regular fa-message text-base"></i>
                    <span class="text-[8px] font-bold">Journal</span>
                </button>
                <button onclick="window.switchView('visits')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-regular fa-calendar-check text-base"></i>
                    <span class="text-[8px] font-bold">Visites</span>
                </button>
                <button onclick="window.switchView('commandes')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-solid fa-box text-base"></i>
                    <span class="text-[8px] font-bold">Commandes</span>
                </button>
                <button onclick="window.switchView('profile')" class="flex flex-col items-center gap-1 py-3 bg-white rounded-xl border border-pink-100 text-pink-500 active:scale-95 transition-all">
                    <i class="fa-regular fa-user text-base"></i>
                    <span class="text-[8px] font-bold">Profil</span>
                </button>
            </div>
        </div>
    `;

    await updateMamanNotifications();
}

// ============================================================
// FONCTIONS DE RÉCUPÉRATION DES DONNÉES
// ============================================================

/**
 * 📥 RÉCUPÉRER LES MÉTRIQUES BÉBÉ
 */
async function fetchBabyMetrics(patientId) {
    try {
        const { data, error } = await supabase
            .from("baby_metrics")
            .select("metric_type, value")
            .eq("patient_id", patientId)
            .order("recorded_at", { ascending: false });
        
        if (error) throw error;
        
        const metrics = { lastFeeding: null, sleep: null, diapers: null, weight: null };
        const latestByType = {};
        
        for (const item of data || []) {
            if (!latestByType[item.metric_type]) latestByType[item.metric_type] = item;
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
 * 📊 CALCULER LA PROGRESSION
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

// ============================================================
// MÉTRIQUES BÉBÉ (MODALE + SAUVEGARDE)
// ============================================================

/**
 * 🍼 OUVRIRE LA MODALE POUR AJOUTER UNE MÉTRIQUE
 */
window.openAddMetricModal = (metricType) => {
    const titles = {
        feeding: 'Dernière tétée',
        sleep: 'Heures de sommeil',
        diapers: 'Nombre de couches',
        weight: 'Poids (g)'
    };
    
    const units = {
        feeding: 'heures',
        sleep: 'heures',
        diapers: 'couches',
        weight: 'grammes'
    };
    
    Swal.fire({
        title: `📝 ${titles[metricType]}`,
        html: `
            <div class="text-left">
                <label class="text-[10px] font-bold text-slate-500 block mb-2">Valeur (en ${units[metricType]})</label>
                <input type="number" id="metric-value" class="w-full p-3 bg-slate-50 rounded-xl" placeholder="Saisir la valeur" step="${metricType === 'weight' ? '10' : '0.5'}">
                ${metricType === 'weight' ? '<p class="text-[9px] text-slate-400 mt-1">Exemple: 3500 pour 3.5 kg</p>' : ''}
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '✅ Enregistrer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#E11D48',
        preConfirm: () => {
            const value = document.getElementById('metric-value').value;
            if (!value) {
                Swal.showValidationMessage('Veuillez saisir une valeur');
                return false;
            }
            return { value: parseFloat(value) };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            await saveBabyMetric(metricType, result.value.value);
            Swal.fire('✅ Enregistré', `${titles[metricType]} mise à jour`, 'success');
            loadMamanDashboard();
        }
    });
};

/**
 * 💾 SAUVEGARDER UNE MÉTRIQUE BÉBÉ
 */
async function saveBabyMetric(metricType, value) {
    try {
        let patients = await secureFetch("/patients");
        if (!Array.isArray(patients)) patients = patients?.data || [];
        const patientId = patients[0]?.id;
        
        if (!patientId) return;
        
        await secureFetch('/educational/baby-metric', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: patientId,
                metric_type: metricType,
                value: value,
                unit: metricType === 'weight' ? 'g' : 'h'
            })
        });
    } catch (err) {
        console.error("Erreur sauvegarde métrique:", err);
        UI.error("Impossible d'enregistrer la métrique");
    }
}

// ============================================================
// GESTION DE L'HUMEUR
// ============================================================

/**
 * 😊 SAUVEGARDER L'HUMEUR
 */
window.saveMoodToDB = async (mood) => {
    try {
        let patients = await secureFetch("/patients");
        if (!Array.isArray(patients)) patients = patients?.data || [];
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
        
        UI.success("Humeur enregistrée !");
        setTimeout(() => loadMamanDashboard(), 500);
        
    } catch (err) {
        console.error("Erreur sauvegarde humeur:", err);
        UI.error("Impossible d'enregistrer l'humeur");
    }
};

/**
 * 📊 AFFICHER L'HISTORIQUE DES HUMEURS
 */
window.showMoodHistoryFromDB = async () => {
    try {
        let patients = await secureFetch("/patients");
        if (!Array.isArray(patients)) patients = patients?.data || [];
        const patient = patients?.[0];
        
        if (!patient) return;
        
        let moods = await secureFetch(`/educational/moods/${patient.id}`);
        if (!Array.isArray(moods)) moods = moods?.data || [];
        
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
    const emojis = { excellent: '😊', bien: '😐', fatigue: '😴', triste: '😔' };
    return emojis[mood] || '😊';
}

// ============================================================
// NOTIFICATIONS
// ============================================================

async function updateMamanNotifications() {
    try {
        let notifications = await secureFetch("/notifications", { noCache: true });
        if (!Array.isArray(notifications)) notifications = notifications?.data || [];
        
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

// ============================================================
// UTILITAIRES
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

export { updateMamanNotifications };
