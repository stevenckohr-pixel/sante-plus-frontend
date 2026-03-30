import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 📋 CHARGER LA LISTE DES MEMBRES DE L'ÉQUIPE
 */
export async function loadAidants() {
    const container = document.getElementById('view-container');
    const userRole = localStorage.getItem('user_role');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6 animate-fadeIn">
            <h3 class="font-black text-xl text-slate-800">Équipe Santé Plus</h3>
            <!-- SEUL LE COORDINATEUR VOIT LE BOUTON RECRUTER -->
            <button onclick="window.openAddAidantModal()" class="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                + Recruter
            </button>
        </div>
        <div id="aidants-list" class="space-y-4">
             <div class="flex justify-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-slate-200 text-3xl"></i></div>
        </div>
    `;

    try {
        const res = await secureFetch('/auth/profiles?role=AIDANT'); // On peut aussi charger les COORDINATEURS
        const members = await res.json();
        
        const list = document.getElementById('aidants-list');
        if (members.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-slate-400 italic text-xs">Aucun membre dans l'équipe.</p>`;
            return;
        }

        list.innerHTML = members.map(m => `
            <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                        ${m.nom.charAt(0)}
                    </div>
                    <div>
                        <h4 class="font-black text-slate-800 text-xs uppercase">${m.nom}</h4>
                        <p class="text-[9px] font-bold text-blue-500 uppercase">${m.role}</p>
                    </div>
                </div>
                <a href="tel:${m.telephone}" class="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <i class="fa-solid fa-phone text-xs"></i>
                </a>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

/**
 * ➕ MODALE DE RECRUTEMENT (Le Formulaire)
 */
export async function openAddAidantModal() {
    const { value: formValues } = await Swal.fire({
        title: '<span class="text-lg font-black uppercase">Nouveau Membre</span>',
        html: `
            <div class="text-left space-y-4 p-2">
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-1">Nom complet</label>
                    <input id="reg-nom" class="swal2-input !m-0 !w-full" placeholder="Ex: Jean Gnonlonfoun">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-1">Email professionnel</label>
                    <input id="reg-email" type="email" class="swal2-input !m-0 !w-full" placeholder="nom@santeplus.bj">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-1">Téléphone</label>
                    <input id="reg-tel" class="swal2-input !m-0 !w-full" placeholder="+229 ...">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-1">Mot de passe temporaire</label>
                    <input id="reg-pass" type="password" class="swal2-input !m-0 !w-full" placeholder="••••••••">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-1">Rôle assigné</label>
                    <select id="reg-role" class="swal2-input !m-0 !w-full">
                        <option value="AIDANT">Aidant (Companion)</option>
                        <option value="COORDINATEUR">Coordinateur (Admin)</option>
                    </select>
                </div>
            </div>`,
        confirmButtonText: 'CRÉER LE COMPTE',
        confirmButtonColor: '#0f172a',
        showCancelButton: true,
        cancelButtonText: 'Annuler',
        preConfirm: () => {
            const nom = document.getElementById('reg-nom').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            if (!nom || !email || !pass) return Swal.showValidationMessage("Merci de remplir les champs obligatoires");
            return {
                nom, email, telephone: document.getElementById('reg-tel').value,
                password: pass, role: document.getElementById('reg-role').value
            }
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Création du compte...', didOpen: () => Swal.showLoading() });
            
            const res = await secureFetch('/auth/create-member', {
                method: 'POST',
                body: JSON.stringify(formValues)
            });

            if (res.ok) {
                Swal.fire("Bienvenue !", "Le nouveau collaborateur a été enregistré.", "success");
                loadAidants(); 
            }
        } catch (err) {
            Swal.fire("Erreur", err.message, "error");
        }
    }
}

/**
 * Rendu des cartes aidants
 */
async function renderAidants(aidants) {
  const list = document.getElementById("aidants-list");
  if (!list) return;

  if (aidants.length === 0) {
    list.innerHTML = `<p class="text-center py-10 text-slate-400 italic text-xs">Aucun aidant dans l'équipe.</p>`;
    return;
  }

  // On génère le HTML pour chaque aidant
  const cards = await Promise.all(
    aidants.map(async (a) => {
      // Optionnel : Récupérer les stats en temps réel pour chaque carte
      const statRes = await secureFetch(`/aidants/stats/${a.id}`);
      const stats = await statRes.json();

      return `
            <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-green-500 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src="${a.photo_url || "https://ui-avatars.com/api/?name=" + a.nom}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h4 class="font-black text-slate-800 uppercase text-xs">${a.nom}</h4>
                        <p class="text-[10px] text-slate-400 font-bold">${a.telephone || "Pas de numéro"}</p>
                        <div class="flex items-center gap-3 mt-2">
                            <span class="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">${stats.total_visites} Visites</span>
                            <span class="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">${stats.taux_validation}% Score</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2">
                    <button onclick="window.viewAidantDetails('${a.id}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
            </div>
        `;
    }),
  );

  list.innerHTML = cards.join("");
}



