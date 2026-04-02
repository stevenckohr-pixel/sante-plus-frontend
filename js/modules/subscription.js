import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";



// Packs avec durées variables
const packs = [
    // Packs mensuels
    { 
        id: 'MENSUEL_ESSENTIEL', 
        name: 'Essentiel', 
        desc: '2 visites / semaine', 
        price: 50000,
        priceDisplay: '50.000 CFA',
        duration: 1, // mois
        durationText: '1 mois',
        features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire'],
        icon: 'fa-seedling',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        popular: false
    },
    { 
        id: 'MENSUEL_CONFORT', 
        name: 'Confort', 
        desc: '3 à 4 visites / semaine', 
        price: 85000,
        priceDisplay: '85.000 CFA',
        duration: 1,
        durationText: '1 mois',
        features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé'],
        icon: 'fa-chart-line',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        popular: true
    },
    { 
        id: 'MENSUEL_SERENITE', 
        name: 'Sérénité', 
        desc: 'Présence quasi quotidienne', 
        price: 150000,
        priceDisplay: '150.000 CFA',
        duration: 1,
        durationText: '1 mois',
        features: ['6-7 visites par semaine', 'Accompagnement complet', 'Urgence 24/7', 'Rapport en temps réel'],
        icon: 'fa-crown',
        color: 'text-gold-primary',
        bg: 'bg-amber-50',
        popular: false
    },
    // Packs trimestriels (3 mois) - économie de 5%
    { 
        id: 'TRIMESTRIEL_ESSENTIEL', 
        name: 'Essentiel 3 mois', 
        desc: '2 visites / semaine', 
        price: 142500,
        priceDisplay: '142.500 CFA',
        originalPrice: 150000,
        duration: 3,
        durationText: '3 mois',
        features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire', 'Économie 5%'],
        icon: 'fa-calendar-alt',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        popular: false,
        badge: '-5%'
    },
    { 
        id: 'TRIMESTRIEL_CONFORT', 
        name: 'Confort 3 mois', 
        desc: '3 à 4 visites / semaine', 
        price: 242250,
        priceDisplay: '242.250 CFA',
        originalPrice: 255000,
        duration: 3,
        durationText: '3 mois',
        features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé', 'Économie 5%'],
        icon: 'fa-calendar-alt',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        popular: false,
        badge: '-5%'
    },
    // Packs annuels (12 mois) - économie de 15%
    { 
        id: 'ANNUEL_ESSENTIEL', 
        name: 'Essentiel 1 an', 
        desc: '2 visites / semaine', 
        price: 510000,
        priceDisplay: '510.000 CFA',
        originalPrice: 600000,
        duration: 12,
        durationText: '12 mois',
        features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire', 'Économie 15%', 'Paiement unique'],
        icon: 'fa-calendar-year',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        popular: false,
        badge: '-15%'
    },
    { 
        id: 'ANNUEL_CONFORT', 
        name: 'Confort 1 an', 
        desc: '3 à 4 visites / semaine', 
        price: 867000,
        priceDisplay: '867.000 CFA',
        originalPrice: 1020000,
        duration: 12,
        durationText: '12 mois',
        features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé', 'Économie 15%', 'Paiement unique'],
        icon: 'fa-calendar-year',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        popular: true,
        badge: '-15%'
    },
    { 
        id: 'ANNUEL_SERENITE', 
        name: 'Sérénité 1 an', 
        desc: 'Présence quasi quotidienne', 
        price: 1530000,
        priceDisplay: '1.530.000 CFA',
        originalPrice: 1800000,
        duration: 12,
        durationText: '12 mois',
        features: ['6-7 visites par semaine', 'Accompagnement complet', 'Urgence 24/7', 'Rapport en temps réel', 'Économie 15%', 'Paiement unique'],
        icon: 'fa-calendar-year',
        color: 'text-gold-primary',
        bg: 'bg-amber-50',
        popular: false,
        badge: '-15%'
    }
];

/**
 * 📋 PAGE D'ABONNEMENT (Choix du pack)
 */
