-- ====================================================================
-- FIX SUPABASE SECURITY ADVISOR CRITICAL WARNING:
-- "RLS references user metadata" on curated_collections & editorial_cards
-- ====================================================================
-- Explanation: Supabase security linter flags referencing `user_metadata` 
-- in RLS because users could potentially edit their own metadata from client.
-- This script replaces those policies to check `app_metadata` and the verified
-- `public.profiles` role instead, instantly clearing both CRITICAL warnings.
-- ====================================================================

-- 1. FIX CURATED_COLLECTIONS POLICY
DROP POLICY IF EXISTS "Admins manage curated_collections" ON public.curated_collections;

CREATE POLICY "Admins manage curated_collections" 
    ON public.curated_collections 
    FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

-- 2. FIX EDITORIAL_CARDS POLICY
DROP POLICY IF EXISTS "Admins manage editorial_cards" ON public.editorial_cards;

CREATE POLICY "Admins manage editorial_cards" 
    ON public.editorial_cards 
    FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

-- 3. FIX STORAGE BUCKET POLICIES (editorial-images)
DROP POLICY IF EXISTS "Admin upload editorial images" ON storage.objects;

CREATE POLICY "Admin upload editorial images"
    ON storage.objects 
    FOR INSERT
    WITH CHECK (
        bucket_id = 'editorial-images' AND (
            auth.jwt() ->> 'role' = 'service_role' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Admin delete editorial images" ON storage.objects;

CREATE POLICY "Admin delete editorial images"
    ON storage.objects 
    FOR DELETE
    USING (
        bucket_id = 'editorial-images' AND (
            auth.jwt() ->> 'role' = 'service_role' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );
