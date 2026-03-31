import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI, compressImage } from "../core/utils.js";

let geoWatchId = null;

export function refreshAidantUI(patientId) {
    const container = document.getElementById("aidant-active-area");
    if (!container) return;
    const activeVisitId = localStorage.getItem("active_visit_id");

    if (!activeVisitId) {
        container.innerHTML = `
            <button onclick="window.startVisit('${patientId}')" class="w-full py-6 bg-emerald-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex flex-col items-center gap-2">
                <i class="fa-solid fa-play text-3xl mb-1"></i>
                DÉMARRER LA VISITE
            </button>
            <p class="text-center text-[10px] text-slate-400 mt-4 uppercase font-black tracking-[0.2em] flex items-center justify-center gap-2">
                <i class="fa-solid fa-location-crosshairs text-emerald-500 animate-pulse"></i> Sécurisé par GPS
            </p>
        `;
    } else {
        container.innerHTML = `
            <div class="bg-amber-50 border border-amber-100 rounded-3xl p-6 mb-4 text-center animate-pulse relative overflow-hidden">
                <div class="absolute -right-4 -top-4 text-amber-500/10 text-6xl"><i class="fa-solid fa-satellite-dish"></i></div>
                <div class="flex justify-center mb-3">
                    <span class="relative flex h-4 w-4">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                    </span>
                </div>
                <p class="text-amber-700 font-black text-sm uppercase tracking-widest relative z-10">Intervention en cours</p>
                <p class="text-amber-500/80 text-[10px] font-bold uppercase mt-1 relative z-10">Tracking actif</p>
            </div>
            
            <!-- 👇 LE BOUTON OUVRE MAINTENANT NOTRE NOUVELLE PAGE PLEIN ÉCRAN 👇 -->
            <button onclick="window.openEndVisit()" class="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-2xl active:scale-95 transition-all flex flex-col items-center gap-2">
                <i class="fa-solid fa-camera text-3xl text-white mb-1"></i>
                CLÔTURER & PRENDRE PHOTO
            </button>
        `;
    }
}

/**
 * 📄 VUE : PAGE DE CLÔTURE DE VISITE (PLEIN ÉCRAN MOBILE)
 */
