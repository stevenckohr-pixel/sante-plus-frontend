import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 📥 CHARGER LES INSCRIPTIONS EN ATTENTE (Coordinateur)
 */
export async function loadRegistrations() {
    const tableBody = document.getElementById('pending-table-body');
    if (!tableBody) return;

    try {
         const res = await secureFetch('/admin/pending-registrations');
        const pending = await res.json();

        if (pending.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-slate-400 italic">Aucune inscription en attente.</td></tr>';
            return;
        }

        tableBody.innerHTML = pending.map(req => `
            <tr class="border-b border-slate-50 hover:bg-slate-50">
                <td class="p-4 font-bold text-slate-700">${req.nom}</td>
                <td class="p-4 text-xs">${req.email}</td>
                <td class="p-4 text-blue-600 font-black text-xs">${req.role}</td>
                <td class="p-4 text-right">
                    <button onclick="window.openActivationPage('${req.id}', '${req.email}', '${req.nom}', '${req.role}')" 
                            class="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
                        Activer
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) { 
        console.error("Erreur chargement admin:", e);
        tableBody.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-rose-500">Erreur de chargement</td></tr>';
    }
}


export async function openActivationPage(id, email, nom, role) {
    const container = document.getElementById("view-container");
    
    container.innerHTML = `
        <div class="animate-slideIn max-w-lg mx-auto pb-24">
            <!-- Header avec retour -->
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('dashboard')" class="w-12 h-12 bg-white rounded-2xl shadow-sm border flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Validation Dossier</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Activation & Accès</p>
                </div>
            </div>

            <!-- Carte de Validation -->
            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidat</p>
                    <h2 class="text-xl font-black text-slate-800">${nom}</h2>
                    <p class="text-xs text-blue-600 font-bold">${email} • ${role}</p>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label class="text-[10px] font-black text-slate-400 uppercase block mb-2">Instructions pour l'email de bienvenue</label>
                    <textarea id="val-notes" class="w-full h-32 bg-transparent text-sm font-medium outline-none" placeholder="Ex: Bienvenue... votre compte sera actif dès réception de votre premier virement."></textarea>
                </div>

                <div class="flex gap-4 pt-4">
                    <button onclick="window.switchView('dashboard')" class="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-100">Annuler</button>
                    <button onclick="window.processValidation('${id}', '${email}', '${nom}', '${role}')" class="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-200">Activer le profil</button>
                </div>
            </div>
        </div>
    `;
}



window.confirmActivation = (id, email, nom, role) => {
    window.openActivationPage(id, email, nom, role);
};

window.processValidation = async (id, email, nom, role) => {
    const notes = document.getElementById('val-notes').value;
    Swal.fire({ title: 'Traitement...', didOpen: () => Swal.showLoading() });

    try {
        await secureFetch('/api/admin/validate-member', {
            method: 'POST',
            body: JSON.stringify({ user_id: id, email, nom, role, notes })
        });
        window.switchView('dashboard');
        Swal.fire("Succès", "Collaborateur activé.", "success");
    } catch(e) {
        Swal.fire("Erreur", e.message, "error");
    }
};
