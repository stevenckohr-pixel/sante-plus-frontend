import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI, compressImage } from "../core/utils.js";

export function refreshAidantUI(patientId) {
  const container = document.getElementById("aidant-active-area");
  const activeVisitId = localStorage.getItem("active_visit_id");

  if (!activeVisitId) {
    // ÉTAT : PRÊT À DÉMARRER
    container.innerHTML = `
            <button onclick="window.startVisit('${patientId}')" class="w-full py-6 bg-green-600 text-white rounded-3xl font-black text-lg shadow-lg shadow-green-200 active:scale-95 transition-all flex flex-col items-center gap-2">
                <i class="fa-solid fa-play text-2xl"></i>
                DÉMARRER LA VISITE
            </button>
            <p class="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Le GPS sera enregistré à l'arrivée</p>
        `;
  } else {
    // ÉTAT : EN COURS (Bouton pour terminer)
    container.innerHTML = `
            <div class="bg-orange-50 border border-orange-100 rounded-3xl p-6 mb-4 text-center">
                <div class="flex justify-center mb-2">
                    <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                </div>
                <p class="text-orange-700 font-black text-sm uppercase">Visite en cours...</p>
                <p class="text-orange-400 text-[10px] font-bold uppercase mt-1">N'oubliez pas de prendre la photo avant de partir</p>
            </div>
            
            <button onclick="window.openEndVisitModal()" class="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all flex flex-col items-center gap-2">
                <i class="fa-solid fa-flag-checkered text-2xl text-green-500"></i>
                TERMINER & ENVOYER LE BILAN
            </button>
        `;
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
 * 📍 RÉCUPÉRER LA POSITION GPS
 */
async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS non supporté"));

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error("Merci d'activer la localisation")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

/**
 * 🛰️ TRACKING LIVE & GEOFENCING (Variable globale pour le watcher)
 */
let geoWatchId = null; 

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

    // On s'assure qu'aucun autre watcher n'est actif
    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);

    // Démarrage de la surveillance haute précision
    geoWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Envoi furtif au serveur (Sans bloquer l'interface de l'aidant)
            fetch(`${window.CONFIG.API_URL}/visites/track`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    visite_id: visiteId,
                    lat: latitude,
                    lng: longitude
                })
            }).catch(e => console.warn("Signal GPS perdu temporairement..."));
        },
        (error) => console.error("Erreur Watcher GPS:", error),
        { 
            enableHighAccuracy: true, 
            maximumAge: 10000, // On accepte une position vieille de 10s max
            timeout: 5000 
        }
    );

    // Sauvegarde de l'ID du watcher pour pouvoir le couper lors de endVisit()
    localStorage.setItem("geo_watch_id", geoWatchId);
}

/**
 * ⏹️ TERMINER UNE VISITE
 */
window.openEndVisitModal = async () => {
  const { value: formValues } = await Swal.fire({
    title:
      '<span class="text-lg font-black uppercase">Bilan de la Visite</span>',
    html: `
            <div class="text-left space-y-6">
                <!-- 1. CHECK-LIST ACTIVITÉS -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Activités effectuées</label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                            <input type="checkbox" class="task-check w-4 h-4 accent-green-600" value="Repas"> <span class="text-xs font-bold">🍲 Repas</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                            <input type="checkbox" class="task-check w-4 h-4 accent-green-600" value="Toilette"> <span class="text-xs font-bold">🧼 Toilette</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                            <input type="checkbox" class="task-check w-4 h-4 accent-green-600" value="Médicaments"> <span class="text-xs font-bold">💊 Médicaments</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                            <input type="checkbox" class="task-check w-4 h-4 accent-green-600" value="Courses"> <span class="text-xs font-bold">🛒 Courses</span>
                        </label>
                    </div>
                </div>

                <!-- 2. HUMEUR (ÉMOTIONNEL) -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase mb-3 block">Humeur du proche</label>
                    <select id="visit-humeur" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                        <option value="Très Joyeux">😊 Très Joyeux / En forme</option>
                        <option value="Calme">😐 Calme / Stable</option>
                        <option value="Fatigué">😴 Un peu fatigué</option>
                        <option value="Triste">😔 Triste / Nostalgique</option>
                    </select>
                </div>

                <!-- 3. NOTES & PHOTO -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Petit message pour la famille</label>
                    <textarea id="visit-notes" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs h-24 outline-none focus:bg-white focus:ring-2 focus:ring-green-100" placeholder="Racontez comment s'est passée la visite..."></textarea>
                </div>

                <div class="p-4 bg-green-50 rounded-2xl border-2 border-dashed border-green-200 text-center">
                    <p class="text-[10px] font-black text-green-600 uppercase mb-2">📸 Preuve Photo (Obligatoire)</p>
                    <input type="file" id="visit-photo" accept="image/*" capture="camera" class="text-[10px] font-bold text-slate-500">
                </div>
            </div>
        `,
    confirmButtonText: "ENVOYER LE BILAN",
    confirmButtonColor: "#16a34a",
    showCancelButton: true,
    cancelButtonText: "Annuler",
    preConfirm: () => {
      const photo = document.getElementById("visit-photo").files[0];
      if (!photo)
        return Swal.showValidationMessage(
          "La photo est obligatoire pour rassurer la famille.",
        );

      return {
        notes: document.getElementById("visit-notes").value,
        humeur: document.getElementById("visit-humeur").value,
        activites: JSON.stringify(
          Array.from(document.querySelectorAll(".task-check:checked")).map(
            (el) => el.value,
          ),
        ),
        photo: photo,
      };
    },
  });

  if (formValues) {
    // Envoi au Backend (Utilise le code que nous avons fait dans l'étape précédente)
    saveEndVisit(formValues);
  }
};


