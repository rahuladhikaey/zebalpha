-- ====================================================================
-- ASALI SWAD - COMPLETE ROW LEVEL SECURITY (RLS) FIX & POLICIES
-- Resolves all Supabase Critical "RLS Disabled in Public" Security Warnings
-- ====================================================================

-- 1. ENABLE RLS ON ALL SYSTEM TABLES
ALTER TABLE IF EXISTS public.seller_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notify_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- 2. DROP OVERLAPPING POLICIES IF THEY EXIST
DROP POLICY IF EXISTS "Sellers view own reports" ON public.seller_reports;
DROP POLICY IF EXISTS "Service role manage seller reports" ON public.seller_reports;

DROP POLICY IF EXISTS "Sellers view own notifications" ON public.seller_notifications;
DROP POLICY IF EXISTS "Sellers update own notifications" ON public.seller_notifications;
DROP POLICY IF EXISTS "Service role manage seller notifications" ON public.seller_notifications;

DROP POLICY IF EXISTS "Sellers view own stock history" ON public.stock_history;
DROP POLICY IF EXISTS "Service role manage stock history" ON public.stock_history;

DROP POLICY IF EXISTS "Sellers view own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Sellers update own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Public view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Service role manage inventory" ON public.inventory;

DROP POLICY IF EXISTS "Service role manage admin_users" ON public.admin_users;

DROP POLICY IF EXISTS "Users view own notify requests" ON public.notify_requests;
DROP POLICY IF EXISTS "Public insert notify requests" ON public.notify_requests;
DROP POLICY IF EXISTS "Service role manage notify requests" ON public.notify_requests;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role manage notifications" ON public.notifications;

DROP POLICY IF EXISTS "Service role manage audit logs" ON public.admin_audit_logs;

DROP POLICY IF EXISTS "Sellers view own support tickets" ON public.seller_support_tickets;
DROP POLICY IF EXISTS "Sellers insert own support tickets" ON public.seller_support_tickets;
DROP POLICY IF EXISTS "Service role manage support tickets" ON public.seller_support_tickets;

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers view own orders" ON public.orders;
DROP POLICY IF EXISTS "Service role manage orders" ON public.orders;


-- 3. CREATE SECURE POLICIES FOR EACH TABLE

-- A. SELLER REPORTS
CREATE POLICY "Sellers view own reports" ON public.seller_reports
    FOR SELECT TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manage seller reports" ON public.seller_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- B. SELLER NOTIFICATIONS
CREATE POLICY "Sellers view own notifications" ON public.seller_notifications
    FOR SELECT TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Sellers update own notifications" ON public.seller_notifications
    FOR UPDATE TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()))
    WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manage seller notifications" ON public.seller_notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- C. STOCK HISTORY
CREATE POLICY "Sellers view own stock history" ON public.stock_history
    FOR SELECT TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manage stock history" ON public.stock_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- D. INVENTORY
CREATE POLICY "Public view inventory" ON public.inventory
    FOR SELECT TO public USING (true);

CREATE POLICY "Sellers update own inventory" ON public.inventory
    FOR UPDATE TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()))
    WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manage inventory" ON public.inventory
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- E. ADMIN USERS
CREATE POLICY "Service role manage admin_users" ON public.admin_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- F. NOTIFY REQUESTS (No user_id column; stores email/phone)
CREATE POLICY "Public insert notify requests" ON public.notify_requests
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users view own notify requests" ON public.notify_requests
    FOR SELECT TO authenticated USING (email = auth.jwt()->>'email');

CREATE POLICY "Service role manage notify requests" ON public.notify_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- G. NOTIFICATIONS (USER)
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manage notifications" ON public.notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- H. ADMIN AUDIT LOGS
CREATE POLICY "Service role manage audit logs" ON public.admin_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- I. SELLER SUPPORT TICKETS
CREATE POLICY "Sellers view own support tickets" ON public.seller_support_tickets
    FOR SELECT TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Sellers insert own support tickets" ON public.seller_support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manage support tickets" ON public.seller_support_tickets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- J. ORDERS
CREATE POLICY "Users view own orders" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Sellers view own orders" ON public.orders
    FOR SELECT TO authenticated
    USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manage orders" ON public.orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 4. GRANT TABLE PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
