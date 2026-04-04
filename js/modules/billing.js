import { secureFetch } from "../core/api.js";
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
    const abonnements = await secureFetch("/billing");

    console.log("✅ Données reçues Billing:", abonnements);

    // Mise à jour du statut
    const hasDebt = Array.isArray(abonnements) && abonnements.some((abo) => 
      abo.statut === "En retard" || abo.statut === "Expiré"
    );
    localStorage.setItem("payment_status", hasDebt ? "Expiré" : "A jour");
    
    // Récupérer le dernier abonnement payé
    const paidAbonnement = Array.isArray(abonnements) 
      ? abonnements.find(abo => abo.statut === "Payé" && abo.date_paiement)
      : null;
    
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

    if (!Array.isArray(abonnements) || abonnements.length === 0) {
      // ✅ Afficher un message avec bouton pour souscrire
      table.innerHTML = `
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
    } else {
      abonnements.forEach((abo) => {
        let statusBadge = "";
        let actionButton = "";

        if (abo.statut === "Payé") {
          statusBadge = `<span class="badge-gold px-3 py-1 rounded-full text-[10px] font-bold">
            <i class="fa-solid fa-check-circle mr-1"></i> PAYÉ
          </span>`;
        } else if (abo.statut === "En retard" || abo.statut === "Expiré") {
          statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 animate-pulse">⚠️ ${abo.statut === "Expiré" ? "EXPIRÉ" : "IMPAYÉ"}</span>`;
        } else {
          statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">⏳ EN ATTENTE</span>`;
        }

        totalDue += abo.montant_du || 0;
        totalPaid += abo.montant_paye || 0;
        if (abo.statut === "En retard" || abo.statut === "Expiré") {
          totalLate += (abo.montant_du - (abo.montant_paye || 0));
        }

        if (userRole === "COORDINATEUR" && abo.statut !== "Payé") {
          actionButton = `<button onclick="window.markAsPaid('${abo.id}', ${abo.montant_du})" class="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase">Valider Cash</button>`;
        } else if (userRole === "FAMILLE" && abo.statut !== "Payé") {
          actionButton = `<button onclick="window.payWithFeda('${abo.id}', ${abo.montant_du})" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase shadow-lg">Payer Mobile</button>`;
        }

        const expirationInfo = abo.date_fin_abonnement ? 
          `<div class="text-[8px] text-slate-400 mt-1">Valable jusqu'au ${new Date(abo.date_fin_abonnement).toLocaleDateString('fr-FR')}</div>` : '';

        table.innerHTML += `
          <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td class="p-4">
              <p class="font-black text-slate-800 text-xs uppercase">${abo.patient?.nom_complet || 'Inconnu'}</p>
              <p class="text-[9px] text-slate-400 font-bold">${abo.patient?.formule || '-'}</p>
              ${expirationInfo}
            </td>
            <td class="p-4 text-[11px] font-bold text-slate-500">${abo.mois_annee}</td>
            <td class="p-4 text-right font-black text-slate-900 text-xs">${UI.formatMoney(abo.montant_du)}</td>
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4 text-center">${actionButton}</td>
          </tr>
        `;
      });
    }

    kpiContainer.innerHTML = `
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

  } catch (err) {
    console.error("❌ Erreur loadBilling:", err.message);
    UI.error("Erreur de chargement de la facturation");
    throw err;
  }
}

/**
 * 💳 REDIRECTION VERS FEDAPAY
 */
window.payWithFeda = async (abonnementId, montant) => {
  try {
    UI.vibrate();

    const result = await Swal.fire({
      title: '<i class="fa-solid fa-shield-halved fa-beat text-emerald-500 mb-3 text-4xl"></i><br><span class="text-xl font-black">Paiement sécurisé</span>',
      html: `
        <div class="text-center">
          <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-4">Connexion aux passerelles sécurisées</p>
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase">Montant :</span>
            <span class="text-sm font-black text-slate-900">${UI.formatMoney(montant)}</span>
          </div>
          <div class="mt-4 flex justify-center gap-4">
            <i class="fa-brands fa-cc-visa text-slate-400 text-xl"></i>
            <i class="fa-brands fa-cc-mastercard text-slate-400 text-xl"></i>
            <i class="fa-solid fa-mobile-alt text-slate-400 text-xl"></i>
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: "💰 Payer maintenant",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#94A3B8",
      customClass: { 
        popup: 'rounded-2xl p-6',
        confirmButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider',
        cancelButton: 'rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-wider'
      }
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: '<i class="fa-solid fa-circle-notch fa-spin text-emerald-500 text-3xl mb-3"></i><br><span class="text-base font-black">Préparation du paiement...</span>',
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl p-6' }
    });

    const data = await secureFetch("/billing/generate-payment", {
      method: "POST",
      body: JSON.stringify({
        abonnement_id: abonnementId,
        montant: montant,
        email_client: localStorage.getItem("user_email") || "client@santeplus.bj",
      }),
    });

    Swal.fire({
      title: "Redirection...",
      text: "Vous allez être redirigé vers la page de paiement sécurisée",
      icon: "info",
      timer: 1500,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });

    setTimeout(() => {
      window.location.href = data.url;
    }, 1500);

  } catch (err) {
    UI.error("Erreur de paiement");
    Swal.fire({
      title: "Erreur de paiement",
      text: err.message || "La passerelle de paiement est temporairement indisponible.",
      icon: "error",
      confirmButtonColor: "#0F172A",
      customClass: { popup: 'rounded-2xl' }
    });
  }
};

 
/**
 * ✅ VALIDATION MANUELLE (Coordinateur)
 */
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

  if (confirm.isConfirmed) {
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
      
      // ✅ FORCER LE RE-CHARGE DES DONNÉES (pas le cache)
      await loadBilling(); // Recharge la liste
      
      Swal.fire({
        icon: "success",
        title: "Paiement validé !",
        text: "La facture a été marquée comme payée.",
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      UI.error(err.message);
      Swal.fire({
        title: "Erreur",
        text: err.message,
        icon: "error",
        customClass: { popup: 'rounded-2xl' }
      });
    }
  }
};
