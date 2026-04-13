// js/core/realtime.js
// ============================================================
// TEMPS RÉEL GLOBAL — Supabase postgres_changes sur toutes tables
// ============================================================

const REALTIME_CONFIG = {
    url: 'https://tagqwwfbpfzluahboczh.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3F3d2ZicGZ6bHVhaGJvY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDYxMDYsImV4cCI6MjA5MDM4MjEwNn0.I0HqBYPTrxPOg41sEWm_hU7YY3f9ZXCekUX5NlgIBWw'
};

// ── État interne ──────────────────────────────────────────────
let supabaseClient = null;

// Canaux actifs
let messagesChannel  = null;  // filtré par patient_id courant
let globalChannel    = null;  // visites + planning + notifications + abonnements + commandes

// Callbacks enregistrés par type d'événement
const callbacks = {
    messages:      [],   // (row) => void
    visites:       [],   // (event, row) => void
    planning:      [],   // (event, row) => void
    notifications: [],   // (row) => void
    abonnements:   [],   // (event, row) => void
    commandes:     [],   // (event, row) => void
};

// ── Init client Supabase ─────────────────────────────────────
function initClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase) {
        console.error('❌ [Realtime] window.supabase introuvable — CDN pas encore chargé');
        return null;
    }
    supabaseClient = window.supabase.createClient(REALTIME_CONFIG.url, REALTIME_CONFIG.key, {
        realtime: { params: { eventsPerSecond: 10 } }
    });
    console.log('✅ [Realtime] Client Supabase initialisé');
    return supabaseClient;
}

// ── Dispatcher interne ───────────────────────────────────────
function dispatch(type, event, row) {
    const list = callbacks[type] || [];
    list.forEach(cb => {
        try { cb(event, row); } catch (e) { console.error(`❌ [Realtime] callback ${type}:`, e); }
    });
}

// ── Canal GLOBAL (toutes tables sauf messages) ───────────────
function initGlobalChannel() {
    const client = initClient();
    if (!client) return;
    if (globalChannel) return; // déjà actif

    console.log('📡 [Realtime] Ouverture canal global...');

    globalChannel = client
        .channel('sps-global')

        // ── VISITES ──────────────────────────────────────────
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visites' }, ({ eventType, new: row, old }) => {
            console.log(`🔄 [Realtime] visites ${eventType}`, row);
            dispatch('visites', eventType, row || old);
            window.dispatchEvent(new CustomEvent('rt:visites', { detail: { eventType, row: row || old } }));
        })

        // ── PLANNING ─────────────────────────────────────────
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planning' }, ({ eventType, new: row, old }) => {
            console.log(`🔄 [Realtime] planning ${eventType}`, row);
            dispatch('planning', eventType, row || old);
            window.dispatchEvent(new CustomEvent('rt:planning', { detail: { eventType, row: row || old } }));
        })

        // ── NOTIFICATIONS ────────────────────────────────────
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, ({ new: row }) => {
            const userId = localStorage.getItem('user_id');
            if (row.user_id !== userId) return; // ne concernait pas cet utilisateur
            console.log('🔔 [Realtime] notification reçue', row);
            dispatch('notifications', 'INSERT', row);
            window.dispatchEvent(new CustomEvent('rt:notification', { detail: { row } }));
        })

        // ── ABONNEMENTS ──────────────────────────────────────
        .on('postgres_changes', { event: '*', schema: 'public', table: 'abonnements' }, ({ eventType, new: row, old }) => {
            console.log(`🔄 [Realtime] abonnements ${eventType}`, row);
            dispatch('abonnements', eventType, row || old);
            window.dispatchEvent(new CustomEvent('rt:abonnements', { detail: { eventType, row: row || old } }));
        })

        // ── COMMANDES ────────────────────────────────────────
        .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, ({ eventType, new: row, old }) => {
            console.log(`🔄 [Realtime] commandes ${eventType}`, row);
            dispatch('commandes', eventType, row || old);
            window.dispatchEvent(new CustomEvent('rt:commandes', { detail: { eventType, row: row || old } }));
        })

        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ [Realtime] Canal global actif');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ [Realtime] Erreur canal global:', err);
                // Tentative de reconnexion après 5 s
                setTimeout(() => {
                    globalChannel = null;
                    initGlobalChannel();
                }, 5000);
            } else {
                console.log(`📡 [Realtime] Canal global: ${status}`);
            }
        });
}

// ── Canal MESSAGES (filtré par patient) ─────────────────────
function subscribeToMessages(patientId, callback) {
    // Retirer l'ancien abonnement messages si le patient change
    if (messagesChannel) {
        messagesChannel.unsubscribe();
        messagesChannel = null;
    }

    if (!patientId) return;

    const client = initClient();
    if (!client) return;

    // Enregistrer le callback
    callbacks.messages = [callback]; // un seul listener actif à la fois

    console.log(`📡 [Realtime] Abonnement messages patient: ${patientId}`);

    messagesChannel = client
        .channel(`messages-${patientId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${patientId}` },
            ({ new: row }) => {
                console.log('💬 [Realtime] Nouveau message:', row);
                callbacks.messages.forEach(cb => {
                    try { cb('INSERT', row); } catch (e) { console.error(e); }
                });
            }
        )
        .subscribe(status => console.log(`📡 [Realtime] messages: ${status}`));
}

function unsubscribeFromMessages() {
    if (messagesChannel) {
        messagesChannel.unsubscribe();
        messagesChannel = null;
    }
    callbacks.messages = [];
}

// ── API publique : écouter un type d'événement ───────────────
// Usage : Realtime.on('visites', (eventType, row) => { ... })
function on(type, callback) {
    if (!callbacks[type]) {
        console.warn(`⚠️ [Realtime] type inconnu: ${type}`);
        return;
    }
    callbacks[type].push(callback);
}

function off(type, callback) {
    if (!callbacks[type]) return;
    callbacks[type] = callbacks[type].filter(cb => cb !== callback);
}

// ── Récupération infos expéditeur ────────────────────────────
async function fetchSenderInfo(senderId) {
    const client = initClient();
    if (!client) return { nom: 'Utilisateur', role: 'COORDINATEUR', photo_url: null };
    try {
        const { data, error } = await client
            .from('profiles')
            .select('nom, role, photo_url')
            .eq('id', senderId)
            .single();
        if (error) throw error;
        return { nom: data.nom || 'Utilisateur', role: data.role || 'COORDINATEUR', photo_url: data.photo_url || null };
    } catch {
        return { nom: 'Utilisateur', role: 'COORDINATEUR', photo_url: null };
    }
}

// ── Démarrage ────────────────────────────────────────────────
function start() {
    initClient();
    initGlobalChannel();
    console.log('✅ [Realtime] Démarré — canaux actifs: global + prêt pour messages');
}

// ── Exposer globalement ──────────────────────────────────────
window.Realtime = {
    start,
    on,
    off,
    subscribe: subscribeToMessages,       // compat ancienne API
    unsubscribe: unsubscribeFromMessages,
    fetchSenderInfo,
    isActive: () => globalChannel !== null,
    // Compat ancienne API visites/commandes
    subscribeToVisites: (cb) => on('visites', (_, row) => cb(row)),
    subscribeToCommandes: (cb) => on('commandes', (_, row) => cb(row)),
    initVisitesChannel: initGlobalChannel,
    initClient,
};

console.log('✅ [Realtime] Module chargé');
