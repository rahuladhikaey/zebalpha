-- ==================================================
-- ASALI SWAD - COMPLETE ROW LEVEL SECURITY (RLS) POLICIES
-- Target: Supabase Master Database
-- ==================================================

-- 1. ENABLE RLS ON ALL SYSTEM TABLES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_verification_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.seller_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notify_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_support_tickets ENABLE ROW LEVEL SECURITY;

-- 2. DROP OVERLAPPING POLICIES IF ANY EXIST
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. CATEGORIES & PRODUCTS POLICIES
CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public can view active products" ON public.products FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. PROFILES & USER ADDRESSES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role full access to profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.user_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.user_addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.user_addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. ORDERS POLICIES
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sellers can view own orders" ON public.orders FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role can manage orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. CART ITEMS & PREORDERS
CREATE POLICY "Users can view own cart items" ON public.cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cart items" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart items" ON public.cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart items" ON public.cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can submit preorder" ON public.preorders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view own preorders" ON public.preorders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage preorders" ON public.preorders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. SELLERS & MERCHANT VERIFICATION LOGS
CREATE POLICY "Sellers view own profile" ON public.sellers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sellers update own profile" ON public.sellers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public view approved sellers" ON public.sellers FOR SELECT TO public USING (status = 'approved' OR account_status = 'Active');
CREATE POLICY "Service role manage sellers" ON public.sellers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Sellers view own verification logs" ON public.merchant_verification_logs FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Sellers insert verification logs" ON public.merchant_verification_logs FOR INSERT TO authenticated WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role manage verification logs" ON public.merchant_verification_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. SELLER SUPPORT, REPORTS, NOTIFICATIONS & HISTORY
CREATE POLICY "Sellers view own support tickets" ON public.seller_support_tickets FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Sellers insert own support tickets" ON public.seller_support_tickets FOR INSERT TO authenticated WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role manage support tickets" ON public.seller_support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Sellers view own reports" ON public.seller_reports FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role manage seller reports" ON public.seller_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Sellers view own seller_notifications" ON public.seller_notifications FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Sellers update own seller_notifications" ON public.seller_notifications FOR UPDATE TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())) WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role manage seller notifications" ON public.seller_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Sellers view own stock history" ON public.stock_history FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role manage stock history" ON public.stock_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public view inventory" ON public.inventory FOR SELECT TO public USING (true);
CREATE POLICY "Sellers update own inventory" ON public.inventory FOR UPDATE TO authenticated USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())) WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Service role manage inventory" ON public.inventory FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. ADMIN SYSTEM TABLES & NOTIFICATIONS
CREATE POLICY "Service role manage admin_users" ON public.admin_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manage admin_audit_logs" ON public.admin_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manage notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public insert notify requests" ON public.notify_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users view own notify requests" ON public.notify_requests FOR SELECT TO authenticated USING (email = auth.jwt()->>'email');
CREATE POLICY "Service role manage notify requests" ON public.notify_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. GRANT SCHEMA & TABLE PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
