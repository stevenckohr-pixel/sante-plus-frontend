import { secureFetch } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { AppState } from "../core/state.js";
import { UI, compressImage, showSkeleton } from "../core/utils.js";


// Au tout début de visites.js, après les imports
console.log("🔍 [visites.js] Début du chargement du module");
console.log("🔍 [visites.js] UI importé:", typeof UI);
console.log("🔍 [visites.js] secureFetch importé:", typeof secureFetch);

// Variables globales pour le tracking GPS
let geoWatchId = null;
let lastSentPosition = null;
let trackingInterval = null;


export async function startVisit(patientId) {
  try {
    UI.vibrate();
    
    // Vérifier si une visite est déjà en cours
    const existingVisit = localStorage.getItem("active_visit_id");
    if (existingVisit) {
      const confirm = await Swal.fire({
        title: "Visite en cours",
        text: "Une visite est déjà active. Voulez-vous la terminer avant d'en démarrer une nouvelle ?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Terminer la visite",
        cancelButtonText: "Annuler",
        customClass: { popup: 'rounded-[2.5rem]' }
      });
      if (confirm.isConfirmed) {
        window.switchView("end-visit");
        return;
      }
      throw new Error("Une visite est déjà en cours");
    }

    Swal.fire({
      title: '<i class="fa-solid fa-satellite-dish fa-beat text-emerald-500 mb-2"></i><br><span class="text-xl font-black">Initialisation du Suivi</span>',
      html: '<p class="text-xs text-slate-400 uppercase tracking-widest font-bold">Couplage GPS et vérification du périmètre de sécurité...</p>',
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: { popup: 'rounded-[2.5rem]' },
      didOpen: () => Swal.showLoading(),
    });

    // 1. Capturer la position d'entrée
    const coords = await getCurrentLocation();
    const gpsString = `${coords.lat},${coords.lon}`;

    // 2. ✅ CORRECTION ICI : secureFetch retourne déjà les données
    const data = await secureFetch("/visites/start", {
      method: "POST",
      body: JSON.stringify({
        patient_id: patientId,
        gps_start: gpsString,
      }),
    
    });

    console.log("✅ Données reçues:", data);  

    // ✅ Plus besoin de res.json() et res.ok
    // if (!res.ok) throw new Error(data.error); ← À SUPPRIMER

    // 3. Stockage des identifiants de session
    localStorage.setItem("active_visit_id", data.visite_id);
    localStorage.setItem("active_patient_id", patientId);

    // 4. LANCEMENT DU TRACKER GPS
    startBackgroundTracking(data.visite_id);

    // 5. Rafraîchir l'UI pour cacher le bouton "Démarrer"
    refreshAidantUI(patientId);

    Swal.fire({
      icon: "success",
      title: '<span class="text-emerald-600 font-black">Protocole Activé</span>',
      html: `
        <div class="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4">
            <p class="text-[10px] text-slate-400 font-black uppercase mb-1">Système de sécurité</p>
            <p class="text-xs font-bold text-slate-600 leading-relaxed">📍 Position de départ: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}<br>🛰️ Tracking GPS Live : <span class="text-emerald-500">ACTIF</span><br>📡 Rapport automatique : <span class="text-emerald-500">EN COURS</span></p>
        </div>`,
      timer: 4000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-[2.5rem]' }
    });

    // Rediriger vers la page de visite en cours
    window.switchView("visits");

  } catch (err) {
    UI.vibrate("error");
    Swal.fire({
        title: "Erreur Visite",
        text: err.message, 
        icon: "error",
        confirmButtonColor: "#0F172A",
        customClass: { popup: 'rounded-[2.5rem]' }
    });
  }
}




/**
 * 📥 CHARGER LES VISITES
 */
