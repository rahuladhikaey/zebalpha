import { createClient } from "@supabase/supabase-js";

const VERIFIED_URL = "https://qjpahzstldiatfbutvfc.supabase.co";
const VERIFIED_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs";

function getServiceKey(): string {
  const envKey = process.env.SUPABASE_A_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof envKey === "string" && envKey.startsWith("eyJ") && envKey.split(".").length === 3 && !envKey.startsWith("sb_")) {
    return envKey;
  }
  return VERIFIED_SERVICE_KEY;
}

export const supabaseServer = createClient(VERIFIED_URL, getServiceKey(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

