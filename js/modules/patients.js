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
                <i class="fa-solid fa-users-slash text-slate-100 text-5xl mb-4"></i>
                <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aucun dossier actif</p>
            </div>`;
    return;
  }

container.innerHTML = AppState.patients.map((p) => {
    const initials = p.nom_complet.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
    
    return `
        <div class="patient-card animate-fadeIn">
            <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-400 font-extrabold text-lg border-2 border-white shadow-inner">
                        ${initials}
                    </div>
                    <div>
                        <h4 class="font-black text-slate-800 text-sm uppercase leading-none">${p.nom_complet}</h4>
                        <div class="flex items-center gap-2 mt-2">
                             <span class="status-pill ${p.formule === 'Premium' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}">${p.formule}</span>
                             <span class="text-[10px] font-bold text-slate-400"><i class="fa-solid fa-map-pin mr-1"></i>${p.adresse || 'Cotonou'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="window.viewPatientFeed('${p.id}')" class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div class="flex -space-x-2">
                     <!-- Petit clin d'oeil aux avatars de tes refs -->
                     <div class="w-6 h-6 rounded-full border-2 border-white bg-blue-500 text-[8px] flex items-center justify-center text-white font-bold">F</div>
                     <div class="w-6 h-6 rounded-full border-2 border-white bg-emerald-500 text-[8px] flex items-center justify-center text-white font-bold">A</div>
                 </div>
                 <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    Famille : <span class="text-slate-800">${p.famille ? p.famille.nom : 'Non liée'}</span>
                 </p>
            </div>
        </div>
    `;
}).join("");
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
