import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const VERIFIED_URL = "https://qjpahzstldiatfbutvfc.supabase.co";
const VERIFIED_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI";
const VERIFIED_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs";

function isValidJwt(key?: string): boolean {
  return typeof key === "string" && key.startsWith("eyJ") && key.split(".").length === 3 && !key.startsWith("sb_");
}

const supabaseUrl = VERIFIED_URL;
const supabaseAnonKey = isValidJwt(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : VERIFIED_ANON_KEY;
const supabaseServiceKey = isValidJwt(process.env.SUPABASE_SERVICE_ROLE_KEY) ? process.env.SUPABASE_SERVICE_ROLE_KEY! : VERIFIED_SERVICE_KEY;

// Service role client to bypass RLS in secure server-side logic
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
export const supabaseServerA = supabaseServer;
export const supabaseServerB = supabaseServer;

// Cookie-based client for standard user request contexts
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Can be ignored if handled by middleware session refresh
          }
        },
      },
    }
  );
}
