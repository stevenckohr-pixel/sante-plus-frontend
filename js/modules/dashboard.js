import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 🚀 CHARGEMENT DU DASHBOARD GLOBAL
 */
export async function loadAdminDashboard() {
    const container = document.getElementById('view-container');
    
    // 1. Structure de base (Bento Grid)
    container.innerHTML = `
        <div class="animate-fadeIn pb-20">
            <h3 class="font-black text-xl text-slate-800 mb-6">Tableau de Bord</h3>
            
            <!-- KPIs : Statistiques en temps réel -->
            <div class="grid grid-cols-2 gap-4 mb-10">
                <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Patients</p>
                    <h3 id="stat-patients" class="text-2xl font-black text-slate-800">...</h3>
                </div>
                <div class="bg-green-50 p-5 rounded-[2rem] border border-green-100">
                    <p class="text-[9px] font-black text-green-600 uppercase tracking-widest">Visites Jour</p>
                    <h3 id="stat-visits" class="text-2xl font-black text-green-700">...</h3>
                </div>
                <div class="bg-orange-50 p-5 rounded-[2rem] border border-orange-100">
                    <p class="text-[9px] font-black text-orange-600 uppercase tracking-widest">À Valider</p>
                    <h3 id="stat-pending" class="text-2xl font-black text-orange-700">...</h3>
                </div>
                <div class="bg-red-50 p-5 rounded-[2rem] border border-red-100">
                    <p class="text-[9px] font-black text-red-600 uppercase tracking-widest">Impayés</p>
                    <h3 id="stat-late" class="text-2xl font-black text-red-700">...</h3>
                </div>
            </div>

            <!-- SECTION A : NOUVELLES INSCRIPTIONS (FAMILLE / AIDANT) -->
            <div class="mb-10">
                <div class="flex justify-between items-center mb-4 px-1">
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">📦 Demandes d'inscription</h4>
                </div>
                <div id="pending-registrations-list" class="grid grid-cols-1 gap-4">
                    <div class="flex justify-center py-10"><i class="fa-solid fa-spinner fa-spin text-slate-200 text-2xl"></i></div>
                </div>
            </div>

            <!-- SECTION B : VALIDATION DES VISITES TERRAIN -->
            <div>
                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">📸 Interventions à contrôler</h4>
                <div id="pending-actions-list" class="space-y-3">
                    <div class="flex justify-center py-10"><i class="fa-solid fa-spinner fa-spin text-slate-200 text-2xl"></i></div>
                </div>
            </div>
        </div>
    `;

    // 2. Lancement des appels API
    try {
        fetchStats();
        loadPendingRegistrations();
        fetchPendingVisits();
    } catch (err) {
        console.error("Erreur Init Dashboard:", err);
    }
}

/**
 * 📊 RÉCUPÉRER LES CHIFFRES CLÉS
 */
async function fetchStats() {
    const res = await secureFetch('/dashboard/stats');
    const stats = await res.json();
    document.getElementById('stat-patients').innerText = stats.total_patients;
    document.getElementById('stat-visits').innerText = stats.visits_today;
    document.getElementById('stat-pending').innerText = stats.pending_validation;
    document.getElementById('stat-late').innerText = stats.late_payments;
}

/**
 * 📦 CHARGER LES INSCRIPTIONS EN ATTENTE (DUO FAMILLE + PATIENT)
 */
async function loadPendingRegistrations() {
    const list = document.getElementById('pending-registrations-list');
    if (!list) return;

    try {
        const res = await secureFetch('/admin/pending-registrations');
        const pending = await res.json();

        if (pending.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-slate-300 italic text-xs border-2 border-dashed rounded-[2rem]">Aucune nouvelle demande.</p>`;
            return;
        }

        list.innerHTML = pending.map(req => {
            const isFamily = req.role === 'FAMILLE';
            // On récupère les infos du patient lié s'il y en a un (le fameux Duo)
            const patient = isFamily && req.patients && req.patients.length > 0 ? req.patients[0] : null;

            return `
                <div class="bg-white p-5 rounded-[2rem] border border-blue-100 shadow-sm flex flex-col justify-between animate-fadeIn">
                    <div class="flex justify-between items-start mb-4">
                        <span class="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[8px] font-black uppercase">${req.role}</span>
                        <span class="text-[9px] font-bold text-slate-300">${new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <h5 class="font-black text-slate-800 text-sm uppercase">${req.nom}</h5>
                    <p class="text-[10px] text-slate-400 mb-4 italic">${req.email}</p>
                    
                    ${patient ? `
                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                            <p class="text-[8px] font-black text-slate-400 uppercase mb-1">Patient à créer</p>
                            <p class="text-xs font-black text-green-600 uppercase">${patient.nom_complet}</p>
                            <p class="text-[9px] text-slate-400 font-bold mt-1">Formule : ${patient.formule}</p>
                        </div>
                    ` : ''}

                    <button onclick="window.processRegistration('${req.id}', '${req.role}', '${req.email}', '${req.nom.replace(/'/g, "\\'")}')" 
                        class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 active:scale-95 transition-all">
                        VALIDER & ACTIVER L'ACCÈS
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

/**
 * 📸 RÉCUPÉRER LES VISITES À CONTRÔLER
 */
async function fetchPendingVisits() {
    const list = document.getElementById('pending-actions-list');
    if (!list) return;

    try {
        const res = await secureFetch('/visites?statut=En attente');
        const visits = await res.json();
        const pending = visits.filter(v => v.statut_validation === 'En attente');

        if (pending.length === 0) {
            list.innerHTML = `<div class="p-10 text-center opacity-20"><i class="fa-solid fa-check-circle text-4xl"></i></div>`;
            return;
        }

        list.innerHTML = pending.map(v => `
            <div class="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between animate-fadeIn">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src="${v.photo_url}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h5 class="font-black text-slate-800 text-[11px] uppercase">${v.patient.nom_complet}</h5>
                        <p class="text-[9px] text-slate-400 font-bold">${UI.formatDate(v.heure_debut)}</p>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="window.quickValidate('${v.id}', 'Validé')" class="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all">
                        <i class="fa-solid fa-check text-xs"></i>
                    </button>
                    <button onclick="window.quickValidate('${v.id}', 'Rejeté')" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

/**
 * ✅ ACTION : ACTIVER UN COMPTE
 */
window.processRegistration = async (userId, role, email, nom) => {
    const confirm = await Swal.fire({
        title: 'Activer l\'accès ?',
        text: `Un email de bienvenue et les identifiants seront envoyés à ${nom}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'OUI, VALIDER',
        confirmButtonColor: '#16a34a'
    });

    if (confirm.isConfirmed) {
        try {
            UI.vibrate();
            Swal.fire({ title: 'Activation...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            
            await secureFetch('/admin/validate-member', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, role, email, nom })
            });

            Swal.fire("Succès", "Le compte est désormais actif.", "success");
            loadAdminDashboard(); // Recharger tout le dashboard
        } catch (err) { Swal.fire("Erreur", err.message, "error"); }
    }
};

/**
 * 📸 ACTION : VALIDER VISITE
 */
window.quickValidate = async (id, status) => {
    try {
        UI.vibrate();
        await secureFetch('/visites/validate', {
            method: 'POST',
            body: JSON.stringify({ visite_id: id, statut: status })
        });
        loadAdminDashboard();
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: `Intervention ${status}` });
    } catch (err) { alert(err.message); }
};
