

/**
 * Utilitaires partagés Santé Plus Services
 */

export const UI = {
    vibrate: (type = "success") => {
        haptic(type === "error" ? "error" : "success");
    },
    toast: showToast,
    success: showSuccessToast,
    error: showErrorToast,
    warning: showWarningToast,
    info: showInfoToast,
    formatDate: (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    },
    formatMoney: (amount) => {
        return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
    },
    getInitials: (name) => {
        return name
            ? name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
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



/**
 * 📳 CONFIGURATION DES MICRO-INTERACTIONS
 */
const HAPTIC_CONFIG = {
    light: [10],
    medium: [30],
    heavy: [50, 30, 50],
    success: [30],
    error: [100, 50, 100],
    warning: [50, 30, 50, 30, 50],
    click: [5],
    long: [50]
};

/**
 * 📳 VIBRATION HAPTIQUE
 * @param {string} type - Type de vibration ('light', 'medium', 'heavy', 'success', 'error', 'warning', 'click')
 */
export function haptic(type = 'light') {
    if (!("vibrate" in navigator)) return;
    const pattern = HAPTIC_CONFIG[type] || HAPTIC_CONFIG.light;
    navigator.vibrate(pattern);
}

/**
 * 🔊 JOUER UN SON (optionnel, désactivé par défaut)
 * @param {string} type - Type de son ('click', 'success', 'error', 'notification')
 */
let soundsEnabled = false;

export function playSound(type = 'click') {
    if (!soundsEnabled) return;
    
    // Sons courts en Web Audio (plus légers que des fichiers audio)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'click':
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            oscillator.type = 'sine';
            break;
        case 'success':
            oscillator.frequency.value = 1200;
            gainNode.gain.value = 0.15;
            oscillator.type = 'sine';
            break;
        case 'error':
            oscillator.frequency.value = 400;
            gainNode.gain.value = 0.15;
            oscillator.type = 'sawtooth';
            break;
        case 'notification':
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.12;
            oscillator.type = 'sine';
            break;
        default:
            oscillator.frequency.value = 600;
            gainNode.gain.value = 0.08;
    }
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.2);
}

/**
 * 🎵 ACTIVER/DÉSACTIVER LES SONS
 */
export function setSoundsEnabled(enabled) {
    soundsEnabled = enabled;
    localStorage.setItem('sounds_enabled', enabled);
}

/**
 * 🎵 RÉCUPÉRER L'ÉTAT DES SONS
 */
export function getSoundsEnabled() {
    return soundsEnabled;
}



/**
 * 🔘 AJOUTER DES FEEDBACK À TOUS LES ÉLÉMENTS CLIQUABLES
 */
export function initMicroInteractions() {
    // Ajouter le feedback haptique à tous les boutons et cartes
    const clickableElements = document.querySelectorAll('button, .menu-tile, .patient-card, .nav-btn, .sidebar-link, [onclick]');
    
    clickableElements.forEach(el => {
        // Éviter les doublons
        if (el.hasAttribute('data-haptic-initialized')) return;
        el.setAttribute('data-haptic-initialized', 'true');
        
        el.addEventListener('click', (e) => {
            // Éviter les doubles feedbacks sur les éléments enfants
            if (e.defaultPrevented) return;
            
            // Vibration légère
            haptic('click');
            
            // Son optionnel
            if (soundsEnabled) {
                playSound('click');
            }
        });
        
        // Ajouter la classe de feedback visuel
        el.classList.add('haptic-feedback');
    });
}

/**
 * 🔄 REINITIALISER LES MICRO-INTERACTIONS (après chargement dynamique)
 */
export function refreshMicroInteractions() {
    const clickableElements = document.querySelectorAll('button, .menu-tile, .patient-card, .nav-btn, .sidebar-link, [onclick]');
    
    clickableElements.forEach(el => {
        if (el.hasAttribute('data-haptic-initialized')) return;
        el.setAttribute('data-haptic-initialized', 'true');
        
        el.addEventListener('click', () => {
            haptic('click');
            if (soundsEnabled) playSound('click');
        });
        el.classList.add('haptic-feedback');
    });
}



