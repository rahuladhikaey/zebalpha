-- ==============================================================================
-- ZEBALPHA — CLEAN PURGE OF ALL PRODUCTS, SHIPMENTS & ORDERS
-- Preserves Sellers, Admin Users, Customers, and Auth Credentials
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
        'cart',
        'wishlist',
        'stock_history',
        'reviews',
        'products'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_truncate
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl);
        END IF;
    END LOOP;
END $$;
