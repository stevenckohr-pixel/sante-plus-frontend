// js/core/syncService.js - Version corrigée

import { secureFetch, clearApiCache } from "./api.js";
import { AppState } from "./state.js";
import { showToast } from "./utils.js";

class SyncService {
    constructor() {
        this.listeners = new Map();
        this.pollingInterval = null;
        this.isOnline = navigator.onLine;
        
        this.init();
    }
    
    init() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        console.log("✅ SyncService initialisé");
    }
    
    /**
     * Forcer le rafraîchissement d'une ressource
     */
    async refresh(resourceType) {
        console.log(`🔄 Refresh: ${resourceType}`);
        
        try {
            // ✅ VIDER LE CACHE D'ABORD
            clearApiCache();
            
            switch(resourceType) {
                case 'messages':
                    if (AppState.currentPatient) {
                        // ✅ FORCER un fetch sans cache
                        const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`, {}, false);
                        AppState.messages = data;
                        this.emit('messages-updated', data);
                        
                        // ✅ Re-rendre le feed immédiatement
                        if (window.renderFeed) {
                            window.renderFeed();
                        }
                    }
                    break;
                    
                case 'commandes':
                    const commandes = await secureFetch('/commandes', {}, false);
                    AppState.commandes = commandes;
                    this.emit('commandes-updated', commandes);
                    if (window.loadCommandes) {
                        window.loadCommandes();
                    }
                    break;
                    
                case 'visites':
                    const visites = await secureFetch('/visites', {}, false);
                    AppState.visites = visites;
                    this.emit('visites-updated', visites);
                    if (window.loadVisits) {
                        window.loadVisits();
                    }
                    break;
                    
                case 'all':
                    await Promise.all([
                        this.refresh('messages'),
                        this.refresh('commandes'),
                        this.refresh('visites')
                    ]);
                    break;
            }
        } catch (err) {
            console.error(`❌ Erreur refresh ${resourceType}:`, err);
        }
    }
    
    /**
     * Forcer le rafraîchissement de la vue active
     */
    refreshCurrentView() {
        const currentView = AppState.currentView;
        if (currentView && window.switchView) {
            console.log(`🔄 Rafraîchissement vue: ${currentView}`);
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
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}



// ============================================================
// 📡 ÉCOUTEUR DE RAFRAÎCHISSEMENT AUTOMATIQUE
// ============================================================

window.addEventListener('app-data-updated', (event) => {
    console.log("📢 [Auto-Refresh] Données mises à jour:", event.detail);
    
    const currentView = AppState?.currentView;
    const endpoint = event.detail?.endpoint || '';
    
    // Rafraîchir le feed si on est dessus
    if (currentView === 'feed' && window.renderFeed) {
        console.log("🔄 Rafraîchissement du feed");
        window.renderFeed();
    }
    
    // Rafraîchir les commandes si on est dessus
    if (currentView === 'commandes' && window.loadCommandes) {
        console.log("🔄 Rafraîchissement des commandes");
        window.loadCommandes();
    }
    
    // Rafraîchir les visites si on est dessus
    if (currentView === 'visits' && window.loadVisits) {
        console.log("🔄 Rafraîchissement des visites");
        window.loadVisits();
    }
    
    // Rafraîchir les patients si on est dessus
    if (currentView === 'patients' && window.loadPatients) {
        console.log("🔄 Rafraîchissement des patients");
        window.loadPatients();
    }
});

 
export const syncService = new SyncService();
