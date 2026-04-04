import { UI } from "../core/utils.js";

/**
 * 🟢 GESTION DE LA CONNEXION
 */
export async function handleLogin() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const btn = document.getElementById("btn-login");

  if (!email || !password) {
    UI.vibrate("error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authentification...';

  try {
    const response = await fetch(`${window.CONFIG.API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("📦 Données reçues du backend :", data);
    
    if (!response.ok) throw new Error(data.error || "Erreur de connexion");

    // 🔴 2FA POUR COORDINATEUR
    if (data.status === "require_2fa") {
      window.renderAuthView('otp', data.email);
      btn.disabled = false;
      btn.innerHTML = 'Accéder à mon espace <i class="fa-solid fa-arrow-right-long opacity-50"></i>';
      return;
    }

    // 🟢 CONNEXION NORMALE (Aidant / Famille)
    localStorage.setItem("token", data.token);
    localStorage.setItem("user_role", data.role);
    localStorage.setItem("user_name", data.nom);
    localStorage.setItem("user_email", email);
    
    // ✅ AJOUT DE LA PHOTO DANS LOCALSTORAGE
    if (data.photo_url) {
      localStorage.setItem("user_photo", data.photo_url);
    } else {
      localStorage.setItem("user_photo", "");
    }
    
    // Stocker aussi l'ID utilisateur si disponible
    if (data.user_id) {
      localStorage.setItem("user_id", data.user_id);
    }

    // ✅ CORRECTION : Gérer correctement le flag user_is_maman
    if (data.role === 'FAMILLE') {
      const userCategorie = localStorage.getItem("user_categorie");
      const isMaman = userCategorie === 'MAMAN_BEBE';
      
      // 🔴 Important : mettre à jour le flag pour la famille
      localStorage.setItem("user_is_maman", isMaman ? "true" : "false");
      
      if (isMaman) {
        window.setThemeColor('#DB2777'); // Rose pour Maman
      } else {
        window.setThemeColor('#D4AF37'); // Or pour les autres familles
      }
    } else {
      // ✅ Pour les aidants et coordinateurs, désactiver le mode Maman
      localStorage.setItem("user_is_maman", "false");
      window.setThemeColor('#0F172A'); // Noir pour Coordinateur/Aidant
    }

    console.log("🌸 Mode Maman après connexion:", localStorage.getItem("user_is_maman") === "true");

    UI.success("Connexion réussie");
    window.location.reload();

  } catch (err) {
    UI.error(err.message);
    Swal.fire({
      icon: 'error',
      title: 'Accès refusé',
      text: err.message,
      confirmButtonColor: '#0F172A',
      customClass: { popup: 'rounded-2xl' }
    });
    btn.disabled = false;
    btn.innerHTML = 'Accéder à mon espace <i class="fa-solid fa-arrow-right-long opacity-50"></i>';
  }
}

/**
 * 🔒 VÉRIFICATION DU CODE OTP (Appelé depuis la vue OTP)
 */
export async function verifyOTP(email) {
  const code = document.getElementById("otp-code")?.value;
  const btn = document.getElementById("btn-otp");

  if (!code || code.length < 5) {
    UI.vibrate("error");
    return;
  }

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
    
    // ✅ CONNEXION RÉUSSIE AVEC 2FA
    localStorage.setItem("token", verifyData.token);
    localStorage.setItem("user_role", verifyData.role);
    localStorage.setItem("user_name", verifyData.nom);
    localStorage.setItem("user_email", email);
    
    // ✅ AJOUT DE LA PHOTO DANS LOCALSTORAGE
    if (verifyData.photo_url) {
      localStorage.setItem("user_photo", verifyData.photo_url);
    } else {
      localStorage.setItem("user_photo", "");
    }
    
    // Stocker aussi l'ID utilisateur si disponible
    if (verifyData.user_id) {
      localStorage.setItem("user_id", verifyData.user_id);
    }
    
    UI.success("Connexion réussie");
    window.location.reload();

  } catch (err) {
    UI.error(err.message);
    Swal.fire({
      icon: 'error',
      title: 'Code Incorrect',
      text: err.message,
      confirmButtonColor: '#0F172A',
      customClass: { popup: 'rounded-2xl' }
    });
    btn.disabled = false;
    btn.innerHTML = 'Vérifier le code <i class="fa-solid fa-shield-check"></i>';
    const otpInput = document.getElementById("otp-code");
    if (otpInput) otpInput.value = "";
  }
}

/**
 * 🚪 DÉCONNEXION
 */
export function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_categorie");
  localStorage.removeItem("user_is_maman");
  localStorage.removeItem("active_visit_id");
  localStorage.removeItem("geo_watch_id");
  localStorage.removeItem("last_view");
  window.location.reload();
}
