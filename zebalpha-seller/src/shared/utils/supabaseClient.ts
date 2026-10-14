"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co";
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "").trim();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const supabaseA = supabase;
export const supabaseB = supabase;
export const supabaseStorage = supabase;
