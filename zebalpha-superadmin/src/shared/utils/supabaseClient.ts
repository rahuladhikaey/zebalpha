"use client";

import { createBrowserClient } from "@supabase/ssr";

// Unified Production DB Instance (Single Data Source for SuperAdmin, Customer, and Seller apps)
const unifiedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_A_URL ?? "https://bprkenwmheakcqryjupi.supabase.co";
const unifiedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";

export const supabaseA = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabaseB = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabase = supabaseB;
export const supabaseStorage = supabaseA;