export async function renderSubscriptionPage() {
    const container = document.getElementById("view-container");
    const userRole = localStorage.getItem("user_role");
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    
    // Récupérer le patient actuel
    let currentPatient = null;
    if (userRole === "FAMILLE") {
        try {
            const res = await secureFetch("/patients");
            if (patients && patients.length > 0) {
                currentPatient = patients[0];
            }
        } catch (e) {
            console.error("Erreur récupération patient:", e);
        }
    }
    
    // Packs selon la catégorie
    const packs = isMaman ? [
        { 
            id: 'ESSENTIEL', 
            name: 'Pack Essentiel', 
            desc: '2 visites / semaine', 
            price: 50000,
            priceDisplay: '50.000 CFA',
            features: ['2 visites par semaine', 'Suivi de base', 'Rapport hebdomadaire'],
            icon: 'fa-seedling',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            popular: false
        },
        { 
            id: 'CONFORT', 
            name: 'Pack Confort', 
            desc: '3 à 4 visites / semaine', 
            price: 85000,
            priceDisplay: '85.000 CFA',
            features: ['3-4 visites par semaine', 'Aide à la toilette', 'Préparation repas', 'Rapport détaillé'],
            icon: 'fa-chart-line',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            popular: true
        },
        { 
            id: 'SERENITE', 
            name: 'Pack Sérénité', 
            desc: 'Présence quasi quotidienne', 
            price: 150000,
            priceDisplay: '150.000 CFA',
            features: ['6-7 visites par semaine', 'Accompagnement complet', 'Urgence 24/7', 'Rapport en temps réel'],
            icon: 'fa-crown',
            color: 'text-gold-primary',
            bg: 'bg-amber-50',
            popular: false
        },
        { 
            id: 'MATERNITE', 
            name: 'Spécial Sortie Maternité', 
            desc: 'Suivi intensif sur 2 semaines', 
            price: 70000,
            priceDisplay: '70.000 CFA',
            features: ['Visite quotidienne', 'Aide bébé', 'Conseils allaitement', 'Suivi personnalisé'],
            icon: 'fa-baby-carriage',
            color: 'text-pink-600',
            bg: 'bg-pink-50',
            popular: false
        }
    ] : [
        { 
            id: 'PONCTUEL', 
            name: 'Intervention Ponctuelle', 
            desc: 'Rdv médical, besoin urgent', 
            price: 10000,
            priceDisplay: '10.000 CFA',
            features: ['Intervention à la demande', 'Accompagnement RDV', 'Flexibilité totale'],
            icon: 'fa-clock',
            color: 'text-slate-600',
            bg: 'bg-slate-100',
            popular: false
        },
        { 
            id: 'REGULIER', 
            name: 'Suivi Régulier', 
            desc: '2 à 3 visites / semaine', 
            price: 60000,
            priceDisplay: '60.000 CFA',
            features: ['2-3 visites par semaine', 'Suivi médical', 'Lien famille', 'Rapport détaillé'],
            icon: 'fa-calendar-week',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            popular: true
        },
        { 
            id: 'COMPLET', 
            name: 'Accompagnement Complet', 
            desc: 'Présence soutenue', 
            price: 150000,
            priceDisplay: '150.000 CFA',
            features: ['5-6 visites par semaine', 'Présence renforcée', 'Veille sanitaire', 'Rapport en temps réel'],
            icon: 'fa-star',
            color: 'text-gold-primary',
            bg: 'bg-amber-50',
            popular: false
        }
    ];
    
    container.innerHTML = `
        <div class="animate-fadeIn max-w-2xl mx-auto pb-32">
            <!-- Header -->
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
            
            <!-- Bannière patient -->
            ${currentPatient ? `
                <div class="bg-slate-100 p-4 rounded-2xl mb-6 flex items-center justify-between">
                    <div>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pour le dossier</p>
                        <p class="font-black text-slate-800">${currentPatient.nom_complet}</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <i class="fa-solid fa-user text-emerald-600"></i>
                    </div>
                </div>
            ` : ''}
            
            <!-- Liste des packs -->
            <div class="space-y-4">
                ${packs.map(pack => `
                    <div onclick="window.selectSubscriptionPack('${pack.id}', ${pack.price})" 
                         class="pack-card bg-white rounded-2xl border-2 border-slate-100 p-5 cursor-pointer transition-all active:scale-98 hover:border-emerald-300"
                         data-pack-id="${pack.id}">
                        <div class="flex items-start gap-4">
                            <div class="w-14 h-14 rounded-xl ${pack.bg} flex items-center justify-center shrink-0">
                                <i class="fa-solid ${pack.icon} ${pack.color} text-2xl"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <div class="flex items-center gap-2">
                                        <h4 class="font-black text-slate-800 text-lg">${pack.name}</h4>
                                        ${pack.popular ? '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase">Populaire</span>' : ''}
                                    </div>
                                    <p class="text-xl font-black text-emerald-600">${pack.priceDisplay}</p>
                                </div>
                                <p class="text-xs text-slate-400 mt-1">${pack.desc}</p>
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
            
            <!-- Informations supplémentaires -->
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
                </ul>
            </div>
        </div>
    `;
}

/**
 * 💳 SÉLECTION D'UN PACK ET PAIEMENT
 */
window.selectSubscriptionPack = async (packId, price) => {
    // Confirmation avant paiement
    const result = await Swal.fire({
        title: '<span class="text-xl font-black">Confirmer l\'abonnement</span>',
        html: `
            <div class="text-center">
                <div class="text-4xl mb-3">${packId === 'CONFORT' || packId === 'REGULIER' ? '⭐' : '💎'}</div>
                <p class="text-sm font-bold text-slate-800">Pack ${packId}</p>
                <p class="text-2xl font-black text-emerald-600 mt-2">${price.toLocaleString()} CFA</p>
                <p class="text-xs text-slate-400 mt-3">Paiement sécurisé via FedaPay</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '💰 Payer maintenant',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#94A3B8',
        customClass: {
            popup: 'rounded-2xl p-6',
            confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider',
            cancelButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
        }
    });
    
    if (!result.isConfirmed) return;
    
    // Créer l'abonnement et rediriger vers paiement
    Swal.fire({
        title: '<i class="fa-solid fa-circle-notch fa-spin text-emerald-500 text-3xl mb-3"></i><br><span class="text-base font-black">Préparation de votre abonnement...</span>',
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl p-6' }
    });
    
    try {
        // 1. Créer/mettre à jour le patient avec le pack choisi
        const userRole = localStorage.getItem("user_role");
        
        if (userRole === "FAMILLE") {
            // Récupérer le patient existant
            const patientsRes = await secureFetch("/patients");
            
            if (patients && patients.length > 0) {
                const patient = patients[0];
                
                // Mettre à jour le pack du patient
                await secureFetch(`/patients/${patient.id}/update-pack`, {
                    method: "PUT",
                    body: JSON.stringify({ type_pack: packId, montant_prevu: price })
                });
                
                // 2. Générer la facture
                const billRes = await secureFetch("/billing/generate", {
                    method: "POST",
                    body: JSON.stringify({
                        patient_id: patient.id,
                        montant: price,
                        pack: packId
                    })
                });
                
                const bill = await billRes;
                
                // 3. Rediriger vers paiement
                const paymentRes = await secureFetch("/billing/generate-payment", {
                    method: "POST",
                    body: JSON.stringify({
                        abonnement_id: bill.id,
                        montant: price,
                        email_client: localStorage.getItem("user_email")
                    })
                });
                
                const payment = await paymentRes;
                
                Swal.fire({
                    title: "Redirection...",
                    text: "Vous allez être redirigé vers la page de paiement sécurisée",
                    icon: "info",
                    timer: 1500,
                    showConfirmButton: false
                });
                
                setTimeout(() => {
                    window.location.href = payment.url;
                }, 1500);
                
            } else {
                throw new Error("Aucun dossier patient trouvé");
            }
        } else {
            // Pour les nouveaux utilisateurs, rediriger vers l'inscription
            Swal.fire({
                title: "Création de compte",
                text: "Vous devez d'abord créer un compte famille",
                icon: "info",
                confirmButtonText: "Créer un compte"
            }).then(() => {
                window.renderAuthView('register', 1);
            });
        }
        
    } catch (err) {
        Swal.close();
        UI.error(err.message);
        Swal.fire({
            title: "Erreur",
            text: err.message,
            icon: "error",
            customClass: { popup: 'rounded-2xl' }
        });
    }
};
