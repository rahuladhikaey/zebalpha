"use client";

import { createBrowserClient } from "@supabase/ssr";

// Unified Production DB Instance (Single Data Source for SuperAdmin, Customer, and Seller apps)
const unifiedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_A_URL ?? "https://qjpahzstldiatfbutvfc.supabase.co";
const unifiedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI";

export const supabaseA = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabaseB = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabase = supabaseB;
export const supabaseStorage = supabaseA;