export async function loadVisits() {
    const container = document.getElementById("visits-list");
    if (!container) return;

    // Afficher le squelette
    showSkeleton(container, 'visit-card');

    try {
        const data = await secureFetch("/visites");

        AppState.visites = Array.isArray(data) ? data : [];
        renderVisits();
    } catch (err) {
        console.error("❌ Erreur loadVisits:", err.message);
        container.innerHTML = `<p class="text-rose-500 text-center p-10 font-bold">Erreur: ${err.message}</p>`;
        throw err;
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
    .map((v, index) => {  
      const isPending =  v.statut === "En attente";
      const statusColor =
         v.statut === "Validé"
          ? "text-green-500"
          :  v.statut === "Rejeté"
            ? "text-red-500"
            : "text-orange-500";

      return `
            <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-4 list-item-animate" style="animation-delay: ${index * 0.05}s">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-black text-slate-800 uppercase text-xs">${v.patient.nom_complet}</h4>
                        <p class="text-[10px] text-slate-400">${UI.formatDate(v.heure_debut)}</p>
                    </div>
                    <span class="text-[9px] font-black uppercase ${statusColor}">${ v.statut}</span>
                </div>
                
                ${v.photo_url ? `<img src="${v.photo_url}" class="w-full h-32 object-cover rounded-2xl mb-3 shadow-inner">` : ""}
                
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                        ${v.aidant?.photo_url ? 
                            `<img src="${v.aidant.photo_url}" class="w-full h-full object-cover">` : 
                            `<i class="fa-solid fa-user-nurse text-slate-400 text-xs"></i>`
                        }
                    </div>
                    <p class="text-[11px] font-bold text-slate-600">${v.aidant.nom}</p>
                </div>
            </div>
        `;
    })
    .join("");
}




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

        const response = await fetch(`${CONFIG.API_URL}/visites/end`, {
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
        window.viewPatientFeed(AppState.currentPatient); 
        window.switchView("visits");

    } catch (err) {
        UI.vibrate("error");
        Swal.fire("Échec", err.message, "error");
    }
}

//--------------------------------------------------
//-----------------------------------------------------

/**
 * 📄 VUE : PAGE DE CLÔTURE DE VISITE (PLEIN ÉCRAN MOBILE)
 */
export async function renderEndVisitView() {
    const container = document.getElementById("view-container");

    // 1. Récupérer les infos du patient
    const patient = await secureFetch(`/patients/${AppState.currentPatient}`);

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
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3 block">Tâches réalisées</label>
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

//----------------------------------------------------------
//----------------------------------------------------------

export async function renderStartVisitView(patientId) {
    if (!patientId) {
        console.error("❌ renderStartVisitView: patientId manquant");
        UI.error("Patient non sélectionné");
        window.switchView('patients');
        return;
    }
    
    const container = document.getElementById("view-container");
    
    try {
        const p = await secureFetch(`/patients/${patientId}`);
        
        container.innerHTML = `
            <div class="animate-slideIn max-w-lg mx-auto pb-32">
                <div class="flex items-center gap-4 mb-8">
                    <button onclick="window.switchView('patients')" class="w-12 h-12 bg-white rounded-2xl border shadow-sm flex items-center justify-center text-slate-400">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h3 class="font-black text-2xl text-slate-800 tracking-tight">Mission : ${p.nom_complet}</h3>
                        <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Prêt pour l'intervention ?</p>
                    </div>
                </div>

                <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                        <p class="text-xs font-bold text-slate-800">${p.adresse || 'Adresse non renseignée'}</p>
                    </div>

                    <div class="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                        <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Instructions</p>
                        <p class="text-xs font-medium text-slate-700 leading-relaxed italic">"${p.notes_medicales || 'Aucune consigne.'}"</p>
                    </div>

                    <button onclick="window.startVisit('${p.id}')" class="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                        DÉMARRER LA VISITE (GPS)
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("❌ Erreur renderStartVisitView:", err);
        UI.error("Patient introuvable");
        window.switchView('patients');
    }
}

//--------------------------------------------------------------------
//-------------------------------------------------------------------

export async function checkActiveVisitOnStart() {
    try {
        console.log("🔍 Vérification des visites actives au démarrage...");
        const visits = await secureFetch("/visites");
        const activeVisit = visits.find(v => v.statut === "En cours");
        
        if (activeVisit) {
            console.log("🔄 Visite active trouvée en base:", activeVisit.id);
            localStorage.setItem("active_visit_id", activeVisit.id);
            localStorage.setItem("active_patient_id", activeVisit.patient_id);
            
            // ✅ Attendre que la vue patient soit chargée
            const currentPatientId = localStorage.getItem("active_patient_id");
            if (currentPatientId) {
                setTimeout(() => {
                    // Vérifier si on est sur la vue patient
                    const container = document.getElementById("aidant-active-area");
                    if (container) {
                        refreshAidantUI(currentPatientId);
                    }
                }, 500);
            }
        } else {
            console.log("✅ Aucune visite active trouvée");
            localStorage.removeItem("active_visit_id");
            localStorage.removeItem("active_patient_id");
            localStorage.removeItem("geo_watch_id");
        }
    } catch (err) {
        console.error("Erreur vérification visite active:", err);
    }
}
//-------------------------------------------------------------------------
//------------------------------------------------------------

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


//-----------------------------------------------------------------------------
//------------------------------------------------------------------------

export function refreshAidantUI(patientId) {
    // ✅ Attendre que le DOM soit prêt
    const tryRefresh = () => {
        const container = document.getElementById("aidant-active-area");
        if (!container) {
            console.log("⏳ En attente de l'élément aidant-active-area...");
            setTimeout(tryRefresh, 200);
            return;
        }
        
        const activeVisitId = localStorage.getItem("active_visit_id");
        
        console.log("🔄 refreshAidantUI - activeVisitId:", activeVisitId);
        console.log("🔄 refreshAidantUI - patientId:", patientId);
        
        if (!activeVisitId) {
            container.innerHTML = `
                <div class="fixed bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-40">
                    <button onclick="window.startVisit('${patientId}')" 
                            class="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <i class="fa-solid fa-play"></i> Démarrer la visite
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="fixed bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-40">
                    <button onclick="window.openEndVisit()" 
                            class="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <i class="fa-solid fa-camera"></i> Clôturer la visite
                    </button>
                </div>
            `;
        }
    };
    
    tryRefresh();
}
//-----------------------------------------------------
//-------------------------------------------------------------

function getChecklistHTML(category) {
    // 🍼 Tâches spécifiques pour les jeunes mamans
    const tasksMaman = [
        { label: 'Aide Organisation (Rangement)', icon: '🧺' },
        { label: 'Assistance non-médicale Bébé', icon: '🍼' },
        { label: 'Préparation repas simples', icon: '🍲' },
        { label: 'Soutien moral et écoute', icon: '🗣️' }
    ];

    // 👴 Tâches spécifiques pour les Séniors / Post-Hôpital
    const tasksSenior = [
        { label: 'Rappel des médicaments', icon: '💊' }, 
        { label: 'Aide à la mobilité / Promenade', icon: '🚶' },
        { label: 'Assistance repas / courses', icon: '🛒' },
        { label: 'Présence rassurante & Ecoute', icon: '🤝' }
    ];

    const tasks = category === 'MAMAN_BEBE' ? tasksMaman : tasksSenior;

    return tasks.map(t => `
        <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-[1.2rem] border border-slate-100 cursor-pointer hover:bg-emerald-50 transition-colors">
            <input type="checkbox" class="task-check w-5 h-5 accent-emerald-500" value="${t.label}"> 
            <span class="text-xs font-black text-slate-700 uppercase">${t.icon} ${t.label}</span>
        </label>
    `).join('');
}




/**
 * 📤 SOUMISSION DU BILAN ET DÉCOUPLAGE GPS
 */


/**
 * ⭐ NOTATION DE LA VISITE (Famille)
 */
window.rateVisit = async (visiteId) => {
    const { value: rating } = await Swal.fire({
        title: 'Noter l\'intervention',
        html: `
            <div class="text-center">
                <p class="text-sm text-slate-600 mb-3">Comment s'est passée la visite ?</p>
                <div class="flex justify-center gap-2 text-3xl" id="star-rating">
                    ${[1,2,3,4,5].map(i => `<i class="fa-regular fa-star text-slate-300 cursor-pointer hover:text-amber-400 transition" data-rating="${i}"></i>`).join('')}
                </div>
                <textarea id="rating-comment" class="w-full mt-4 p-3 bg-slate-50 rounded-xl text-sm" rows="2" placeholder="Votre commentaire (optionnel)..."></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '✓ Envoyer',
        cancelButtonText: 'Plus tard',
        confirmButtonColor: '#10B981',
        didOpen: () => {
            let selectedRating = 0;
            document.querySelectorAll('#star-rating i').forEach(star => {
                star.addEventListener('click', () => {
                    selectedRating = parseInt(star.dataset.rating);
                    document.querySelectorAll('#star-rating i').forEach((s, idx) => {
                        if (idx < selectedRating) {
                            s.className = 'fa-solid fa-star text-amber-400';
                        } else {
                            s.className = 'fa-regular fa-star text-slate-300';
                        }
                    });
                });
            });
            window.selectedRating = () => selectedRating;
        },
        preConfirm: () => {
            const rating = window.selectedRating ? window.selectedRating() : 0;
            if (rating === 0) {
                Swal.showValidationMessage('Veuillez sélectionner une note');
                return false;
            }
            const comment = document.getElementById('rating-comment')?.value || '';
            return { rating, comment };
        }
    });
    
    if (rating && rating.rating) {
        try {
            await secureFetch("/visites/rate", {
                method: "POST",
                body: JSON.stringify({
                    visite_id: visiteId,
                    note: rating.rating,
                    commentaire: rating.comment
                })
            });
            UI.success("Merci pour votre évaluation !");
        } catch (err) {
            UI.error(err.message);
        }
    }
};



/**
 * ▶️ DÉMARRER UNE VISITE (Version Élite avec Surveillance Live)
 */

/**
 * 📡 MOTEUR DE SURVEILLANCE LIVE
 * Envoie des signaux "ping" au serveur avec la position actuelle
 */
function startBackgroundTracking(visiteId) {
    if (!navigator.geolocation) {
        console.warn("⚠️ GPS non supporté sur ce navigateur");
        return;
    }

    // Nettoyer l'ancien watcher s'il existe
    if (geoWatchId) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
    }

    // Envoyer la position toutes les 10 secondes même sans mouvement
    if (trackingInterval) clearInterval(trackingInterval);
    
    trackingInterval = setInterval(async () => {
        if (!localStorage.getItem("active_visit_id")) {
            clearInterval(trackingInterval);
            return;
        }
        
        // Demander une position à jour
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    await sendPosition(position, visiteId);
                },
                (err) => console.warn("⚠️ Erreur position périodique:", err.message),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, 10000); // Toutes les 10 secondes

    // Watcher en continu pour les mouvements
    geoWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            await sendPosition(position, visiteId);
        },
        (error) => {
            console.error("❌ Erreur Watcher GPS:", error.message);
            if (error.code === 1) {
                // Permission refusée
                Swal.fire({
                    title: "GPS requis",
                    text: "Veuillez autoriser la localisation pour le suivi des visites",
                    icon: "warning",
                    confirmButtonColor: "#0F172A"
                });
            }
        },
        { 
            enableHighAccuracy: true, 
            maximumAge: 5000, // 5 secondes max
            timeout: 15000 
        }
    );

    localStorage.setItem("geo_watch_id", geoWatchId);
    console.log("🛰️ [GPS] Tracking démarré avec ID:", geoWatchId);
}

