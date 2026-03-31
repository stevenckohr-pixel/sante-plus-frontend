import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

let map = null;
let markers = {}; // Stocke les marqueurs pour les mettre à jour sans scintillement

export async function initLiveMap() {
    const container = document.getElementById('view-container');
    container.innerHTML = document.getElementById('template-map').innerHTML;

    // 1. Initialisation de la carte centrée sur Cotonou
    if (map) map.remove(); 
    map = L.map('map', { zoomControl: false }).setView([6.368, 2.401], 13);

    // 2. Style de carte "SaaS Dark" ou "Professional Bright"
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: 'Santé Plus Services'
    }).addTo(map);

    // 3. Charger les positions immédiatement puis toutes les 30s
    refreshTruckingPositions();
    const interval = setInterval(() => {
        if (document.getElementById('map')) {
            refreshTruckingPositions();
        } else {
            clearInterval(interval); // Arrête le tracking si on change de page
        }
    }, 15000); // 15 secondes pour du quasi-temps réel
}

async function refreshTruckingPositions() {
    try {
        // On récupère les visites en cours avec les dernières positions live
        const res = await secureFetch('/visites/live-tracking');
        const data = await res.json();

        document.getElementById('active-count-badge').innerText = `${data.length} AIDANTS LIVE`;

        data.forEach(item => {
            const { lat, lng, aidant_nom, patient_nom, is_inside, visite_id } = item;
            
            const markerColor = is_inside ? '#10B981' : '#F43F5E';
            const pulseClass = is_inside ? '' : 'animate-ping';

            // Custom Icon Style Radar
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                    <div class="relative flex items-center justify-center">
                        <div class="absolute w-8 h-8 rounded-full opacity-20" style="background: ${markerColor}"></div>
                        <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg ${pulseClass}" style="background: ${markerColor}"></div>
                        <div class="absolute -top-8 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap">
                            ${aidant_nom} • ${patient_nom}
                        </div>
                    </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            if (markers[visite_id]) {
                markers[visite_id].setLatLng([lat, lng]); // Déplacement fluide
            } else {
                markers[visite_id] = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            }
        });
    } catch (e) { console.error("Map Sync Error:", e); }
}




// Dans modules/map.js, modifie la logique visuelle :

async function updateSingleMarker(payload) {
    const { lat, lng, visite_id, alerte_geofence } = payload;
    
    // 🔴 ROUGE si l'aidant est sorti du périmètre, VERT s'il est OK
    const statusColor = alerte_geofence ? '#F43F5E' : '#10B981';
    const rippleEffect = alerte_geofence ? 'animate-ping' : '';

    if (markers[visite_id]) {
        markers[visite_id].setLatLng([lat, lng]);
        // Mise à jour de la couleur du marqueur existant
        markers[visite_id].setIcon(createCustomIcon(statusColor, rippleEffect));
    } else {
        // Création d'un nouveau marqueur
        markers[visite_id] = L.marker([lat, lng], { 
            icon: createCustomIcon(statusColor, rippleEffect) 
        }).addTo(map);
    }
}

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
