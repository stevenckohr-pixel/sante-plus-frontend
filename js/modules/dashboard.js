import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";
import { loadRegistrations } from "../modules/admin.js";

/**
 * 🚀 DASHBOARD ÉLITE : Gestionnaire de Dossiers & KPIs
 */
export async function loadAdminDashboard() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
        <div class="animate-fadeIn pb-32">
            <!-- KPIs -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                ${renderStatCard('Dossiers', 'stat-patients', 'fa-hospital-user', 'bg-blue-500')}
                ${renderStatCard('Visites Jour', 'stat-visits', 'fa-calendar-check', 'bg-emerald-500')}
                ${renderStatCard('À Valider', 'stat-pending', 'fa-clipboard-check', 'bg-amber-500')}
                ${renderStatCard('CA Encaissé', 'stat-late', 'fa-hand-holding-dollar', 'bg-emerald-500')}
            </div>

            <!-- Inscriptions en attente -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                <div class="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-black text-slate-800">Inscriptions en attente</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Validation des accès & Activation Duo Pack</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3">
                            <i class="fa-solid fa-magnifying-glass text-slate-300 text-xs"></i>
                            <input type="text" id="pending-search" placeholder="Filtrer..." class="bg-transparent border-none outline-none text-sm font-medium w-full md:w-48">
                        </div>
                    </div>
                </div>

                <!-- Version Desktop -->
                <div class="hidden lg:block overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th class="px-6 py-4">Responsable</th>
                                <th class="px-6 py-4">Type</th>
                                <th class="px-6 py-4">Parent au Bénin</th>
                                <th class="px-6 py-4">Date</th>
                                <th class="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pending-table-body" class="divide-y divide-slate-50"></tbody>
                    </table>
                </div>

                <!-- Version Mobile -->
                <div id="pending-mobile-list" class="lg:hidden divide-y divide-slate-100"></div>
            </div>

            <!-- Rapports de visite à valider -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-50">
                    <h3 class="text-xl font-black text-slate-800">Derniers rapports de soins</h3>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Certification des interventions terrain</p>
                </div>
                <div id="pending-visits-list" class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            </div>
        </div>
    `;

    fetchStats();
    loadRegistrations();
    loadVisitsToValidate();
}

/**
 * 📊 CARTE STATISTIQUE
 */
function renderStatCard(label, id, icon, color) {
    return `
        <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center text-xl shadow-md">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">${label}</p>
                <h3 id="${id}" class="text-2xl font-black text-slate-800 tracking-tight">...</h3>
            </div>
        </div>
    `;
}

/**
 * 📈 RÉCUPÉRER LES STATISTIQUES
 */
async function fetchStats() {
    try {
        // ✅ Correction : secureFetch retourne déjà les données
        const stats = await secureFetch('/dashboard/stats');
        
        const patientsEl = document.getElementById('stat-patients');
        const visitsEl = document.getElementById('stat-visits');
        const pendingEl = document.getElementById('stat-pending');
        const revenueEl = document.getElementById('stat-late');
        
        if (patientsEl) patientsEl.innerText = stats.total_patients || 0;
        if (visitsEl) visitsEl.innerText = stats.visits_today || 0;
        if (pendingEl) pendingEl.innerText = stats.pending_validation || 0;
        if (revenueEl) revenueEl.innerText = UI.formatMoney(stats.revenue_total || 0);
        
    } catch (e) { 
        console.error("Stats Error:", e); 
    }
}
/**
 * 📋 CHARGER LES VISITES À VALIDER
 */
async function loadVisitsToValidate() {
    const list = document.getElementById('pending-visits-list');
    if (!list) return;
    
    try {
        // ✅ Correction : secureFetch retourne déjà les données, pas besoin de .json()
        const visits = await secureFetch('/visites?statut=En attente');
        const pending = Array.isArray(visits) ? visits.filter(v => v.statut === 'En attente') : [];

        if (pending.length === 0) {
            list.innerHTML = `<p class="col-span-2 text-center text-slate-400 italic text-sm py-10">Aucun rapport en attente.</p>`;
            return;
        }

        list.innerHTML = pending.map(v => `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    ${v.photo_url ? `<img src="${v.photo_url}" class="w-12 h-12 rounded-xl object-cover shadow-sm cursor-pointer" onclick="window.open('${v.photo_url}')">` : `
                        <div class="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
                            <i class="fa-solid fa-image text-slate-400"></i>
                        </div>
                    `}
                    <div>
                        <h5 class="font-black text-slate-800 text-xs uppercase">${v.patient?.nom_complet || 'Patient'}</h5>
                        <p class="text-[9px] text-slate-400 font-bold mt-0.5">${UI.formatDate(v.heure_debut)}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.quickValidate('${v.id}', 'Validé')" class="w-8 h-8 rounded-lg bg-emerald-500 text-white shadow-sm flex items-center justify-center active:scale-95 transition-all">
                        <i class="fa-solid fa-check text-xs"></i>
                    </button>
                    <button onclick="window.quickValidate('${v.id}', 'Rejeté')" class="w-8 h-8 rounded-lg bg-rose-500 text-white shadow-sm flex items-center justify-center active:scale-95 transition-all">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Erreur chargement visites:", e);
        list.innerHTML = `<p class="col-span-2 text-center text-rose-500 text-sm py-10">Erreur de chargement</p>`;
    }
}

/**
 * ✅ VALIDATION RAPIDE D'UNE VISITE
 */

// ✅ Définir la fonction comme une fonction normale, pas directement sur window
async function quickValidate(visiteId, statut) {
    Swal.fire({
        title: "Validation",
        text: `Confirmer la ${statut === 'Validé' ? 'validation' : 'invalidation'} de cette visite ?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: statut === 'Validé' ? "OUI, VALIDER" : "OUI, REJETER",
        confirmButtonColor: statut === 'Validé' ? "#10B981" : "#F43F5E",
        cancelButtonText: "Annuler",
        customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: "Traitement...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            try {
                await secureFetch("/visites/validate", {
                    method: "POST",
                    body: JSON.stringify({ visite_id: visiteId, statut: statut })
                });
                UI.success(`Visite ${statut === 'Validé' ? 'validée' : 'rejetée'} avec succès`);
                loadVisitsToValidate();
                fetchStats();
            } catch (err) {
                UI.error(err.message);
            }
        }
    });
}

// ✅ Exposer la fonction globalement pour les appels HTML
window.quickValidate = quickValidate;
window.fetchStats = fetchStats;

// ✅ Exporter la fonction pour l'import dans main.js
export { quickValidate };
