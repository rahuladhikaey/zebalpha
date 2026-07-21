"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.com";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Use the same client for storage — supabase already includes the storage API
export const supabaseStorage = supabase;