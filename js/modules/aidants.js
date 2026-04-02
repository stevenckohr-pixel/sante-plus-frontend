import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";
import { showSkeleton } from "../core/utils.js";


/**
 * 📋 CHARGER LA LISTE DES COLLABORATEURS
 */
import { showSkeleton } from "../core/utils.js";

export async function loadAidants() {
    const container = document.getElementById('view-container');
    const userRole = localStorage.getItem('user_role');

    // Structure de base
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8 animate-fadeIn">
            <div>
                <h3 class="font-black text-2xl text-slate-800 tracking-tight">Équipe & RH</h3>
                <p class="text-xs text-slate-400 font-bold uppercase mt-1">Gestion des collaborateurs</p>
            </div>
            ${userRole === 'COORDINATEUR' ? `
                <button onclick="window.switchView('add-aidant')" class="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center">
                    <i class="fa-solid fa-user-plus text-lg"></i>
                </button>
            ` : ''}
        </div>
        <div id="aidants-list" class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24"></div>
    `;

    const list = document.getElementById('aidants-list');
    
    // 🎯 AFFICHER LE SQUELETTE PENDANT LE CHARGEMENT
    showSkeleton(list, 'aidant-card');

    try {
        // On récupère les Aidants
        const res = await secureFetch('/auth/profiles?role=AIDANT');
        let members = await res.json();
        
        // Bonus : On récupère aussi les Coordinateurs pour voir toute l'équipe
        const resCoord = await secureFetch('/auth/profiles?role=COORDINATEUR');
        const coords = await resCoord.json();
        members = [...coords, ...members];

        if (members.length === 0) {
            list.innerHTML = `<div class="col-span-full p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-sm"><p class="text-xs font-bold text-slate-400 uppercase">Aucun membre trouvé.</p></div>`;
            return;
        }

        // Rendu des Cartes "Employé"
        const cards = await Promise.all(members.map(async (m) => {
            let statsHtml = '';
            
            // Si c'est un aidant, on affiche ses statistiques terrain
            if(m.role === 'AIDANT') {
                try {
                    const statRes = await secureFetch(`/aidants/stats/${m.id}`);
                    const stats = await statRes.json();
                    statsHtml = `
                        <div class="flex items-center gap-3 mt-5 pt-5 border-t border-slate-50">
                            <span class="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-widest">${stats.total_visites} Visites</span>
                            <span class="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-widest">${stats.taux_validation}% Fiabilité</span>
                        </div>
                    `;
                } catch(e) {}
            }

            return `
                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow group animate-fadeIn">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${m.role === 'COORDINATEUR' ? 'from-slate-800 to-slate-900' : 'from-blue-500 to-cyan-400'} flex items-center justify-center text-white font-black text-xl shadow-lg">
                                ${m.nom.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 class="font-black text-slate-800 text-sm uppercase leading-none">${m.nom}</h4>
                                <p class="text-[9px] font-black ${m.role === 'COORDINATEUR' ? 'text-slate-400' : 'text-blue-500'} uppercase tracking-[0.2em] mt-1.5">${m.role}</p>
                            </div>
                        </div>
                        <a href="tel:${m.telephone}" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 hover:bg-green-500 hover:text-white transition-colors shadow-sm">
                            <i class="fa-solid fa-phone text-xs"></i>
                        </a>
                    </div>
                    ${statsHtml}
                </div>
            `;
        }));

        list.innerHTML = cards.join('');
    } catch (err) {
        console.error("Erreur chargement aidants:", err);
        list.innerHTML = `<p class="text-rose-500 text-center col-span-full p-10">Erreur de chargement</p>`;
    }
}

/**
 * 📄 VUE : PAGE DE RECRUTEMENT (Pleine page)
 */
export async function renderAddAidantView() {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-2xl mx-auto pb-24">
            <!-- Header de Page -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('aidants')" class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:scale-95">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nouveau Profil</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Création d'un accès collaborateur</p>
                </div>
            </div>

            <!-- Formulaire Native App -->
            <div class="bg-white rounded-[3rem] p-8 lg:p-10 shadow-sm border border-slate-100">
                <div class="space-y-6">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nom complet</label>
                        <div class="relative group">
                            <i class="fa-solid fa-user-tie absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="reg-nom" class="app-input !pl-12" placeholder="Ex: Chloé Dossou">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Email professionnel</label>
                        <div class="relative group">
                            <i class="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="reg-email" type="email" class="app-input !pl-12" placeholder="chloe@santeplus.bj">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Téléphone mobile</label>
                        <div class="relative group">
                            <i class="fa-solid fa-phone absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="reg-tel" class="app-input !pl-12" placeholder="+229 ...">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Mot de passe temporaire</label>
                        <div class="relative group">
                            <i class="fa-solid fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="reg-pass" type="text" class="app-input !pl-12 font-mono" placeholder="Sera envoyé à l'aidant" value="SPS-${Math.floor(1000 + Math.random() * 9000)}!">
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Rôle assigné</label>
                        <select id="reg-role" class="app-input font-bold text-slate-800 cursor-pointer">
                            <option value="AIDANT">Aidant Terrain (Intervenant)</option>
                            <option value="COORDINATEUR">Coordinateur (Administrateur)</option>
                        </select>
                    </div>

                    <div class="pt-8 mt-8 border-t border-slate-50">
                        <button onclick="window.submitAddAidant()" class="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                            Créer le collaborateur <i class="fa-solid fa-user-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 📤 SOUMISSION AU SERVEUR
 */
export async function submitAddAidant() {
    const nom = document.getElementById('reg-nom').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const tel = document.getElementById('reg-tel').value;
    const role = document.getElementById('reg-role').value;

    if (!nom || !email || !pass) {
        UI.vibrate('error');
        return Swal.fire({
            title: "Données manquantes",
            text: "Remplissez les champs obligatoires",
            icon: "warning",
            customClass: { popup: 'rounded-[2.5rem]' }
        });
    }

    Swal.fire({ title: 'Création du profil...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, customClass: { popup: 'rounded-[2.5rem]' } });

    try {
        const res = await secureFetch('/auth/create-member', {
            method: 'POST',
            body: JSON.stringify({ nom, email, telephone: tel, password: pass, role })
        });

        if (res.ok) {
            UI.vibrate("success");
            Swal.fire({
                icon: "success",
                title: "Recrutement Validé",
                text: "Le collaborateur peut maintenant se connecter à son espace.",
                confirmButtonColor: "#10B981",
                customClass: { popup: 'rounded-[2.5rem]' }
            });
            window.switchView("aidants"); // Retour automatique à la liste
        } else {
            const data = await res.json();
            throw new Error(data.error || "Erreur de création");
        }
    } catch (err) {
        Swal.fire({
            title: "Erreur",
            text: err.message,
            icon: "error",
            customClass: { popup: 'rounded-[2.5rem]' }
        });
    }
}
