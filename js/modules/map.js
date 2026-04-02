import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

// Variables globales
let map = null;
let markers = {};
let activeInterval = null;

/**
 * 🎨 CRÉATION D'ICÔNE RADAR MODERNE
 */
function createCustomIcon(color, isActive = true, size = 'md') {
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
                    ${isActive ? `<div class="absolute inset-0 rounded-full animate-pulse" style="background: ${color}; opacity: 0.5;"></div>` : ''}
                </div>
            </div>`,
        iconSize: [s.w, s.h],
        iconAnchor: [s.w/2, s.w/2]
    });
}

/**
 * 🛰️ INITIALISATION DU RADAR LIVE
 */
export async function initLiveMap() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
        <div class="animate-fadeIn flex flex-col h-[80vh] pb-32">
            <div class="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-3">
                <div>
                    <h3 class="text-2xl font-black text-slate-800">Radar Terrain</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Localisation des interventions en cours</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="center-map-btn" class="bg-white p-3 rounded-xl shadow-md border border-slate-100 hover:bg-slate-50 transition-all active:scale-95">
                        <i class="fa-solid fa-location-crosshairs text-slate-600"></i>
                    </button>
                    <div id="active-count-badge" class="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-md">
                        0 AIDANTS LIVE
                    </div>
                </div>
            </div>
            
            <!-- Indicateur de connexion -->
            <div id="connection-status" class="flex items-center justify-center gap-2 mb-3 text-[9px] font-black">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-slate-400 uppercase tracking-wider">Connexion live active</span>
            </div>
            
            <div id="live-map-container" class="flex-1 w-full rounded-[2rem] border-4 border-white shadow-2xl relative overflow-hidden bg-slate-100 min-h-[400px]">
                <div id="map" class="absolute inset-0 z-10 w-full h-full"></div>
                
                <!-- Overlay de chargement -->
                <div id="map-loading" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center transition-opacity">
                    <div class="text-center">
                        <div class="relative w-10 h-10 mx-auto mb-3">
                            <div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                            <i class="fa-solid fa-map-location-dot absolute inset-0 flex items-center justify-center text-emerald-500 text-sm"></i>
                        </div>
                        <p class="text-[10px] font-black text-slate-400">Chargement de la carte...</p>
                    </div>
                </div>
                
                <div class="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl z-20 border border-slate-700 shadow-2xl lg:w-80">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                        <span class="text-white text-[9px] font-black uppercase tracking-widest">Légende Radar</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-[10px] text-slate-300">
                            <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span>Dans le périmètre (zone sécurisée)</span>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-slate-300">
                            <div class="w-3 h-3 rounded-full bg-rose-500"></div>
                            <span>Hors zone / Alerte géographique</span>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-slate-300">
                            <div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                            <span>Position en mouvement</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error("❌ Map container introuvable !");
            return;
        }
        
        // Nettoyer l'ancienne instance
        if (map) {
            map.remove();
            map = null;
            markers = {};
        }
        
        // Cacher le loader quand la carte est prête
        const mapLoading = document.getElementById('map-loading');
        
        // Initialisation de la carte
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true,
            zoomSnap: 0.5,
            wheelPxPerZoomLevel: 120
        }).setView([6.368, 2.401], 13);
        
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(map);
        
        // Cacher le loader
        if (mapLoading) {
            setTimeout(() => {
                mapLoading.style.opacity = '0';
                setTimeout(() => mapLoading.style.display = 'none', 300);
            }, 500);
        }
        
        // Forcer le redimensionnement
        setTimeout(() => {
            if (map) map.invalidateSize(true);
        }, 150);
        
        // Bouton centrage
        document.getElementById('center-map-btn')?.addEventListener('click', () => {
            if (Object.keys(markers).length > 0) {
                const bounds = [];
                Object.values(markers).forEach(m => bounds.push(m.getLatLng()));
                if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                map.setView([6.368, 2.401], 13);
            }
        });
        
        // Démarrer le rafraîchissement
        await refreshAllPositions();
        
        if (activeInterval) clearInterval(activeInterval);
        activeInterval = setInterval(refreshAllPositions, 5000);
        
        // Détection de la connexion
        window.addEventListener('online', () => updateConnectionStatus(true));
        window.addEventListener('offline', () => updateConnectionStatus(false));
        
        console.log("🛰️ Radar SPS opérationnel.");
    }, 100);
}

/**
 * 📡 MISE À JOUR DU STATUT DE CONNEXION
 */
function updateConnectionStatus(isOnline) {
    const statusDiv = document.getElementById('connection-status');
    if (!statusDiv) return;
    
    if (isOnline) {
        statusDiv.innerHTML = `
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-slate-400 uppercase tracking-wider">Connexion live active</span>
        `;
    } else {
        statusDiv.innerHTML = `
            <div class="w-2 h-2 rounded-full bg-rose-500"></div>
            <span class="text-rose-400 uppercase tracking-wider">Connexion perdue - Reconnexion...</span>
        `;
    }
}

/**
 * 📥 RÉCUPÉRATION DES POSITIONS
 */
async function refreshAllPositions() {
    if (!map) return;
    
    try {
        const res = await secureFetch('/visites/live-tracking');
        const activeVisits = await res.json();
        
        // Mettre à jour le compteur
        const badge = document.getElementById('active-count-badge');
        if (badge) {
            const count = activeVisits.length;
            badge.innerText = `${count} AIDANT${count > 1 ? 'S' : ''} LIVE`;
            if (count > 0) {
                badge.classList.add('animate-pulse');
            } else {
                badge.classList.remove('animate-pulse');
            }
        }
        
        // Supprimer les anciens marqueurs
        Object.keys(markers).forEach(key => {
            if (markers[key]) {
                map.removeLayer(markers[key]);
                delete markers[key];
            }
        });
        
        for (const visit of activeVisits) {
            if (!visit.lat || !visit.lng) continue;
            
            const isInside = visit.is_inside !== false;
            const isMoving = visit.is_moving || false;
            const statusColor = isInside ? '#10B981' : '#F43F5E';
            const size = isMoving ? 'lg' : 'md';
            
            const icon = createCustomIcon(statusColor, true, size);
            
            const marker = L.marker([visit.lat, visit.lng], { icon }).addTo(map);
            
            marker.bindPopup(`
                <div class="text-center p-2 min-w-[180px]">
                    <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <i class="fa-solid fa-user-nurse text-emerald-600 text-xs"></i>
                        </div>
                        <div class="text-left">
                            <p class="font-black text-slate-800 text-xs">${escapeHtml(visit.aidant_nom || 'Aidant')}</p>
                            <p class="text-[9px] text-slate-400">👤 ${escapeHtml(visit.patient_nom || 'Patient')}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-[9px]">
                        <span class="font-bold ${isInside ? 'text-emerald-600' : 'text-rose-600'}">
                            ${isInside ? '✅ Dans le périmètre' : '⚠️ Hors zone'}
                        </span>
                        ${isMoving ? '<span class="text-blue-500"><i class="fa-solid fa-person-walking"></i> En déplacement</span>' : ''}
                    </div>
                    <button onclick="window.zoomToLocation(${visit.lat}, ${visit.lng})" 
                            class="mt-2 w-full py-1.5 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase">
                        Centrer
                    </button>
                </div>
            `);
            
            markers[visit.visite_id] = marker;
        }
        
    } catch (err) {
        console.error("❌ Erreur refresh positions:", err);
        updateConnectionStatus(false);
        setTimeout(() => updateConnectionStatus(true), 3000);
    }
}

/**
 * 🔍 Centrer la carte sur une position
 */
window.zoomToLocation = (lat, lng) => {
    if (map) {
        map.setView([lat, lng], 16);
    }
};

/**
 * 🔧 Échapper les caractères HTML
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
