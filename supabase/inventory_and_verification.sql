-- ==============================================================================
-- ZEBALPHA — PRE / POST CLEANUP AUDIT & INVENTORY QUERY
-- ==============================================================================

SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname ASC;

-- Exact verification counts for core business tables:
SELECT 
    (SELECT COUNT(*) FROM public.orders) AS orders_count,
    (SELECT COUNT(*) FROM public.seller_orders) AS seller_orders_count,
    (SELECT COUNT(*) FROM public.order_items) AS order_items_count,
    (SELECT COUNT(*) FROM public.payments) AS payments_count,
    (SELECT COUNT(*) FROM public.products) AS products_count,
    (SELECT COUNT(*) FROM public.inventory) AS inventory_count,
    (SELECT COUNT(*) FROM public.sellers) AS sellers_count,
    (SELECT COUNT(*) FROM public.customers) AS customers_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role NOT IN ('superadmin', 'admin')) AS test_profiles_count,
    (SELECT COUNT(*) FROM public.seller_financial_ledger) AS ledger_entries_count,
    (SELECT COUNT(*) FROM public.seller_payout_requests) AS payout_requests_count,
    (SELECT COUNT(*) FROM public.payout_queue) AS payout_queue_count,
    (SELECT COUNT(*) FROM public.webhook_events) AS webhook_events_count;
