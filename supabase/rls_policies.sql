-- ==================================================
-- ASALI SWAD - ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 1. CATEGORIES POLICIES
CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. PRODUCTS POLICIES
CREATE POLICY "Public can view active products" ON public.products FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role full access to profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. USER ADDRESSES POLICIES
CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.user_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.user_addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.user_addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. ORDERS POLICIES
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert orders" ON public.orders FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can manage orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. CART ITEMS POLICIES
CREATE POLICY "Users can view own cart items" ON public.cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cart items" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart items" ON public.cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart items" ON public.cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. PREORDERS POLICIES
CREATE POLICY "Anyone can submit preorder" ON public.preorders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view own preorders" ON public.preorders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage preorders" ON public.preorders FOR ALL TO service_role USING (true) WITH CHECK (true);
