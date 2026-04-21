import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// CHARGEMENT FEDAPAY
// ============================================================

function loadFedaPayScript() {
    return new Promise((resolve, reject) => {
        if (typeof FedaPay !== 'undefined') {
            console.log("✅ FedaPay déjà chargé");
            return resolve();
        }
        
        console.log("📦 Chargement de FedaPay...");
        const script = document.createElement('script');
        script.src = 'https://cdn.fedapay.com/checkout.js?v=1.1.7';
        script.onload = () => {
            console.log("✅ FedaPay chargé avec succès");
            resolve();
        };
        script.onerror = () => {
            reject(new Error("Impossible de charger FedaPay"));
        };
        document.head.appendChild(script);
    });
}

// ============================================================
// PAGE D'ABONNEMENT
// ============================================================

export async function renderSubscriptionPage() {
    const container = document.getElementById("view-container");
    const userRole = localStorage.getItem("user_role");
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    
    // Récupérer le patient actuel
    let currentPatient = null;
    if (userRole === "FAMILLE") {
        try {
            const patients = await secureFetch("/patients");
            if (patients && patients.length > 0) {
                currentPatient = patients[0];
            }
        } catch (e) {
            console.error("Erreur récupération patient:", e);
        }
    }
    
    // Définition des packs
    const packs = getPacks(isMaman);
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-2xl mx-auto pb-32">
            <div class="flex items-center gap-4 mb-8">
                <button onclick="window.switchView('home')" 
                        class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95">
                    <i class="fa-solid fa-arrow-left text-lg"></i>
                </button>
                <div>
                    <h3 class="font-black text-2xl text-slate-800 tracking-tight">Nos Formules</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Choisissez l'accompagnement qui vous convient</p>
                </div>
            </div>
            
            ${currentPatient ? `
                <div class="bg-slate-100 p-4 rounded-2xl mb-6 flex items-center justify-between">
                    <div>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pour le dossier</p>
                        <p class="font-black text-slate-800">${escapeHtml(currentPatient.nom_complet)}</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <i class="fa-solid fa-user text-emerald-600"></i>
                    </div>
                </div>
            ` : ''}
            
            <div class="space-y-4">
                ${packs.map(pack => `
                    <div onclick="window.selectSubscriptionPack('${pack.id}', ${pack.price}, ${pack.duration})" 
                         class="pack-card bg-white rounded-2xl border-2 border-slate-100 p-5 cursor-pointer transition-all active:scale-98 hover:border-emerald-300">
                        <div class="flex items-start gap-4">
                            <div class="w-14 h-14 rounded-xl ${pack.bg} flex items-center justify-center shrink-0">
                                <i class="fa-solid ${pack.icon} ${pack.color} text-2xl"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <div class="flex items-center gap-2">
                                        <h4 class="font-black text-slate-800 text-lg">${pack.name}</h4>
                                        ${pack.popular ? '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase">Populaire</span>' : ''}
                                        ${pack.badge ? `<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[8px] font-black uppercase">${pack.badge}</span>` : ''}
                                    </div>
                                    <div class="text-right">
                                        ${pack.originalPrice ? `<span class="text-[10px] text-slate-400 line-through mr-2">${pack.originalPrice.toLocaleString()} CFA</span>` : ''}
                                        <p class="text-xl font-black text-emerald-600">${pack.priceDisplay}</p>
                                    </div>
                                </div>
                                <p class="text-xs text-slate-500 mt-1">${pack.desc} • ${pack.durationText}</p>
                                <div class="flex flex-wrap gap-2 mt-3">
                                    ${pack.features.map(f => `<span class="text-[9px] text-slate-500 bg-slate-50 px-2 py-1 rounded-full">✓ ${f}</span>`).join('')}
                                </div>
                            </div>
                            <div class="shrink-0">
                                <div class="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
                                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-3 mb-3">
                    <i class="fa-solid fa-shield-heart text-emerald-500 text-xl"></i>
                    <p class="font-black text-slate-800 text-sm">Pourquoi s'abonner ?</p>
                </div>
                <ul class="space-y-2 text-xs text-slate-600">
                    <li class="flex items-center gap-2">✓ Suivi médical personnalisé 24/7</li>
                    <li class="flex items-center gap-2">✓ Intervenants qualifiés et formés</li>
                    <li class="flex items-center gap-2">✓ Rapport détaillé après chaque visite</li>
                    <li class="flex items-center gap-2">✓ Assistance téléphonique prioritaire</li>
                    <li class="flex items-center gap-2">✓ Paiement sécurisé via FedaPay</li>
                </ul>
            </div>
        </div>
    `;
}

// ============================================================
// DÉFINITION DES PACKS
// ============================================================

function getPacks(isMaman) {
    if (isMaman) {
        return [
            // Packs mensuels
            { id: 'MENSUEL_ESSENTIEL', name: 'Essentiel', desc: '2 visites / semaine', price: 50000, priceDisplay: '50.000 CFA', duration: 1, durationText: '1 mois', features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire'], icon: 'fa-seedling', color: 'text-emerald-600', bg: 'bg-emerald-50', popular: false },
            { id: 'MENSUEL_CONFORT', name: 'Confort', desc: '3 à 4 visites / semaine', price: 85000, priceDisplay: '85.000 CFA', duration: 1, durationText: '1 mois', features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé'], icon: 'fa-chart-line', color: 'text-blue-600', bg: 'bg-blue-50', popular: true },
            { id: 'MENSUEL_SERENITE', name: 'Sérénité', desc: 'Présence quasi quotidienne', price: 150000, priceDisplay: '150.000 CFA', duration: 1, durationText: '1 mois', features: ['6-7 visites par semaine', 'Accompagnement complet', 'Urgence 24/7', 'Rapport en temps réel'], icon: 'fa-crown', color: 'text-gold-primary', bg: 'bg-amber-50', popular: false },
            // Packs trimestriels
            { id: 'TRIMESTRIEL_ESSENTIEL', name: 'Essentiel 3 mois', desc: '2 visites / semaine', price: 142500, priceDisplay: '142.500 CFA', originalPrice: 150000, duration: 3, durationText: '3 mois', features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire', 'Économie 5%'], icon: 'fa-calendar-alt', color: 'text-emerald-600', bg: 'bg-emerald-50', popular: false, badge: '-5%' },
            { id: 'TRIMESTRIEL_CONFORT', name: 'Confort 3 mois', desc: '3 à 4 visites / semaine', price: 242250, priceDisplay: '242.250 CFA', originalPrice: 255000, duration: 3, durationText: '3 mois', features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé', 'Économie 5%'], icon: 'fa-calendar-alt', color: 'text-blue-600', bg: 'bg-blue-50', popular: false, badge: '-5%' },
            // Packs annuels
            { id: 'ANNUEL_ESSENTIEL', name: 'Essentiel 1 an', desc: '2 visites / semaine', price: 510000, priceDisplay: '510.000 CFA', originalPrice: 600000, duration: 12, durationText: '12 mois', features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire', 'Économie 15%', 'Paiement unique'], icon: 'fa-calendar-year', color: 'text-emerald-600', bg: 'bg-emerald-50', popular: false, badge: '-15%' },
            { id: 'ANNUEL_CONFORT', name: 'Confort 1 an', desc: '3 à 4 visites / semaine', price: 867000, priceDisplay: '867.000 CFA', originalPrice: 1020000, duration: 12, durationText: '12 mois', features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé', 'Économie 15%', 'Paiement unique'], icon: 'fa-calendar-year', color: 'text-blue-600', bg: 'bg-blue-50', popular: true, badge: '-15%' },
            // Pack spécial
            { id: 'MATERNITE', name: 'Spécial Sortie Maternité', desc: 'Suivi intensif sur 2 semaines', price: 70000, priceDisplay: '70.000 CFA', duration: 0.5, durationText: '2 semaines', features: ['Visite quotidienne', 'Aide bébé', 'Conseils allaitement', 'Suivi personnalisé'], icon: 'fa-baby-carriage', color: 'text-pink-600', bg: 'bg-pink-50', popular: false }
        ];
    } else {
        return [
            { id: 'MENSUEL_PONCTUEL', name: 'Ponctuel', desc: 'Intervention à la demande', price: 10000, priceDisplay: '10.000 CFA', duration: 1, durationText: '1 mois', features: ['Intervention à la demande', 'Accompagnement RDV', 'Flexibilité totale'], icon: 'fa-clock', color: 'text-slate-600', bg: 'bg-slate-100', popular: false },
            { id: 'MENSUEL_REGULIER', name: 'Régulier', desc: '2 à 3 visites / semaine', price: 60000, priceDisplay: '60.000 CFA', duration: 1, durationText: '1 mois', features: ['2-3 visites par semaine', 'Suivi médical', 'Lien famille', 'Rapport détaillé'], icon: 'fa-calendar-week', color: 'text-emerald-600', bg: 'bg-emerald-50', popular: true },
            { id: 'MENSUEL_COMPLET', name: 'Complet', desc: 'Présence soutenue', price: 150000, priceDisplay: '150.000 CFA', duration: 1, durationText: '1 mois', features: ['5-6 visites par semaine', 'Présence renforcée', 'Veille sanitaire', 'Rapport en temps réel'], icon: 'fa-star', color: 'text-gold-primary', bg: 'bg-amber-50', popular: false },
            { id: 'TRIMESTRIEL_REGULIER', name: 'Régulier 3 mois', desc: '2 à 3 visites / semaine', price: 171000, priceDisplay: '171.000 CFA', originalPrice: 180000, duration: 3, durationText: '3 mois', features: ['2-3 visites par semaine', 'Suivi médical', 'Lien famille', 'Rapport détaillé', 'Économie 5%'], icon: 'fa-calendar-alt', color: 'text-emerald-600', bg: 'bg-emerald-50', popular: false, badge: '-5%' },
            { id: 'ANNUEL_REGULIER', name: 'Régulier 1 an', desc: '2 à 3 visites / semaine', price: 612000, priceDisplay: '612.000 CFA', originalPrice: 720000, duration: 12, durationText: '12 mois', features: ['2-3 visites par semaine', 'Suivi médical', 'Lien famille', 'Rapport détaillé', 'Économie 15%', 'Paiement unique'], icon: 'fa-calendar-year', color: 'text-emerald-600', bg: 'bg-emerald-50', popular: true, badge: '-15%' },
            { id: 'ANNUEL_COMPLET', name: 'Complet 1 an', desc: 'Présence soutenue', price: 1530000, priceDisplay: '1.530.000 CFA', originalPrice: 1800000, duration: 12, durationText: '12 mois', features: ['5-6 visites par semaine', 'Présence renforcée', 'Veille sanitaire', 'Rapport en temps réel', 'Économie 15%', 'Paiement unique'], icon: 'fa-calendar-year', color: 'text-gold-primary', bg: 'bg-amber-50', popular: false, badge: '-15%' }
        ];
    }
}

// ============================================================
// SÉLECTION D'UN PACK
// ============================================================

window.selectSubscriptionPack = async (packId, price, durationMonths) => {
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const packs = getPacks(isMaman);
    const selectedPack = packs.find(p => p.id === packId);
    
    // Récupérer le patient ID
    let patientId = AppState.currentPatient;
    if (!patientId) {
        try {
            const patients = await secureFetch("/patients");
            if (patients && patients.length > 0) {
                patientId = patients[0].id;
                AppState.currentPatient = patientId;
                localStorage.setItem("current_patient_id", patientId);
            } else {
                UI.error("Aucun patient trouvé");
                return;
            }
        } catch (err) {
            UI.error("Impossible de récupérer le patient");
            return;
        }
    }
    
    const result = await Swal.fire({
        title: '<span class="text-xl font-black">💳 Paiement sécurisé</span>',
        html: `
            <div class="text-center">
                <div class="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <i class="fa-solid fa-credit-card text-emerald-500 text-3xl"></i>
                </div>
                <p class="text-sm font-bold text-slate-800 mb-2">${selectedPack?.name}</p>
                <p class="text-xs text-slate-500">Montant: <span class="font-bold text-emerald-600">${price.toLocaleString()} CFA</span></p>
                <p class="text-xs text-slate-500 mt-1">Durée: ${durationMonths === 0.5 ? '2 semaines' : durationMonths + ' mois'}</p>
                <div class="mt-4 p-3 bg-slate-50 rounded-xl">
                    <p class="text-[10px] text-slate-500">🔒 Paiement sécurisé par FedaPay</p>
                    <p class="text-[10px] text-slate-500 mt-1">📱 Mobile Money • 💳 Carte bancaire</p>
                </div>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '💳 Payer maintenant',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#94A3B8',
        customClass: { popup: 'rounded-2xl p-6' }
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({
        title: "Préparation du paiement...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });
    
    try {
        // 1. CRÉER LA FACTURE
        const facture = await secureFetch("/billing/generate", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                montant: price,
                pack: packId
            })
        });
        
        console.log("✅ Facture créée:", facture);
        
        // 2. INITIER LE PAIEMENT FEDAPAY
        const payment = await secureFetch("/billing/initiate-payment", {
            method: "POST",
            body: JSON.stringify({
                pack_id: packId,
                duration_months: durationMonths,
                patient_id: patientId,
                amount: price
            })
        });
        
        Swal.close();
        
        if (payment.payment_url) {
            // Ouvrir la fenêtre de paiement FedaPay
            window.open(payment.payment_url, '_blank');
            
            Swal.fire({
                icon: "info",
                title: "Paiement initié",
                html: `
                    <div class="text-center">
                        <p>Une fenêtre de paiement s'est ouverte.</p>
                        <p class="text-xs text-slate-500 mt-2">Après le paiement, votre abonnement sera automatiquement activé.</p>
                    </div>
                `,
                confirmButtonText: "OK",
                confirmButtonColor: "#10B981"
            });
            
            // Rafraîchir la page après 10 secondes
            setTimeout(() => {
                window.switchView("billing");
            }, 10000);
        } else {
            throw new Error("URL de paiement non reçue");
        }
        
    } catch (err) {
        Swal.close();
        console.error("Erreur:", err);
        Swal.fire({
            icon: "error",
            title: "Erreur",
            text: err.message || "Impossible d'initier le paiement",
            confirmButtonText: "OK"
        });
    }
};

// ============================================================
// INITIATION PAIEMENT FEDAPAY
// ============================================================

// js/modules/subscription.js - Remplacer window.initiateFedaPayPayment

window.initiateFedaPayPayment = async (packId, durationMonths, price) => {
    let patientId = AppState.currentPatient;
    
    if (!patientId) {
        try {
            const patients = await secureFetch("/patients");
            if (patients && patients.length > 0) {
                patientId = patients[0].id;
                AppState.currentPatient = patientId;
                localStorage.setItem("current_patient_id", patientId);
            } else {
                UI.error("Aucun patient trouvé pour ce compte");
                return;
            }
        } catch (err) {
            console.error("Erreur récupération patient:", err);
            UI.error("Impossible de récupérer les informations du patient");
            return;
        }
    }
    
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeColor = isMaman ? 'pink' : 'emerald';
    const primaryColor = isMaman ? '#E11D48' : '#059669';
    
    // 🔥 Afficher le message "Disponible prochainement"
    Swal.fire({
        title: '<i class="fa-solid fa-credit-card text-3xl mb-3" style="color: ' + primaryColor + '"></i><br><span class="text-xl font-black">💳 Paiement sécurisé</span>',
        html: `
            <div class="text-center">
                <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">
                    <i class="fa-solid fa-tools text-2xl text-amber-500 mb-2"></i>
                    <p class="text-sm font-bold text-amber-700">🚧 Paiement en ligne bientôt disponible</p>
                    <p class="text-xs text-amber-600 mt-1">Nous travaillons à intégrer cette fonctionnalité</p>
                </div>
                <div class="bg-white rounded-xl p-4 border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Récapitulatif</p>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm text-slate-600">Pack sélectionné :</span>
                        <span class="font-bold text-slate-800">${packId.replace('_', ' ')}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-slate-600">Montant :</span>
                        <span class="text-xl font-black" style="color: ${primaryColor}">${price.toLocaleString()} CFA</span>
                    </div>
                    <div class="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                        <span class="text-sm text-slate-600">Durée :</span>
                        <span class="font-bold text-slate-800">${durationMonths === 0.5 ? '2 semaines' : durationMonths + ' mois'}</span>
                    </div>
                </div>
                <div class="mt-4 p-3 bg-slate-50 rounded-xl">
                    <p class="text-[9px] text-slate-500">🔒 Paiement sécurisé • 📱 Mobile Money • 💳 Carte bancaire</p>
                </div>
            </div>
        `,
        confirmButtonText: "✅ J'ai compris",
        confirmButtonColor: primaryColor,
        showCancelButton: false,
        customClass: {
            popup: 'rounded-2xl p-6',
            confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
        }
    });
};
