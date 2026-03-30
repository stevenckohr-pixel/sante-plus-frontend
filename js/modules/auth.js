import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

export async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const btn = document.querySelector('button[onclick="window.login()"]');

  if (!email || !password) return alert("Veuillez remplir tous les champs");

  // Feedback visuel
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connexion...';

  try {
    const response = await fetch(`${window.CONFIG.API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur de connexion");
    }

    // 🔴 GESTION DU 2FA (Double Authentification pour Coordinateur)
    if (data.status === "require_2fa") {
      btn.innerHTML = "ATTENTE DU CODE...";
      
      const { value: code } = await Swal.fire({
        title: 'Vérification requise',
        text: 'Un code à 6 chiffres a été envoyé par email.',
        input: 'text',
        inputPlaceholder: 'Entrez le code ici',
        confirmButtonText: 'Vérifier',
        confirmButtonColor: '#16a34a',
        allowOutsideClick: false
      });

      if (code) {
        // On vérifie le code saisi
        const verifyRes = await fetch(`${window.CONFIG.API_URL}/auth/verify-2fa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email, code: code })
        });
        
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok || verifyData.status === "error") {
            throw new Error(verifyData.message || "Code invalide");
        }
        
        // Code bon ! On connecte l'utilisateur
        localStorage.setItem("token", verifyData.token);
        localStorage.setItem("user_role", verifyData.role);
        localStorage.setItem("user_name", verifyData.nom);
        localStorage.setItem("user_email", email);
        UI.vibrate("success");
        window.location.reload();
      } else {
         btn.disabled = false;
         btn.innerHTML = "CONNEXION";
      }
      return; // On arrête l'exécution ici pour le 2FA
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
    Swal.fire("Erreur", err.message, "error");
    btn.disabled = false;
    btn.innerHTML = "CONNEXION";
  }
}

export function handleLogout() {
  localStorage.clear();
  window.location.reload();
}
