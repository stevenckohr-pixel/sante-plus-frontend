/**
 * Utilitaires partagés Santé Plus Services
 */

export const UI = {
  // Vibration haptique pour mobile
  vibrate: (type = "success") => {
    if (!("vibrate" in navigator)) return;
    if (type === "success") navigator.vibrate([30]);
    if (type === "error") navigator.vibrate([100, 50, 100]);
  },

  // Formater les dates proprement (ex: Aujourd'hui à 14:30)
  formatDate: (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  // Formater l'argent (CFA)
  formatMoney: (amount) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
  },

  // Générer des initiales pour les avatars si pas de photo
  getInitials: (name) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "??";
  },
};

// Compression d'image avant envoi au serveur (pour économiser la bande passante au Bénin)
export async function compressImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.7,
        );
      };
    };
  });
}
