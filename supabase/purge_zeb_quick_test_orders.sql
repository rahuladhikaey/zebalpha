-- ============================================================================
-- ZEBQUICK — PURGE ALL OLD TEST ORDERS BEFORE PRODUCTION LAUNCH
-- WARNING: Permanently deletes all existing ZebQuick orders, items & payout ledger rows.
-- Run once in Supabase SQL Editor when ready to go live cleanly.
-- ============================================================================

DELETE FROM zeb_quick.seller_payout_ledger;
DELETE FROM zeb_quick.order_items;
DELETE FROM zeb_quick.orders;
