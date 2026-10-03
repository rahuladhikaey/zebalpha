import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL || "https://qjpahzstldiatfbutvfc.supabase.co";
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_A_SERVICE_ROLE_KEY || "").trim();

if (!serviceKey && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY is required in production environment.");
}

export const supabaseServer = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