/**
 * 🍞 TOAST DE NOTIFICATION UNIFIÉ
 * @param {string} message - Message à afficher
 * @param {string} type - Type ('success', 'error', 'warning', 'info')
 * @param {number} duration - Durée d'affichage (ms)
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Supprimer les toasts existants
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    // Icône selon le type
    const icons = {
        success: '<i class="fa-solid fa-check-circle"></i>',
        error: '<i class="fa-solid fa-circle-exclamation"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info: '<i class="fa-solid fa-info-circle"></i>'
    };
    
    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    document.body.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Animation de sortie
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 🍞 TOAST DE SUCCÈS
 */
export function showSuccessToast(message, duration = 2500) {
    showToast(message, 'success', duration);
    haptic('success');
}

/**
 * 🍞 TOAST D'ERREUR
 */
export function showErrorToast(message, duration = 3000) {
    showToast(message, 'error', duration);
    haptic('error');
}

/**
 * 🍞 TOAST D'AVERTISSEMENT
 */
export function showWarningToast(message, duration = 3000) {
    showToast(message, 'warning', duration);
    haptic('warning');
}

/**
 * 🍞 TOAST D'INFORMATION
 */
export function showInfoToast(message, duration = 2000) {
    showToast(message, 'info', duration);
}



/**
 * 🌀 LOADER LOCAL (Uniquement dans le conteneur)
 * @param {HTMLElement} container - L'élément qui va afficher le loader
 * @param {string} message - Message optionnel
 */
export function showLocalLoader(container, message = 'Chargement...') {
    if (!container) return;
    
    if (!container.dataset.originalContent) {
        container.dataset.originalContent = container.innerHTML;
    }
    
    container.innerHTML = `
        <div class="local-loader flex flex-col items-center justify-center py-20 min-h-[200px]">
            <div class="relative w-12 h-12">
                <div class="absolute inset-0 border-3 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <img src="https://res.cloudinary.com/dglwrrvh3/image/upload/v1774974945/heart-beat_tjb16u.png" 
                     class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 animate-pulse">
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-3">${message}</p>
        </div>
    `;
}

export function hideLocalLoader(container) {
    if (!container) return;
    if (container.dataset.originalContent) {
        container.innerHTML = container.dataset.originalContent;
        delete container.dataset.originalContent;
    }
}



/**
 * 📦 CACHE POUR LES DONNÉES API
 */
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function cachedFetch(url, options = {}, ttl = CACHE_DURATION) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = apiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
        console.log(`📦 Cache hit: ${url}`);
        return cached.data;
    }
    
    console.log(`🌐 Cache miss: ${url}`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    apiCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
    });
    
    return data;
}

/**
 * 🖼️ LAZY LOADING DES IMAGES
 */
export function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px',
        threshold: 0.01
    });
    
    images.forEach(img => imageObserver.observe(img));
}

/**
 * 📊 NETTOYER LE CACHE (si besoin)
 */
export function clearApiCache() {
    apiCache.clear();
    console.log('🗑️ Cache API vidé');
}

/**
 * ⚡ VERSION OPTIMISÉE DE secureFetch AVEC CACHE
 */
export async function secureFetchWithCache(endpoint, options = {}, useCache = true) {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    
    const fetchOptions = { ...options, headers };
    
    if (useCache && (!options.method || options.method === 'GET')) {
        return cachedFetch(`${window.CONFIG.API_URL}${endpoint}`, fetchOptions);
    }
    
    const response = await fetch(`${window.CONFIG.API_URL}${endpoint}`, fetchOptions);
    
    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.reload();
        throw new Error("Session expirée");
    }
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur serveur");
    }
    
    return response.json();
}
