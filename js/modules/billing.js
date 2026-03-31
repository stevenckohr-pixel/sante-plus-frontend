import { secureFetch } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { UI } from "../core/utils.js";

/**
 * Charge les abonnements et met à jour le statut d'accès
 */
export async function loadBilling() {
  const table = document.getElementById("billing-table");
  const kpiContainer = document.getElementById("billing-kpis");
  const userRole = localStorage.getItem("user_role");

  if (!table || !kpiContainer) return;

  try {
    const res = await secureFetch("/billing");
    const abonnements = await res.json();

    // 1. MISE À JOUR DU STATUT DE PAIEMENT EN LOCAL (Pour le verrou switchView)
    // On vérifie si l'utilisateur a une facture en retard
    const hasDebt = abonnements.some((abo) => abo.statut === "En retard");
    localStorage.setItem("payment_status", hasDebt ? "En retard" : "A jour");

    let totalDue = 0,
      totalPaid = 0,
      totalLate = 0;
    table.innerHTML = "";

    // 2. RENDU DES LIGNES
    abonnements.forEach((abo) => {
      let statusBadge = "";
      let actionButton = "";

      // Design des badges de statut
      if (abo.statut === "Payé") {
        statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700 border border-green-200">✅ PAYÉ</span>`;
      } else if (abo.statut === "En retard") {
        statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 animate-pulse">⚠️ IMPAYÉ</span>`;
      } else {
        statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">⏳ EN ATTENTE</span>`;
      }

      // Calcul des totaux pour les KPIs
      totalDue += abo.montant_du;
      totalPaid += abo.montant_paye || 0;
      if (abo.statut === "En retard")
        totalLate += abo.montant_du - abo.montant_paye;

      // Logique des boutons selon le Rôle
      if (userRole === "COORDINATEUR" && abo.statut !== "Payé") {
        actionButton = `<button onclick="window.markAsPaid('${abo.id}', ${abo.montant_du})" class="text-blue-600 font-bold text-[10px] uppercase hover:underline">Valider encaissement</button>`;
      } else if (userRole === "FAMILLE" && abo.statut !== "Payé") {
        actionButton = `
                    <button onclick="window.payWithFeda('${abo.id}', ${abo.montant_du})" class="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-green-200 active:scale-95 transition-all">
                        Payer via MTN / MOOV
                    </button>`;
      }

      table.innerHTML += `
                <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td class="p-4">
                        <p class="font-black text-slate-800 text-xs uppercase">${abo.patient.nom_complet}</p>
                        <p class="text-[9px] text-slate-400 font-bold">${abo.patient.formule}</p>
                    </td>
                    <td class="p-4 text-[11px] font-bold text-slate-500">${abo.mois_annee}</td>
                    <td class="p-4 text-right">
                        <p class="font-black text-slate-900 text-xs">${UI.formatMoney(abo.montant_du)}</p>
                    </td>
                    <td class="p-4 text-center">${statusBadge}</td>
                    <td class="p-4 text-center">${actionButton}</td>
                </tr>
            `;
    });

    // 3. RENDU DES KPIs (Adaptatif)
    kpiContainer.innerHTML = `
            <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total encaissé</p>
                    <h3 class="text-xl font-black text-green-600">${UI.formatMoney(totalPaid)}</h3>
                </div>
                <div class="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                    <i class="fa-solid fa-sack-dollar text-xl"></i>
                </div>
            </div>
            ${
              totalLate > 0
                ? `
            <div class="bg-red-50 p-5 rounded-[2rem] border border-red-100 flex items-center justify-between">
                <div>
                    <p class="text-[9px] font-black text-red-600 uppercase tracking-widest">Reste à recouvrer</p>
                    <h3 class="text-xl font-black text-red-700">${UI.formatMoney(totalLate)}</h3>
                </div>
                <i class="fa-solid fa-hand-holding-dollar text-red-200 text-2xl"></i>
            </div>`
                : ""
            }
        `;
  } catch (err) {
    console.error(err);
    UI.vibrate("error");
  }
}


/**
 * 💳 REDIRECTION VERS FEDAPAY (Paiement Mobile Money / Carte)
 * Design Unifié SPS Elite
 */
window.payWithFeda = async (abonnementId, montant) => {
  try {
    UI.vibrate();

    // 🎨 UI de transition Premium
    Swal.fire({
      title: '<i class="fa-solid fa-shield-halved fa-beat text-emerald-500 mb-3 text-4xl"></i><br><span class="text-xl font-black">Sécurisation...</span>',
      html: `
        <div class="text-center">
            <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-4">Connexion aux passerelles sécurisées</p>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span class="text-[10px] font-black text-slate-400 uppercase">Montant :</span>
                <span class="text-sm font-black text-slate-900">${UI.formatMoney(montant)}</span>
            </div>
        </div>`,
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: { popup: 'rounded-[3rem]' },
      didOpen: () => Swal.showLoading(),
    });

    // 1. Appel au backend pour créer la transaction FedaPay
    const res = await secureFetch("/billing/generate-payment", {
      method: "POST",
      body: JSON.stringify({
        abonnement_id: abonnementId,
        montant: montant,
        email_client: localStorage.getItem("user_email") || "client@santeplus.bj",
      }),
    });

    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || "Échec de connexion FedaPay");

    // 2. Redirection vers le Checkout FedaPay (MTN / Moov / Visa)
    // On laisse un petit délai pour que l'utilisateur voie que c'est "sécurisé"
    setTimeout(() => {
        window.location.href = data.url;
    }, 1500);

  } catch (err) {
    UI.vibrate("error");
    Swal.fire({
        title: "Erreur de paiement",
        text: "La passerelle de paiement est temporairement indisponible.",
        icon: "error",
        confirmButtonColor: "#0F172A",
        customClass: { popup: 'rounded-[2.5rem]' }
    });
  }
};

/**
 * ✅ VALIDATION MANUELLE (Coordinateur uniquement)
 */
window.markAsPaid = async (id, montant) => {
  const confirm = await Swal.fire({
    title: "Confirmer le paiement ?",
    text: `Voulez-vous marquer cette facture de ${UI.formatMoney(montant)} comme payée ?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "OUI, REÇU",
    confirmButtonColor: "#16a34a",
  });

  if (confirm.isConfirmed) {
    try {
      await secureFetch("/billing/pay", {
        method: "POST",
        body: JSON.stringify({ abonnement_id: id, montant: montant }),
      });
      Swal.fire("Enregistré", "Le paiement a été validé.", "success");
      loadBilling(); // Rafraîchir
    } catch (err) {
      alert(err.message);
    }
  }
};
