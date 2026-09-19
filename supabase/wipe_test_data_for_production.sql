-- ==============================================================================
-- CLEAN PRODUCTION RESET SCRIPT FOR ASALISWAD / ZEBALPHA
-- Wipes all test users, test sellers, test orders, and test shipments
-- ==============================================================================

-- Step 1: Wipe all transactional, shipping & audit tables
TRUNCATE TABLE public.shipping_events CASCADE;
TRUNCATE TABLE public.shipments CASCADE;
TRUNCATE TABLE public.address_change_history CASCADE;
TRUNCATE TABLE public.seller_orders CASCADE;
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.seller_pickup_locations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.reviews CASCADE;
TRUNCATE TABLE public.cart CASCADE;
TRUNCATE TABLE public.wishlist CASCADE;
TRUNCATE TABLE public.stock_history CASCADE;

-- Step 2: Wipe sellers and products (if you want a clean product catalog)
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.sellers CASCADE;

-- Step 3: Wipe any customer/profile tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        TRUNCATE TABLE public.customers CASCADE;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        TRUNCATE TABLE public.profiles CASCADE;
    END IF;
END $$;

-- Step 4: Now delete all auth users cleanly without foreign key constraints blocking
DELETE FROM auth.users;

-- Done! Your database is now 100% clean and ready for fresh production users & sellers.
