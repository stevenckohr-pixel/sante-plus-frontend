import { secureFetch } from "../core/api.js";
import { AppState } from "../core/state.js";
import { UI } from "../core/utils.js";

export async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const btn = document.querySelector('button[onclick="window.login()"]');

  if (!email || !password) return alert("Veuillez remplir tous les champs");

  // Feedback visuel
  btn.disabled = true;
  btn.innerHTML =
    '<i class="fa-solid fa-circle-notch fa-spin"></i> Connexion...';

  try {
    const response = await fetch(`${window.CONFIG.API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_name", data.nom);
      localStorage.setItem("user_email", email);
      UI.vibrate("success");
      window.location.reload(); // On recharge pour initialiser l'App avec le Token
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    UI.vibrate("error");
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = "CONNEXION";
  }
}

export function handleLogout() {
  localStorage.clear();
  window.location.reload();
}
