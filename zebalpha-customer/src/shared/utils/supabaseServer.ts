import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function isValidJwt(token?: string): boolean {
  return Boolean(token && token.split(".").length === 3);
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_A_SERVICE_ROLE_KEY || "").trim();

let _serverClient: any = null;
function getSupabaseServerInstance() {
  if (!_serverClient) {
    if (!supabaseServiceKey) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("[Security Alert] SUPABASE_SERVICE_ROLE_KEY is required for privileged server operations but is not configured.");
      }
      console.warn("[Security Alert] SUPABASE_SERVICE_ROLE_KEY is missing. Insecure fallback prevented.");
      _serverClient = createClient(supabaseUrl, "unconfigured_service_role_key");
    } else {
      _serverClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  }
  return _serverClient;
}

// Service role client to bypass RLS in secure server-side logic
export const supabaseServer = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseServerInstance();
    const val = client[prop];
    return typeof val === "function" ? val.bind(client) : val;
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
