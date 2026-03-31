/**
 * 🛰️ CONFIGURATION SUPABASE FRONTEND (Realtime)
 */

// On récupère l'instance Supabase chargée via le CDN dans index.html
const { createClient } = window.supabase;

const supabaseUrl = "https://tagqwwfbpfzluahboczh.supabase.co";
// Utilise ta clé anon/public ici pour le frontend
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3F3d2ZicGZ6bHVhaGJvY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgwNjEwNiwiZXhwIjoyMDkwMzgyMTA2fQ.SKaZYQ_QS3lxPpU8y_kbs3DG2m3dqLAUlt8XWFnugzo"; 

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