/**
 * 📤 ENVOYER LE BILAN FINAL & COUPER LE SUIVI (Séquence de Clôture)
 */
async function saveEndVisit(formValues) {
  const visiteId = localStorage.getItem("active_visit_id");

  try {
    Swal.fire({
      title: '<i class="fa-solid fa-cloud-arrow-up fa-bounce text-blue-500 mb-2"></i><br><span class="text-xl font-black">Transmission...</span>',
      html: '<p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Envoi du bilan certifié et archivage de la photo...</p>',
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: { popup: 'rounded-[2.5rem]' },
      didOpen: () => Swal.showLoading(),
    });

    // 📍 1. Capture de la position finale (Preuve de présence à la sortie)
    let gpsEnd = "0,0";
    try {
      const coords = await getCurrentLocation();
      gpsEnd = `${coords.lat},${coords.lon}`;
    } catch (e) { console.warn("GPS final indisponible"); }

    // 📸 2. Compression optimisée
    const compressedPhoto = await compressImage(formValues.photo);

    // 📦 3. Construction du colis de données
    const fd = new FormData();
    fd.append("visite_id", visiteId);
    fd.append("notes", formValues.notes);
    fd.append("humeur", formValues.humeur);
    fd.append("activites_faites", formValues.activites);
    fd.append("gps_end", gpsEnd);
    fd.append("photo_visite", compressedPhoto);

    // 🚀 4. Transmission au serveur
    const response = await fetch(`${window.CONFIG.API_URL}/visites/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: fd,
    });

    if (!response.ok) throw new Error("Erreur lors de l'archivage du rapport.");

    // ============================================================
    // 🛑 5. PROTOCOLE DE DÉCOUPLAGE GPS (L'étape ajoutée)
    // ============================================================
    const watchId = localStorage.getItem("geo_watch_id");
    if (watchId) {
        navigator.geolocation.clearWatch(parseInt(watchId)); // Arrête physiquement le capteur
        localStorage.removeItem("geo_watch_id"); // Nettoie le stockage
        console.log("🛰️ [GPS] Surveillance Live désactivée proprement.");
    }
    
    // Nettoyage de la session de visite
    localStorage.removeItem("active_visit_id");
    UI.vibrate("success");

    // 🏆 6. UI de réussite
    await Swal.fire({
      icon: "success",
      title: '<span class="text-emerald-500 font-black">Mission Accomplie</span>',
      html: `
        <div class="text-center">
            <p class="text-sm text-slate-600">Le rapport a été transmis avec succès.<br>La famille a reçu une notification push.</p>
            <div class="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-2">
                <i class="fa-solid fa-shield-check text-emerald-500"></i>
                <span class="text-[10px] font-black text-emerald-600 uppercase">Données sécurisées & Horodatées</span>
            </div>
        </div>`,
      confirmButtonColor: "#0F172A",
      confirmButtonText: "RETOUR AU PLANNING",
      customClass: { popup: 'rounded-[2.5rem]' }
    });

    window.switchView("visits");

  } catch (err) {
    UI.vibrate("error");
    Swal.fire({
        title: "Échec Transmission",
        text: err.message,
        icon: "error",
        confirmButtonColor: "#ef4444",
        customClass: { popup: 'rounded-[2.5rem]' }
    });
  }
}
