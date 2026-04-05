import { CONFIG } from "./config.js";
import ErrorHandler from './errorHandler.js';

// Cache pour les réponses GET
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  // ✅ Vider le cache pour cet endpoint si ce n'est pas un GET
  if (method !== 'GET') {
    apiCache.delete(endpoint);
    console.log(`🗑️ Cache invalidé pour: ${endpoint}`);
    
    // ✅ Invalider les caches localStorage
    localStorage.removeItem(`cache_/commandes`);
    localStorage.removeItem(`cache_/visites`);
    localStorage.removeItem(`cache_/patients`);
    
    // ✅ Déclencher un rafraîchissement automatique après 500ms
    setTimeout(() => {
      if (window.refreshCurrentView) {
        window.refreshCurrentView();
      }
    }, 500);
  }

  const executeRequest = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
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

      if (method === 'GET') {
        const data = await response.json();
        apiCache.set(endpoint, {
          data: data,
          timestamp: Date.now()
        });
        return data;
      }

      return await response.json();

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
