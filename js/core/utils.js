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



/**
 * 🎨 MODALE DE SÉLECTION MODERNE (remplace select)
 * @param {Array} items - Liste d'objets {id, name, extra?}
 * @param {string} title - Titre de la modale
 * @param {string} placeholder - Texte de recherche
 * @returns {Promise<Object>} - Élément sélectionné
 */
export async function openModernSelector(items, title, placeholder = "Rechercher...") {
    return new Promise(async (resolve) => {
        let searchTerm = '';
        let filteredItems = [...items];
        
        const renderList = () => {
            const filtered = items.filter(item => 
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            if (filtered.length === 0) {
                return `<div class="text-center py-8 text-slate-400 text-xs">Aucun résultat</div>`;
            }
            
            return filtered.map(item => `
                <div class="selector-item p-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer" data-id="${item.id}" data-name="${item.name.replace(/'/g, "\\'")}">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-bold text-slate-800 text-sm">${item.name}</p>
                            ${item.extra ? `<p class="text-[10px] text-slate-400 mt-0.5">${item.extra}</p>` : ''}
                        </div>
                        <i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                    </div>
                </div>
            `).join('');
        };
        
        const modalContent = `
            <div class="max-h-[60vh] flex flex-col">
                <div class="relative mb-4">
                    <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                    <input type="text" id="selector-search" 
                           class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-emerald-300 transition"
                           placeholder="${placeholder}" 
                           autocomplete="off">
                </div>
                <div id="selector-list" class="overflow-y-auto max-h-[50vh]">
                    ${renderList()}
                </div>
            </div>
        `;
        
        const { value: confirmed } = await Swal.fire({
            title: `<span class="text-base font-black text-slate-800">${title}</span>`,
            html: modalContent,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "Fermer",
            cancelButtonColor: "#94A3B8",
            customClass: {
                popup: 'rounded-2xl p-6',
                cancelButton: 'rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-wider'
            },
            didOpen: () => {
                const searchInput = document.getElementById('selector-search');
                const listContainer = document.getElementById('selector-list');
                
                searchInput.addEventListener('input', (e) => {
                    searchTerm = e.target.value;
                    listContainer.innerHTML = renderList();
                    attachItemEvents();
                });
                
                const attachItemEvents = () => {
                    document.querySelectorAll('.selector-item').forEach(el => {
                        el.addEventListener('click', () => {
                            const id = el.dataset.id;
                            const name = el.dataset.name;
                            const selectedItem = items.find(i => i.id == id);
                            Swal.close();
                            resolve(selectedItem);
                        });
                    });
                };
                attachItemEvents();
            }
        });
        
        if (!confirmed) resolve(null);
    });
}



/**
 * 💀 AFFICHER UN SQUELETTE DE CHARGEMENT
 * @param {string} type - Type de squelette ('patient-card', 'visit-card', 'aidant-card', 'default')
 * @returns {string} HTML du squelette
 */
export function getSkeletonHTML(type = 'default') {
    const skeletons = {
        'patient-card': `
            <div class="skeleton-card">
                <div class="flex items-center gap-3 mb-3">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="flex-1">
                        <div class="skeleton skeleton-text w-3/4"></div>
                        <div class="skeleton skeleton-text w-1/2"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-text w-full"></div>
                <div class="skeleton skeleton-text w-2/3 mt-2"></div>
                <div class="flex gap-2 mt-3">
                    <div class="skeleton skeleton-button w-1/3"></div>
                    <div class="skeleton skeleton-button w-1/3"></div>
                </div>
            </div>
        `,
        'visit-card': `
            <div class="skeleton-card">
                <div class="flex justify-between mb-3">
                    <div class="skeleton skeleton-text w-1/3"></div>
                    <div class="skeleton skeleton-text w-1/4"></div>
                </div>
                <div class="skeleton skeleton-text w-full"></div>
                <div class="skeleton skeleton-text w-2/3 mt-2"></div>
                <div class="flex items-center gap-2 mt-3">
                    <div class="skeleton skeleton-avatar w-8 h-8"></div>
                    <div class="skeleton skeleton-text w-1/2"></div>
                </div>
            </div>
        `,
        'aidant-card': `
            <div class="skeleton-card">
                <div class="flex items-center gap-3">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="flex-1">
                        <div class="skeleton skeleton-text w-2/3"></div>
                        <div class="skeleton skeleton-text w-1/2 mt-1"></div>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    <div class="skeleton skeleton-button w-1/2"></div>
                    <div class="skeleton skeleton-button w-1/2"></div>
                </div>
            </div>
        `,
        'default': `
            <div class="space-y-4">
                <div class="skeleton-card">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text w-3/4"></div>
                </div>
                <div class="skeleton-card">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text w-3/4"></div>
                </div>
            </div>
        `
    };
    
    return skeletons[type] || skeletons.default;
}

/**
 * 🌀 AFFICHER LE SQUELETTE DANS UN CONTENEUR
 * @param {HTMLElement} container - Élément cible
 * @param {string} type - Type de squelette
 */
export function showSkeleton(container, type = 'default') {
    if (!container) return;
    container.innerHTML = getSkeletonHTML(type);
}