export async function renderEndVisitView() {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-lg mx-auto pb-24">
            <!-- Header de Page -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('visits')" class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:scale-95">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Rapport d'Intervention</h3>
                    <p class="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1"><i class="fa-solid fa-circle-dot animate-pulse mr-1"></i> Tracking actif</p>
                </div>
            </div>

            <div class="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100 space-y-8">
                
                <!-- 1. ACTIVITÉS -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3 block">Tâches réalisées pour ${patient.nom_complet}</label>
                    <div class="grid grid-cols-2 gap-3">
                        ${getChecklistHTML(patient.categorie_service)}
                    </div>
                </div>

                <!-- 2. HUMEUR (Émojis cliquables) -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3 block">Humeur du patient</label>
                    <select id="visit-humeur" class="app-input font-black text-slate-700 cursor-pointer">
                        <option value="Très Joyeux">😊 Très Joyeux / En forme</option>
                        <option value="Calme">😐 Calme / Stable</option>
                        <option value="Fatigué">😴 Un peu fatigué</option>
                        <option value="Triste">😔 Triste / Nostalgique</option>
                    </select>
                </div>

                <!-- 3. NOTES -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3 block">Message à la famille</label>
                    <textarea id="visit-notes" class="app-input h-28 !py-4" placeholder="Décrivez comment s'est passée la visite pour rassurer la famille..."></textarea>
                </div>

                <!-- 4. UPLOAD PHOTO (Look App Native) -->
                <div>
                    <label class="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2 mb-3 block"><i class="fa-solid fa-asterisk text-[8px] mr-1"></i> Preuve Photo requise</label>
                    <div class="relative w-full h-32 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                        <input type="file" id="visit-photo" accept="image/*" capture="environment" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="document.getElementById('photo-label').innerText = '📸 Photo capturée avec succès'">
                        <i class="fa-solid fa-camera text-3xl text-slate-300 mb-2"></i>
                        <p id="photo-label" class="text-xs font-black text-slate-500 uppercase tracking-widest">Prendre une photo</p>
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-50 mt-4">
                    <button onclick="window.submitEndVisit()" class="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                        Transmettre le rapport <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 📤 SOUMISSION DU BILAN ET DÉCOUPLAGE GPS
 */
export async function submitEndVisit() {
    const visiteId = localStorage.getItem("active_visit_id");
    const photoInput = document.getElementById("visit-photo");
    
    if (!photoInput.files || !photoInput.files[0]) {
        UI.vibrate('error');
        return Swal.fire("Photo Manquante", "La photo est obligatoire pour clôturer l'intervention.", "warning");
    }

    try {
        Swal.fire({
            title: '<i class="fa-solid fa-cloud-arrow-up fa-bounce text-blue-500 mb-4 text-4xl"></i><br><span class="text-xl font-black">Transmission...</span>',
            html: '<p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Envoi du bilan certifié en cours...</p>',
            allowOutsideClick: false,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[3rem] p-8' },
            didOpen: () => Swal.showLoading(),
        });

        // 📍 Récupération silencieuse du GPS final
        let gpsEnd = "0,0";
        try {
            if(navigator.geolocation) {
                const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout:5000}));
                gpsEnd = `${pos.coords.latitude},${pos.coords.longitude}`;
            }
        } catch (e) { console.warn("GPS final ignoré"); }

        // Récupération des données
        const notes = document.getElementById("visit-notes").value;
        const humeur = document.getElementById("visit-humeur").value;
        const activites = JSON.stringify(Array.from(document.querySelectorAll('.task-check:checked')).map(el => el.value));
        const compressedPhoto = await compressImage(photoInput.files[0]);

        const fd = new FormData();
        fd.append("visite_id", visiteId);
        fd.append("notes", notes);
        fd.append("humeur", humeur);
        fd.append("activites_faites", activites);
        fd.append("gps_end", gpsEnd);
        fd.append("photo_visite", compressedPhoto);

        const response = await fetch(`${window.CONFIG.API_URL}/visites/end`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: fd,
        });

        if (!response.ok) throw new Error("Erreur de transmission réseau.");

        // 🛑 DÉCOUPLAGE DU TRACKER GPS
        const watchId = localStorage.getItem("geo_watch_id");
        if (watchId) {
            navigator.geolocation.clearWatch(parseInt(watchId));
            localStorage.removeItem("geo_watch_id");
        }
        localStorage.removeItem("active_visit_id");
        
        UI.vibrate("success");
        await Swal.fire({
            icon: "success",
            title: '<span class="text-emerald-500 font-black">Mission Accomplie</span>',
            html: `<div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center gap-2 mt-2">
                    <i class="fa-solid fa-shield-check text-emerald-500"></i>
                    <span class="text-[10px] font-black text-emerald-600 uppercase">Données Sécurisées</span>
                   </div>`,
            confirmButtonColor: "#0F172A",
            confirmButtonText: "RETOUR AU PLANNING",
            customClass: { popup: 'rounded-[3rem]' }
        });

        window.switchView("visits");

    } catch (err) {
        UI.vibrate("error");
        Swal.fire("Échec", err.message, "error");
    }
}




/**
 * Charge les visites (Historique pour l'aidant ou le coordinateur)
 */
export async function loadVisits() {
  const container = document.getElementById("visits-list");
  if (!container) return;

  try {
    const response = await secureFetch("/visites");
    const data = await response.json();
    AppState.visites = data;
    renderVisits();
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">Erreur : ${err.message}</p>`;
  }
}



/**
 * Affiche les visites sous forme de Timeline
 */
