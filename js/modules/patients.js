import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

/**
 * 📥 1. CHARGER LA LISTE DES PATIENTS
 */
export async function loadPatients() {
  const container = document.getElementById("patients-list");
  if (!container) return;

  try {
    const response = await secureFetch("/patients");
    const data = await response.json();

    AppState.patients = data;
    renderPatients();
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-center">Erreur: ${err.message}</p>`;
  }
}

/**
 * 🎨 2. RENDU DE LA LISTE
 */
export function renderPatients() {
  const container = document.getElementById("patients-list");
  const userRole = localStorage.getItem("user_role");
  if (!container) return;

  if (AppState.patients.length === 0) {
    container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <i class="fa-solid fa- users-slash text-slate-100 text-5xl mb-4"></i>
                <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aucun dossier actif</p>
            </div>`;
    return;
  }

  container.innerHTML = AppState.patients
    .map((p) => {
      // On vérifie si une famille est déjà liée
      const hasFamily = p.famille_user_id !== null;
      const familyName = p.famille ? p.famille.nom : "Non liée";

      return `
        <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-green-500 transition-all animate-fadeIn">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black border border-slate-100">
                    ${UI.getInitials(p.nom_complet)}
                </div>
                <div>
                    <h4 class="font-black text-slate-800 uppercase text-xs">${p.nom_complet}</h4>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <span class="text-[8px] font-black px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-100 uppercase">${p.formule}</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase"><i class="fa-solid fa-house-chimney text-[8px] mr-1"></i>${p.adresse || "Cotonou"}</span>
                    </div>
                    <!-- Indicateur de famille -->
                    <p class="text-[9px] mt-1 ${hasFamily ? "text-blue-500" : "text-orange-400"} font-bold">
                        <i class="fa-solid fa-people-roof mr-1"></i>Famille : ${familyName}
                    </p>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <!-- Bouton de liaison (Admin uniquement) -->
                ${
                  userRole === "COORDINATEUR" && !hasFamily
                    ? `
                    <button onclick="window.openLinkFamilyModal('${p.id}', '${p.nom_complet.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center" title="Lier une famille">
                        <i class="fa-solid fa-link"></i>
                    </button>
                `
                    : ""
                }

                <!-- Bouton vers le Feed -->
                <button onclick="window.viewPatientFeed('${p.id}')" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all flex items-center justify-center">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
    })
    .join("");
}

/**
 * ➕ 3. AJOUTER UN PATIENT (Coordinateur)
 */
export async function openAddPatientModal() {
  const { value: formValues } = await Swal.fire({
    title: '<span class="text-lg font-black uppercase">Nouveau Patient</span>',
    html: `
            <div class="text-left space-y-4 p-2">
                <input id="swal-nom" class="swal2-input !m-0 !w-full" placeholder="Nom complet">
                <input id="swal-tel" class="swal2-input !m-0 !w-full" placeholder="Téléphone au Bénin">
                <input id="swal-addr" class="swal2-input !m-0 !w-full" placeholder="Adresse (Quartier/Rue)">
                <select id="swal-formule" class="swal2-input !m-0 !w-full">
                    <option value="Basic">Formule Basic</option>
                    <option value="Standard">Formule Standard</option>
                    <option value="Premium">Formule Premium</option>
                </select>
            </div>`,
    confirmButtonText: "CRÉER LE DOSSIER",
    confirmButtonColor: "#16a34a",
    showCancelButton: true,
    preConfirm: () => {
      const nom = document.getElementById("swal-nom").value;
      if (!nom) return Swal.showValidationMessage("Le nom est obligatoire");
      return {
        nom_complet: nom,
        telephone: document.getElementById("swal-tel").value,
        adresse: document.getElementById("swal-addr").value,
        formule: document.getElementById("swal-formule").value,
      };
    },
  });

  if (formValues) {
    try {
      await secureFetch("/patients/add", {
        method: "POST",
        body: JSON.stringify(formValues),
      });
      UI.vibrate("success");
      loadPatients();
    } catch (err) {
      Swal.fire("Erreur", err.message, "error");
    }
  }
}

/**
 * 🔗 4. LIER UNE FAMILLE (Coordinateur)
 * Cette fonction va chercher tous les comptes 'FAMILLE' et permet d'en assigner un au patient
 */
window.openLinkFamilyModal = async (patientId, patientName) => {
  try {
    Swal.fire({ title: "Chargement...", didOpen: () => Swal.showLoading() });

    // 1. Récupérer tous les comptes "FAMILLE" (On utilise une nouvelle route ou le filtre profiles)
    const response = await secureFetch("/auth/profiles?role=FAMILLE");
    const families = await response.json();

    if (families.length === 0) {
      return Swal.fire(
        "Oups",
        "Aucun compte famille n'est encore inscrit dans l'application.",
        "info",
      );
    }

    const familyOptions = families
      .map((f) => `<option value="${f.id}">${f.nom} (${f.email})</option>`)
      .join("");

    const { value: familyId } = await Swal.fire({
      title: "Lier une famille",
      html: `
                <p class="text-xs text-slate-500 mb-4">Qui est responsable du suivi de <b>${patientName}</b> ?</p>
                <select id="swal-family-id" class="swal2-input !m-0 !w-full">
                    <option value="">-- Sélectionner un compte --</option>
                    ${familyOptions}
                </select>`,
      confirmButtonText: "EFFECTUER LA LIAISON",
      confirmButtonColor: "#2563eb",
      showCancelButton: true,
      preConfirm: () => {
        const id = document.getElementById("swal-family-id").value;
        if (!id)
          return Swal.showValidationMessage("Veuillez choisir une famille");
        return id;
      },
    });

    if (familyId) {
      await secureFetch("/patients/link-family", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          famille_user_id: familyId,
        }),
      });
      UI.vibrate("success");
      Swal.fire(
        "Liaison réussie",
        "La famille peut maintenant suivre les soins.",
        "success",
      );
      loadPatients(); // Rafraîchir la liste
    }
  } catch (err) {
    Swal.fire("Erreur", err.message, "error");
  }
};
