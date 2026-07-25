-- ====================================================================
-- FIX TABLE PERMISSIONS (GRANTS) & ROW LEVEL SECURITY (RLS) POLICIES
-- Run this script in your Supabase SQL Editor to solve:
-- 1. "permission denied for table sellers"
-- 2. "No sellers found matching the selected filters" in Super Admin dashboard
-- ====================================================================

-- 1. GRANT SCHEMA & TABLE PERMISSIONS TO ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sellers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;

-- Ensure default privileges apply to future tables created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. ENABLE ROW LEVEL SECURITY ON ALL APPLICABLE TABLES
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 3. CLEAN UP EXISTING SELLERS POLICIES TO PREVENT DUPLICATES/CONFLICTS
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sellers') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sellers', r.policyname);
    END LOOP;
END $$;

-- 4. CREATE POLICIES FOR `sellers` TABLE
-- Allow public, anon & authenticated users (Sellers, Admins, Registration) full access to sellers table
CREATE POLICY "Public Full Access Sellers" ON public.sellers 
    FOR ALL TO public USING (true) WITH CHECK (true);

-- Allow service_role full access
CREATE POLICY "Service Role Full Access Sellers" ON public.sellers 
    FOR ALL TO service_role USING (true);

-- 5. CLEAN UP & UPDATE PRODUCTS POLICIES
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "Public Read Products" ON public.products 
    FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated Manage Products" ON public.products 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access Products" ON public.products 
    FOR ALL TO service_role USING (true);

-- 6. CLEAN UP & UPDATE ORDERS POLICIES
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "Public Insert Orders" ON public.orders 
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Authenticated Manage Orders" ON public.orders 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access Orders" ON public.orders 
    FOR ALL TO service_role USING (true);

-- 7. SELLER AUXILIARY TABLES POLICIES
DROP POLICY IF EXISTS "Authenticated Manage Pickup Locations" ON public.seller_pickup_locations;
CREATE POLICY "Authenticated Manage Pickup Locations" ON public.seller_pickup_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated Manage Support Tickets" ON public.seller_support_tickets;
CREATE POLICY "Authenticated Manage Support Tickets" ON public.seller_support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated Manage Settlements" ON public.seller_settlements;
CREATE POLICY "Authenticated Manage Settlements" ON public.seller_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
