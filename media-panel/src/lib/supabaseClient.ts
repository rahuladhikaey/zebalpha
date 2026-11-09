"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key-for-build").trim();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== "undefined") {
  console.warn("[MediaPanel] Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

