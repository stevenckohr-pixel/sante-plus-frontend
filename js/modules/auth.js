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
        }
    }
};
