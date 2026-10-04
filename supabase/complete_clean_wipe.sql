-- ==============================================================================
-- ZEBALPHA — COMPLETE FRESH REBOOT / CLEAN WIPE SCRIPT
-- Safely truncates all test data across Customer, Seller, and Order systems.
-- Wipes all test accounts from auth.users, profiles, sellers, and customers.
-- Preserves system tables: store_settings, categories, and pincode_zones.
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    tables_to_truncate text[] := ARRAY[
        -- Orders, Shipping, Payments & Returns
        'order_returns',
        'seller_claims',
        'shipping_events',
        'shipment_tracking',
        'shipments',
        'address_change_history',
        'order_status_history',
        'settlement_orders',
        'settlement_receipts',
        'seller_settlements',
        'seller_payment_history',
        'payment_audit_logs',
        'payments',
        'order_items',
        'seller_orders',
        'orders',
        
        -- Customer interactions, Carts, Addresses
        'cart_items',
        'cart',
        'wishlist',
        'user_addresses',
        'card_applications',
        'notify_requests',
        'reviews',
        'notifications',
        'seller_notifications',
        'seller_reports',
        
        -- Products & Stock History
        'inventory',
        'stock_history',
        'products',
        
        -- Sellers & Merchant Data
        'seller_support_tickets',
        'seller_pickup_locations',
        'merchant_verification_logs',
        'sellers',
        
        -- Customer & Profile Accounts
        'customers',
        'profiles'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_truncate
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. Cleanly wipe all test users and credentials from Supabase Auth
DELETE FROM auth.users;

-- Completed successfully message
DO $$
BEGIN
    RAISE NOTICE 'ZEBALPHA database wiped fresh successfully!';
END $$;
