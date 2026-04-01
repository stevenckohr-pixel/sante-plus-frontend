import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 🚀 DASHBOARD ÉLITE : Gestionnaire de Dossiers & KPIs
 */
export async function loadAdminDashboard() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
        <div class="animate-fadeIn pb-24">
            
            <!-- 📊 KPIs : Ligne de statistiques pro -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                ${renderStatCard('Dossiers', 'stat-patients', 'fa-hospital-user', 'bg-blue-500')}
                ${renderStatCard('Visites Jour', 'stat-visits', 'fa-calendar-check', 'bg-emerald-500')}
                ${renderStatCard('À Valider', 'stat-pending', 'fa-clipboard-check', 'bg-amber-500')}
                ${renderStatCard('Impayés', 'stat-late', 'fa-hand-holding-dollar', 'bg-rose-500')}
            </div>

            <!-- 📂 SECTION : GESTION DES DEMANDES D'ADMISSION -->
            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
                <div class="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                    <div>
                        <h3 class="text-xl font-black text-slate-800">Inscriptions en attente</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Validation des accès & Activation Duo Pack</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3">
                            <i class="fa-solid fa-magnifying-glass text-slate-300"></i>
                            <input type="text" placeholder="Filtrer..." class="bg-transparent border-none outline-none text-sm font-medium w-full md:w-48">
                        </div>
                    </div>
                </div>

                <!-- TABLEAU DESKTOP (Visible uniquement sur PC) -->
                <div class="hidden lg:block overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th class="px-8 py-5">Responsable</th>
                                <th class="px-8 py-5">Type</th>
                                <th class="px-8 py-5">Parent au Bénin</th>
                                <th class="px-8 py-5">Date</th>
                                <th class="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pending-table-body" class="divide-y divide-slate-50">
                            <!-- JS Inject -->
                        </tbody>
                    </table>
                </div>

                <!-- LISTE MOBILE (Visible uniquement sur Mobile) -->
                <div id="pending-mobile-list" class="lg:hidden divide-y divide-slate-50">
                    <!-- JS Inject -->
                </div>
            </div>

            <!-- 📸 SECTION : RAPPORTS DE VISITE -->
            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-8 border-b border-slate-50">
                    <h3 class="text-xl font-black text-slate-800">Derniers rapports de soins</h3>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Certification des interventions terrain</p>
                </div>
                <div id="pending-visits-list" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- JS Inject -->
                </div>
            </div>
        </div>
    `;

    // Lancer les chargements
    fetchStats();
    loadRegistrations();
    loadVisitsToValidate();
}

/**
 * 🎨 Rendu d'une ligne du tableau (PC)
 */
function renderTableRow(req) {
    const patient = (req.patients && req.patients.length > 0) ? req.patients[0] : null;
    const userData = btoa(JSON.stringify({ id: req.id, role: req.role, email: req.email, nom: req.nom }));

    return `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg">
                        ${req.nom.charAt(0)}
                    </div>
                    <div>
                        <p class="text-sm font-black text-slate-800 uppercase">${req.nom}</p>
                        <p class="text-[11px] text-slate-400 font-medium">${req.email}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-6">
                <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase">
                    ${req.role}
                </span>
            </td>
            <td class="px-8 py-6">
                ${patient ? `
                    <div class="flex flex-col">
                        <span class="text-xs font-black text-slate-700 uppercase">${patient.nom_complet}</span>
                        <span class="text-[9px] text-green-600 font-bold uppercase mt-0.5">${patient.formule}</span>
                    </div>
                ` : '<span class="text-slate-300 italic text-xs">Aucun</span>'}
            </td>
            <td class="px-8 py-6 text-[11px] font-bold text-slate-400">
                ${new Date(req.created_at).toLocaleDateString()}
            </td>
            <td class="px-8 py-6 text-right">
                <button onclick="window.confirmActivation('${userData}')" class="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-slate-100">
                    Activer
                </button>
            </td>
        </tr>
    `;
}

/**
 * 🎨 Rendu d'une carte (Mobile)
 */
function renderMobileCard(req) {
    const patient = (req.patients && req.patients.length > 0) ? req.patients[0] : null;
    const userData = btoa(JSON.stringify({ id: req.id, role: req.role, email: req.email, nom: req.nom }));

    return `
        <div class="p-6 bg-white">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        ${req.nom.charAt(0)}
                    </div>
                    <div>
                        <p class="text-sm font-black text-slate-800 uppercase">${req.nom}</p>
                        <p class="text-[10px] text-blue-500 font-bold uppercase">${req.role}</p>
                    </div>
                </div>
            </div>
            ${patient ? `
                <div class="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100 text-xs">
                    <p class="font-black text-slate-700 uppercase">${patient.nom_complet}</p>
                    <p class="text-green-600 font-bold mt-1">${patient.formule}</p>
                </div>
            ` : ''}
            <button onclick="window.confirmActivation('${userData}')" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                ACTIVER LE DOSSIER
            </button>
        </div>
    `;
}



async function fetchStats() {
    try {
        const res = await secureFetch('/dashboard/stats');
        const stats = await res.json();
        
        document.getElementById('stat-patients').innerText = stats.total_patients;
        document.getElementById('stat-visits').innerText = stats.visits_today;
        document.getElementById('stat-pending').innerText = stats.pending_validation;
        
        // 💰 Affichage du CA au lieu des impayés (plus valorisant)
        const revenueElement = document.getElementById('stat-late');
        revenueElement.innerText = new Intl.NumberFormat('fr-FR').format(stats.revenue_total) + ' CFA';
        revenueElement.classList.add('text-emerald-600'); // On le met en vert
        
        // On change le label de la carte
        revenueElement.previousElementSibling.innerText = "CA ENCAISSÉ";
        
    } catch (e) { console.error("Stats Error:", e); }
}

function renderStatCard(label, id, icon, color) {
    return `
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center text-2xl shadow-lg">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${label}</p>
                <h3 id="${id}" class="text-2xl font-black text-slate-800 tracking-tight">...</h3>
            </div>
        </div>
    `;
}

async function loadVisitsToValidate() {
    const list = document.getElementById('pending-visits-list');
    try {
        const res = await secureFetch('/visites?statut=En attente');
        const visits = await res.json();
        const pending = visits.filter(v => v.statut_validation === 'En attente');

        if (pending.length === 0) {
            list.innerHTML = `<p class="col-span-2 text-center text-slate-300 italic text-sm py-10">Aucun rapport en attente.</p>`;
            return;
        }

        list.innerHTML = pending.map(v => `
            <div class="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="${v.photo_url}" class="w-12 h-12 rounded-xl object-cover shadow-inner" onclick="window.open('${v.photo_url}')">
                    <div>
                        <h5 class="font-black text-slate-800 text-[11px] uppercase leading-none">${v.patient.nom_complet}</h5>
                        <p class="text-[9px] text-slate-400 font-bold mt-1">${UI.formatDate(v.heure_debut)}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.quickValidate('${v.id}', 'Validé')" class="w-9 h-9 rounded-xl bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-all">
                        <i class="fa-solid fa-check text-xs"></i>
                    </button>
                    <button onclick="window.quickValidate('${v.id}', 'Rejeté')" class="w-9 h-9 rounded-xl bg-rose-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-all">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}
