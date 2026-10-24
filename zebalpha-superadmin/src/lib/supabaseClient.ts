"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_A_URL ?? "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    console.error("[ZebAlpha Security] Missing required Supabase client configuration.");
  }
}

// Public browser Supabase client (Uses anon key only, subject to RLS)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Storage API attachment using public browser client
export const supabaseStorage = supabase;
