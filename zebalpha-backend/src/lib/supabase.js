import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

function getValidKey(key) {
  if (typeof key === 'string' && key.trim().length > 0 && key !== 'undefined' && key !== 'null' && key !== 'Enter value') {
    return key.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[Security Alert] Missing Supabase API Key in backend production environment.');
  }
  return '';
}

function getValidUrl(url) {
  if (typeof url === 'string' && url.startsWith('http')) {
    return url.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[Security Alert] Missing Supabase URL in backend production environment.');
  }
  return '';
}

const keyA = getValidKey(config.supabaseA?.serviceKey || config.supabaseA?.anonKey);
const urlA = getValidUrl(config.supabaseA?.url);

// Supabase Instance A: Customer Storefront, Super Admin, Products, Categories, Orders, Payments, Reviews
export const supabaseA = createClient(urlA, keyA);

const keyB = getValidKey(config.supabaseB?.serviceKey || config.supabaseB?.anonKey || keyA);
const urlB = getValidUrl(config.supabaseB?.url || urlA);

// Supabase Instance B: Seller Auth, Seller Profile, Inventory, Pickup Locations, Reports, Notifications, Audit Logs
export const supabaseB = createClient(urlB, keyB);

// Legacy export fallback
export const supabase = supabaseA;
