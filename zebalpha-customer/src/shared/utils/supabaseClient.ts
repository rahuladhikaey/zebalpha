"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co";
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

const isHttps = typeof window !== 'undefined' ? window.location.protocol === 'https:' : process.env.NODE_ENV === 'production';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    path: '/',
    sameSite: 'lax',
    secure: isHttps,
  },
});
export const supabaseA = supabase;
export const supabaseB = supabase;
export const supabaseStorage = supabase;
