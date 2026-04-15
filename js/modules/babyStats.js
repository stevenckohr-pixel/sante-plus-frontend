// js/modules/babyStats.js
import { secureFetch } from "../core/api.js";
import supabase from "../core/supabaseClient.js";

/**
 * 📊 PAGE DES STATISTIQUES BÉBÉ
 */
export async function loadBabyStats() {
    const container = document.getElementById("view-container");
    if (!container) return;

    // Récupérer le patient
    let patients = await secureFetch("/patients");
    if (!Array.isArray(patients)) patients = patients?.data || [];
    const patientId = patients[0]?.id;
    
    if (!patientId) {
        container.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Aucun patient trouvé</p></div>`;
        return;
    }

    // Récupérer les données
    const [weightHistory, feedingHistory, sleepHistory, diaperHistory] = await Promise.all([
        fetchMetrics(patientId, 'weight'),
        fetchMetrics(patientId, 'feeding'),
        fetchMetrics(patientId, 'sleep'),
        fetchMetrics(patientId, 'diapers')
    ]);

    container.innerHTML = `
        <div class="baby-stats-container animate-fadeIn pb-24">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
                <button onclick="window.switchView('home')" 
                        class="w-10 h-10 rounded-full bg-white shadow-sm border border-pink-100 flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left text-pink-500"></i>
                </button>
                <div>
                    <h3 class="font-black text-xl text-slate-800">📊 Évolution de bébé</h3>
                    <p class="text-[10px] text-pink-500 font-bold uppercase tracking-wider">Suivi personnalisé</p>
                </div>
            </div>

            <!-- Cartes récapitulatives -->
            <div class="grid grid-cols-2 gap-3 mb-6">
                ${renderStatCard(weightHistory, 'Poids', 'kg', (weightHistory[weightHistory.length-1]?.value || 0) / 1000, 'fa-weight-scale')}
                ${renderStatCard(feedingHistory, 'Tétées', '/jour', calculateDailyAvg(feedingHistory, 'feeding'), 'fa-baby-bottle')}
                ${renderStatCard(sleepHistory, 'Sommeil', 'h/jour', calculateDailyAvg(sleepHistory, 'sleep'), 'fa-moon')}
                ${renderStatCard(diaperHistory, 'Couches', '/jour', calculateDailyAvg(diaperHistory, 'diapers'), 'fa-droplet')}
            </div>

            <!-- Graphique de poids -->
            <div class="bg-white rounded-2xl p-4 mb-5 shadow-sm border border-pink-100">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-slate-800">📈 Courbe de poids</h4>
                    <span class="text-[9px] text-pink-500 font-bold">${getProgressMessage(weightHistory)}</span>
                </div>
                <canvas id="weight-chart" height="200" style="max-height: 200px;"></canvas>
            </div>

            <!-- Graphique des tétées -->
            <div class="bg-white rounded-2xl p-4 mb-5 shadow-sm border border-pink-100">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-slate-800">🍼 Évolution des tétées</h4>
                    <span class="text-[9px] text-pink-500 font-bold">${getTrendMessage(feedingHistory, 'feeding')}</span>
                </div>
                <canvas id="feeding-chart" height="200" style="max-height: 200px;"></canvas>
            </div>

            <!-- Graphique sommeil vs couches -->
            <div class="bg-white rounded-2xl p-4 mb-5 shadow-sm border border-pink-100">
                <h4 class="font-bold text-slate-800 mb-4">😴 Sommeil vs 🧷 Couches</h4>
                <canvas id="sleep-diaper-chart" height="200" style="max-height: 200px;"></canvas>
            </div>

            <!-- Badges de progression -->
            <div class="bg-gradient-to-r from-pink-50 to-pink-100 rounded-2xl p-5">
                <h4 class="font-bold text-pink-700 mb-3 text-center">🎉 Félicitations !</h4>
                <div class="flex flex-wrap justify-center gap-3">
                    ${generateBadges(weightHistory, feedingHistory, sleepHistory)}
                </div>
            </div>

            <!-- Bouton pour ajouter une mesure rapide -->
            <button onclick="window.openAddMetricModal('weight')" 
                    class="w-full mt-5 py-4 bg-pink-500 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">
                <i class="fa-solid fa-plus mr-2"></i> Ajouter une mesure
            </button>
        </div>
    `;

    // Dessiner les graphiques après le rendu
    setTimeout(() => {
        drawWeightChart(weightHistory);
        drawFeedingChart(feedingHistory);
        drawSleepDiaperChart(sleepHistory, diaperHistory);
    }, 100);
}

/**
 * 📥 RÉCUPÉRER LES MÉTRIQUES
 */
async function fetchMetrics(patientId, metricType) {
    try {
        const { data, error } = await supabase
            .from("baby_metrics")
            .select("value, recorded_at")
            .eq("patient_id", patientId)
            .eq("metric_type", metricType)
            .order("recorded_at", { ascending: true })
            .limit(30);
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error(`Erreur fetch ${metricType}:`, err);
        return [];
    }
}

/**
 * 📊 RENDRE UNE CARTE STATISTIQUE
 */
function renderStatCard(data, label, unit, currentValue, icon) {
    const lastValue = currentValue || 0;
    const previousValue = data[data.length - 2]?.value || lastValue;
    const trend = lastValue - previousValue;
    const trendIcon = trend > 0 ? '📈' : (trend < 0 ? '📉' : '➡️');
    const trendColor = trend > 0 ? 'text-emerald-500' : (trend < 0 ? 'text-rose-500' : 'text-slate-400');
    
    return `
        <div class="bg-white rounded-xl p-3 shadow-sm border border-pink-100">
            <div class="flex items-center justify-between mb-2">
                <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <i class="fa-solid ${icon} text-pink-500 text-sm"></i>
                </div>
                <span class="text-[9px] font-bold ${trendColor}">${trendIcon} ${Math.abs(trend).toFixed(1)}${unit}</span>
            </div>
            <p class="text-[9px] font-bold text-slate-400 uppercase">${label}</p>
            <p class="text-xl font-black text-slate-800">${lastValue.toFixed(1)}${unit}</p>
            <p class="text-[8px] text-slate-400">${data.length} mesures</p>
        </div>
    `;
}

/**
 * 📈 DESSINER LE GRAPHIQUE DE POIDS
 */
function drawWeightChart(data) {
    const ctx = document.getElementById('weight-chart')?.getContext('2d');
    if (!ctx) return;
    
    const labels = data.map(d => new Date(d.recorded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    const values = data.map(d => d.value / 1000);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Poids (kg)',
                data: values,
                borderColor: '#E11D48',
                backgroundColor: 'rgba(225, 29, 72, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#E11D48',
                pointBorderColor: 'white',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 10 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw} kg` } }
            },
            scales: { y: { beginAtZero: false, title: { display: true, text: 'kg', font: { size: 10 } } } }
        }
    });
}

