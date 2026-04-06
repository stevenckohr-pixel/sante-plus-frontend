import { CONFIG } from "./config.js";
import ErrorHandler from './errorHandler.js';

const isCapacitor = typeof window !== 'undefined' && window.hasOwnProperty('Capacitor');

const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

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
        apiCache.set(endpoint, {
          data: responseData,
          timestamp: Date.now()
        });
      } else {
        responseData = await response.json();
      }

      // Vider le cache pour les méthodes non-GET (sans rechargement)
      if (method !== 'GET') {
        apiCache.delete(endpoint);
        console.log(`🗑️ Cache invalidé pour: ${endpoint}`);
        
        localStorage.removeItem(`cache_/commandes`);
        localStorage.removeItem(`cache_/visites`);
        localStorage.removeItem(`cache_/patients`);
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
    if (method === 'GET') {
      const cached = apiCache.get(endpoint);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 Cache hit: ${endpoint}`);
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
  console.log('🗑️ Cache API vidé');
}

export async function retryQueuedRequests() {
  await ErrorHandler.processRetryQueue();
}
