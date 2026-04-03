// ============================================================
// js/modules/map.js - MODULE CARTE COMPLET
// Version: 2.0
// Description: Gestion de la carte pour les 3 rôles
// ============================================================

import { secureFetch } from "../core/api.js";
import { UI, showToast } from "../core/utils.js";

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let map = null;
let markers = {};
let routeLayer = null;
let trajectoryLayer = null;
let watchId = null;
let trajectoryPoints = [];
let activeInterval = null;
let replayInterval = null;
let currentReplayIndex = 0;
let selectedAidantId = null;

// Coordonnées du siège SPS (Cotonou)
const SPS_HQ = {
    lat: 6.368,
    lng: 2.401,
    name: "Siège Santé Plus"
};

// Seuils
const OFF_ROUTE_THRESHOLD = 50;
let offRouteAlertShown = false;
let isNavigating = false;
let currentPatient = null;
let currentPatientCoords = null;
let lastRouteCalculation = null;

// Stockage des données
let activeAidants = [];

// ============================================================
// FONCTIONS UTILITAIRES
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

function formatDistance(meters) {
    if (!meters) return '---';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
    if (!seconds) return '---';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes} min`;
    return `Moins d'une minute`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ============================================================
// CRÉATION D'ICÔNES
// ============================================================

function createCustomIcon(color, isActive = true, size = 'md', icon = 'user-nurse') {
    const sizes = {
        sm: { w: 32, h: 32, dot: 10, ring: 28 },
        md: { w: 40, h: 40, dot: 14, ring: 36 },
        lg: { w: 48, h: 48, dot: 18, ring: 44 }
    };
    const s = sizes[size];
    
    return L.divIcon({
        className: 'custom-radar-icon',
        html: `
            <div class="relative flex items-center justify-center" style="width: ${s.w}px; height: ${s.h}px;">
                ${isActive ? `<div class="absolute rounded-full opacity-30 animate-ping" style="width: ${s.ring}px; height: ${s.ring}px; background: ${color};"></div>` : ''}
                <div class="relative rounded-full border-3 border-white shadow-xl flex items-center justify-center" style="width: ${s.dot}px; height: ${s.dot}px; background: ${color};">
                    <i class="fa-solid fa-${icon} text-white text-[${s.dot/2}px]"></i>
                </div>
            </div>`,
        iconSize: [s.w, s.h],
        iconAnchor: [s.w/2, s.w/2]
    });
}

