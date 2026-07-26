-- ====================================================================
-- ASALISWAD MARKETPLACE - UNIFIED AUTHENTICATION ARCHITECTURE MIGRATION
-- Target Database: Supabase Unified Production Database
-- ====================================================================

-- 1. Ensure extensions and schema constraints
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Foreign Key Constraint Integrity on public.sellers
-- Ensure user_id references auth.users(id) on delete cascade
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sellers_user_id_fkey' AND table_name = 'sellers'
    ) THEN
        ALTER TABLE public.sellers 
        ADD CONSTRAINT sellers_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Foreign Key Constraint Integrity on public.profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. AUTOMATIC AUTH USER TRIGGER FOR PROFILES & SELLERS
-- Function to automatically handle user insertion from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_fullname TEXT;
    user_phone TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '');

    -- Insert into public.profiles for all users
    INSERT INTO public.profiles (id, email, full_name, phone_no, role, status, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_fullname,
        NULLIF(user_phone, ''),
        user_role,
        'active',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = NOW();

    -- If the user is a seller, link user_id in public.sellers if existing row by email matches
    IF user_role = 'seller' THEN
        UPDATE public.sellers
        SET user_id = NEW.id,
            email_verified = TRUE,
            updated_at = NOW()
        WHERE email = NEW.email AND user_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RLS POLICIES FOR SECURE DATA ACCESS BY AUTHENTICATED USER
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Sellers RLS: Allow authenticated sellers to view & update their own record
DROP POLICY IF EXISTS "Sellers view own profile" ON public.sellers;
CREATE POLICY "Sellers view own profile" ON public.sellers
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR status = 'approved');

DROP POLICY IF EXISTS "Sellers update own profile" ON public.sellers;
CREATE POLICY "Sellers update own profile" ON public.sellers
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Profiles RLS: Allow users to view & update their own profile
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow public read access to active sellers for storefront display
DROP POLICY IF EXISTS "Public read approved sellers" ON public.sellers;
CREATE POLICY "Public read approved sellers" ON public.sellers
    FOR SELECT TO anon
    USING (status = 'approved');
