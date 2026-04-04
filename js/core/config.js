export const CONFIG = {
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000/api"
      : "https://sante-plus-backend-ux1n.onrender.com/api",

  APP_NAME: "Santé Plus Services",
  THEME_COLOR: "#16a34a",
  
  // Logos avec texte (pour emails et grands affichages)
  LOGO_GENERAL_TEXT: "/assets/images/logo-general-text.png",
  LOGO_MAMAN_TEXT: "/assets/images/logo-maman-text.png",
  
  // Icônes sans texte (cœur - pour loader, favicon, petits espaces)
  LOGO_GENERAL_ICON: "/assets/images/logo-general-icon.png",
  LOGO_MAMAN_ICON: "/assets/images/logo-maman-icon.png"
};
