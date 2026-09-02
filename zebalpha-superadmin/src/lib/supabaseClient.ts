"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://bprkenwmheakcqryjupi.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : supabase;

// Use the same client for storage — supabase already includes the storage API
export const supabaseStorage = supabase;
