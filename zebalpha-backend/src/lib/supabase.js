import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

// Supabase Instance A: Customer Storefront, Super Admin, Products, Categories, Orders, Payments, Reviews
export const supabaseA = createClient(
  config.supabaseA.url,
  config.supabaseA.serviceKey || config.supabaseA.anonKey
);

// Supabase Instance B: Seller Auth, Seller Profile, Inventory, Pickup Locations, Reports, Notifications, Audit Logs
export const supabaseB = createClient(
  config.supabaseB.url,
  config.supabaseB.serviceKey || config.supabaseB.anonKey
);

// Legacy export fallback
export const supabase = supabaseA;
