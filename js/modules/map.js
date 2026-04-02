import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

let map = null;
let markers = {};
let paths = {};
let activeInterval = null;

/**
 * 🛰️ INITIALISATION DU RADAR LIVE
 */
export async function initLiveMap() {
    const container = document.getElementById('view-container');
    
    // 1. On injecte le template
    container.innerHTML = document.getElementById('template-map').innerHTML;

    // 2. Attendre que le DOM soit prêt
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
            paths = {};
        }

        // 3. Initialisation de la carte
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true,
            zoomSnap: 0.5,
            wheelPxPerZoomLevel: 120
        }).setView([6.368, 2.401], 13);

        // Ajouter un contrôle de zoom personnalisé
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(map);

        // 4. Forcer le redimensionnement
        setTimeout(() => {
            if (map) map.invalidateSize(true);
        }, 150);

        // 5. Charger les données et démarrer le rafraîchissement
        await refreshAllPositions();
        
        // Rafraîchir toutes les 10 secondes
        if (activeInterval) clearInterval(activeInterval);
        activeInterval = setInterval(refreshAllPositions, 10000);
        
        console.log("🛰️ Radar SPS opérationnel.");
    }, 300);
}

/**
 * 📥 RÉCUPÉRATION INITIALE ET MISE À JOUR DES POSITIONS
 */
async function refreshAllPositions() {
    if (!map) return;
    
    try {
        const res = await secureFetch('/visites/live-tracking');
        const activeVisits = await res.json();
        
        // Mettre à jour le compteur
        const badge = document.getElementById('active-count-badge');
        if (badge) {
            badge.innerText = `${activeVisits.length} AIDANT${activeVisits.length > 1 ? 'S' : ''} LIVE`;
            if (activeVisits.length > 0) {
                badge.classList.add('animate-pulse');
            } else {
                badge.classList.remove('animate-pulse');
            }
        }
        
        // Supprimer les anciens marqueurs et traces
        Object.keys(markers).forEach(key => {
            if (markers[key]) {
                map.removeLayer(markers[key]);
                delete markers[key];
            }
        });
        Object.keys(paths).forEach(key => {
            if (paths[key]) {
                map.removeLayer(paths[key]);
                delete paths[key];
            }
        });
        
        // Pour chaque visite active, récupérer l'historique et dessiner
        for (const visit of activeVisits) {
            if (!visit.visite_id) continue;
            
            // Récupérer la trajectoire complète
            const trajRes = await secureFetch(`/visites/trajectory/${visit.visite_id}`);
            const history = await trajRes.json();
            
            if (history && history.length > 0) {
                const points = history.map(p => [p.lat, p.lng]);
                // Dessiner la ligne complète
                paths[visit.visite_id] = L.polyline(points, {
                    color: '#3B82F6',
                    weight: 3,
                    opacity: 0.4,
                    dashArray: '5, 10',
                    lineJoin: 'round'
                }).addTo(map);
                
                // Dernier point connu
                const lastPoint = history[history.length - 1];
                const isInside = !visit.alerte_geofence;
                const color = isInside ? '#10B981' : '#F43F5E';
                const ripple = isInside ? '' : 'animate-ping';
                
                // Créer le marqueur
                const icon = createCustomIcon(color, ripple);
                const marker = L.marker([lastPoint.lat, lastPoint.lng], { icon }).addTo(map);
                
                // Popup
                marker.bindPopup(`
                    <div class="text-center p-1">
                        <p class="font-black text-slate-800 text-xs">👨‍⚕️ ${visit.aidant_nom || 'Aidant'}</p>
                        <p class="text-[10px] text-slate-500">👤 ${visit.patient_nom || 'Patient'}</p>
                        <p class="text-[10px] font-bold ${isInside ? 'text-emerald-600' : 'text-rose-600'} mt-1">
                            ${isInside ? '✅ Dans le périmètre' : '⚠️ Hors zone'}
                        </p>
                    </div>
                `);
                
                markers[visit.visite_id] = marker;
            } else {
                // Pas d'historique, on affiche juste un marqueur avec la position actuelle si disponible
                if (visit.lat && visit.lng) {
                    const isInside = !visit.alerte_geofence;
                    const color = isInside ? '#10B981' : '#F43F5E';
                    const ripple = isInside ? '' : 'animate-ping';
                    const icon = createCustomIcon(color, ripple);
                    const marker = L.marker([visit.lat, visit.lng], { icon }).addTo(map);
                    marker.bindPopup(`
                        <div class="text-center p-1">
                            <p class="font-black text-slate-800 text-xs">👨‍⚕️ ${visit.aidant_nom || 'Aidant'}</p>
                            <p class="text-[10px] text-slate-500">👤 ${visit.patient_nom || 'Patient'}</p>
                            <p class="text-[10px] font-bold ${isInside ? 'text-emerald-600' : 'text-rose-600'} mt-1">
                                ${isInside ? '✅ Dans le périmètre' : '⚠️ Hors zone'}
                            </p>
                        </div>
                    `);
                    markers[visit.visite_id] = marker;
                }
            }
        }
        
    } catch (err) {
        console.error("❌ Erreur refresh positions:", err);
    }
}

/**
 * 🎨 CRÉATION D'ICÔNE RADAR HYPE
 */
function createCustomIcon(color, ripple) {
    return L.divIcon({
        className: 'custom-radar-icon',
        html: `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-12 h-12 rounded-full opacity-20 ${ripple}" style="background: ${color}; animation-duration: 1.5s;"></div>
                <div class="w-5 h-5 rounded-full border-4 border-white shadow-xl" style="background: ${color}"></div>
            </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}
