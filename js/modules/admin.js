import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 📥 CHARGER LES INSCRIPTIONS EN ATTENTE (Coordinateur)
 */
export async function loadRegistrations() {
    const tableBody = document.getElementById('pending-table-body');
    if (!tableBody) return;

    try {
         const res = await secureFetch('/api/admin/pending-registrations');
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
                    <button onclick="window.confirmActivation('${req.id}', '${req.email}', '${req.nom}', '${req.role}')" 
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

/**
 * 🔑 ACTION D'ACTIVATION
 */
window.confirmActivation = async (id, email, nom, role) => {
    const confirm = await Swal.fire({
        title: "Activer ce compte ?",
        text: `Envoyer les accès à ${nom} ?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10B981"
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Activation...', didOpen: () => Swal.showLoading() });
        
        try {
            await secureFetch('/admin/validate-member', {
                method: 'POST',
                body: JSON.stringify({ user_id: id, email, nom, role })
            });
            Swal.fire("Activé", "Email envoyé au collaborateur.", "success");
            loadRegistrations(); // Rafraîchit le tableau
        } catch (e) {
            Swal.fire("Erreur", e.message, "error");
        }
    }
};
