-- ==============================================================================
-- ZEBALPHA - AUTHENTICATION, ACCOUNT PERSISTENCE & WISHLIST EXTENSION SCHEMA
-- Safe, Non-Destructive SQL Migration for Supabase PostgreSQL
-- ==============================================================================

-- 1. Ensure public.profiles table has complete columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_no VARCHAR(20),
    gender VARCHAR(20) DEFAULT 'prefer_not_to_say',
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'customer' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure all columns exist on existing profiles table if previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_no VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'prefer_not_to_say';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Enhanced Idempotent Trigger for auth.users -> public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_avatar TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'user_name',
        SPLIT_PART(NEW.email, '@', 1)
    );
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    INSERT INTO public.profiles (id, full_name, email, phone_no, avatar_url, role, status, created_at, updated_at)
    VALUES (
        NEW.id,
        user_name,
        NEW.email,
        NEW.phone,
        user_avatar,
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        email = EXCLUDED.email,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. WISHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON public.wishlists(product_id);

-- 4. Ensure CART ITEMS TABLE structure and indexes
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    package_name VARCHAR(100) NOT NULL DEFAULT 'Standard',
    quantity INT DEFAULT 1 NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, product_id, package_name)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);

-- 5. Ensure USER ADDRESSES TABLE structure and indexes
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    address_line TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'West Bengal' NOT NULL,
    landmark TEXT,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    user_email TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all active profiles, but can only update their own profile
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own and public profiles" ON public.profiles;
    CREATE POLICY "Users can read own and public profiles" 
        ON public.profiles FOR SELECT 
        USING (true);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile" 
        ON public.profiles FOR INSERT 
        WITH CHECK (auth.uid() = id);
END $$;

-- Wishlists: Users can manage their own wishlist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlists;
    CREATE POLICY "Users can view own wishlist" 
        ON public.wishlists FOR SELECT 
        USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlists;
    CREATE POLICY "Users can insert own wishlist" 
        ON public.wishlists FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlists;
    CREATE POLICY "Users can delete own wishlist" 
        ON public.wishlists FOR DELETE 
        USING (auth.uid() = user_id);
END $$;

-- Cart Items: Users can manage their own cart
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own cart" ON public.cart_items;
    CREATE POLICY "Users can view own cart" 
        ON public.cart_items FOR SELECT 
        USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert/update own cart" ON public.cart_items;
    CREATE POLICY "Users can insert/update own cart" 
        ON public.cart_items FOR ALL 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- Addresses: Users can manage their own saved addresses
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own addresses" ON public.user_addresses;
    CREATE POLICY "Users can view own addresses" 
        ON public.user_addresses FOR SELECT 
        USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert/update/delete own addresses" ON public.user_addresses;
    CREATE POLICY "Users can insert/update/delete own addresses" 
        ON public.user_addresses FOR ALL 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;
