import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const defaultUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const defaultKey = 'sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR';

function getValidKey(key) {
  if (typeof key === 'string' && key.trim().length > 0 && key !== 'undefined' && key !== 'null' && key !== 'Enter value') {
    return key.trim();
  }
  return defaultKey;
}

function getValidUrl(url) {
  if (typeof url === 'string' && url.startsWith('http')) {
    return url.trim();
  }
  return defaultUrl;
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
