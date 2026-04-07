// js/core/realtime.js
// Module de gestion des connexions temps réel avec Supabase

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration Supabase (à mettre dans config.js plus tard)
const SUPABASE_URL = 'https://tagqwwfbpfzluahboczh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3F3d2ZicGZ6bHVhaGJvY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDYxMDYsImV4cCI6MjA5MDM4MjEwNn0.I0HqBYPTrxPOg41sEWm_hU7YY3f9ZXCekUX5NlgIBWw';

let supabaseClient = null;
let activeSubscription = null;
let currentPatientId = null;
let onMessageCallback = null;

/**
 * 🔌 Initialiser le client Supabase
 */
export function initSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
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

/**
 * 📡 S'abonner aux nouveaux messages d'un patient
 * @param {string} patientId - ID du patient
 * @param {Function} callback - Fonction appelée à chaque nouveau message
 */
export function subscribeToMessages(patientId, callback) {
    // Nettoyer l'ancienne souscription
    unsubscribeFromMessages();
    
    if (!patientId) {
        console.warn("⚠️ [Realtime] Pas de patientId, abonnement ignoré");
        return;
    }
    
    currentPatientId = patientId;
    onMessageCallback = callback;
    
    const client = initSupabaseClient();
    
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
            if (status === 'SUBSCRIBED') {
                console.log("✅ [Realtime] Connecté - en attente de nouveaux messages");
            }
        });
}

/**
 * 🧹 Se désabonner
 */
export function unsubscribeFromMessages() {
    if (activeSubscription) {
        activeSubscription.unsubscribe();
        activeSubscription = null;
        console.log("🔌 [Realtime] Désabonné");
    }
    currentPatientId = null;
    onMessageCallback = null;
}

/**
 * 👤 Récupérer les infos d'un expéditeur
 */
export async function fetchSenderInfo(senderId) {
    if (!supabaseClient) {
        initSupabaseClient();
    }
    
    try {
        const { data, error } = await supabaseClient
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

/**
 * Vérifier si Realtime est actif
 */
export function isRealtimeActive() {
    return activeSubscription !== null;
}
