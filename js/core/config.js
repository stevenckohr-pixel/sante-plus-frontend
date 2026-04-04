export const CONFIG = {
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000/api"
      : "https://sante-plus-backend-ux1n.onrender.com/api",

  APP_NAME: "Santé Plus Services",
  THEME_COLOR: "#16a34a",
  
  // ✅ Logos locaux
  LOGO_GENERAL: "/assets/images/logo-general.png",
  LOGO_MAMAN: "/assets/images/logo-maman.png"
};
