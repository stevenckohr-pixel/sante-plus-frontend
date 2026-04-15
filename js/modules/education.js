import { secureFetch } from "../core/api.js";
import { UI } from "../core/utils.js";

// Base de données des contenus éducatifs (MVP)
const educationalContent = {
    videos: [
        {
            id: 1,
            title: "Les bienfaits de l'allaitement",
            category: "allaitement",
            duration: "5:30",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        },
        {
            id: 2,
            title: "Comment calmer les pleurs de bébé",
            category: "bebe",
            duration: "8:15",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        },
        {
            id: 3,
            title: "Le massage pour bébé",
            category: "bebe",
            duration: "12:00",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        }
    ],
    articles: [
        {
            id: 1,
            title: "Les signes d'alerte pendant la grossesse",
            category: "grossesse",
            readTime: "5 min",
            content: "Découvrez les signes qui doivent vous alerter pendant votre grossesse..."
        },
        {
            id: 2,
            title: "La préparation à l'accouchement",
            category: "accouchement",
            readTime: "7 min",
            content: "Tout ce qu'il faut savoir pour bien préparer votre accouchement..."
        },
        {
            id: 3,
            title: "Les premiers jours avec bébé à la maison",
            category: "postpartum",
            readTime: "6 min",
            content: "Conseils pour bien vivre les premiers jours après la naissance..."
        }
    ]
};

// Checklist naissance
const birthChecklist = {
    pourMaman: [
        "🩺 Carnet de santé",
        "📋 Dossier médical",
        "🧦 Vêtements confortables (2-3 tenues)",
        "👙 Soutien-gorge d'allaitement",
        "🩴 Chaussons / Tongs",
        "📱 Chargeur de téléphone",
        "💄 Trousse de toilette"
    ],
    pourBebe: [
        "👕 Bodies (4-6)",
        "🧦 Pyjamas (3-4)",
        "🧤 Gants / Bonnet",
        "🧸 Couvertures / Gigoteuse",
        "🍼 Biberons (2-3)",
        "🥛 Lait maternisé (si nécessaire)",
        "🚿 Produits de toilette bébé"
    ],
    documents: [
        "📄 Carte d'identité",
        "💳 Carte de sécurité sociale",
        "📊 Résultats d'analyses",
        "📝 Échographies"
    ]
};

/**
 * 📚 PAGE CONTENUS ÉDUCATIFS
 */
export async function loadEducationPage() {
    const container = document.getElementById("view-container");
    if (!container) return;

    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeColor = isMaman ? 'pink' : 'emerald';
    const activeTab = window._educationTab || 'videos';

    container.innerHTML = `
        <div class="education-container">
            <div class="flex items-center gap-4 mb-6">
                <button onclick="window.switchView('home')" 
                        class="w-10 h-10 rounded-full bg-white shadow-sm border border-${themeColor}-100 flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left text-${themeColor}-500"></i>
                </button>
                <div>
                    <h3 class="font-black text-xl text-slate-800">Espace Éducation</h3>
                    <p class="text-[10px] text-${themeColor}-500 font-bold uppercase tracking-wider">Pour vous et bébé</p>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 mb-6 bg-white p-1 rounded-2xl border border-${themeColor}-100">
                <button onclick="window.switchEducationTab('videos')" 
                        id="tab-videos" 
                        class="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'videos' ? `bg-${themeColor}-500 text-white shadow-md` : 'text-slate-400'}">
                    <i class="fa-solid fa-video mr-1"></i> Vidéos
                </button>
                <button onclick="window.switchEducationTab('articles')" 
                        id="tab-articles" 
                        class="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'articles' ? `bg-${themeColor}-500 text-white shadow-md` : 'text-slate-400'}">
                    <i class="fa-solid fa-newspaper mr-1"></i> Articles
                </button>
                <button onclick="window.switchEducationTab('checklist')" 
                        id="tab-checklist" 
                        class="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'checklist' ? `bg-${themeColor}-500 text-white shadow-md` : 'text-slate-400'}">
                    <i class="fa-solid fa-list-check mr-1"></i> Checklist
                </button>
            </div>

            <!-- Contenu dynamique -->
            <div id="education-content">
                ${activeTab === 'videos' ? renderVideos() : 
                  activeTab === 'articles' ? renderArticles() : 
                  renderChecklist()}
            </div>
        </div>
    `;

    addEducationStyles();
}

