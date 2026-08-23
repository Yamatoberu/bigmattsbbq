import "server-only";
// Server-only singleton. Import only from API routes and Server Components.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database-sca.types";

let _scaClient: SupabaseClient<Database, "sca"> | undefined;

export function getScaSupabaseClient(): SupabaseClient<Database, "sca"> {
  if (_scaClient) return _scaClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  _scaClient = createClient<Database, "sca">(url, key, {
    db: {
      schema: "sca"
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return _scaClient;
}
