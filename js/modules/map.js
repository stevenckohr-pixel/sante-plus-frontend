// js/modules/map.js - VERSION COMPLÈTE CORRIGÉE

import { secureFetch } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { UI } from "../core/utils.js";

let map = null;
let markers = {};
let activeInterval = null;

// Coordonnées du siège SPS (à modifier selon votre adresse réelle)
const SPS_HQ = {
    lat: 6.368,  // Cotonou
    lng: 2.401,
    name: "Siège Santé Plus"
};

/**
 * 🎨 CRÉATION D'ICÔNE RADAR MODERNE
 */
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

/**
 * 🛰️ INITIALISATION DE LA CARTE SELON LE RÔLE
 */
export async function initLiveMap() {
    const container = document.getElementById('view-container');
    const userRole = localStorage.getItem("user_role");
    const isFamily = userRole === "FAMILLE";
    const isAidant = userRole === "AIDANT";
    const isCoordinator = userRole === "COORDINATEUR";
    
    let title = "Radar Terrain";
    let subtitle = "";
    
    if (isFamily) {
        title = "Suivi de votre proche";
        subtitle = "Localisation de l'intervenant";
    } else if (isAidant) {
        title = "Ma position";
        subtitle = "Votre localisation actuelle";
    } else {
        title = "Radar Terrain";
        subtitle = "Localisation des interventions en cours";
    }
    
    container.innerHTML = `
        <div class="animate-fadeIn flex flex-col h-[80vh] pb-32">
            <div class="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-3">
                <div>
                    <h3 class="text-2xl font-black text-slate-800">${title}</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">${subtitle}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="center-map-btn" class="bg-white p-3 rounded-xl shadow-md border border-slate-100 hover:bg-slate-50 transition-all active:scale-95">
                        <i class="fa-solid fa-location-crosshairs text-slate-600"></i>
                    </button>
                    <div id="active-count-badge" class="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-md">
                        ${isCoordinator ? '0 AIDANTS LIVE' : (isFamily ? 'SUIVI ACTIF' : 'GPS ACTIF')}
                    </div>
                </div>
            </div>
            
            <div id="live-map-container" class="flex-1 w-full rounded-[2rem] border-4 border-white shadow-2xl relative overflow-hidden bg-slate-100 min-h-[400px]">
                <div id="map" class="absolute inset-0 z-10 w-full h-full"></div>
                
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
                        <span class="text-white text-[9px] font-black uppercase tracking-widest">Légende</span>
                    </div>
                    <div class="space-y-2">
                        ${isCoordinator ? `
                            <div class="flex items-center gap-2 text-[10px] text-slate-300">
                                <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span>Aidant en intervention</span>
                            </div>
                            <div class="flex items-center gap-2 text-[10px] text-slate-300">
                                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span>Domicile du patient</span>
                            </div>
                        ` : ''}
                        ${isFamily ? `
                            <div class="flex items-center gap-2 text-[10px] text-slate-300">
                                <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span>Position de l'aidant</span>
                            </div>
                            <div class="flex items-center gap-2 text-[10px] text-slate-300">
                                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span>Domicile de votre proche</span>
                            </div>
                        ` : ''}
                        ${isAidant ? `
                            <div class="flex items-center gap-2 text-[10px] text-slate-300">
                                <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span>Votre position actuelle</span>
                            </div>
                            <div class="flex items-center gap-2 text-[10px] text-slate-300">
                                <div class="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span>Siège SPS</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        if (map) {
            map.remove();
            map = null;
            markers = {};
        }
        
        const mapLoading = document.getElementById('map-loading');
        
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true,
            zoomSnap: 0.5,
            wheelPxPerZoomLevel: 120
        });
        
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
        
        setTimeout(() => {
            if (map) map.invalidateSize(true);
        }, 150);
        
        document.getElementById('center-map-btn')?.addEventListener('click', () => {
            if (Object.keys(markers).length > 0) {
                const bounds = [];
                Object.values(markers).forEach(m => bounds.push(m.getLatLng()));
                if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                map.setView([6.368, 2.401], 13);
            }
        });
        
        // Charger les données selon le rôle
        if (isCoordinator) {
            await loadCoordinatorMap();
        } else if (isFamily) {
            await loadFamilyMap();
        } else if (isAidant) {
            await loadAidantMap();
        }
        
        if (activeInterval) clearInterval(activeInterval);
        activeInterval = setInterval(async () => {
            if (isCoordinator) {
                await loadCoordinatorMap();
            } else if (isFamily) {
                await loadFamilyMap();
            } else if (isAidant) {
                await loadAidantMap();
            }
        }, 10000); // Rafraîchissement toutes les 10 secondes
        
    }, 100);
}

