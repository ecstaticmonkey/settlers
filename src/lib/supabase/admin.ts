import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MultiplayerError } from '../multiplayer/types';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;
let cachedUrl: string | null = null;


export function serverSecret() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('your-') || key.includes('placeholder')) {
    throw new MultiplayerError('Multiplayer is not configured. Add SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) to the server environment and redeploy.', 503);
  }
  return key;
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes('your-project') || url.includes('placeholder')) {
    throw new MultiplayerError('Multiplayer is not configured. Set NEXT_PUBLIC_SUPABASE_URL and redeploy.', 503);
  }
  const key = serverSecret();
  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }
  cachedUrl = url;
  cachedKey = key;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) }) },
  });
  return cachedClient;
}

