import { secureFetch, clearApiCache } from "./api.js";
import { AppState } from "./state.js";
import { showToast } from "./utils.js";

class SyncService {
    constructor() {
        this.listeners = new Map();
        this.isOnline = navigator.onLine;
        this.refreshInProgress = false;
        this.init();
    }
    
    init() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        window.addEventListener('app-data-updated', (event) => {
            console.log("📢 [SyncService] Événement reçu:", event.detail);
            this.handleDataUpdate(event.detail);
        });
        
        console.log("✅ SyncService initialisé");
    }
    
    async handleDataUpdate(detail) {
        if (this.refreshInProgress) {
            console.log("⏳ Refresh déjà en cours, ignoré");
            return;
        }
        
        this.refreshInProgress = true;
        
        try {
            const { endpoint, resourceType } = detail;
            const currentView = AppState?.currentView;
            
            console.log(`🔄 Rafraîchissement: ${endpoint} (vue: ${currentView}, type: ${resourceType})`);
            
            // ✅ VIDER LE CACHE COMPLÈTEMENT
            clearApiCache();
            
            // ✅ FORCER LE RECHARGEMENT SELON LE TYPE DE RESSOURCE
            switch(resourceType) {
                case 'message_sent':
                case 'message_updated':
                    // Recharger le feed si on est dedans
                    if (currentView === 'feed') {
                        await this.forceRefreshFeed();
                    } else if (currentView === 'home') {
                        // Si on est sur l'accueil, rafraîchir les badges
                        await this.refreshHomeBadges();
                    }
                    break;
                    
                case 'commande_created':
                case 'commande_updated':
                    // Recharger les commandes
                    await this.forceRefreshCommandes();
                    break;
                    
                case 'visit_started':
                case 'visit_ended':
                    // Recharger les visites
                    await this.forceRefreshVisites();
                    break;
                    
                case 'patients':
                    await this.forceRefreshPatients();
                    break;
                    
                default:
                    // Fallback : recharger la vue courante
                    await this.forceRefreshCurrentView();
            }
            
            // ✅ TOUJOURS rafraîchir les badges de l'accueil
            await this.refreshHomeBadges();
            
        } catch (err) {
            console.error("❌ Erreur handleDataUpdate:", err);
        } finally {
            this.refreshInProgress = false;
        }
    }
    
    /**
     * FORCER le rechargement du feed
     */
    async forceRefreshFeed() {
        console.log("🔄 FORCE REFRESH FEED");
        
        if (!AppState.currentPatient) {
            console.warn("⚠️ Pas de patient courant");
            return;
        }
        
        try {
            // Recharger les messages
            const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`, {}, true);
            AppState.messages = data;
            
            // Re-rendre le feed
            if (typeof window.renderFeed === 'function') {
                window.renderFeed();
                console.log("✅ Feed re-rendu");
            } else {
                console.warn("⚠️ window.renderFeed non trouvé");
            }
            
        } catch (err) {
            console.error("❌ Erreur refresh feed:", err);
        }
    }
    
    /**
     * FORCER le rechargement des commandes
     */
    async forceRefreshCommandes() {
        console.log("🔄 FORCE REFRESH COMMANDES");
        
        try {
            if (typeof window.loadCommandes === 'function') {
                await window.loadCommandes();
                console.log("✅ Commandes rechargées");
            } else {
                console.warn("⚠️ window.loadCommandes non trouvé");
                // Fallback : recharger la vue
                await this.forceRefreshCurrentView();
            }
        } catch (err) {
            console.error("❌ Erreur refresh commandes:", err);
        }
    }
    
    /**
     * FORCER le rechargement des visites
     */
    async forceRefreshVisites() {
        console.log("🔄 FORCE REFRESH VISITES");
        
        try {
            if (typeof window.loadVisits === 'function') {
                await window.loadVisits();
                console.log("✅ Visites rechargées");
            } else {
                console.warn("⚠️ window.loadVisits non trouvé");
                await this.forceRefreshCurrentView();
            }
            
            // Rafraîchir l'UI aidant
            const activePatientId = localStorage.getItem("active_patient_id");
            if (activePatientId && typeof window.refreshAidantUI === 'function') {
                window.refreshAidantUI(activePatientId);
            }
        } catch (err) {
            console.error("❌ Erreur refresh visites:", err);
        }
    }
    
    /**
     * FORCER le rechargement des patients
     */
    async forceRefreshPatients() {
        console.log("🔄 FORCE REFRESH PATIENTS");
        
        try {
            if (typeof window.loadPatients === 'function') {
                await window.loadPatients();
                console.log("✅ Patients rechargés");
            }
        } catch (err) {
            console.error("❌ Erreur refresh patients:", err);
        }
    }
    
    /**
     * FORCER le rechargement de la vue courante
     */
    async forceRefreshCurrentView() {
        const currentView = AppState.currentView;
        if (currentView && typeof window.switchView === 'function') {
            console.log(`🔄 FORCE REFRESH VUE: ${currentView}`);
            await window.switchView(currentView);
        }
    }
    
    /**
     * Rafraîchir les badges de l'accueil
     */
    async refreshHomeBadges() {
        if (typeof window.refreshMenuBadges === 'function') {
            await window.refreshMenuBadges();
            console.log("✅ Badges menu mis à jour");
        }
    }
    
    refreshCurrentView() {
        this.forceRefreshCurrentView();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
    
    handleOnline() {
        console.log("📶 Connexion rétablie");
        this.isOnline = true;
        showToast("Connexion rétablie", "success", 2000);
        this.forceRefreshCurrentView();
    }
    
    handleOffline() {
        console.log("📶 Connexion perdue");
        this.isOnline = false;
        showToast("Connexion perdue", "warning", 3000);
    }
    
    destroy() {
        this.refreshInProgress = false;
    }
}

export const syncService = new SyncService();
