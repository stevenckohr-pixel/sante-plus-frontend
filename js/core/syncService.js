
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
        
        // ✅ Écouter l'événement global
        window.addEventListener('app-data-updated', (event) => {
            console.log("📢 [SyncService] Événement reçu:", event.detail);
            this.handleDataUpdate(event.detail);
        });
        
        console.log("✅ SyncService initialisé");
    }
    
    /**
     * ✅ Gestionnaire central des mises à jour
     */
    async handleDataUpdate(detail) {
        if (this.refreshInProgress) {
            console.log("⏳ Refresh déjà en cours, ignoré");
            return;
        }
        
        this.refreshInProgress = true;
        
        try {
            const { endpoint, method } = detail;
            const currentView = AppState?.currentView;
            
            console.log(`🔄 Rafraîchissement: ${endpoint} (vue: ${currentView})`);
            
            // ✅ VIDER LE CACHE API
            clearApiCache();
            
            // ✅ Déterminer quoi recharger selon l'endpoint
            if (endpoint.includes('/messages') || endpoint === 'message_sent') {
                if (currentView === 'feed' && window.renderFeed) {
                    await this.refreshMessages();
                }
            }
            else if (endpoint.includes('/commandes') || endpoint === 'commande_created' || endpoint === 'commande_updated') {
                if (window.loadCommandes) {
                    await window.loadCommandes();
                }
            }
            else if (endpoint.includes('/visites') || endpoint === 'visit_started' || endpoint === 'visit_ended') {
                if (window.loadVisits) {
                    await window.loadVisits();
                }
                // Rafraîchir l'UI aidant si nécessaire
                const activePatientId = localStorage.getItem("active_patient_id");
                if (activePatientId && window.refreshAidantUI) {
                    window.refreshAidantUI(activePatientId);
                }
            }
            else if (endpoint.includes('/patients')) {
                if (window.loadPatients) {
                    await window.loadPatients();
                }
            }
            else if (endpoint.includes('/planning') || endpoint.includes('/assignments')) {
                if (window.renderRHDashboard) {
                    await window.renderRHDashboard();
                }
                if (window.loadPlanning) {
                    await window.loadPlanning();
                }
            }
            else if (endpoint === 'dashboard') {
                if (window.fetchStats) {
                    await window.fetchStats();
                }
                if (window.loadRegistrations) {
                    await window.loadRegistrations();
                }
            }
            
            // ✅ Rafraîchir la vue courante si nécessaire
        if (currentView) {
            console.log(`📍 Vue actuelle: ${currentView}, endpoint: ${endpoint}`);
        }
            
        } catch (err) {
            console.error("❌ Erreur handleDataUpdate:", err);
        } finally {
            this.refreshInProgress = false;
        }
    }
    
    /**
     * Rafraîchir les messages (feed)
     */
async refreshMessages() {
    if (!AppState.currentPatient) return;
    
    try {
        const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`);
        AppState.messages = data;
        
        // ✅ Utiliser window.renderFeed (maintenant disponible)
        if (typeof window.renderFeed === 'function') {
            window.renderFeed();
            console.log("✅ Feed re-rendu après refresh");
        } else {
            console.warn("⚠️ window.renderFeed n'est pas une fonction");
        }
        
        console.log("✅ Messages rafraîchis");
    } catch (err) {
        console.error("❌ Erreur refreshMessages:", err);
    }
}
    
    /**
     * Forcer le rafraîchissement de la vue active
     */
    refreshCurrentView() {
        const currentView = AppState.currentView;
        if (currentView && window.switchView) {
            console.log(`🔄 Rafraîchissement forcé de la vue: ${currentView}`);
            window.switchView(currentView);
        }
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
        this.refreshCurrentView();
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