// Fonction helper pour envoyer une position
async function sendPosition(position, visiteId) {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Vérifier si la position a changé de façon significative (> 5m)
    if (lastSentPosition) {
        const lastLat = lastSentPosition.lat;
        const lastLng = lastSentPosition.lng;
        const distance = Math.sqrt(
            Math.pow(latitude - lastLat, 2) + 
            Math.pow(longitude - lastLng, 2)
        ) * 111000; // Conversion en mètres (approximative)
        
        if (distance < 5) {
            // Position trop proche de la précédente, on ignore
            return;
        }
    }
    
    // Vérifier la précision
    if (accuracy > 100) {
        console.warn(`🛰️ [GPS] Point ignoré : précision trop faible (${Math.round(accuracy)}m)`);
        return;
    }

    console.log(`🛰️ [GPS] Point envoyé : ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Précision: ${Math.round(accuracy)}m)`);
    
    // Mettre à jour la dernière position envoyée
    lastSentPosition = { lat: latitude, lng: longitude };

    try {
        await fetch(`${CONFIG.API_URL}/visites/track`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                visite_id: visiteId, 
                lat: latitude, 
                lng: longitude,
                accuracy: accuracy 
            })
        });
    } catch(e) {
        console.warn("❌ Erreur envoi position:", e);
    }
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
