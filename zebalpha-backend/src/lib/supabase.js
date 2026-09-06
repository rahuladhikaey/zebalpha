import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const defaultUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI';

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
