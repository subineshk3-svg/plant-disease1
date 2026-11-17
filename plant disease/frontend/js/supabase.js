/**
 * AgriScan AI - Client-side Supabase Integration
 * Handles Supabase JS client initialization, realtime subscriptions,
 * and direct file storage capabilities with graceful offline fallback.
 */

const SupabaseState = {
  client: null,
  enabled: false,
  url: '',
  bucket: 'plant-images',
  realtimeSubscriptions: []
};

async function initSupabaseClient() {
  try {
    const res = await fetch('/api/supabase/config');
    if (!res.ok) return;

    const cfg = await res.json();
    if (cfg.enabled && cfg.url && cfg.anon_key && window.supabase) {
      SupabaseState.client = window.supabase.createClient(cfg.url, cfg.anon_key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      SupabaseState.enabled = true;
      SupabaseState.url = cfg.url;
      SupabaseState.bucket = cfg.bucket || 'plant-images';
      console.log('[AgriScan] Supabase Client Initialized with Realtime & Storage.');
      
      // Initialize realtime listeners
      setupRealtimeListeners();
    }
  } catch (err) {
    console.warn('[AgriScan] Supabase client init warning (running in offline mode):', err);
    SupabaseState.enabled = false;
  }
}

function getSupabaseClient() {
  return SupabaseState.client;
}

function isSupabaseAvailable() {
  return !!(SupabaseState.enabled && SupabaseState.client);
}

// ---------------- REALTIME EVENT SUBSCRIPTIONS ----------------

function setupRealtimeListeners() {
  if (!isSupabaseAvailable()) return;

  try {
    const client = getSupabaseClient();
    
    // Listen to diagnoses updates for live history sync
    const diagChannel = client
      .channel('public:diagnoses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'diagnoses' }, (payload) => {
        // If user is currently viewing history, refresh data seamlessly
        if (AppState.currentPage === 'history' && typeof loadHistoryData === 'function') {
          loadHistoryData();
        }
      })
      .subscribe();

    SupabaseState.realtimeSubscriptions.push(diagChannel);
  } catch (e) {
    console.warn('[AgriScan Realtime] Could not subscribe:', e);
  }
}

/**
 * Realtime subscription for active chat conversation
 */
function subscribeToRealtimeChat(diagnosisId, onMessageCallback) {
  if (!isSupabaseAvailable()) return null;

  try {
    const client = getSupabaseClient();
    const channelName = `chat-room-${diagnosisId || 'global'}`;
    
    const channel = client
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: diagnosisId ? `diagnosis_id=eq.${diagnosisId}` : undefined
      }, (payload) => {
        if (typeof onMessageCallback === 'function' && payload.new) {
          onMessageCallback(payload.new);
        }
      })
      .subscribe();

    return channel;
  } catch (e) {
    console.warn('[AgriScan Realtime Chat] Subscription error:', e);
    return null;
  }
}
window.subscribeToRealtimeChat = subscribeToRealtimeChat;
window.isSupabaseAvailable = isSupabaseAvailable;
window.getSupabaseClient = getSupabaseClient;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initSupabaseClient();
});
