import { secureFetch } from "../core/api.js";
import { UI, compressImage } from "../core/utils.js";

/**
 * 📱 PAGE PROFIL UTILISATEUR
 */
export async function renderProfilePage() {
    const container = document.getElementById("view-container");
    const userRole = localStorage.getItem("user_role");
    const userId = localStorage.getItem("user_id");
    const userName = localStorage.getItem("user_name");
    const userEmail = localStorage.getItem("user_email");
    const userPhoto = localStorage.getItem("user_photo");
    
    // Récupérer les infos complètes depuis le backend
    let profile = null;
    let patient = null;
    
    try {
        const profileRes = await secureFetch(`/auth/profile/${userId}`);
        profile = profileRes;
        
        if (userRole === "FAMILLE") {
            const patients = await secureFetch("/patients");
            if (patients && patients.length > 0) {
                patient = patients[0];
            }
        }
    } catch (e) {
        console.error("Erreur chargement profil:", e);
    }
    
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeColor = isMaman ? 'pink' : 'emerald';
    const themeBgClass = isMaman ? 'bg-pink-50' : 'bg-emerald-50';
    const themeTextClass = isMaman ? 'text-pink-600' : 'text-emerald-600';
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-2xl mx-auto pb-32">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('home')" 
                        class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95">
                    <i class="fa-solid fa-arrow-left text-lg"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Mon Profil</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gérez vos informations personnelles</p>
                </div>
            </div>
            
            <!-- Photo de profil -->
            <div class="flex flex-col items-center mb-8">
                <div class="relative">
                    <div id="profile-photo-container" 
                         class="w-32 h-32 rounded-2xl ${themeBgClass} border-4 border-white shadow-xl flex items-center justify-center cursor-pointer overflow-hidden"
                         onclick="document.getElementById('profile-photo-input').click()">
                        ${userPhoto ? 
                            `<img src="${userPhoto}" class="w-full h-full object-cover">` : 
                            `<i class="fa-solid fa-camera text-4xl ${themeTextClass}"></i>`
                        }
                    </div>
                    <button onclick="document.getElementById('profile-photo-input').click()" 
                            class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
                        <i class="fa-solid fa-pen text-xs"></i>
                    </button>
                    <input type="file" id="profile-photo-input" accept="image/*" class="hidden" onchange="window.updateProfilePhoto(this.files[0])">
                </div>
                <h2 class="text-xl font-black text-slate-800 mt-4">${escapeHtml(profile?.nom || userName)}</h2>
                <p class="text-xs font-bold ${themeTextClass} uppercase tracking-wider mt-1">${userRole}</p>
            </div>
            
            <!-- UN SEUL BLOC - Informations personnelles -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-100">
                    <h4 class="font-black text-slate-800">Informations personnelles</h4>
                    <p class="text-[10px] text-slate-400 mt-1">Modifiez vos informations ci-dessous</p>
                </div>
                
                <div class="p-6 space-y-5">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-user mr-1"></i> Nom complet
                        </label>
                        <input type="text" id="profile-nom" value="${escapeHtml(profile?.nom || userName)}" 
                               class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300">
                    </div>
                    
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-envelope mr-1"></i> Email
                        </label>
                        <input type="email" id="profile-email" value="${escapeHtml(profile?.email || userEmail)}" 
                               class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300">
                    </div>
                    
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-phone mr-1"></i> Téléphone
                        </label>
                        <input type="tel" id="profile-telephone" value="${escapeHtml(profile?.telephone || '')}" 
                               class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300"
                               placeholder="+229 XX XXX XXX">
                    </div>
                    
                    <button onclick="window.updateProfile()" 
                            class="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all">
                        <i class="fa-solid fa-save mr-2"></i> Enregistrer les modifications
                    </button>
                </div>
            </div>
            
            ${userRole === "FAMILLE" && patient ? `
            <!-- Section Patient -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div class="p-6 border-b border-slate-100">
                    <h4 class="font-black text-slate-800">Dossier de votre proche</h4>
                    <p class="text-[10px] text-slate-400 mt-1">Informations du patient</p>
                </div>
                
                <div class="p-6 space-y-5">
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <div id="patient-photo-container" 
                                 class="w-16 h-16 rounded-xl ${themeBgClass} border-2 border-white shadow-md flex items-center justify-center cursor-pointer overflow-hidden"
                                 onclick="document.getElementById('patient-photo-input').click()">
                                ${patient?.photo_url ? 
                                    `<img src="${patient.photo_url}" class="w-full h-full object-cover">` : 
                                    `<i class="fa-solid fa-user text-2xl ${themeTextClass}"></i>`
                                }
                            </div>
                            <button onclick="document.getElementById('patient-photo-input').click()" 
                                    class="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
                                <i class="fa-solid fa-pen text-[8px]"></i>
                            </button>
                            <input type="file" id="patient-photo-input" accept="image/*" class="hidden" onchange="window.updatePatientPhoto(this.files[0])">
                        </div>
                        <div>
                            <p class="font-black text-slate-800">${escapeHtml(patient.nom_complet)}</p>
                            <p class="text-[10px] text-slate-400">${patient.formule || 'Standard'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-location-dot mr-1"></i> Adresse
                        </label>
                        <input type="text" id="patient-adresse" value="${escapeHtml(patient.adresse || '')}" 
                               class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300">
                    </div>
                    
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-notes-medical mr-1"></i> Notes médicales
                        </label>
                        <textarea id="patient-notes" rows="3" 
                                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300"
                                  placeholder="Allergies, traitements, précautions...">${escapeHtml(patient.notes_medicales || '')}</textarea>
                    </div>
                    
                    <button onclick="window.updatePatientInfo()" 
                            class="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all">
                        <i class="fa-solid fa-save mr-2"></i> Enregistrer
                    </button>
                </div>
            </div>
            ` : ''}
            
            ${userRole === "AIDANT" ? `
            <!-- Section Aidant -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div class="p-6 border-b border-slate-100">
                    <h4 class="font-black text-slate-800">Compétences & Disponibilités</h4>
                    <p class="text-[10px] text-slate-400 mt-1">Informations professionnelles</p>
                </div>
                
                <div class="p-6 space-y-5">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-stethoscope mr-1"></i> Compétences
                        </label>
                        <div class="flex flex-wrap gap-2">
                            ${['Soins de base', 'Aide à la mobilité', 'Préparation repas', 'Accompagnement', 'Premiers secours'].map(skill => `
                                <label class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full text-xs">
                                    <input type="checkbox" class="skill-check" value="${skill}" ${profile?.competences?.includes(skill) ? 'checked' : ''}>
                                    ${skill}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            <i class="fa-solid fa-calendar mr-1"></i> Disponibilités
                        </label>
                        <textarea id="aidant-disponibilites" rows="2" 
                                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300"
                                  placeholder="Lundis et mercredis après-midi, week-ends...">${escapeHtml(profile?.disponibilites || '')}</textarea>
                    </div>
                    
                    <button onclick="window.updateAidantInfo()" 
                            class="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all">
                        <i class="fa-solid fa-save mr-2"></i> Enregistrer
                    </button>
                </div>
            </div>
            ` : ''}
            
            <!-- Statistiques -->
            <div class="bg-slate-50 rounded-2xl p-6 mt-6">
                <h4 class="font-black text-slate-800 mb-4">Statistiques</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                        <p class="text-2xl font-black text-emerald-600" id="stat-missions">0</p>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">${userRole === 'AIDANT' ? 'Missions' : 'Visites'}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-black text-emerald-600" id="stat-rating">0</p>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fiabilité</p>
                    </div>
                </div>
            </div>
            
            <!-- Bouton déconnexion -->
            <button onclick="window.logout()" class="w-full mt-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all">
                <i class="fa-solid fa-power-off mr-2"></i> Déconnexion
            </button>
        </div>
    `;
    
    loadUserStats(userRole, userId);
}

/**
 * 📊 Charger les statistiques utilisateur
 */
async function loadUserStats(role, userId) {
    try {
        if (role === "AIDANT") {
            const stats = await secureFetch(`/aidants/stats/${userId}`);
            document.getElementById("stat-missions").innerText = stats.total_visites || 0;
            document.getElementById("stat-rating").innerText = `${stats.taux_validation || 0}%`;
        } else {
            const visits = await secureFetch("/visites");
            document.getElementById("stat-missions").innerText = visits?.length || 0;
            document.getElementById("stat-rating").innerText = "100%";
        }
    } catch (e) {
        console.error("Erreur chargement stats:", e);
    }
}

/**
 * 📸 Mettre à jour la photo de profil
 */
window.updateProfilePhoto = async (file) => {
    if (!file) return;
    
    Swal.fire({ title: "Upload...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("photo", compressed);
        
        const result = await secureFetch("/auth/update-photo", {
            method: "POST",
            body: formData,
            headers: {}
        });
        
        if (result.photo_url) {
            const container = document.getElementById("profile-photo-container");
            container.innerHTML = `<img src="${result.photo_url}?t=${Date.now()}" class="w-full h-full object-cover">`;
            localStorage.setItem("user_photo", result.photo_url);
            UI.success("Photo mise à jour");
        }
    } catch (err) {
        UI.error(err.message);
    }
};

/**
 * 📸 Mettre à jour la photo du patient
 */
window.updatePatientPhoto = async (file) => {
    if (!file) return;
    
    Swal.fire({ title: "Upload...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("photo", compressed);
        
        const result = await secureFetch("/patients/update-photo", {
            method: "POST",
            body: formData,
            headers: {}
        });
        
        if (result.photo_url) {
            const container = document.getElementById("patient-photo-container");
            container.innerHTML = `<img src="${result.photo_url}?t=${Date.now()}" class="w-full h-full object-cover">`;
            UI.success("Photo du patient mise à jour");
        }
    } catch (err) {
        UI.error(err.message);
    }
};

/**
 * 💾 Mettre à jour le profil
 */
window.updateProfile = async () => {
    const nom = document.getElementById("profile-nom")?.value;
    const email = document.getElementById("profile-email")?.value;
    const telephone = document.getElementById("profile-telephone")?.value;
    
    Swal.fire({ title: "Mise à jour...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        await secureFetch("/auth/update-profile", {
            method: "PUT",
            body: JSON.stringify({ nom, email, telephone })
        });
        
        localStorage.setItem("user_name", nom);
        UI.success("Profil mis à jour");
        Swal.close();
    } catch (err) {
        UI.error(err.message);
    }
};

/**
 * 💾 Mettre à jour les infos du patient
 */
window.updatePatientInfo = async () => {
    const adresse = document.getElementById("patient-adresse")?.value;
    const notes_medicales = document.getElementById("patient-notes")?.value;
    
    Swal.fire({ title: "Mise à jour...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        await secureFetch("/patients/update-info", {
            method: "PUT",
            body: JSON.stringify({ adresse, notes_medicales })
        });
        
        UI.success("Informations patient mises à jour");
        Swal.close();
    } catch (err) {
        UI.error(err.message);
    }
};

/**
 * 💾 Mettre à jour les infos aidant
 */
window.updateAidantInfo = async () => {
    const competences = Array.from(document.querySelectorAll('.skill-check:checked')).map(cb => cb.value);
    const disponibilites = document.getElementById("aidant-disponibilites")?.value;
    
    Swal.fire({ title: "Mise à jour...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    try {
        await secureFetch("/auth/update-aidant-info", {
            method: "PUT",
            body: JSON.stringify({ competences, disponibilites })
        });
        
        UI.success("Informations professionnelles mises à jour");
        Swal.close();
    } catch (err) {
        UI.error(err.message);
    }
};

/**
 * 🔧 Échapper les caractères HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export { renderProfilePage };
