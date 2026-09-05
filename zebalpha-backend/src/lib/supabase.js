import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const fallbackUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const fallbackKey = config.supabaseA.serviceKey || config.supabaseA.anonKey || config.supabaseB.serviceKey || config.supabaseB.anonKey || 'sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR';

// Supabase Instance A: Customer Storefront, Super Admin, Products, Categories, Orders, Payments, Reviews
export const supabaseA = createClient(
  config.supabaseA.url || fallbackUrl,
  config.supabaseA.serviceKey || config.supabaseA.anonKey || fallbackKey
);

// Supabase Instance B: Seller Auth, Seller Profile, Inventory, Pickup Locations, Reports, Notifications, Audit Logs
export const supabaseB = createClient(
  config.supabaseB.url || config.supabaseA.url || fallbackUrl,
  config.supabaseB.serviceKey || config.supabaseB.anonKey || fallbackKey
);

// Legacy export fallback
export const supabase = supabaseA;