function createCoordinatorIcon(color, iconName, isAnimated) {
    return L.divIcon({
        className: 'custom-coordinator-icon',
        html: `
            <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
                ${isAnimated ? `<div class="absolute rounded-full opacity-30 animate-ping" style="width: 32px; height: 32px; background: ${color};"></div>` : ''}
                <div class="relative rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="width: 28px; height: 28px; background: ${color};">
                    <i class="fa-solid fa-${iconName} text-white text-xs"></i>
                </div>
            </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
}

// ============================================================
// FONCTION PRINCIPALE - ROUTAGE PAR RÔLE
// ============================================================

export async function initLiveMap() {
    const userRole = localStorage.getItem("user_role");
    
    if (userRole === "COORDINATEUR") {
        await initCoordinatorMap();
    } else if (userRole === "FAMILLE") {
        await initFamilyMap();
    } else if (userRole === "AIDANT") {
        await initAidantMap();
    } else {
        await initAidantMap();
    }
}

// ============================================================
// 🗺️ VUE COORDINATEUR
// ============================================================

async function initCoordinatorMap() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
        <div class="animate-fadeIn flex flex-col h-[85vh] pb-32">
            <div class="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-3">
                <div>
                    <h3 class="text-2xl font-black text-slate-800">📡 Radar Supervision</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Suivi en temps réel des interventions</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="refresh-map-btn" class="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                        <i class="fa-solid fa-rotate-right text-slate-600"></i>
                    </button>
                    <button id="center-all-btn" class="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                        <i class="fa-solid fa-globe text-slate-600"></i>
                    </button>
                    <button id="show-alerts-btn" class="bg-amber-500 text-white px-4 py-3 rounded-xl shadow-md text-[10px] font-black uppercase">
                        <i class="fa-solid fa-bell"></i> Alertes
                    </button>
                </div>
            </div>
            
            <div class="mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-user-nurse mr-1"></i> Filtrer par aidant
                        </label>
                        <select id="filter-aidant" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="">Tous les aidants</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-hospital-user mr-1"></i> Filtrer par patient
                        </label>
                        <select id="filter-patient" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="">Tous les patients</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-circle-exclamation mr-1"></i> Statut
                        </label>
                        <select id="filter-status" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="all">Tous</option>
                            <option value="inside">Dans la zone ✅</option>
                            <option value="outside">Hors zone ⚠️</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div id="live-map-container" class="flex-1 w-full rounded-[2rem] border-4 border-white shadow-2xl relative overflow-hidden bg-slate-100 min-h-[500px]">
                <div id="map" class="absolute inset-0 z-10 w-full h-full"></div>
                <div id="map-loading" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div class="text-center">
                        <div class="relative w-10 h-10 mx-auto mb-3">
                            <div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                        <p class="text-[10px] font-black text-slate-400">Chargement de la carte...</p>
                    </div>
                </div>
            </div>
            
            <div id="info-panel" class="fixed right-4 top-24 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-30 hidden transition-all">
                <div class="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h4 id="panel-title" class="font-black text-slate-800">Détails</h4>
                    <button id="close-panel" class="text-slate-400 hover:text-slate-600">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div id="panel-content" class="p-4 max-h-96 overflow-y-auto"></div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        if (map) { map.remove(); map = null; markers = {}; }
        
        const mapLoading = document.getElementById('map-loading');
        
        map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.5 });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(map);
        
        if (mapLoading) {
            setTimeout(() => {
                mapLoading.style.opacity = '0';
                setTimeout(() => mapLoading.style.display = 'none', 300);
            }, 500);
        }
        
        setTimeout(() => map.invalidateSize(true), 150);
        
        document.getElementById('refresh-map-btn')?.addEventListener('click', () => loadCoordinatorData());
        document.getElementById('center-all-btn')?.addEventListener('click', () => centerAllMarkers());
        document.getElementById('show-alerts-btn')?.addEventListener('click', () => showAlertsPanel());
        document.getElementById('close-panel')?.addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });
        
        document.getElementById('filter-aidant')?.addEventListener('change', () => applyFilters());
        document.getElementById('filter-patient')?.addEventListener('change', () => applyFilters());
        document.getElementById('filter-status')?.addEventListener('change', () => applyFilters());
        
        await loadCoordinatorData();
        await loadFiltersData();
        
        if (activeInterval) clearInterval(activeInterval);
        activeInterval = setInterval(() => loadCoordinatorData(), 10000);
        
    }, 100);
}

async function loadCoordinatorData() {
    try {
        const aidants = await secureFetch('/visites/active-aidants');
        const patients = await secureFetch('/visites/patients-locations');
        activeAidants = aidants;
        updateCoordinatorMarkers(aidants, patients);
        updateCoordinatorStats(aidants);
    } catch (err) {
        console.error("❌ Erreur chargement données:", err);
    }
}

function updateCoordinatorMarkers(aidants, patients) {
    Object.keys(markers).forEach(key => {
        if (markers[key]) { map.removeLayer(markers[key]); delete markers[key]; }
    });
    
    patients.forEach(patient => {
        if (!patient.lat || !patient.lng) return;
        const icon = createCoordinatorIcon('#3B82F6', 'home', false);
        const marker = L.marker([patient.lat, patient.lng], { icon }).addTo(map);
        marker.bindPopup(`
            <div class="text-center p-2">
                <p class="font-black text-slate-800">🏠 ${escapeHtml(patient.nom_complet)}</p>
                <p class="text-[10px] text-slate-500">${escapeHtml(patient.adresse || 'Adresse non renseignée')}</p>
                <button onclick="window.centerOnPatient(${patient.lat}, ${patient.lng})" class="mt-2 w-full py-1.5 bg-blue-500 text-white rounded-lg text-[9px] font-black">Centrer</button>
            </div>
        `);
        markers[`patient_${patient.id}`] = marker;
    });
    
    aidants.forEach(aidant => {
        if (!aidant.last_position?.lat || !aidant.last_position?.lng) return;
        const isInside = aidant.is_inside_geofence;
        const color = isInside ? '#10B981' : '#F43F5E';
        const icon = createCoordinatorIcon(color, 'user-nurse', true);
        const marker = L.marker([aidant.last_position.lat, aidant.last_position.lng], { icon }).addTo(map);
        marker.bindPopup(`
            <div class="text-center p-2 min-w-[200px]">
                <p class="font-black text-slate-800">${escapeHtml(aidant.aidant?.nom || 'Aidant')}</p>
                <p class="text-[10px] text-slate-500">Patient: ${escapeHtml(aidant.patient?.nom_complet || '?')}</p>
                <p class="text-[9px] ${isInside ? 'text-emerald-600' : 'text-rose-600'} font-bold">${isInside ? '✅ Dans la zone' : '⚠️ Hors zone'}</p>
                <div class="flex gap-2 mt-2">
                    <button onclick="window.viewAidantHistory('${aidant.aidant?.id}')" class="flex-1 py-1.5 bg-indigo-500 text-white rounded-lg text-[9px] font-black">📜 Historique</button>
                    <button onclick="window.centerOnAidant(${aidant.last_position.lat}, ${aidant.last_position.lng})" class="flex-1 py-1.5 bg-slate-800 text-white rounded-lg text-[9px] font-black">Centrer</button>
                </div>
            </div>
        `);
        markers[`aidant_${aidant.id}`] = marker;
    });
}

function updateCoordinatorStats(aidants) {
    const total = aidants.length;
    const outside = aidants.filter(a => !a.is_inside_geofence).length;
    const badge = document.getElementById('active-count-badge');
    if (badge) {
        badge.innerHTML = `${total} AIDANT${total > 1 ? 'S' : ''} LIVE`;
        badge.classList.toggle('bg-amber-500', outside > 0);
        badge.classList.toggle('bg-emerald-500', outside === 0);
    }
    if (outside > 0) showToast(`${outside} aidant${outside > 1 ? 's' : ''} hors zone`, "warning", 5000);
}

async function loadFiltersData() {
    try {
        const aidants = await secureFetch('/visites/active-aidants');
        const patients = await secureFetch('/visites/patients-locations');
        const aidantSelect = document.getElementById('filter-aidant');
        const patientSelect = document.getElementById('filter-patient');
        if (aidantSelect) {
            aidantSelect.innerHTML = '<option value="">Tous les aidants</option>' +
                [...new Map(aidants.map(a => [a.aidant?.id, a.aidant])).values()]
                .filter(a => a).map(a => `<option value="${a.id}">${escapeHtml(a.nom)}</option>`).join('');
        }
        if (patientSelect) {
            patientSelect.innerHTML = '<option value="">Tous les patients</option>' +
                patients.map(p => `<option value="${p.id}">${escapeHtml(p.nom_complet)}</option>`).join('');
        }
    } catch (err) { console.error(err); }
}

function applyFilters() {
    const aidantFilter = document.getElementById('filter-aidant')?.value;
    const patientFilter = document.getElementById('filter-patient')?.value;
    const statusFilter = document.getElementById('filter-status')?.value;
    let filtered = [...activeAidants];
    if (aidantFilter) filtered = filtered.filter(a => a.aidant?.id === aidantFilter);
    if (patientFilter) filtered = filtered.filter(a => a.patient?.id === patientFilter);
    if (statusFilter === 'inside') filtered = filtered.filter(a => a.is_inside_geofence);
    if (statusFilter === 'outside') filtered = filtered.filter(a => !a.is_inside_geofence);
    
    Object.keys(markers).forEach(key => {
        if (key.startsWith('aidant_') && markers[key]) {
            map.removeLayer(markers[key]); delete markers[key];
        }
    });
    filtered.forEach(aidant => {
        if (!aidant.last_position?.lat || !aidant.last_position?.lng) return;
        const isInside = aidant.is_inside_geofence;
        const icon = createCoordinatorIcon(isInside ? '#10B981' : '#F43F5E', 'user-nurse', true);
        const marker = L.marker([aidant.last_position.lat, aidant.last_position.lng], { icon }).addTo(map);
        markers[`aidant_${aidant.id}`] = marker;
    });
}

function centerAllMarkers() {
    const bounds = [];
    Object.values(markers).forEach(m => bounds.push(m.getLatLng()));
    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
    else map.setView([6.368, 2.401], 12);
}

async function showAlertsPanel() {
    try {
        const alerts = await secureFetch('/visites/geofence-alerts');
        const panel = document.getElementById('info-panel');
        const panelTitle = document.getElementById('panel-title');
        const panelContent = document.getElementById('panel-content');
        panelTitle.innerHTML = '<i class="fa-solid fa-bell text-amber-500 mr-2"></i> Alertes Géofence';
        if (!alerts.length) {
            panelContent.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-check-circle text-emerald-500 text-3xl mb-3"></i><p class="text-sm font-bold">Aucune alerte</p></div>`;
        } else {
            panelContent.innerHTML = alerts.map(alert => `
                <div class="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p class="font-black text-amber-800">${escapeHtml(alert.aidant?.nom)}</p>
                    <p class="text-[10px] text-slate-600">Patient: ${escapeHtml(alert.patient?.nom_complet)}</p>
                    <button onclick="window.centerOnAidantFromAlert('${alert.aidant?.id}')" class="mt-2 w-full py-1.5 bg-amber-600 text-white rounded-lg text-[9px] font-black">Localiser</button>
                </div>
            `).join('');
        }
        panel.classList.remove('hidden');
    } catch (err) { UI.error("Impossible de charger les alertes"); }
}

