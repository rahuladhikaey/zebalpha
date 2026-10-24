import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    console.error("[ZebAlpha Security] Missing required Supabase configuration (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }
}

export function createClient() {
  const isHttps = typeof window !== 'undefined' ? window.location.protocol === 'https:' : process.env.NODE_ENV === 'production';

  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: isHttps,
      },
    }
  )
}
