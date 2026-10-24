import { supabaseA } from '../lib/supabase.js';

export const masterDb = supabaseA;
export const customerDb = supabaseA;

export async function syncProductToCustomerDb(product, action = 'upsert') {
  // Single Database Architecture: All operations write directly to single configured database.
  return;
}

export async function syncCategoryToCustomerDb(category, action = 'upsert') {
  // Single Database Architecture: All operations write directly to single configured database.
  return;
}
