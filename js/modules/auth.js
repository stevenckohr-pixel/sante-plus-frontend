import { UI } from "../core/utils.js";

/**
 * 🟢 GESTION DE LA CONNEXION
 */
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

    // 🔴 2FA POUR COORDINATEUR (Redirection vers la vue In-Card au lieu d'une Popup)
    if (data.status === "require_2fa") {
        // On demande à main.js d'afficher la vue OTP avec l'email
        window.renderAuthView('otp', data.email);
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
        confirmButtonColor: '#0F172A',
        customClass: { popup: 'rounded-[2.5rem]' }
    });
    btn.disabled = false;
    btn.innerHTML = 'Accéder à mon espace <i class="fa-solid fa-arrow-right-long opacity-50"></i>';
  }
}

/**
 * 🔒 VÉRIFICATION DU CODE OTP (Appelé depuis la vue OTP)
 */
export async function verifyOTP(email) {
    const code = document.getElementById("otp-code").value;
    const btn = document.getElementById("btn-otp");

    if (!code || code.length < 5) return UI.vibrate("error");

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Vérification...';

    try {
        const verifyRes = await fetch(`${window.CONFIG.API_URL}/auth/verify-2fa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code })
        });
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok) throw new Error(verifyData.message || "Code invalide");
        
        // Connexion réussie !
        localStorage.setItem("token", verifyData.token);
        localStorage.setItem("user_role", verifyData.role);
        localStorage.setItem("user_name", verifyData.nom);
        localStorage.setItem("user_email", email);
        UI.vibrate("success");
        window.location.reload();

    } catch (err) {
        UI.vibrate("error");
        Swal.fire({
            icon: 'error',
            title: 'Code Incorrect',
            text: err.message,
            confirmButtonColor: '#0F172A',
            customClass: { popup: 'rounded-[2.5rem]' }
        });
        btn.disabled = false;
        btn.innerHTML = 'Vérifier le code <i class="fa-solid fa-shield-check"></i>';
        document.getElementById("otp-code").value = ""; // On vide le champ pour qu'il réessaie
    }
}





export function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  window.location.reload();
}
