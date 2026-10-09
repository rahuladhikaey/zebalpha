-- ==============================================================================
-- ZEBALPHA — MASTER PRODUCTION DATA CLEANUP SCRIPT
-- ==============================================================================
-- OBJECTIVE:
-- Permanently remove all old/test/demo customer, seller, product, order,
-- shipment, return, settlement, payout, and ledger data for fresh launch.
--
-- PRESERVED ARCHITECTURE & DATA:
-- 1. All Tables, Foreign Keys, Indexes, Triggers, Constraints & RLS Policies
-- 2. Master System Configurations: store_settings, platform_finance_configs
-- 3. Core Catalog Hierarchy: categories, curated_collections, editorial_cards
-- 4. Administrative Accounts: admin_users & admin profiles/auth records
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    -- Explicitly ordered according to foreign-key dependencies
    tables_to_truncate text[] := ARRAY[
        -- 1. Background Queues, Webhooks & Logs
        'payout_queue',
        'payout_events',
        'payout_reconciliation_events',
        'webhook_events',
        'payment_audit_logs',
        'admin_audit_logs',
        'edd_audit_logs',
        'merchant_verification_logs',
        'seller_bank_audit_logs',

        -- 2. Logistics & Status History
        'shipping_events',
        'shipment_tracking',
        'address_change_history',
        'order_status_history',

        -- 3. Returns & Protection Claims
        'order_returns',
        'seller_claims',

        -- 4. Financial Ledger & Settlements
        'settlement_receipts',
        'settlement_orders',
        'seller_settlements',
        'seller_payment_history',
        'order_financial_snapshot',
        'seller_financial_ledger',
        'seller_payout_requests',
        'seller_settlement_methods',
        'seller_bank_accounts',

        -- 5. Shipments, Order Items & Orders
        'shipments',
        'order_items',
        'seller_orders',
        'payments',
        'orders',

        -- 6. Customer Interactions, Carts, Wishlists & Support
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

        -- 7. Products & Inventory
        'inventory',
        'stock_history',
        'products',

        -- 8. Customer & Seller Accounts
        'sellers',
        'customers'
    ];
BEGIN
    RAISE NOTICE 'Starting ZebAlpha Production Data Cleanup...';

    -- Disable triggers temporarily during batch purge if needed, or truncate with CASCADE
    FOREACH tbl IN ARRAY tables_to_truncate
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl);
            RAISE NOTICE 'Truncated: public.%', tbl;
        ELSE
            RAISE NOTICE 'Table not found, skipping: public.%', tbl;
        END IF;
    END LOOP;

    -- 9. Purge non-admin profiles while preserving SuperAdmin/Admin accounts
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DELETE FROM public.profiles
        WHERE role NOT IN ('superadmin', 'admin')
          AND email NOT ILIKE '%admin%';
        RAISE NOTICE 'Cleaned non-admin profiles.';
    END IF;

    -- 10. Purge non-admin users from auth.users
    DELETE FROM auth.users
    WHERE id NOT IN (
        SELECT id FROM public.profiles 
        WHERE role IN ('superadmin', 'admin') 
           OR email ILIKE '%admin%'
    )
    AND email NOT ILIKE '%admin%';
    RAISE NOTICE 'Cleaned non-admin auth.users.';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ZEBALPHA PRODUCTION DATA PURGE COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=======================================================';
END $$;
