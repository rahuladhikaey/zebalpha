"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Mm3pqD7ev-c76TXhkL0ajQ_ZHq325WW";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const supabaseA = supabase;
export const supabaseB = supabase;
export const supabaseStorage = supabase;
