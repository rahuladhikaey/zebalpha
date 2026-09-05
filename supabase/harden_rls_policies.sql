-- ====================================================================
-- ZERO-TRUST ROW LEVEL SECURITY (RLS) HARDENING SCRIPT
-- Drops overly permissive wildcard policies and applies least-privilege RBAC.
-- ====================================================================

-- 1. DROP WILDCARD PERMISSIVE POLICIES FROM ALL TABLES
DO $$
DECLARE
    t text;
    pol record;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Drop any allow_all_policy_* created previously
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t AND policyname LIKE 'allow_all_policy_%'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, t);
        END LOOP;
    END LOOP;
END $$;

-- 2. SECURE ADMINISTRATIVE TABLES (Zero access to anon/authenticated, service_role only)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages admin_users" ON public.admin_users;
CREATE POLICY "Service role manages admin_users" ON public.admin_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Service role manages admin_audit_logs" ON public.admin_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages payment_audit_logs" ON public.payment_audit_logs;
CREATE POLICY "Service role manages payment_audit_logs" ON public.payment_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. STORE SETTINGS (Public read-only, service_role write)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Service role manages store_settings" ON public.store_settings;
CREATE POLICY "Public read store_settings" ON public.store_settings
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manages store_settings" ON public.store_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. PRODUCTS & CATEGORIES (Public read active products, service_role write)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Service role manages categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manages categories" ON public.categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active products" ON public.products;
DROP POLICY IF EXISTS "Service role manages products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
    FOR SELECT TO anon, authenticated USING (
        is_active = true OR 
        products.seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid())
    );
CREATE POLICY "Service role manages products" ON public.products
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. PROFILES (Users manage own profile, service_role manages all)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role manages profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role manages profiles" ON public.profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. SELLERS (Public view approved sellers, seller manages own record)
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved sellers" ON public.sellers;
DROP POLICY IF EXISTS "Sellers manage own profile" ON public.sellers;
DROP POLICY IF EXISTS "Service role manages sellers" ON public.sellers;
CREATE POLICY "Public read approved sellers" ON public.sellers
    FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Sellers manage own profile" ON public.sellers
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages sellers" ON public.sellers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. ORDERS & ORDER ITEMS (Customer views own, seller views own items, service_role writes)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Service role manages orders" ON public.orders;
CREATE POLICY "Customers view own orders" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sellers view assigned orders" ON public.orders
    FOR SELECT TO authenticated USING (
        orders.seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = orders.seller_id AND s.user_id = auth.uid())
    );
CREATE POLICY "Service role manages orders" ON public.orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own order_items" ON public.order_items;
DROP POLICY IF EXISTS "Service role manages order_items" ON public.order_items;
CREATE POLICY "Users view own order_items" ON public.order_items
    FOR SELECT TO authenticated USING (
        order_items.seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = order_items.seller_id AND s.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.parent_order_id AND o.user_id = auth.uid())
    );
CREATE POLICY "Service role manages order_items" ON public.order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. CART ITEMS & ADDRESSES (Strictly scoped to user_id = auth.uid())
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Service role manages cart_items" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages cart_items" ON public.cart_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Service role manages user_addresses" ON public.user_addresses;
CREATE POLICY "Users manage own addresses" ON public.user_addresses
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages user_addresses" ON public.user_addresses
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. NOTIFICATIONS (Users read own notifications)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role manages notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages notifications" ON public.notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers read own alerts" ON public.seller_notifications;
DROP POLICY IF EXISTS "Service role manages seller_notifications" ON public.seller_notifications;
CREATE POLICY "Sellers read own alerts" ON public.seller_notifications
    FOR SELECT TO authenticated USING (
        seller_notifications.seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_notifications.seller_id AND s.user_id = auth.uid())
    );
CREATE POLICY "Service role manages seller_notifications" ON public.seller_notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
