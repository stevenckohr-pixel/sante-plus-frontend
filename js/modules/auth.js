import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

export async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const btn = document.getElementById("btn-login");

  if (!email || !password) return UI.vibrate("error");

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authentification...';

  try {
    const response = await fetch(`${window.CONFIG.API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Erreur de connexion");

    // 🔴 2FA POUR COORDINATEUR (Le correctif + Un super design)
    if (data.status === "require_2fa") {
      btn.innerHTML = "VERIFICATION EN COURS...";
      
      const { value: code } = await Swal.fire({
        title: '<i class="fa-solid fa-shield-halved text-4xl text-green-500 mb-2"></i><br><span class="text-xl font-black">Sécurité 2FA</span>',
        html: '<p class="text-sm text-slate-500 mb-4">Un code à 6 chiffres a été envoyé sur votre email.</p>',
        input: 'text',
        inputAttributes: {
          maxlength: 6,
          autocapitalize: 'off',
          autocorrect: 'off',
          style: 'text-align: center; font-size: 24px; letter-spacing: 10px; font-weight: 900;'
        },
        inputPlaceholder: '000000',
        confirmButtonText: 'VALIDER LE CODE',
        confirmButtonColor: '#0f172a',
        allowOutsideClick: false,
        customClass: { popup: 'rounded-[2.5rem]' }
      });

      if (code) {
        const verifyRes = await fetch(`${window.CONFIG.API_URL}/auth/verify-2fa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email, code: code })
        });
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok) throw new Error(verifyData.message || "Code invalide");
        
        // Connexion réussie après 2FA
        localStorage.setItem("token", verifyData.token);
        localStorage.setItem("user_role", verifyData.role);
        localStorage.setItem("user_name", verifyData.nom);
        localStorage.setItem("user_email", email);
        UI.vibrate("success");
        window.location.reload();
      } else {
         btn.disabled = false;
         btn.innerHTML = 'Accéder à mon espace <i class="fa-solid fa-arrow-right"></i>';
      }
      return;
    }

    // 🟢 CONNEXION NORMALE (Aidant / Famille)
    localStorage.setItem("token", data.token);
    localStorage.setItem("user_role", data.role);
    localStorage.setItem("user_name", data.nom);
    localStorage.setItem("user_email", email);
    UI.vibrate("success");
    window.location.reload();

  } catch (err) {
    UI.vibrate("error");
    Swal.fire({
        icon: 'error',
        title: 'Accès refusé',
        text: err.message,
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-[2rem]' }
    });
    btn.disabled = false;
    btn.innerHTML = 'Accéder à mon espace <i class="fa-solid fa-arrow-right"></i>';
  }
}


export function handleLogout() {
  localStorage.clear();
  window.location.reload();
}




/**
 * 📝 INSCRIPTION LIBRE DES FAMILLES (DIASPORA) - UI Premium
 */
window.openRegisterFamily = async () => {
    const { value: form } = await Swal.fire({
        title: '<div class="text-2xl font-black text-slate-800 mb-1">Rejoindre Santé Plus</div><p class="text-xs font-medium text-slate-400 normal-case">Créez votre compte et reliez le dossier de votre proche.</p>',
        width: '36rem',
        padding: '2rem',
        customClass: {
            popup: 'rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100',
            confirmButton: 'w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-green-600 transition-colors mt-4',
            cancelButton: 'w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-[11px] uppercase mt-2'
        },
        html: `
            <div class="text-left space-y-5 mt-6">
                <!-- Section Famille -->
                <div class="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs"><i class="fa-solid fa-user"></i></div>
                        <p class="text-[10px] font-black text-slate-600 uppercase tracking-widest">1. Le Responsable (Vous)</p>
                    </div>
                    <div class="space-y-3">
                        <input id="f-nom" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all placeholder-slate-400" placeholder="Votre nom complet">
                        <div class="grid grid-cols-2 gap-3">
                            <input id="f-email" type="email" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all placeholder-slate-400" placeholder="Email">
                            <input id="f-tel" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all placeholder-slate-400" placeholder="Téléphone">
                        </div>
                        <input id="f-pass" type="password" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all placeholder-slate-400" placeholder="Créer un mot de passe sécurisé">
                    </div>
                </div>
                
                <!-- Section Patient -->
                <div class="bg-green-50 p-5 rounded-3xl border border-green-100">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-7 h-7 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs"><i class="fa-solid fa-bed-pulse"></i></div>
                        <p class="text-[10px] font-black text-green-800 uppercase tracking-widest">2. Le Proche au Bénin</p>
                    </div>
                    <div class="space-y-3">
                        <input id="p-nom" class="w-full px-4 py-3 bg-white border border-green-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm transition-all placeholder-slate-400" placeholder="Nom complet du parent">
                        <input id="p-addr" class="w-full px-4 py-3 bg-white border border-green-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm transition-all placeholder-slate-400" placeholder="Adresse complète (Ville, Quartier)">
                        
                        <select id="p-form" class="w-full px-4 py-3 bg-white border border-green-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm font-bold text-slate-700 transition-all cursor-pointer">
                            <option value="Basic">Pack Basic (1 visite/sem) - 50k FCFA</option>
                            <option value="Standard">Pack Standard (3 visites/sem) - 75k FCFA</option>
                            <option value="Premium">Pack Premium (7j/7) - 100k FCFA</option>
                        </select>
                    </div>
                </div>
            </div>`,
        confirmButtonText: 'SOUMETTRE MON DOSSIER <i class="fa-solid fa-arrow-right ml-2"></i>',
        showCancelButton: true,
        cancelButtonText: 'Fermer',
        preConfirm: () => {
            return {
                nom_famille: document.getElementById('f-nom').value,
                email: document.getElementById('f-email').value,
                password: document.getElementById('f-pass').value,
                tel_famille: document.getElementById('f-tel').value,
                nom_patient: document.getElementById('p-nom').value,
                adresse_patient: document.getElementById('p-addr').value,
                formule: document.getElementById('p-form').value
            }
        }
    });

    if (form) {
        if (!form.email || !form.password || !form.nom_patient) {
            return Swal.fire("Erreur", "Veuillez remplir les informations essentielles.", "error");
        }
        Swal.fire({ title: 'Création du dossier...', didOpen: () => Swal.showLoading() });
        const res = await fetch(`${CONFIG.API_URL}/auth/register-family-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if(res.ok) {
            Swal.fire({
                icon: "success",
                title: "Demande Envoyée !",
                text: "Notre coordination vous contactera très vite.",
                confirmButtonColor: "#16a34a"
            });
        }
    }
};