window.viewAidantHistory = async (aidantId) => {
    const { value: date } = await Swal.fire({
        title: "Historique des déplacements",
        html: `<input type="date" id="history-date" class="w-full p-3 bg-slate-50 rounded-xl" value="${new Date().toISOString().split('T')[0]}">`,
        confirmButtonText: "Voir",
        preConfirm: () => document.getElementById('history-date').value
    });
    if (!date) return;
    try {
        const history = await secureFetch(`/visites/aidant-history/${aidantId}?date=${date}`);
        if (!history.length) return Swal.fire({ icon: "info", title: "Aucune donnée", text: "Aucun déplacement pour cette date" });
        showTrajectory(history, aidantId);
    } catch (err) { UI.error(err.message); }
};

function showTrajectory(history, aidantId) {
    const panel = document.getElementById('info-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelContent = document.getElementById('panel-content');
    panelTitle.innerHTML = '<i class="fa-solid fa-route text-indigo-500 mr-2"></i> Trajectoire';
    const points = history.map(h => [h.lat, h.lng]);
    if (trajectoryLayer) map.removeLayer(trajectoryLayer);
    trajectoryLayer = L.polyline(points, { color: '#8B5CF6', weight: 4, opacity: 0.8 }).addTo(map);
    map.fitBounds(trajectoryLayer.getBounds(), { padding: [50, 50] });
    panelContent.innerHTML = `
        <div class="space-y-4">
            <div class="bg-indigo-50 p-3 rounded-xl">
                <p class="text-[9px] font-black text-indigo-600">📊 ${history.length} points GPS</p>
                <p class="text-[10px] text-slate-500">${new Date(history[0]?.created_at).toLocaleString()}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="window.replayTrajectory(${JSON.stringify(history).replace(/"/g, '&quot;')})" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black">▶ Rejouer</button>
                <button onclick="window.clearTrajectory()" class="flex-1 py-2 bg-slate-200 rounded-lg text-[10px] font-black">Effacer</button>
            </div>
        </div>
    `;
    panel.classList.remove('hidden');
}

window.replayTrajectory = (history) => {
    if (replayInterval) clearInterval(replayInterval);
    currentReplayIndex = 0;
    const points = history.map(h => [h.lat, h.lng]);
    const replayIcon = createCoordinatorIcon('#F59E0B', 'location-dot', true);
    const replayMarker = L.marker(points[0], { icon: replayIcon }).addTo(map);
    replayInterval = setInterval(() => {
        if (currentReplayIndex >= points.length) {
            clearInterval(replayInterval);
            map.removeLayer(replayMarker);
            replayInterval = null;
            showToast("Replay terminé", "success");
            return;
        }
        replayMarker.setLatLng(points[currentReplayIndex]);
        map.setView(points[currentReplayIndex], 16);
        currentReplayIndex++;
    }, 500);
};

window.clearTrajectory = () => {
    if (trajectoryLayer) { map.removeLayer(trajectoryLayer); trajectoryLayer = null; }
    if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
    document.getElementById('info-panel')?.classList.add('hidden');
    showToast("Trajectoire effacée", "info");
};

window.centerOnPatient = (lat, lng) => map?.setView([lat, lng], 16);
window.centerOnAidant = (lat, lng) => map?.setView([lat, lng], 16);
window.centerOnAidantFromAlert = async (aidantId) => {
    const aidants = await secureFetch('/visites/active-aidants');
    const aidant = aidants.find(a => a.aidant?.id === aidantId);
    if (aidant?.last_position) map?.setView([aidant.last_position.lat, aidant.last_position.lng], 16);
    document.getElementById('info-panel')?.classList.add('hidden');
};

// ============================================================
// 👨‍👩‍👧 VUE FAMILLE
// ============================================================

async function initFamilyMap() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
        <div class="animate-fadeIn flex flex-col h-[80vh] pb-32">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="text-2xl font-black text-slate-800">👨‍👩‍👧 Suivi de votre proche</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Localisation en temps réel</p>
                </div>
                <button id="refresh-family-btn" class="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                    <i class="fa-solid fa-rotate-right text-slate-600"></i>
                </button>
            </div>
            
            <div id="live-map-container" class="flex-1 w-full rounded-[2rem] border-4 border-white shadow-2xl relative overflow-hidden bg-slate-100">
                <div id="map" class="absolute inset-0 z-10 w-full h-full"></div>
                <div id="map-loading" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div class="text-center"><div class="relative w-10 h-10 mx-auto mb-3"><div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div></div><p class="text-[10px] font-black text-slate-400">Chargement...</p></div>
                </div>
            </div>
            
            <div id="family-info" class="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">STATUT DE L'INTERVENTION</p>
                        <p id="family-status" class="font-black text-emerald-600 text-sm">Chargement...</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">DERNIÈRE MISE À JOUR</p>
                        <p id="family-last-update" class="text-[10px] text-slate-500">---</p>
                    </div>
                </div>
                <div id="family-distance" class="mt-3 pt-3 border-t border-slate-100 hidden">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">DISTANCE DE L'AIDANT</p>
                    <p id="family-distance-value" class="font-black text-lg text-emerald-600">---</p>
                </div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        if (map) { map.remove(); map = null; markers = {}; }
        
        map = L.map('map', { zoomControl: false, attributionControl: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        
        setTimeout(() => map.invalidateSize(true), 150);
        
        document.getElementById('refresh-family-btn')?.addEventListener('click', () => loadFamilyData());
        
        await loadFamilyData();
        if (activeInterval) clearInterval(activeInterval);
        activeInterval = setInterval(() => loadFamilyData(), 15000);
    }, 100);
}