export function renderVisits() {
  const container = document.getElementById("visits-list");
  if (!container) return;

  if (AppState.visites.length === 0) {
    container.innerHTML = `<p class="text-slate-400 text-center py-10 italic">Aucune visite enregistrée.</p>`;
    return;
  }

  container.innerHTML = AppState.visites
    .map((v) => {
      const isPending = v.statut_validation === "En attente";
      const statusColor =
        v.statut_validation === "Validé"
          ? "text-green-500"
          : v.statut_validation === "Rejeté"
            ? "text-red-500"
            : "text-orange-500";

      return `
            <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-black text-slate-800 uppercase text-xs">${v.patient.nom_complet}</h4>
                        <p class="text-[10px] text-slate-400">${UI.formatDate(v.heure_debut)}</p>
                    </div>
                    <span class="text-[9px] font-black uppercase ${statusColor}">${v.statut_validation}</span>
                </div>
                
                ${v.photo_url ? `<img src="${v.photo_url}" class="w-full h-32 object-cover rounded-2xl mb-3 shadow-inner">` : ""}
                
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                        <i class="fa-solid fa-user-nurse"></i>
                    </div>
                    <p class="text-[11px] font-bold text-slate-600">${v.aidant.nom}</p>
                </div>
            </div>
        `;
    })
    .join("");
}




/**
 * ▶️ DÉMARRER UNE VISITE (Version Élite avec Surveillance Live)
 */
window.startVisit = async (patientId) => {
  try {
    UI.vibrate();
    
    // UI Pro : Loader stylisé "SaaS"
    Swal.fire({
      title: '<i class="fa-solid fa-satellite-dish fa-beat text-emerald-500 mb-2"></i><br><span class="text-xl font-black">Initialisation du Suivi</span>',
      html: '<p class="text-xs text-slate-400 uppercase tracking-widest font-bold">Couplage GPS et vérification du périmètre de sécurité...</p>',
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: { popup: 'rounded-[2.5rem]' },
      didOpen: () => Swal.showLoading(),
    });

    // 1. Capturer la position d'entrée (Proof of Arrival)
    const coords = await getCurrentLocation();
    const gpsString = `${coords.lat},${coords.lon}`;

    // 2. Déclenchement au backend
    const res = await secureFetch("/visites/start", {
      method: "POST",
      body: JSON.stringify({
        patient_id: patientId,
        gps_start: gpsString,
      }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // 3. Stockage des identifiants de session
    localStorage.setItem("active_visit_id", data.visite_id);

    // 🚀 LANCEMENT DU TRACKER LIVE (Le Watcher)
    // Cela envoie la position au Coordinateur dès que l'aidant bouge de 1 mètre
    startBackgroundTracking(data.visite_id);

    Swal.fire({
      icon: "success",
      title: '<span class="text-emerald-600 font-black">Protocole Activé</span>',
      html: `
        <div class="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4">
            <p class="text-[10px] text-slate-400 font-black uppercase mb-1">Système de sécurité</p>
            <p class="text-xs font-bold text-slate-600 leading-relaxed">Tracking GPS Live : <span class="text-emerald-500">ACTIF</span><br>Rapport automatique : <span class="text-emerald-500">EN COURS</span></p>
        </div>`,
      timer: 3000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-[2.5rem]' }
    });

    window.switchView("visits");

  } catch (err) {
    UI.vibrate("error");
    Swal.fire({
        title: "Échec GPS",
        text: "Veuillez activer votre localisation pour certifier votre arrivée.",
        icon: "error",
        confirmButtonColor: "#0F172A",
        customClass: { popup: 'rounded-[2.5rem]' }
    });
  }
};





/**
 * 📡 MOTEUR DE SURVEILLANCE LIVE
 * Envoie des signaux "ping" au serveur avec la position actuelle
 */
function startBackgroundTracking(visiteId) {
    if (!navigator.geolocation) return;

    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);

    geoWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            
            // 🛡️ FILTRE DE PRÉCISION ÉLITE
            // Si la précision est supérieure à 60 mètres, on ignore le point (trop imprécis)
            if (accuracy > 60) {
                console.warn(`🛰️ [GPS] Point ignoré : précision trop faible (${Math.round(accuracy)}m)`);
                return;
            }

            console.log(`🛰️ [GPS] Point certifié : ${latitude}, ${longitude} (Précision: ${Math.round(accuracy)}m)`);

            fetch(`${window.CONFIG.API_URL}/visites/track`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ visite_id: visiteId, lat: latitude, lng: longitude })
            }).catch(e => {});
        },
        (error) => console.error("Erreur Watcher GPS:", error),
        { 
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 10000 
        }
    );

    localStorage.setItem("geo_watch_id", geoWatchId);
}


