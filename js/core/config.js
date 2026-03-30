export const CONFIG = {
  // Remplace par l'URL de ton serveur Render une fois déployé
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000/api"
      : "https://ton-backend-render.onrender.com/api",

  APP_NAME: "Santé Plus Services",
  THEME_COLOR: "#16a34a", // Vert Santé
};
