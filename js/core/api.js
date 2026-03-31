import { CONFIG } from "./config.js";

export async function secureFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  console.log(`📡 Appel API : ${endpoint}`); 


  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
    ...options,
    headers,
  });

    console.log(`📥 Réponse API [${response.status}] : ${endpoint}`); // <--- AJOUTE ÇA !

    if (response.status === 503) {
      Swal.fire({
          title: "Réveil du serveur...",
          text: "Le service gratuit Render se réactive (cela peut prendre 30 secondes).",
          icon: "info",
          showConfirmButton: false,
          timer: 5000
      });
      throw new Error("Serveur en cours de démarrage");
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.reload();
    throw new Error("Session expirée");
  }

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Erreur serveur");
  }

  return response;
}