/**
 * 📡 COORDINATEUR : Voit tous les aidants + tous les patients
 */
async function loadCoordinatorMap() {
    if (!map) return;
    
    try {
        const activeVisits = await secureFetch('/visites/live-tracking');
        
        const badge = document.getElementById('active-count-badge');
        if (badge) {
            const count = activeVisits.length;
            badge.innerText = `${count} AIDANT${count > 1 ? 'S' : ''} LIVE`;
        }
        
        // Supprimer les anciens marqueurs
        Object.keys(markers).forEach(key => {
            if (markers[key]) {
                map.removeLayer(markers[key]);
                delete markers[key];
            }
        });
        
        // Ajouter les marqueurs des aidants
        for (const visit of activeVisits) {
            if (!visit.lat || !visit.lng) continue;
            
            const isInside = visit.is_inside !== false;
            const statusColor = isInside ? '#10B981' : '#F43F5E';
            
            const icon = createCustomIcon(statusColor, true, 'md', 'user-nurse');
            
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
                    </div>
                </div>
            `);
            
            markers[`aidant_${visit.visite_id}`] = marker;
        }
        
        // Ajouter les marqueurs des patients (domiciles)
        const patients = await secureFetch('/patients');
        for (const patient of patients) {
            if (!patient.lat || !patient.lng) continue;
            
            const icon = createCustomIcon('#3B82F6', false, 'sm', 'home');
            const marker = L.marker([patient.lat, patient.lng], { icon }).addTo(map);
            
            marker.bindPopup(`
                <div class="text-center p-2">
                    <p class="font-black text-slate-800 text-xs">🏠 ${escapeHtml(patient.nom_complet)}</p>
                    <p class="text-[9px] text-slate-400">${escapeHtml(patient.adresse || 'Adresse non renseignée')}</p>
                </div>
            `);
            
            markers[`patient_${patient.id}`] = marker;
        }
        
    } catch (err) {
        console.error("❌ Erreur chargement carte coordinateur:", err);
    }
}

/**
 * 👨‍👩‍👧 FAMILLE : Voit son patient + l'aidant assigné
 */
async function loadFamilyMap() {
    if (!map) return;
    
    try {
        // Récupérer le patient de la famille
        const patients = await secureFetch('/patients');
        const patient = patients?.[0];
        
        if (!patient) {
            console.warn("Aucun patient trouvé pour cette famille");
            return;
        }
        
        const badge = document.getElementById('active-count-badge');
        if (badge) {
            badge.innerText = 'SUIVI ACTIF';
        }
        
        // Supprimer les anciens marqueurs
        Object.keys(markers).forEach(key => {
            if (markers[key]) {
                map.removeLayer(markers[key]);
                delete markers[key];
            }
        });
        
        // 1. Marqueur du domicile du patient (BLEU)
        if (patient.lat && patient.lng) {
            const homeIcon = createCustomIcon('#3B82F6', false, 'lg', 'home');
            const marker = L.marker([patient.lat, patient.lng], { icon: homeIcon }).addTo(map);
            marker.bindPopup(`
                <div class="text-center p-2">
                    <p class="font-black text-slate-800">🏠 Domicile</p>
                    <p class="text-xs">${escapeHtml(patient.nom_complet)}</p>
                    <p class="text-[10px] text-slate-400">${escapeHtml(patient.adresse || '')}</p>
                </div>
            `);
            markers['patient_home'] = marker;
        }
        
        // 2. Récupérer la position de l'aidant (si visite en cours)
        const activeVisit = await secureFetch(`/visites/active/${patient.id}`);
        
        if (activeVisit && activeVisit.lat && activeVisit.lng) {
            const aidantIcon = createCustomIcon('#10B981', true, 'lg', 'user-nurse');
            const marker = L.marker([activeVisit.lat, activeVisit.lng], { icon: aidantIcon }).addTo(map);
            marker.bindPopup(`
                <div class="text-center p-2">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-user-nurse text-emerald-500"></i>
                        <p class="font-black text-slate-800">${escapeHtml(activeVisit.aidant_nom || 'Aidant')}</p>
                    </div>
                    <p class="text-[10px] text-slate-400">Dernière mise à jour: ${new Date(activeVisit.last_update).toLocaleTimeString()}</p>
                    <p class="text-[9px] ${activeVisit.is_inside ? 'text-emerald-600' : 'text-rose-600'} mt-1">
                        ${activeVisit.is_inside ? '✅ Dans le périmètre' : '⚠️ En déplacement'}
                    </p>
                </div>
            `);
            markers['aidant_position'] = marker;
            
            // Centrer la carte entre le patient et l'aidant
            const bounds = L.latLngBounds(
                [patient.lat, patient.lng],
                [activeVisit.lat, activeVisit.lng]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (patient.lat && patient.lng) {
            // Pas d'aidant actif, centrer sur le patient
            map.setView([patient.lat, patient.lng], 15);
        } else {
            map.setView([6.368, 2.401], 13);
        }
        
    } catch (err) {
        console.error("❌ Erreur chargement carte famille:", err);
    }
}

/**
 * 👨‍⚕️ AIDANT : Voit sa position + le siège SPS
 */
async function loadAidantMap() {
    if (!map) return;
    
    try {
        const badge = document.getElementById('active-count-badge');
        if (badge) {
            badge.innerText = 'GPS ACTIF';
        }
        
        // Supprimer les anciens marqueurs
        Object.keys(markers).forEach(key => {
            if (markers[key]) {
                map.removeLayer(markers[key]);
                delete markers[key];
            }
        });
        
        // 1. Ajouter le marqueur du siège SPS (VIOLET)
        const hqIcon = createCustomIcon('#8B5CF6', false, 'lg', 'building');
        const hqMarker = L.marker([SPS_HQ.lat, SPS_HQ.lng], { icon: hqIcon }).addTo(map);
        hqMarker.bindPopup(`
            <div class="text-center p-2">
                <p class="font-black text-slate-800">🏢 Siège Santé Plus</p>
                <p class="text-[10px] text-slate-400">${SPS_HQ.name}</p>
            </div>
        `);
        markers['sps_hq'] = hqMarker;
        
        // 2. Obtenir et afficher la position actuelle de l'aidant
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    // Marqueur de l'aidant (VERT avec animation)
                    const aidantIcon = createCustomIcon('#10B981', true, 'lg', 'user-nurse');
                    const marker = L.marker([latitude, longitude], { icon: aidantIcon }).addTo(map);
                    marker.bindPopup(`
                        <div class="text-center p-2">
                            <p class="font-black text-slate-800">📍 Ma position</p>
                            <p class="text-[10px] text-slate-400">Lat: ${latitude.toFixed(6)}</p>
                            <p class="text-[10px] text-slate-400">Lng: ${longitude.toFixed(6)}</p>
                            <button onclick="window.zoomToLocation(${latitude}, ${longitude})" class="mt-2 px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px]">Centrer</button>
                        </div>
                    `);
                    markers['aidant_current'] = marker;
                    
                    // Centrer sur l'aidant
                    map.setView([latitude, longitude], 15);
                },
                (error) => {
                    console.warn("Erreur géolocalisation:", error.message);
                    map.setView([SPS_HQ.lat, SPS_HQ.lng], 13);
                    UI.warning("Activez votre position pour le tracking");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            map.setView([SPS_HQ.lat, SPS_HQ.lng], 13);
            UI.error("GPS non supporté par votre navigateur");
        }
        
    } catch (err) {
        console.error("❌ Erreur chargement carte aidant:", err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.zoomToLocation = (lat, lng) => {
    if (map) {
        map.setView([lat, lng], 16);
    }
};
