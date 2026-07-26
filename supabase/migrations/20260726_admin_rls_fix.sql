-- Add missing RLS policies for SuperAdmin access

-- Admins manage all sellers
DROP POLICY IF EXISTS "Admins manage all sellers" ON public.sellers;
CREATE POLICY "Admins manage all sellers" ON public.sellers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    );

-- Admins manage all profiles
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    );

-- Admins manage all products
DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
CREATE POLICY "Admins manage all products" ON public.products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    );

-- Admins manage all orders
DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;
CREATE POLICY "Admins manage all orders" ON public.orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    );

-- Admins manage merchant verification logs
DROP POLICY IF EXISTS "Admins manage merchant verification logs" ON public.merchant_verification_logs;
CREATE POLICY "Admins manage merchant verification logs" ON public.merchant_verification_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.role = 'superadmin'
        )
    );