async function loadFamilyData() {
    try {
        const patients = await secureFetch('/patients');
        const patient = patients?.[0];
        if (!patient) return;
        
        if (patient.lat && patient.lng) {
            if (markers['patient_home']) map.removeLayer(markers['patient_home']);
            const homeIcon = createCustomIcon('#3B82F6', false, 'lg', 'home');
            markers['patient_home'] = L.marker([patient.lat, patient.lng], { icon: homeIcon }).addTo(map);
            markers['patient_home'].bindPopup(`<p class="font-black">🏠 Domicile de ${patient.nom_complet}</p><p class="text-[10px]">${patient.adresse || ''}</p>`);
        }
        
        const activeVisit = await secureFetch(`/visites/active/${patient.id}`);
        
        if (activeVisit && activeVisit.lat && activeVisit.lng) {
            if (markers['aidant']) map.removeLayer(markers['aidant']);
            const aidantIcon = createCustomIcon('#10B981', true, 'lg', 'user-nurse');
            markers['aidant'] = L.marker([activeVisit.lat, activeVisit.lng], { icon: aidantIcon }).addTo(map);
            markers['aidant'].bindPopup(`<p class="font-black">👨‍⚕️ ${activeVisit.aidant_nom || 'Aidant'}</p><p class="text-[10px]">🚶 En déplacement vers votre proche</p>`);
            
            document.getElementById('family-status').innerHTML = '🟢 Intervention en cours';
            document.getElementById('family-last-update').innerHTML = new Date(activeVisit.last_update).toLocaleTimeString();
            
            if (patient.lat && patient.lng) {
                const distance = calculateDistance(activeVisit.lat, activeVisit.lng, patient.lat, patient.lng);
                document.getElementById('family-distance').classList.remove('hidden');
                document.getElementById('family-distance-value').innerHTML = formatDistance(distance);
                
                const bounds = L.latLngBounds([patient.lat, patient.lng], [activeVisit.lat, activeVisit.lng]);
                map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                map.setView([activeVisit.lat, activeVisit.lng], 14);
            }
        } else {
            document.getElementById('family-status').innerHTML = '⚪ Aucune intervention en cours';
            document.getElementById('family-last-update').innerHTML = '---';
            document.getElementById('family-distance').classList.add('hidden');
            if (patient.lat && patient.lng) map.setView([patient.lat, patient.lng], 14);
            else map.setView([6.368, 2.401], 12);
        }
    } catch (err) { console.error(err); }
}

