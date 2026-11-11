import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_A_URL || 
    "https://qjpahzstldiatfbutvfc.supabase.co"
  ).trim();

  // Prefer service role key for full DB access; fallback to public anon key for read-only server queries
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_A_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || 
    ""
  ).trim();

  if (!supabaseUrl || !serviceKey) {
    // If during build phase or completely unconfigured, return placeholder
    if (process.env.NEXT_PHASE === "phase-production-build" || !serviceKey) {
      return createClient(supabaseUrl || "https://placeholder.supabase.co", "dummy-service-role-key-for-build", {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    throw new Error("CRITICAL SECURITY ERROR: Missing required Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }

  _client = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseServer();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});


