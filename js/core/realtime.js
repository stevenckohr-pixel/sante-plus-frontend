// js/core/realtime.js
// Module de gestion des connexions temps réel avec Supabase
// Version compatible sans import/export

// Configuration Supabase
const REALTIME_CONFIG = {
    url: 'https://tagqwwfbpfzluahboczh.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3F3d2ZicGZ6bHVhaGJvY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDYxMDYsImV4cCI6MjA5MDM4MjEwNn0.I0HqBYPTrxPOg41sEWm_hU7YY3f9ZXCekUX5NlgIBWw'
};

let supabaseClient = null;
let activeSubscription = null;
let currentPatientId = null;
let onMessageCallback = null;

// Initialiser le client Supabase (utilise le CDN déjà chargé dans index.html)
function initSupabaseClient() {
    if (!supabaseClient && window.supabase) {
        const { createClient } = window.supabase;
        supabaseClient = createClient(REALTIME_CONFIG.url, REALTIME_CONFIG.key, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        console.log("✅ [Realtime] Client Supabase initialisé");
    }
    return supabaseClient;
}

// S'abonner aux nouveaux messages
function subscribeToMessages(patientId, callback) {
    unsubscribeFromMessages();
    
    if (!patientId) {
        console.warn("⚠️ [Realtime] Pas de patientId, abonnement ignoré");
        return;
    }
    
    currentPatientId = patientId;
    onMessageCallback = callback;
    
    const client = initSupabaseClient();
    if (!client) {
        console.error("❌ [Realtime] Impossible d'initialiser le client");
        return;
    }
    
    console.log(`📡 [Realtime] Abonnement aux messages du patient: ${patientId}`);
    
    activeSubscription = client
        .channel(`messages-${patientId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `patient_id=eq.${patientId}`
            },
            (payload) => {
                console.log("🔄 [Realtime] Nouveau message reçu:", payload.new);
                if (onMessageCallback) {
                    onMessageCallback(payload.new);
                }
            }
        )
        .subscribe((status) => {
            console.log(`📡 [Realtime] Statut: ${status}`);
        });
}

// Se désabonner
function unsubscribeFromMessages() {
    if (activeSubscription) {
        activeSubscription.unsubscribe();
        activeSubscription = null;
        console.log("🔌 [Realtime] Désabonné");
    }
    currentPatientId = null;
    onMessageCallback = null;
}

// Récupérer les infos d'un expéditeur
async function fetchSenderInfoRealtime(senderId) {
    const client = initSupabaseClient();
    if (!client) return { nom: "Utilisateur", role: "COORDINATEUR", photo_url: null };
    
    try {
        const { data, error } = await client
            .from('profiles')
            .select('nom, role, photo_url')
            .eq('id', senderId)
            .single();
            
        if (error) throw error;
        return { 
            nom: data.nom || 'Utilisateur', 
            role: data.role || 'COORDINATEUR', 
            photo_url: data.photo_url || null 
        };
    } catch (err) {
        console.error("❌ [Realtime] Erreur récupération expéditeur:", err);
        return { nom: "Utilisateur", role: "COORDINATEUR", photo_url: null };
    }
}

// Vérifier si Realtime est actif
function isRealtimeActive() {
    return activeSubscription !== null;
}

// Exposer les fonctions globalement
window.Realtime = {
    initClient: initSupabaseClient,
    subscribe: subscribeToMessages,
    unsubscribe: unsubscribeFromMessages,
    fetchSenderInfo: fetchSenderInfoRealtime,
    isActive: isRealtimeActive
};