// ============================================================
// 🧭 VUE AIDANT
// ============================================================
async function initAidantMap() {
    const container = document.getElementById('view-container');
    
    // ✅ 1. DEMANDER L'AUTORISATION GPS IMMÉDIATEMENT
    let hasGpsPermission = false;
    try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
            hasGpsPermission = true;
        } else if (permission.state === 'prompt') {
            // La demande sera faite automatiquement
            hasGpsPermission = true;
        }
    } catch (err) {
        console.warn("Permission API non supportée", err);
    }
    
    container.innerHTML = `
        <div class="animate-fadeIn flex flex-col h-[80vh] pb-32">
            <div class="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-3">
                <div>
                    <h3 class="text-2xl font-black text-slate-800">🧭 Navigation GPS</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Guidage vers le domicile du patient</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="center-map-btn" class="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                        <i class="fa-solid fa-location-crosshairs text-slate-600"></i>
                    </button>
                    <button id="clear-trajectory-btn" class="bg-slate-100 p-3 rounded-xl shadow-md border border-slate-100">
                        <i class="fa-solid fa-eraser text-slate-600"></i>
                    </button>
                    <button id="stop-navigation-btn" class="bg-rose-500 text-white px-4 py-3 rounded-xl shadow-md text-[10px] font-black uppercase hidden">
                        <i class="fa-solid fa-stop"></i> Arrêter
                    </button>
                </div>
            </div>
            
            <!-- ✅ BOUTON POUR ACTIVER LE GPS MANUELLEMENT -->
            <div id="gps-warning" class="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl hidden">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-location-dot text-amber-500 text-xl"></i>
                    <div class="flex-1">
                        <p class="text-sm font-black text-amber-800">GPS non activé</p>
                        <p class="text-[10px] text-amber-700">Activez votre position pour utiliser la navigation</p>
                    </div>
                    <button id="enable-gps-btn" class="bg-amber-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase">
                        Activer GPS
                    </button>
                </div>
            </div>
            
            <div class="mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                    <i class="fa-solid fa-hospital-user mr-1"></i> Sélectionnez votre destination
                </label>
                <select id="patient-selector" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
                    <option value="">-- Choisir un patient --</option>
                </select>
            </div>
            
            <div id="navigation-panel" class="mb-4 bg-emerald-500 text-white p-4 rounded-xl shadow-lg hidden">
                <div class="flex items-center justify-between">
                    <div><p class="text-[8px] font-black uppercase tracking-wider opacity-80">DESTINATION</p><p id="dest-name" class="font-black text-sm">---</p></div>
                    <i class="fa-solid fa-route text-2xl opacity-80"></i>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/20">
                    <div><p class="text-[8px] font-black uppercase tracking-wider opacity-80">DISTANCE</p><p id="distance-display" class="font-black text-lg">---</p></div>
                    <div><p class="text-[8px] font-black uppercase tracking-wider opacity-80">TEMPS ESTIMÉ</p><p id="time-display" class="font-black text-lg">---</p></div>
                </div>
                <div id="direction-arrow" class="mt-3 text-center">
                    <i class="fa-solid fa-location-arrow text-2xl animate-pulse"></i>
                    <span id="direction-text" class="text-[10px] ml-2">Suivez l'itinéraire tracé</span>
                </div>
            </div>
            
            <div id="live-map-container" class="flex-1 w-full rounded-[2rem] border-4 border-white shadow-2xl relative overflow-hidden bg-slate-100">
                <div id="map" class="absolute inset-0 z-10 w-full h-full"></div>
                <div id="map-loading" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div class="text-center">
                        <div class="relative w-10 h-10 mx-auto mb-3">
                            <div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                        <p class="text-[10px] font-black text-slate-400">Chargement de la carte...</p>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-100">
                <div class="flex items-center justify-around text-[9px] font-bold">
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div><span>Ma position</span></div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-blue-500"></div><span>Patient</span></div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 bg-emerald-400"></div><span>Itinéraire</span></div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 bg-amber-500 rounded-full"></div><span>Trajectoire</span></div>
                </div>
            </div>
            
            <button id="fix-patient-gps" class="mt-3 w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hidden">
                📍 Fixer ce lieu comme domicile du patient
            </button>
        </div>
    `;

    setTimeout(async () => {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        if (map) { map.remove(); map = null; markers = {}; }
        
        map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.5 });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        
        setTimeout(() => map.invalidateSize(true), 150);
        
        // ✅ 2. BOUTON POUR ACTIVER LE GPS
        const enableGpsBtn = document.getElementById('enable-gps-btn');
        const gpsWarning = document.getElementById('gps-warning');
        
        // ✅ 3. FONCTION POUR DEMANDER LA POSITION
        const requestLocation = () => {
            if (!navigator.geolocation) {
                showToast("GPS non supporté par votre navigateur", "error");
                return false;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Succès
                    gpsWarning?.classList.add('hidden');
                    showToast("GPS activé !", "success");
                    
                    // Ajouter le marqueur de position
                    const aidantIcon = createCustomIcon('#10B981', true, 'lg', 'user-nurse');
                    if (markers['aidant']) map.removeLayer(markers['aidant']);
                    markers['aidant'] = L.marker([position.coords.latitude, position.coords.longitude], { icon: aidantIcon }).addTo(map);
                    map.setView([position.coords.latitude, position.coords.longitude], 15);
                    
                    // Démarrer le tracking
                    startAidantTracking();
                    return true;
                },
                (error) => {
                    console.error("Erreur GPS:", error);
                    let message = "Impossible d'obtenir votre position";
                    if (error.code === 1) message = "Vous devez autoriser l'accès à votre position";
                    if (error.code === 2) message = "Position indisponible";
                    if (error.code === 3) message = "Délai d'attente dépassé";
                    
                    showToast(message, "error");
                    gpsWarning?.classList.remove('hidden');
                    return false;
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };
        
        // ✅ 4. DEMANDER LA POSITION AUTOMATIQUEMENT
        requestLocation();
        
        // ✅ 5. BOUTON CENTRAGE
        document.getElementById('center-map-btn')?.addEventListener('click', () => {
            requestLocation();
        });
        
        // ✅ 6. BOUTON ACTIVER GPS
        enableGpsBtn?.addEventListener('click', () => {
            requestLocation();
        });
        
        // ✅ 7. AUTRES ÉVÉNEMENTS
        document.getElementById('clear-trajectory-btn')?.addEventListener('click', () => { 
            clearTrajectory(); 
            showToast("Trajectoire effacée", "info"); 
        });
        
        document.getElementById('fix-patient-gps')?.addEventListener('click', () => fixCurrentLocationAsPatientHome());
        document.getElementById('stop-navigation-btn')?.addEventListener('click', () => stopNavigation());
        
        await loadAssignedPatients();
        
        document.getElementById('patient-selector')?.addEventListener('change', async (e) => {
            const patientId = e.target.value;
            if (patientId) { await startNavigation(patientId); }
            else { stopNavigation(); }
        });
        
        // ✅ 8. CACHER LE LOADER
        const mapLoading = document.getElementById('map-loading');
        if (mapLoading) {
            setTimeout(() => {
                mapLoading.style.opacity = '0';
                setTimeout(() => mapLoading.style.display = 'none', 300);
            }, 500);
        }
        
    }, 100);
}