/**
 * 🍼 DESSINER LE GRAPHIQUE DES TÉTÉES
 */
function drawFeedingChart(data) {
    const ctx = document.getElementById('feeding-chart')?.getContext('2d');
    if (!ctx) return;
    
    const labels = data.map(d => new Date(d.recorded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    const values = data.map(d => d.value);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Durée des tétées (h)',
                data: values,
                backgroundColor: '#F472B6',
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 10 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw} heures` } }
            }
        }
    });
}

/**
 * 😴 DESSINER LE GRAPHIQUE SOMMEIL VS COUCHES
 */
function drawSleepDiaperChart(sleepData, diaperData) {
    const ctx = document.getElementById('sleep-diaper-chart')?.getContext('2d');
    if (!ctx) return;
    
    const labels = sleepData.map((d, i) => new Date(d.recorded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    const sleepValues = sleepData.map(d => d.value);
    const diaperValues = diaperData.map(d => d.value);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '😴 Sommeil (heures)',
                    data: sleepValues,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#3B82F6'
                },
                {
                    label: '🧷 Couches',
                    data: diaperValues,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#F59E0B'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } }
        }
    });
}

/**
 * 📊 CALCULER LA MOYENNE JOURNALIÈRE
 */
function calculateDailyAvg(data, type) {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return (sum / data.length).toFixed(1);
}

/**
 * 🎉 GÉNÉRER DES BADGES DE PROGRESSION
 */
function generateBadges(weightData, feedingData, sleepData) {
    const badges = [];
    
    // Badge poids
    if (weightData.length > 1) {
        const firstWeight = weightData[0].value / 1000;
        const lastWeight = weightData[weightData.length - 1].value / 1000;
        const gain = lastWeight - firstWeight;
        if (gain > 0.5) badges.push({ emoji: '🏆', text: `${gain.toFixed(1)} kg pris !`, color: 'bg-emerald-100 text-emerald-700' });
        else if (gain > 0) badges.push({ emoji: '📈', text: `${gain.toFixed(1)} kg gagnés`, color: 'bg-blue-100 text-blue-700' });
    }
    
    // Badge tétées
    const avgFeeding = calculateDailyAvg(feedingData, 'feeding');
    if (avgFeeding >= 2) badges.push({ emoji: '🍼', text: `${avgFeeding}h de tétées en moyenne`, color: 'bg-pink-100 text-pink-700' });
    
    // Badge sommeil
    const avgSleep = calculateDailyAvg(sleepData, 'sleep');
    if (avgSleep >= 8) badges.push({ emoji: '😴', text: 'Bébé dort bien !', color: 'bg-indigo-100 text-indigo-700' });
    else if (avgSleep >= 6) badges.push({ emoji: '🌙', text: 'Nuits paisibles', color: 'bg-purple-100 text-purple-700' });
    
    // Badge couches
    const avgDiapers = calculateDailyAvg(sleepData, 'diapers');
    if (avgDiapers >= 6) badges.push({ emoji: '🧷', text: `${avgDiapers} couches/jour`, color: 'bg-amber-100 text-amber-700' });
    
    return badges.map(b => `<span class="px-3 py-1.5 rounded-full text-[9px] font-bold ${b.color}"><span class="mr-1">${b.emoji}</span>${b.text}</span>`).join('');
}

/**
 * 📊 MESSAGE DE PROGRESSION
 */
function getProgressMessage(data) {
    if (data.length < 2) return '📊 Commencez à suivre';
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const diff = last - first;
    if (diff > 0) return `✅ +${(diff/1000).toFixed(1)} kg`;
    if (diff < 0) return `⚠️ -${Math.abs(diff/1000).toFixed(1)} kg`;
    return '➡️ Stable';
}

/**
 * 📊 MESSAGE DE TENDANCE
 */
function getTrendMessage(data, type) {
    if (data.length < 2) return '📊 Commencez à suivre';
    const recent = data.slice(-3);
    const avg = recent.reduce((a,b) => a + b.value, 0) / recent.length;
    if (type === 'feeding') return avg > 2 ? '📈 Tétées fréquentes' : (avg < 1.5 ? '⚠️ Tétées espacées' : '✅ Rythme normal');
    if (type === 'sleep') return avg > 8 ? '😴 Bébé bien reposé' : (avg < 6 ? '⚠️ Sommeil léger' : '✅ Sommeil correct');
    return '📊 Suivi en cours';
}
