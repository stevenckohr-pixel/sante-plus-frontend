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

  // Fonction pour exécuter la requête
  const executeRequest = async () => {
    // Timeout de 15 secondes
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

      // Cas spécial : serveur qui se réveille (Render gratuit)
      if (response.status === 503) {
        Swal.fire({
            title: "Réveil du serveur...",
            text: "Le service gratuit Render se réactive (cela peut prendre 30 secondes).",
            icon: "info",
            showConfirmButton: false,
            timer: 5000
        });
        throw new Error("Serveur en cours de démarrage");
      }

      // Session expirée
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        window.location.reload();
        throw new Error("Session expirée");
      }

      // Autres erreurs
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

      // Pour les requêtes GET, mettre en cache
      if (method === 'GET') {
        const data = await response.json();
        apiCache.set(endpoint, {
          data: data,
          timestamp: Date.now()
        });
        return data;
      }

      // Pour POST, PUT, DELETE
      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error("Le serveur ne répond pas. Vérifiez votre connexion.");
        timeoutError.status = 408;
        throw timeoutError;
      }
      
      throw error;
    }
  };

  try {
    // Vérifier le cache pour les requêtes GET
    if (method === 'GET') {
      const cached = apiCache.get(endpoint);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 Cache hit: ${endpoint}`);
        return cached.data;
      }
    }

    // Si pas de connexion, mettre en file d'attente pour les requêtes non-GET
    if (!ErrorHandler.isOnline() && method !== 'GET') {
      console.log(`📦 Hors ligne - Mise en file d'attente: ${method} ${endpoint}`);
      ErrorHandler.queueRequest({
        url: `${CONFIG.API_URL}${endpoint}`,
        method: method,
        body: options.body
      });
      return { queued: true, message: "Action mise en attente (hors ligne)" };
    }

    // Exécuter avec système de retry
    return await ErrorHandler.retry(executeRequest, 3);
    
  } catch (err) {
    console.error(`❌ Erreur API ${method} ${endpoint}:`, err.message);
    
    // Ne pas afficher d'erreur pour les requêtes mises en file d'attente
    if (err.message?.includes('hors ligne')) {
      return { queued: true };
    }
    
    // Laisser ErrorHandler gérer l'affichage
    throw err;
  }
}

// Fonction pour vider le cache
export function clearApiCache() {
  apiCache.clear();
  console.log('🗑️ Cache API vidé');
}

// Fonction pour réessayer les requêtes en file d'attente
export async function retryQueuedRequests() {
  await ErrorHandler.processRetryQueue();
}
