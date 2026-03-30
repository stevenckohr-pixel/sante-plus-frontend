export const CONFIG = {
  // Remplace par l'URL de ton serveur Render une fois déployé
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "https://stevenckohr-pixel.github.io/sante-plus-frontend/api"
      : "https://sante-plus-backend-ux1n.onrender.com/api",

  APP_NAME: "Santé Plus Services",
  THEME_COLOR: "#16a34a", // Vert Santé
};