async function loadAssignedPatients() {
    try {
        const patients = await secureFetch('/patients');
        const selector = document.getElementById('patient-selector');
        if (selector && patients?.length) {
            selector.innerHTML = '<option value="">-- Choisir un patient --</option>' +
                patients.map(p => `<option value="${p.id}" data-lat="${p.lat || ''}" data-lng="${p.lng || ''}">🏠 ${p.nom_complet} - ${p.adresse?.substring(0, 40) || 'Adresse non renseignée'}</option>`).join('');
        }
    } catch (err) { console.error(err); }
}

async function startNavigation(patientId) {
    try {
        const patient = await secureFetch(`/patients/${patientId}`);
        if (!patient.lat || !patient.lng) {
            UI.warning("Ce patient n'a pas de position GPS. Utilisez 'Fixer le domicile' pour enregistrer son adresse.");
            document.getElementById('fix-patient-gps').classList.remove('hidden');
            return;
        }
        document.getElementById('fix-patient-gps').classList.add('hidden');
        
        currentPatient = patient;
        currentPatientCoords = { lat: patient.lat, lng: patient.lng };
        isNavigating = true;
        
        document.getElementById('navigation-panel').classList.remove('hidden');
        document.getElementById('stop-navigation-btn').classList.remove('hidden');
        document.getElementById('dest-name').innerText = patient.nom_complet;
        
        if (markers['patient']) map.removeLayer(markers['patient']);
        const patientIcon = createCustomIcon('#3B82F6', false, 'lg', 'home');
        markers['patient'] = L.marker([patient.lat, patient.lng], { icon: patientIcon }).addTo(map);
        markers['patient'].bindPopup(`<p class="font-black">🏠 ${patient.nom_complet}</p><p class="text-[10px]">${patient.adresse || ''}</p><button onclick="window.openGoogleMaps(${patient.lat}, ${patient.lng})" class="mt-2 w-full py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black">🧭 Ouvrir dans Google Maps</button>`);
        
        await calculateAndDisplayRoute();
        checkIfArrived();
    } catch (err) { UI.error("Impossible de démarrer la navigation"); }
}

