import { secureFetch, clearApiCache } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { UI } from "../core/utils.js";

/**
 * 📥 CHARGER LA FACTURATION
 */
export async function loadBilling() {
  const table = document.getElementById("billing-table");
  const kpiContainer = document.getElementById("billing-kpis");
  const userRole = localStorage.getItem("user_role");

  if (!table || !kpiContainer) return;

  try {
    let abonnements = await secureFetch("/billing");
    
    // ✅ Sécurisation : s'assurer que c'est un tableau
    if (!Array.isArray(abonnements)) {
      abonnements = abonnements?.data || [];
    }

    console.log("✅ Données reçues Billing:", abonnements);

    // ✅ VÉRIFICATION SI PAS DE FACTURES (PLACÉE ICI, AVANT TOUT TRAITEMENT)
    if (!abonnements || abonnements.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="p-10 text-center">
            <div class="flex flex-col items-center gap-4">
              <i class="fa-solid fa-receipt text-4xl text-slate-300"></i>
              <p class="text-slate-400 italic text-sm">Aucune facture disponible pour le moment</p>
              <p class="text-[10px] text-slate-300">Les factures apparaîtront après validation des paiements</p>
              ${userRole === "FAMILLE" ? `
                <button onclick="window.switchView('subscription')" 
                        class="mt-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all">
                  🎁 Souscrire un abonnement
                </button>
              ` : ''}
              ${userRole === "COORDINATEUR" ? `
                <p class="text-xs text-slate-400 mt-2">Les factures sont créées automatiquement le 1er du mois.</p>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
      
      kpiContainer.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-100 text-center col-span-2">
          <p class="text-slate-400 text-sm">Aucune donnée de facturation</p>
        </div>
      `;
      
      return; // ✅ SORTIE IMMÉDIATE
    }

    // ✅ SI ON ARRIVE ICI, C'EST QU'IL Y A DES FACTURES
    // Mise à jour du statut de paiement
    const hasDebt = abonnements.some((abo) => 
      abo.statut === "En retard" || abo.statut === "Expiré"
    );
    localStorage.setItem("payment_status", hasDebt ? "Expiré" : "A jour");
    
    // Récupérer le dernier abonnement payé
    const paidAbonnement = abonnements.find(abo => abo.statut === "Payé" && abo.date_paiement);
    
    if (paidAbonnement) {
      if (paidAbonnement.date_fin_abonnement) {
        localStorage.setItem("subscription_end_date", paidAbonnement.date_fin_abonnement);
      }
      if (paidAbonnement.date_paiement) {
        localStorage.setItem("last_payment_date", paidAbonnement.date_paiement);
      }
    }

    let totalDue = 0, totalPaid = 0, totalLate = 0;
    table.innerHTML = "";

    abonnements.forEach((abo) => {
      const statusBadge = getStatusBadge(abo.statut);
      const actionButton = getActionButton(abo, userRole);
      const expirationInfo = abo.date_fin_abonnement ? 
        `<div class="text-[8px] text-slate-400 mt-1">Valable jusqu'au ${new Date(abo.date_fin_abonnement).toLocaleDateString('fr-FR')}</div>` : '';

      totalDue += abo.montant_du || 0;
      totalPaid += abo.montant_paye || 0;
      if (abo.statut === "En retard" || abo.statut === "Expiré") {
        totalLate += (abo.montant_du - (abo.montant_paye || 0));
      }

      table.innerHTML += `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
          <td class="p-4">
            <p class="font-black text-slate-800 text-xs uppercase">${escapeHtml(abo.patient?.nom_complet || 'Inconnu')}</p>
            <p class="text-[9px] text-slate-400 font-bold">${escapeHtml(abo.patient?.formule || '-')}</p>
            ${expirationInfo}
          </td>
          <td class="p-4 text-[11px] font-bold text-slate-500">${abo.mois_annee}</td>
          <td class="p-4 text-right font-black text-slate-900 text-xs">${UI.formatMoney(abo.montant_du)}</td>
          <td class="p-4 text-center">${statusBadge}</td>
          <td class="p-4 text-center">${actionButton}</td>
        </tr>
      `;
    });

    kpiContainer.innerHTML = renderKpis(totalPaid, totalLate);

  } catch (err) {
    console.error("❌ Erreur loadBilling:", err.message);
    UI.error("Erreur de chargement de la facturation");
    
    // ✅ AFFICHER UN MESSAGE D'ERREUR DANS LA PAGE
    table.innerHTML = `
      <tr>
        <td colspan="5" class="p-10 text-center">
          <div class="flex flex-col items-center gap-4">
            <i class="fa-solid fa-circle-exclamation text-4xl text-rose-400"></i>
            <p class="text-rose-500 text-sm">Erreur de chargement des factures</p>
            <button onclick="window.loadBilling()" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px]">Réessayer</button>
          </div>
        </td>
      </tr>
    `;
    throw err;
  }
}

// ============================================================
// FONCTIONS DE RENDU
// ============================================================

function renderEmptyState(userRole) {
  return `
    <tr>
      <td colspan="5" class="p-10 text-center">
        <div class="flex flex-col items-center gap-4">
          <i class="fa-solid fa-receipt text-4xl text-slate-300"></i>
          <p class="text-slate-400 italic text-sm">Aucune facture pour le moment</p>
          ${userRole === "FAMILLE" ? `
            <button onclick="window.switchView('subscription')" 
                    class="mt-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all">
              🎁 Souscrire un abonnement
            </button>
          ` : ''}
          ${userRole === "COORDINATEUR" ? `
            <p class="text-xs text-slate-400 mt-2">Aucune facture générée. Les factures sont créées automatiquement le 1er du mois.</p>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

function getStatusBadge(statut) {
  if (statut === "Payé") {
    return `<span class="badge-gold px-3 py-1 rounded-full text-[10px] font-bold">
      <i class="fa-solid fa-check-circle mr-1"></i> PAYÉ
    </span>`;
  } else if (statut === "En retard" || statut === "Expiré") {
    return `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 animate-pulse">
      ⚠️ ${statut === "Expiré" ? "EXPIRÉ" : "IMPAYÉ"}
    </span>`;
  } else {
    return `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
      ⏳ EN ATTENTE
    </span>`;
  }
}

function getActionButton(abo, userRole) {
  if (userRole === "COORDINATEUR" && abo.statut !== "Payé") {
    return `<button onclick="window.markAsPaid('${abo.id}', ${abo.montant_du})" 
                   class="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase">
              Valider Cash
            </button>`;
  } else if (userRole === "FAMILLE" && abo.statut !== "Payé") {
    return `<button onclick="window.payWithFeda('${abo.id}', ${abo.montant_du})" 
                   class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase shadow-lg">
              Payer Mobile
            </button>`;
  }
  return '';
}

function renderKpis(totalPaid, totalLate) {
  return `
    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
      <div>
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total encaissé</p>
        <h3 class="text-xl font-black text-emerald-600">${UI.formatMoney(totalPaid)}</h3>
      </div>
      <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
        <i class="fa-solid fa-sack-dollar text-xl"></i>
      </div>
    </div>
    ${totalLate > 0 ? `
      <div class="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-center justify-between">
        <div>
          <p class="text-[9px] font-black text-red-600 uppercase tracking-widest">Reste à recouvrer</p>
          <h3 class="text-xl font-black text-red-700">${UI.formatMoney(totalLate)}</h3>
        </div>
        <i class="fa-solid fa-hand-holding-dollar text-red-200 text-2xl"></i>
      </div>
    ` : ""}
  `;
}

// ============================================================
// PAIEMENT FEDAPAY
// ============================================================
// js/modules/billing.js - Remplacer window.payWithFeda

window.payWithFeda = async (abonnementId, montant) => {
    // 🔥 Afficher le message "Disponible prochainement"
    Swal.fire({
        title: '<i class="fa-solid fa-credit-card text-3xl text-emerald-500 mb-3"></i><br><span class="text-xl font-black">Paiement en ligne</span>',
        html: `
            <div class="text-center">
                <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">
                    <i class="fa-solid fa-tools text-2xl text-amber-500 mb-2"></i>
                    <p class="text-sm font-bold text-amber-700">Fonctionnalité à venir</p>
                    <p class="text-xs text-amber-600 mt-1">Le paiement en ligne sera bientôt disponible</p>
                </div>
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-400 uppercase">Montant à payer :</span>
                    <span class="text-lg font-black text-slate-800">${UI.formatMoney(montant)}</span>
                </div>
                <div class="mt-4 flex justify-center gap-3 text-slate-400">
                    <i class="fa-brands fa-cc-visa text-2xl"></i>
                    <i class="fa-brands fa-cc-mastercard text-2xl"></i>
                    <i class="fa-solid fa-mobile-alt text-2xl"></i>
                </div>
                <div class="mt-4 p-3 bg-emerald-50 rounded-xl">
                    <p class="text-[9px] text-emerald-600 font-medium">💡 Paiement possible par :</p>
                    <p class="text-[8px] text-emerald-500 mt-1">Mobile Money • Carte bancaire • Virement</p>
                </div>
            </div>
        `,
        confirmButtonText: "OK, j'ai compris",
        confirmButtonColor: "#10B981",
        showCancelButton: false,
        customClass: {
            popup: 'rounded-2xl p-6',
            confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
        }
    });
};
// ============================================================
// VALIDATION MANUELLE (Coordinateur)
// ============================================================

window.markAsPaid = async (id, montant) => {
  const confirm = await Swal.fire({
    title: "Confirmer le paiement ?",
    text: `Voulez-vous marquer cette facture de ${UI.formatMoney(montant)} comme payée ?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "OUI, REÇU",
    confirmButtonColor: "#10B981",
    cancelButtonText: "Annuler",
    cancelButtonColor: "#94A3B8",
    customClass: { popup: 'rounded-2xl' }
  });

  if (!confirm.isConfirmed) return;

  Swal.fire({ 
    title: "Traitement...", 
    didOpen: () => Swal.showLoading(), 
    allowOutsideClick: false 
  });
  
  try {
    await secureFetch("/billing/pay", {
      method: "POST",
      body: JSON.stringify({ abonnement_id: id, montant: montant }),
    });
    
    UI.success("Paiement validé");
    
    // Forcer le vidage du cache et recharger
    clearApiCache();
    await loadBilling();
    
    Swal.fire({
      icon: "success",
      title: "Paiement validé !",
      text: "La facture a été marquée comme payée.",
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (err) {
    console.error("❌ Erreur validation:", err);
    UI.error(err.message);
    Swal.fire({
      title: "Erreur",
      text: err.message,
      icon: "error",
      customClass: { popup: 'rounded-2xl' }
    });
  }
};

// ============================================================
// UTILITAIRE
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
