import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

/**
 * 🚀 CHARGEMENT DU DASHBOARD GLOBAL (Design Bento Premium)
 */
export async function loadAdminDashboard() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
        <div class="animate-fadeIn pb-24 px-1">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Tableau de Bord</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Supervision en temps réel</p>
                </div>
                <button onclick="window.loadAdminDashboard()" class="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-green-600 transition-colors">
                    <i class="fa-solid fa-rotate"></i>
                </button>
            </div>
            
            <!-- KPIs : Bento Grid Style -->
            <div class="grid grid-cols-2 gap-4 mb-10">
                <!-- Patients -->
                <div class="bg-white p-5 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 group hover:border-blue-200 transition-all">
                    <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                        <i class="fa-solid fa-hospital-user"></i>
                    </div>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dossiers</p>
                    <h3 id="stat-patients" class="text-2xl font-black text-slate-800 mt-1">...</h3>
                </div>

                <!-- Visites du jour -->
                <div class="bg-emerald-50/50 p-5 rounded-[2.5rem] border border-emerald-100 group hover:border-emerald-300 transition-all">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-200">
                        <i class="fa-solid fa-calendar-check"></i>
                    </div>
                    <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Visites Jour</p>
                    <h3 id="stat-visits" class="text-2xl font-black text-emerald-700 mt-1">...</h3>
                </div>

                <!-- À Valider -->
                <div class="bg-amber-50/50 p-5 rounded-[2.5rem] border border-amber-100 group hover:border-amber-300 transition-all">
                    <div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-amber-200">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">À Valider</p>
                    <h3 id="stat-pending" class="text-2xl font-black text-amber-700 mt-1">...</h3>
                </div>

                <!-- Impayés -->
                <div class="bg-rose-50/50 p-5 rounded-[2.5rem] border border-rose-100 group hover:border-rose-300 transition-all">
                    <div class="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-rose-200">
                        <i class="fa-solid fa-file-invoice-dollar"></i>
                    </div>
                    <p class="text-[9px] font-black text-rose-600 uppercase tracking-widest">Impayés</p>
                    <h3 id="stat-late" class="text-2xl font-black text-rose-700 mt-1">...</h3>
                </div>
            </div>

            <!-- SECTION A : NOUVELLES INSCRIPTIONS -->
            <div class="mb-10">
                <div class="flex items-center gap-2 mb-5 px-1">
                    <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-widest">📦 Demandes d'inscription</h4>
                </div>
                <div id="pending-registrations-list" class="space-y-4">
                    <div class="flex justify-center py-10"><i class="fa-solid fa-spinner fa-spin text-slate-200 text-2xl"></i></div>
                </div>
            </div>

            <!-- SECTION B : VALIDATION DES VISITES -->
            <div>
                <div class="flex items-center gap-2 mb-5 px-1">
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-widest">📸 Rapports terrain à certifier</h4>
                </div>
                <div id="pending-actions-list" class="space-y-4">
                    <div class="flex justify-center py-10"><i class="fa-solid fa-spinner fa-spin text-slate-200 text-2xl"></i></div>
                </div>
            </div>
        </div>
    `;

    // Appel des fonctions de données
    fetchStats();
    loadPendingRegistrations();
    fetchPendingVisits();
}

/**
 * 📊 KPIs
 */
async function fetchStats() {
    try {
        const res = await secureFetch('/dashboard/stats');
        const stats = await res.json();
        document.getElementById('stat-patients').innerText = stats.total_patients;
        document.getElementById('stat-visits').innerText = stats.visits_today;
        document.getElementById('stat-pending').innerText = stats.pending_validation;
        document.getElementById('stat-late').innerText = stats.late_payments;
    } catch (e) { console.error("Stats Error:", e); }
}

/**
 * 📦 DEMANDES DIASPORA (Duo Famille + Patient)
 */
async function loadPendingRegistrations() {
    const list = document.getElementById('pending-registrations-list');
    if (!list) return;

    try {
        const res = await secureFetch('/admin/pending-registrations');
        const pending = await res.json();

        if (pending.length === 0) {
            list.innerHTML = `
                <div class="p-8 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Aucune nouvelle demande</p>
                </div>`;
            return;
        }

        list.innerHTML = pending.map(req => {
            const patient = (req.patients && req.patients.length > 0) ? req.patients[0] : null;
            
            // 💡 ASTUCE PRO : On encode les données en Base64 pour éviter les erreurs d'apostrophes dans le HTML
            const userData = btoa(JSON.stringify({
                id: req.id,
                role: req.role,
                email: req.email,
                nom: req.nom
            }));

            return `
                <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-shadow animate-fadeIn">
                    <div class="flex justify-between items-center mb-5">
                        <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter">
                            ${req.role === 'FAMILLE' ? 'DIASPORA' : 'PROFESSIONNEL'}
                        </span>
                        <span class="text-[9px] font-bold text-slate-300">${new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-lg">
                            ${req.nom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h5 class="font-black text-slate-800 text-sm uppercase leading-none">${req.nom}</h5>
                            <p class="text-[10px] text-slate-400 font-medium mt-1.5 underline underline-offset-2">${req.email}</p>
                        </div>
                    </div>
                    
                    ${patient ? `
                        <div class="p-4 bg-green-50/50 rounded-2xl border border-green-100 mb-6">
                            <p class="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Parent à accompagner</p>
                            <p class="text-xs font-black text-slate-800 uppercase">${patient.nom_complet}</p>
                            <div class="flex gap-2 mt-2">
                                <span class="text-[8px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100">PACK : ${patient.formule}</span>
                            </div>
                        </div>
                    ` : ''}

                    <button onclick="window.confirmRegistration('${userData}')" 
                        class="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-100">
                        ACTIVER LE DOSSIER
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) { console.error("Erreur Dashboard:", err); }
}

