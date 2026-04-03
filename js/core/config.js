export const CONFIG = {
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000/api"
      : "https://sante-plus-backend-ux1n.onrender.com/api",

  APP_NAME: "Santé Plus Services",
  THEME_COLOR: "#16a34a",
  
  LOGO_GENERAL: "https://res.cloudinary.com/dglwrrvh3/image/upload/v1775257930/ChatGPT_Image_Jan_7_2026_at_11_58_26_PM_1_hrty2z.png",
  LOGO_MAMAN: "https://res.cloudinary.com/dglwrrvh3/image/upload/v1775257930/IMG-20260403-WA0007.jpg_yrxykl.jpg"
};