function stopNavigation() {
    isNavigating = false;
    currentPatient = null;
    currentPatientCoords = null;
    offRouteAlertShown = false;
    document.getElementById('navigation-panel').classList.add('hidden');
    document.getElementById('stop-navigation-btn').classList.add('hidden');
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    if (markers['patient']) { map.removeLayer(markers['patient']); delete markers['patient']; }
}

async function calculateAndDisplayRoute() {
    if (!isNavigating || !currentPatientCoords) return;
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const startLat = position.coords.latitude;
        const startLng = position.coords.longitude;
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${currentPatientCoords.lng},${currentPatientCoords.lat}?overview=full&geometries=geojson&steps=true`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes?.length) {
                const route = data.routes[0];
                document.getElementById('distance-display').innerHTML = formatDistance(route.distance);
                document.getElementById('time-display').innerHTML = formatDuration(route.duration);
                if (routeLayer) map.removeLayer(routeLayer);
                routeLayer = L.geoJSON(route.geometry, { style: { color: '#10B981', weight: 5, opacity: 0.9 } }).addTo(map);
                checkIfOffRoute(startLat, startLng, route);
                lastRouteCalculation = Date.now();
            }
        } catch (err) { console.error(err); }
    }, (err) => { console.warn(err); });
}

function checkIfOffRoute(currentLat, currentLng, route) {
    if (!route?.geometry?.coordinates) return;
    let minDistance = Infinity;
    for (const point of route.geometry.coordinates) {
        const distance = calculateDistance(currentLat, currentLng, point[1], point[0]);
        if (distance < minDistance) minDistance = distance;
    }
    const directionText = document.getElementById('direction-text');
    if (minDistance > OFF_ROUTE_THRESHOLD && !offRouteAlertShown) {
        offRouteAlertShown = true;
        directionText.innerHTML = '⚠️ Vous vous êtes écarté de l\'itinéraire ! Recalcul...';
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        showToast("⚠️ Vous vous êtes écarté de l'itinéraire", "warning", 5000);
        setTimeout(() => { offRouteAlertShown = false; calculateAndDisplayRoute(); setTimeout(() => directionText.innerHTML = 'Suivez l\'itinéraire tracé', 3000); }, 3000);
    } else if (minDistance <= OFF_ROUTE_THRESHOLD) {
        offRouteAlertShown = false;
        directionText.innerHTML = '✅ Suivez l\'itinéraire tracé';
    }
}

function checkIfArrived() {
    if (!isNavigating || !currentPatientCoords) return;
    navigator.geolocation.getCurrentPosition((position) => {
        const distance = calculateDistance(position.coords.latitude, position.coords.longitude, currentPatientCoords.lat, currentPatientCoords.lng);
        if (distance < 50) {
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            showToast("🎉 Vous êtes arrivé à destination !", "success", 5000);
            Swal.fire({ icon: "success", title: "Arrivé à destination !", text: `Vous êtes au domicile de ${currentPatient.nom_complet}`, confirmButtonText: "Démarrer la visite", confirmButtonColor: "#10B981", showCancelButton: true, cancelButtonText: "Plus tard" }).then((result) => { if (result.isConfirmed) window.startVisit(currentPatient.id); });
        }
    });
}

async function fixCurrentLocationAsPatientHome() {
    const selector = document.getElementById('patient-selector');
    const patientId = selector.value;
    const patientName = selector.options[selector.selectedIndex]?.text?.split(' -')[0];
    if (!patientId) return UI.warning("Sélectionnez d'abord un patient");
    if (!navigator.geolocation) return UI.error("GPS non disponible");
    
    const result = await Swal.fire({ title: "Fixer le domicile ?", text: `Voulez-vous enregistrer votre position actuelle comme domicile de ${patientName} ?`, icon: "question", showCancelButton: true, confirmButtonText: "OUI, ENREGISTRER", confirmButtonColor: "#10B981" });
    if (!result.isConfirmed) return;
    
    Swal.fire({ title: "Enregistrement...", didOpen: () => Swal.showLoading() });
    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            await secureFetch('/patients/update-gps', { method: 'POST', body: JSON.stringify({ patient_id: patientId, lat: position.coords.latitude, lng: position.coords.longitude }) });
            Swal.fire({ icon: "success", title: "Domicile enregistré !", timer: 2000, showConfirmButton: false });
            await loadPatientLocation(patientId);
            await calculateAndDisplayRoute();
        } catch (err) { Swal.fire("Erreur", err.message, "error"); }
    }, () => Swal.fire("Erreur GPS", "Impossible d'obtenir votre position", "error"));
}

async function loadPatientLocation(patientId) {
    try {
        const patient = await secureFetch(`/patients/${patientId}`);
        if (patient?.lat && patient?.lng) {
            if (markers['patient']) map.removeLayer(markers['patient']);
            const patientIcon = createCustomIcon('#3B82F6', false, 'lg', 'home');
            markers['patient'] = L.marker([patient.lat, patient.lng], { icon: patientIcon }).addTo(map);
            return { lat: patient.lat, lng: patient.lng };
        } else { UI.warning("Ce patient n'a pas de position GPS enregistrée"); return null; }
    } catch (err) { return null; }
}

function startAidantTracking() {
    if (!navigator.geolocation) return;
    const aidantIcon = createCustomIcon('#10B981', true, 'lg', 'user-nurse');
    navigator.geolocation.getCurrentPosition((pos) => {
        markers['aidant'] = L.marker([pos.coords.latitude, pos.coords.longitude], { icon: aidantIcon }).addTo(map);
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
    });
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            if (markers['aidant']) markers['aidant'].setLatLng([latitude, longitude]);
            else markers['aidant'] = L.marker([latitude, longitude], { icon: aidantIcon }).addTo(map);
            trajectoryPoints.push([latitude, longitude]);
            updateTrajectoryLine();
            if (isNavigating && currentPatientCoords) {
                const now = Date.now();
                if (!lastRouteCalculation || (now - lastRouteCalculation) > 5000) { calculateAndDisplayRoute(); checkIfArrived(); }
            }
        },
        (error) => console.warn("Erreur tracking:", error.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
}

function updateTrajectoryLine() {
    if (trajectoryPoints.length < 2) return;
    if (trajectoryLayer) map.removeLayer(trajectoryLayer);
    trajectoryLayer = L.polyline(trajectoryPoints, { color: '#F59E0B', weight: 3, opacity: 0.6 }).addTo(map);
}

function clearTrajectory() {
    trajectoryPoints = [];
    if (trajectoryLayer) { map.removeLayer(trajectoryLayer); trajectoryLayer = null; }
}

function clearRoute() {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    document.getElementById('distance-display').innerHTML = '---';
    document.getElementById('time-display').innerHTML = '---';
}

// Fonctions globales supplémentaires
window.copyAddressToClipboard = (address) => { if (address) { navigator.clipboard.writeText(address); showToast("Adresse copiée !", "success"); } };
window.zoomToLocation = (lat, lng) => map?.setView([lat, lng], 16);
window.openGoogleMaps = (lat, lng) => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