/**
 * 📍 UTILITAIRE : RÉCUPÉRER LA POSITION GPS ACTUELLE
 */
async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS non supporté par ce téléphone"));

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
          let msg = "Erreur GPS";
          if (err.code === 1) msg = "Merci d'autoriser le partage de position dans vos réglages.";
          reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/**
 * 🔄 REPRISE AUTOMATIQUE DU TRACKING
 * À appeler dans main.js au démarrage pour éviter de perdre le suivi en cas de refresh
 */
export function resumeTrackingIfActive() {
    const activeVisitId = localStorage.getItem("active_visit_id");
    if (activeVisitId && !geoWatchId) {
        console.log("🛰️ [GPS] Reprise du suivi pour la visite :", activeVisitId);
        startBackgroundTracking(activeVisitId);
    }
}



function getChecklistHTML(category) {
    const tasks = category === 'MAMAN_BEBE' ? [
        { label: 'Aide Organisation', icon: '✨' },
        { label: 'Assistance Bébé', icon: '👶' },
        { label: 'Repas légers', icon: '🍲' },
        { label: 'Écoute / Soutien', icon: '🎧' }
    ] : [
        { label: 'Rappel Médocs', icon: '💊' },
        { label: 'Prise Tension', icon: '🩺' },
        { label: 'Aide Repas', icon: '🍲' },
        { label: 'Courses / Logistique', icon: '🛒' }
    ];

    return tasks.map(t => `
        <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-[1.2rem] border border-slate-100 cursor-pointer hover:bg-emerald-50 transition-colors">
            <input type="checkbox" class="task-check w-5 h-5 accent-emerald-500" value="${t.label}"> 
            <span class="text-xs font-black text-slate-700 uppercase">${t.icon} ${t.label}</span>
        </label>
    `).join('');
}

/**
 * 🏠 FIXER LE DOMICILE DU PATIENT (Elite Feature)
 * Permet à l'aidant, lors de sa première visite, d'enregistrer 
 * l'emplacement exact de la maison pour le Geofencing futur.
 */
window.savePatientHomeGPS = async (patientId) => {
    const confirm = await Swal.fire({
        title: 'Fixer le domicile ?',
        text: "Voulez-vous enregistrer votre position actuelle comme l'adresse officielle de ce patient ?",
        icon: 'location-dot',
        showCancelButton: true,
        confirmButtonText: 'OUI, ENREGISTRER',
        confirmButtonColor: '#10B981',
        customClass: { popup: 'rounded-[2.5rem]' }
    });

    if (confirm.isConfirmed) {
        try {
            Swal.fire({ title: 'Localisation...', didOpen: () => Swal.showLoading() });
            const coords = await getCurrentLocation();
            
            await secureFetch(`/patients/update-gps`, {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: patientId,
                    lat: coords.lat,
                    lng: coords.lon
                })
            });

            UI.vibrate();
            Swal.fire("Succès", "Le périmètre de sécurité est désormais actif pour ce domicile.", "success");
        } catch (err) {
            Swal.fire("Erreur", err.message, "error");
        }
    }
};
