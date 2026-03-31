import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";
import supabase from "../core/supabaseClient.js"; 

let map = null;
let markers = {}; 
let paths = {}; 

/**
 * 🛰️ INITIALISATION DU RADAR LIVE
 */
export async function initLiveMap() {
    const container = document.getElementById('view-container');
    
    // 1. On injecte le template
    container.innerHTML = document.getElementById('template-map').innerHTML;

    // 2. On attend un court instant que le DOM soit "prêt" et visible
    setTimeout(async () => {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        // On nettoie l'ancienne instance si elle existe
        if (map) {
            map.remove();
            markers = {};
            paths = {};
        }

        // 3. Initialisation de la carte
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([6.368, 2.401], 13); // Centré sur Cotonou

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

        // 🔥 IMPORTANT : Force Leaflet à recalculer sa taille réelle
        map.invalidateSize();

        // 4. Charger les données
        await refreshAllPositions();
        
        // ⚡ Lancer le Realtime
        console.log("🛰️ Radar SPS opérationnel.");
    }, 100); 
}

/**
 * 🔄 MOTEUR DE MOUVEMENT (Marker + Polyline)
 */
async function updateMovement(data) {
    const { lat, lng, visite_id, alerte_geofence } = data;
    const point = [lat, lng];

    // 1. GESTION DU MARQUEUR
    const statusColor = alerte_geofence ? '#F43F5E' : '#10B981'; // Rouge si hors zone
    const rippleEffect = alerte_geofence ? 'animate-ping' : '';

    if (markers[visite_id]) {
        markers[visite_id].setLatLng(point);
        markers[visite_id].setIcon(createCustomIcon(statusColor, rippleEffect));
    } else {
        // Si le marqueur n'existe pas encore (nouvelle visite qui démarre)
        markers[visite_id] = L.marker(point, { 
            icon: createCustomIcon(statusColor, rippleEffect) 
        }).addTo(map);
    }

    // 2. GESTION DU TRACÉ (Breadcrumbs)
    if (!paths[visite_id]) {
        paths[visite_id] = L.polyline([point], {
            color: '#3B82F6',
            weight: 3,
            opacity: 0.4,
            dashArray: '5, 10',
            lineJoin: 'round'
        }).addTo(map);
    } else {
        paths[visite_id].addLatLng(point); // On allonge la ligne en direct
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
                <div class="absolute w-12 h-12 rounded-full opacity-20 ${ripple}" style="background: ${color}"></div>
                <div class="w-5 h-5 rounded-full border-4 border-white shadow-xl" style="background: ${color}"></div>
            </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}

/**
 * 📥 RÉCUPÉRATION INITIALE ET HISTORIQUE
 */
async function refreshAllPositions() {
    try {
        // Récupère les aidants actuellement en visite
        const res = await secureFetch('/visites/live-tracking');
        const activeVisits = await res.json();

        document.getElementById('active-count-badge').innerText = `${activeVisits.length} AIDANTS LIVE`;

        for (const visit of activeVisits) {
            // Pour chaque aidant, on va chercher son historique de points (sa trajectoire)
            const trajRes = await secureFetch(`/visites/trajectory/${visit.visite_id}`);
            const history = await trajRes.json();

            if (history.length > 0) {
                const points = history.map(p => [p.lat, p.lng]);
                
                // Dessiner la ligne complète
                paths[visit.visite_id] = L.polyline(points, {
                    color: '#3B82F6',
                    weight: 3,
                    opacity: 0.4,
                    dashArray: '5, 10'
                }).addTo(map);

                // Placer le marqueur au dernier point connu
                const lastPoint = history[history.length - 1];
                updateMovement({
                    ...lastPoint,
                    visite_id: visit.visite_id,
                    alerte_geofence: visit.is_inside === false
                });
            }
        }
    } catch (e) {
        console.error("Erreur chargement Radar Initial :", e);
    }
}
