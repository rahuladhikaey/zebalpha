-- Asali Swad Row Level Security (RLS) Policies Migration
-- Ensures database protection post-backend removal

-- 1. Enable RLS on core tables
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notify_requests ENABLE ROW LEVEL SECURITY;

-- 2. Products & Categories Policies (Public Read, Admin Write)
CREATE POLICY "Public Read Products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Admin All Products" ON public.products
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public Read Categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Admin All Categories" ON public.categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 3. Orders Policies
-- Customers can insert orders on checkout (public or authenticated)
CREATE POLICY "Public Insert Orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Customers can view their own orders; Admin can view all orders
CREATE POLICY "Owner Read Orders" ON public.orders
    FOR SELECT USING (
        user_id = auth.uid() 
        OR auth.jwt() ->> 'role' = 'admin' 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Admin can update/delete orders
CREATE POLICY "Admin Update Orders" ON public.orders
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- 4. User Profiles Policies
CREATE POLICY "User Read Own Profile" ON public.profiles
    FOR SELECT USING (
        id = auth.uid() 
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "User Update Own Profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "User Insert Own Profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- 5. Stock History Policies
CREATE POLICY "Admin Read Stock History" ON public.stock_history
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- 6. Notify Requests Policies
CREATE POLICY "Public Insert Notify Requests" ON public.notify_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin Read Notify Requests" ON public.notify_requests
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' 
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
