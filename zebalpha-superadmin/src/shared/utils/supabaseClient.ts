"use client";

import { createBrowserClient } from "@supabase/ssr";

const unifiedUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_A_URL ?? "").trim();
const unifiedAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "").trim();

if (!unifiedUrl || !unifiedAnonKey) {
  if (typeof window !== "undefined") {
    console.error("[ZebAlpha Security] Missing required Supabase client configuration.");
  }
}

export const supabaseA = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabaseB = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabase = supabaseB;
export const supabaseStorage = supabaseA;
