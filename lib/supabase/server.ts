import { createClient, SupabaseClient } from '@supabase/supabase-js';

type ClientRole = 'anon' | 'service';

function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function makeClient(role: ClientRole): SupabaseClient {
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key =
    role === 'service' ? requiredEnv('SUPABASE_SERVICE_ROLE_KEY') : requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function getSupabaseServiceRole(): SupabaseClient {
  return makeClient('service');
}

export function getSupabaseAnon(): SupabaseClient {
  return makeClient('anon');
}
