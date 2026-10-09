import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/Full Folder 77/zebalpha-backend/back.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qjpahzstldiatfbutvfc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TABLES_IN_PURGE_ORDER = [
  'payout_queue',
  'payout_events',
  'payout_reconciliation_events',
  'webhook_events',
  'payment_audit_logs',
  'admin_audit_logs',
  'edd_audit_logs',
  'merchant_verification_logs',
  'seller_bank_audit_logs',
  'shipping_events',
  'shipment_tracking',
  'address_change_history',
  'order_status_history',
  'order_returns',
  'seller_claims',
  'settlement_receipts',
  'settlement_orders',
  'seller_settlements',
  'seller_payment_history',
  'order_financial_snapshot',
  'seller_financial_ledger',
  'seller_payout_requests',
  'seller_settlement_methods',
  'seller_bank_accounts',
  'shipments',
  'order_items',
  'seller_orders',
  'payments',
  'orders',
  'cart_items',
  'cart',
  'wishlists',
  'wishlist',
  'user_addresses',
  'card_applications',
  'notify_requests',
  'reviews',
  'notifications',
  'seller_notifications',
  'seller_reports',
  'seller_support_tickets',
  'seller_pickup_locations',
  'inventory',
  'stock_history',
  'products',
  'sellers',
  'customers'
];

async function runInventoryAudit() {
  console.log("\n=======================================================");
  console.log("ZEBALPHA PRE-CLEANUP DATABASE INVENTORY AUDIT");
  console.log("=======================================================\n");

  const counts = {};
  for (const table of TABLES_IN_PURGE_ORDER) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        counts[table] = `Error: ${error.message}`;
      } else {
        counts[table] = count ?? 0;
      }
    } catch (err) {
      counts[table] = `Exception: ${err.message}`;
    }
  }

  // Check profiles count (all vs non-admin)
  const { count: totalProfiles } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: adminProfiles } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['superadmin', 'admin']);
  counts['profiles (total)'] = totalProfiles ?? 0;
  counts['profiles (admin protected)'] = adminProfiles ?? 0;
  counts['profiles (to delete)'] = (totalProfiles ?? 0) - (adminProfiles ?? 0);

  // Check preserved system tables
  const { count: storeSettingsCount } = await supabase.from('store_settings').select('*', { count: 'exact', head: true }).catch(() => ({ count: 'N/A' }));
  const { count: categoriesCount } = await supabase.from('categories').select('*', { count: 'exact', head: true }).catch(() => ({ count: 'N/A' }));
  counts['[PRESERVED] store_settings'] = storeSettingsCount ?? 0;
  counts['[PRESERVED] categories'] = categoriesCount ?? 0;

  console.table(counts);
  return counts;
}

export { runInventoryAudit, TABLES_IN_PURGE_ORDER, supabase };
