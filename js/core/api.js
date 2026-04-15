import { CONFIG } from "./config.js";
import ErrorHandler from './errorHandler.js';
import db from './db.js';

const isCapacitor = typeof window !== 'undefined' && window.hasOwnProperty('Capacitor');

const apiCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 secondes

// Liste des endpoints à NE PAS mettre en cache
const NO_CACHE_ENDPOINTS = ['/visites/active', '/notifications'];
// Les messages sont maintenant gérés par IndexedDB

export async function secureFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const method = options.method || 'GET';
  
  console.log(`📡 Appel API : ${method} ${endpoint}`);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Vérifier le cache IndexedDB pour les GET (sauf messages qui ont leur propre logique)
  const isMessagesEndpoint = endpoint.includes('/messages');
  const shouldUseIndexedDB = method === 'GET' && !options.noCache && 
    !NO_CACHE_ENDPOINTS.some(pattern => endpoint.includes(pattern)) && !isMessagesEndpoint;
  
  if (shouldUseIndexedDB && db.isReady) {
    const cached = await db.getCachedApiResponse(endpoint);
    if (cached) {
      console.log(`📦 [IDB Cache hit] ${endpoint}`);
      return cached;
    }
  }

  const executeRequest = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `${CONFIG.API_URL}${endpoint}`;
      console.log(`🌐 Requête vers: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log(`📥 Réponse API [${response.status}] : ${endpoint}`);

      if (response.status === 503) {
        throw new Error("Le serveur se réveille... Veuillez patienter 30 secondes.");
      }

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        window.location.reload();
        throw new Error("Session expirée");
      }

      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}`;
        try {
          const errData = await response.json();
          errorMessage = errData.error || errData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      let responseData;
      if (method === 'GET') {
        responseData = await response.json();
        
        // Cache mémoire pour les endpoints rapides
        const shouldUseMemoryCache = !NO_CACHE_ENDPOINTS.some(pattern => endpoint.includes(pattern));
        
        if (shouldUseMemoryCache) {
          apiCache.set(endpoint, {
            data: responseData,
            timestamp: Date.now()
          });
        }
        
        // Cache IndexedDB pour les endpoints GET (sauf messages)
        if (shouldUseIndexedDB && db.isReady && responseData) {
          await db.cacheApiResponse(endpoint, responseData, 5); // 5 minutes de cache
        }
      } else {
        responseData = await response.json();
      }

      // Invalider le cache après les modifications
      if (method !== 'GET') {
        // Invalider le cache mémoire
        apiCache.delete(endpoint);
        
        // Invalider le cache IndexedDB
        if (db.isReady) {
          await db.delete('api_cache', endpoint);
        }
        
        // Invalider le cache pour les endpoints liés
        if (endpoint.includes('/messages')) {
          apiCache.forEach((_, key) => {
            if (key.includes('/messages')) apiCache.delete(key);
          });
        }
        if (endpoint.includes('/visites')) {
          apiCache.forEach((_, key) => {
            if (key.includes('/visites')) apiCache.delete(key);
          });
        }
        if (endpoint.includes('/commandes')) {
          apiCache.forEach((_, key) => {
            if (key.includes('/commandes')) apiCache.delete(key);
          });
        }
        if (endpoint.includes('/patients')) {
          apiCache.forEach((_, key) => {
            if (key.includes('/patients')) apiCache.delete(key);
          });
        }
        
        console.log(`🗑️ Cache invalidé pour: ${endpoint}`);
        
        // Déclencher l'événement de rafraîchissement
        if (typeof window !== 'undefined') {
          let resourceType = 'unknown';
          if (endpoint.includes('/messages')) resourceType = 'message_sent';
          else if (endpoint.includes('/commandes')) resourceType = 'commande_updated';
          else if (endpoint.includes('/visites/start')) resourceType = 'visit_started';
          else if (endpoint.includes('/visites/end')) resourceType = 'visit_ended';
          else if (endpoint.includes('/visites')) resourceType = 'visites';
          else if (endpoint.includes('/patients')) resourceType = 'patients';
          else if (endpoint.includes('/planning')) resourceType = 'planning';
          
          window.dispatchEvent(new CustomEvent('app-data-updated', { 
            detail: { 
              endpoint: endpoint,
              method: method,
              resourceType: resourceType,
              timestamp: Date.now()
            } 
          }));
        }
      }

      return responseData;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error("Le serveur ne répond pas. Vérifiez votre connexion.");
      }
      
      throw error;
    }
  };

  try {
    // Utiliser le cache mémoire pour les endpoints rapides
    const shouldUseMemoryCache = method === 'GET' && !NO_CACHE_ENDPOINTS.some(pattern => endpoint.includes(pattern));
    
    if (shouldUseMemoryCache) {
      const cached = apiCache.get(endpoint);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 [Memory Cache hit] ${endpoint}`);
        return cached.data;
      }
    }

    return await ErrorHandler.retry(executeRequest, 3);
    
  } catch (err) {
    console.error(`❌ Erreur API ${method} ${endpoint}:`, err.message);
    throw err;
  }
}

export function clearApiCache() {
  apiCache.clear();
  console.log('🗑️ Cache mémoire vidé');
  
  // Nettoyer aussi IndexedDB
  if (db.isReady) {
    db.clear('api_cache').then(() => {
      console.log('🗑️ Cache IndexedDB vidé');
    }).catch(err => {
      console.warn('⚠️ Erreur nettoyage IndexedDB:', err);
    });
  }
}

export async function retryQueuedRequests() {
  await ErrorHandler.processRetryQueue();
}
