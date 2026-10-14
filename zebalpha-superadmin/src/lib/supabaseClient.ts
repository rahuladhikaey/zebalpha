"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qjpahzstldiatfbutvfc.supabase.co";
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

// Public browser Supabase client (Uses anon key only, subject to RLS)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Storage API attachment using public browser client
export const supabaseStorage = supabase;