/**
 * 🎬 AFFICHER LES VIDÉOS
 */
function renderVideos() {
    return `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${educationalContent.videos.map(video => `
                    <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                        <div class="relative">
                            <img src="${video.thumbnail}" class="w-full h-40 object-cover" loading="lazy">
                            <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <button onclick="window.playVideo('${video.url}')" 
                                        class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                    <i class="fa-solid fa-play text-${localStorage.getItem('user_is_maman') === 'true' ? 'pink' : 'emerald'}-500 text-lg"></i>
                                </button>
                            </div>
                            <span class="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded-full">${video.duration}</span>
                        </div>
                        <div class="p-3">
                            <p class="font-bold text-slate-800 text-sm">${video.title}</p>
                            <p class="text-[9px] text-${localStorage.getItem('user_is_maman') === 'true' ? 'pink' : 'emerald'}-500 mt-0.5 uppercase tracking-wider">${video.category}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * 📄 AFFICHER LES ARTICLES
 */
function renderArticles() {
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeColor = isMaman ? 'pink' : 'emerald';
    
    return `
        <div class="space-y-3">
            ${educationalContent.articles.map(article => `
                <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="text-[9px] font-bold text-${themeColor}-500 uppercase tracking-wider mb-1">${article.category}</p>
                            <h4 class="font-bold text-slate-800 text-sm">${article.title}</h4>
                            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${article.content.substring(0, 80)}...</p>
                            <div class="flex items-center gap-3 mt-3">
                                <span class="text-[9px] text-slate-400"><i class="fa-regular fa-clock mr-1"></i>${article.readTime}</span>
                                <button onclick="window.readArticle(${article.id})" 
                                        class="text-[9px] font-bold text-${themeColor}-500">Lire l'article →</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * ✅ AFFICHER LA CHECKLIST NAISSANCE
 */
function renderChecklist() {
    const isMaman = localStorage.getItem("user_is_maman") === "true";
    const themeColor = isMaman ? 'pink' : 'emerald';
    
    // Récupérer l'état des checkboxes depuis localStorage
    const savedState = JSON.parse(localStorage.getItem('birth_checklist') || '{}');
    
    return `
        <div class="space-y-4">
            <!-- Pour Maman -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-${themeColor}-100">
                <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-female text-${themeColor}-500"></i> Pour Maman
                </h4>
                <div class="space-y-2">
                    ${birthChecklist.pourMaman.map((item, index) => `
                        <label class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" class="checklist-item w-5 h-5 accent-${themeColor}-500" 
                                   data-category="maman" data-index="${index}" 
                                   ${savedState[`maman_${index}`] ? 'checked' : ''}>
                            <span class="text-sm text-slate-700 ${savedState[`maman_${index}`] ? 'line-through text-slate-400' : ''}">${item}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- Pour Bébé -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-${themeColor}-100">
                <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-baby text-${themeColor}-500"></i> Pour Bébé
                </h4>
                <div class="space-y-2">
                    ${birthChecklist.pourBebe.map((item, index) => `
                        <label class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" class="checklist-item w-5 h-5 accent-${themeColor}-500" 
                                   data-category="bebe" data-index="${index}"
                                   ${savedState[`bebe_${index}`] ? 'checked' : ''}>
                            <span class="text-sm text-slate-700 ${savedState[`bebe_${index}`] ? 'line-through text-slate-400' : ''}">${item}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- Documents -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-${themeColor}-100">
                <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-folder-open text-${themeColor}-500"></i> Documents Importants
                </h4>
                <div class="space-y-2">
                    ${birthChecklist.documents.map((item, index) => `
                        <label class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" class="checklist-item w-5 h-5 accent-${themeColor}-500" 
                                   data-category="documents" data-index="${index}"
                                   ${savedState[`documents_${index}`] ? 'checked' : ''}>
                            <span class="text-sm text-slate-700 ${savedState[`documents_${index}`] ? 'line-through text-slate-400' : ''}">${item}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- Progression -->
            <div class="bg-${themeColor}-50 rounded-2xl p-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-${themeColor}-600">Progression</span>
                    <span id="checklist-progress" class="text-xs font-bold text-${themeColor}-600">0%</span>
                </div>
                <div class="w-full bg-white rounded-full h-2">
                    <div id="checklist-progress-bar" class="bg-${themeColor}-500 h-2 rounded-full transition-all" style="width: 0%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 🎬 JOUER UNE VIDÉO (modale)
 */
window.playVideo = (url) => {
    Swal.fire({
        title: "Lecture vidéo",
        html: `
            <div class="relative" style="padding-bottom: 56.25%; height: 0;">
                <iframe src="${url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: { popup: 'rounded-2xl w-full max-w-2xl' }
    });
};

/**
 * 📖 LIRE UN ARTICLE
 */
window.readArticle = (articleId) => {
    const article = educationalContent.articles.find(a => a.id === articleId);
    if (!article) return;
    
    Swal.fire({
        title: `<span class="text-lg font-black text-slate-800">${article.title}</span>`,
        html: `
            <div class="text-left">
                <p class="text-[10px] text-${localStorage.getItem('user_is_maman') === 'true' ? 'pink' : 'emerald'}-500 mb-3">${article.category} • ${article.readTime}</p>
                <p class="text-sm text-slate-600 leading-relaxed">${article.content}</p>
                <div class="mt-4 p-3 bg-${localStorage.getItem('user_is_maman') === 'true' ? 'pink' : 'emerald'}-50 rounded-xl">
                    <p class="text-xs font-medium text-slate-600">💡 À retenir :</p>
                    <p class="text-xs text-slate-500 mt-1">Cet article vous a été utile ? Partagez-le avec d'autres mamans !</p>
                </div>
            </div>
        `,
        confirmButtonText: "Fermer",
        confirmButtonColor: localStorage.getItem('user_is_maman') === 'true' ? '#DB2777' : '#10B981',
        customClass: { popup: 'rounded-2xl' }
    });
};

/**
 * 🔄 CHANGER D'ONGLET
 */
window.switchEducationTab = (tab) => {
    window._educationTab = tab;
    loadEducationPage();
    
    // Sauvegarder la préférence
    localStorage.setItem('education_last_tab', tab);
};

/**
 * 💾 SAUVEGARDER L'ÉTAT DE LA CHECKLIST
 */
function saveChecklistState() {
    const checkboxes = document.querySelectorAll('.checklist-item');
    const state = {};
    
    checkboxes.forEach(cb => {
        const category = cb.dataset.category;
        const index = cb.dataset.index;
        state[`${category}_${index}`] = cb.checked;
    });
    
    localStorage.setItem('birth_checklist', JSON.stringify(state));
    
    // Mettre à jour la progression
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const percent = Math.round((checked / total) * 100);
    
    const progressText = document.getElementById('checklist-progress');
    const progressBar = document.getElementById('checklist-progress-bar');
    
    if (progressText) progressText.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
}

/**
 * 🎨 AJOUTER LES STYLES
 */
function addEducationStyles() {
    if (document.getElementById('education-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'education-styles';
    style.textContent = `
        .education-container {
            padding: 20px;
            background: #F8FAFC;
            min-height: 100%;
        }
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);
}

// Initialiser les événements de checklist après rendu
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('checklist-item')) {
        setTimeout(() => saveChecklistState(), 50);
    }
});

// Exporter
export { loadEducationPage };
