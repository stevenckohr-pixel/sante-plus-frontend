// js/core/syncService.js
// Service de synchronisation des données

import { secureFetch } from "./api.js";
import { AppState } from "./state.js";
import { showToast } from "./utils.js";

class SyncService {
    constructor() {
        this.listeners = new Map(); // Événements à écouter
        this.pollingInterval = null;
        this.isOnline = navigator.onLine;
        this.pendingActions = []; // Actions en attente (offline)
        
        this.init();
    }
    
    init() {
        // Écouter la connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Démarrer le polling de secours (toutes les 30s si WebSocket down)
        this.startFallbackPolling();
        
        console.log("✅ SyncService initialisé");
    }
    
    /**
     * Enregistrer une fonction à appeler quand une donnée change
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Déclencher un événement
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
    
    /**
     * Forcer le rafraîchissement d'une ressource
     */
    async refresh(resourceType, id = null) {
        console.log(`🔄 Refresh: ${resourceType} ${id || ''}`);
        
        try {
            switch(resourceType) {
                case 'messages':
                    if (AppState.currentPatient) {
                        const data = await secureFetch(`/messages?patient_id=${AppState.currentPatient}`, {}, false);
                        AppState.messages = data;
                        this.emit('messages-updated', data);
                    }
                    break;
                    
                case 'commandes':
                    const commandes = await secureFetch('/commandes', {}, false);
                    AppState.commandes = commandes;
                    this.emit('commandes-updated', commandes);
                    break;
                    
                case 'visites':
                    const visites = await secureFetch('/visites', {}, false);
                    AppState.visites = visites;
                    this.emit('visites-updated', visites);
                    break;
                    
                case 'patients':
                    const patients = await secureFetch('/patients', {}, false);
                    AppState.patients = patients;
                    this.emit('patients-updated', patients);
                    break;
                    
                case 'all':
                    await Promise.all([
                        this.refresh('messages'),
                        this.refresh('commandes'),
                        this.refresh('visites'),
                        this.refresh('patients')
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
    
    /**
     * Actions offline : stocker et réessayer
     */
    queueAction(action) {
        this.pendingActions.push({
            ...action,
            timestamp: Date.now(),
            retries: 0
        });
        this.savePendingActions();
        showToast("Action enregistrée, sera synchronisée automatiquement", "info", 3000);
    }
    
    async savePendingActions() {
        localStorage.setItem('pending_actions', JSON.stringify(this.pendingActions));
    }
    
    async loadPendingActions() {
        const saved = localStorage.getItem('pending_actions');
        if (saved) {
            this.pendingActions = JSON.parse(saved);
            if (this.pendingActions.length > 0 && this.isOnline) {
                this.processPendingActions();
            }
        }
    }
    
    async processPendingActions() {
        if (!this.isOnline || this.pendingActions.length === 0) return;
        
        console.log(`📦 Traitement de ${this.pendingActions.length} actions en attente...`);
        
        const actions = [...this.pendingActions];
        this.pendingActions = [];
        
        for (const action of actions) {
            try {
                await this.executeAction(action);
                console.log(`✅ Action exécutée: ${action.type}`);
            } catch (err) {
                console.error(`❌ Échec action:`, err);
                if (action.retries < 3) {
                    this.pendingActions.push({
                        ...action,
                        retries: (action.retries || 0) + 1
                    });
                }
            }
        }
        
        await this.savePendingActions();
        
        if (this.pendingActions.length === 0) {
            showToast("Toutes les actions ont été synchronisées", "success", 2000);
            this.refreshCurrentView();
        }
    }
    
    async executeAction(action) {
        // Implémentez selon vos actions
        const { type, data } = action;
        
        switch(type) {
            case 'send_message':
                await secureFetch('/messages/send', { method: 'POST', body: JSON.stringify(data) });
                break;
            case 'send_photo':
                // Upload photo...
                break;
            case 'start_visit':
                await secureFetch('/visites/start', { method: 'POST', body: JSON.stringify(data) });
                break;
            default:
                console.warn(`Action inconnue: ${type}`);
        }
    }
    
    /**
     * Fallback polling (si WebSocket est down)
     */
    startFallbackPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        
        this.pollingInterval = setInterval(() => {
            // Vérifier si WebSocket est actif
            const wsActive = window.Realtime && window.Realtime.isActive();
            
            if (!wsActive && this.isOnline) {
                console.log("📡 WebSocket inactif, polling de secours...");
                this.refreshCurrentView();
            }
        }, 30000); // Toutes les 30 secondes
    }
    
    handleOnline() {
        console.log("📶 Connexion rétablie");
        this.isOnline = true;
        showToast("Connexion rétablie", "success", 2000);
        this.processPendingActions();
        this.refreshCurrentView();
    }
    
    handleOffline() {
        console.log("📶 Connexion perdue");
        this.isOnline = false;
        showToast("Connexion perdue - Les actions seront synchronisées plus tard", "warning", 3000);
    }
    
    /**
     * Nettoyer
     */
    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

// Singleton
export const syncService = new SyncService();