// 🔑 Nouvelle fonction pour décoder proprement
window.confirmRegistration = (encodedData) => {
    const { id, role, email, nom } = JSON.parse(atob(encodedData));
    window.processRegistration(id, role, email, nom);
};

/**
 * 📸 VALIDATION DES RAPPORTS DE VISITE
 */
async function fetchPendingVisits() {
    const list = document.getElementById('pending-actions-list');
    try {
        const res = await secureFetch('/visites?statut=En attente');
        const visits = await res.json();
        const pending = visits.filter(v => v.statut_validation === 'En attente');

        if (pending.length === 0) {
            list.innerHTML = `<div class="p-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem] opacity-40">
                <i class="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2"></i>
                <p class="text-xs font-bold text-slate-400 italic">Tout est à jour</p>
            </div>`;
            return;
        }

        list.innerHTML = pending.map(v => `
            <div class="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between animate-fadeIn">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src="${v.photo_url}" class="w-full h-full object-cover shadow-inner" onclick="window.open('${v.photo_url}')">
                    </div>
                    <div>
                        <h5 class="font-black text-slate-800 text-[11px] uppercase">${v.patient.nom_complet}</h5>
                        <p class="text-[9px] text-slate-400 font-bold tracking-tighter">${UI.formatDate(v.heure_debut)}</p>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="window.quickValidate('${v.id}', 'Validé')" class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button onclick="window.quickValidate('${v.id}', 'Rejeté')" class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

// Branchements sur window pour que le HTML les voit
window.loadAdminDashboard = loadAdminDashboard;
window.processRegistration = async (userId, role, email, nom) => {
    const confirm = await Swal.fire({
        title: 'Activer l\'accès ?',
        text: `Un email de bienvenue sera envoyé à ${nom}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'OUI, VALIDER',
        confirmButtonColor: '#10b981',
        customClass: { popup: 'rounded-[2rem]' }
    });

    if (confirm.isConfirmed) {
        try {
            UI.vibrate();
            Swal.fire({ title: 'Activation...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            
            await secureFetch('/admin/validate-member', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, role, email, nom })
            });

            Swal.fire("Succès", "Le compte et le dossier patient sont actifs.", "success");
            loadAdminDashboard();
        } catch (err) { Swal.fire("Erreur", err.message, "error"); }
    }
};

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
