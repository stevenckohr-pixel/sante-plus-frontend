export const CONFIG = {
  // L'URL doit toujours pointer vers le BACKEND (Render)
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000/api" // 🟢 Pour tes tests sur ton PC
      : "https://sante-plus-backend-ux1n.onrender.com/api", // 🔵 Pour le site en ligne

  APP_NAME: "Santé Plus Services",
  THEME_COLOR: "#16a34a", 
};
