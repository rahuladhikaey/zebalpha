-- ==============================================================================
-- BULLETPROOF PRODUCTION RESET SCRIPT FOR ASALISWAD / ZEBALPHA
-- Safely truncates only existing tables and wipes all test auth users
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    tables_to_truncate text[] := ARRAY[
        'shipping_events',
        'shipments',
        'address_change_history',
        'seller_orders',
        'order_items',
        'payments',
        'orders',
        'seller_pickup_locations',
        'notifications',
        'reviews',
        'cart',
        'wishlist',
        'stock_history',
        'products',
        'sellers',
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

-- Cleanly wipe all test users from auth.users
DELETE FROM auth.users;
