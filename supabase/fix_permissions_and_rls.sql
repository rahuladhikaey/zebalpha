-- ====================================================================
-- SAFE TWO-DATABASE PERMISSIONS & RLS POLICIES SCRIPT
-- Runs on BOTH Database A (Master) and Database B (Customer DB) with ZERO ERRORS!
-- Automatically checks table existence before creating policies.
-- ====================================================================

-- 1. GRANT USAGE & FULL ACCESS TO ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. DYNAMICALLY APPLY RLS & PUBLIC POLICIES FOR EXISTING TABLES ONLY
DO $$
BEGIN
    -- Products Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Products" ON public.products;
        CREATE POLICY "Public Full Access Products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Categories Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
        ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Categories" ON public.categories;
        CREATE POLICY "Public Full Access Categories" ON public.categories FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Store Settings Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'store_settings') THEN
        ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Store Settings" ON public.store_settings;
        CREATE POLICY "Public Full Access Store Settings" ON public.store_settings FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Orders Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Orders" ON public.orders;
        CREATE POLICY "Public Full Access Orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Sellers Table (Master DB)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sellers') THEN
        ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Sellers" ON public.sellers;
        CREATE POLICY "Public Full Access Sellers" ON public.sellers FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Seller Settlements Table (Master DB)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seller_settlements') THEN
        ALTER TABLE public.seller_settlements ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Settlements" ON public.seller_settlements;
        CREATE POLICY "Public Full Access Settlements" ON public.seller_settlements FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Card Applications Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'card_applications') THEN
        ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Card Applications" ON public.card_applications;
        CREATE POLICY "Public Full Access Card Applications" ON public.card_applications FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- User Addresses Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_addresses') THEN
        ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access User Addresses" ON public.user_addresses;
        CREATE POLICY "Public Full Access User Addresses" ON public.user_addresses FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Seller Orders Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seller_orders') THEN
        ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Seller Orders" ON public.seller_orders;
        CREATE POLICY "Public Full Access Seller Orders" ON public.seller_orders FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Order Items Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
        ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Order Items" ON public.order_items;
        CREATE POLICY "Public Full Access Order Items" ON public.order_items FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Payments Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Payments" ON public.payments;
        CREATE POLICY "Public Full Access Payments" ON public.payments FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Shipments Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shipments') THEN
        ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Shipments" ON public.shipments;
        CREATE POLICY "Public Full Access Shipments" ON public.shipments FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Stock History Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_history') THEN
        ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Stock History" ON public.stock_history;
        CREATE POLICY "Public Full Access Stock History" ON public.stock_history FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- Notifications Table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Full Access Notifications" ON public.notifications;
        CREATE POLICY "Public Full Access Notifications" ON public.notifications FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END $$;
