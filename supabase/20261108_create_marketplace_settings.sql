-- =====================================================================
-- 20261108_create_marketplace_settings.sql
-- Creates public.marketplace_settings table & verifies store_settings permissions
-- Resolves 'Could not find the table public.marketplace_settings in schema cache'
-- =====================================================================

-- 1. Create marketplace_settings table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;

-- 3. Read policy for storefronts & customizers
DROP POLICY IF EXISTS "Allow public read access to marketplace_settings" ON public.marketplace_settings;
CREATE POLICY "Allow public read access to marketplace_settings" 
    ON public.marketplace_settings 
    FOR SELECT 
    TO public, anon, authenticated 
    USING (true);

-- 4. Full access policy for service role (Admin backend APIs)
DROP POLICY IF EXISTS "Allow service role to manage marketplace_settings" ON public.marketplace_settings;
CREATE POLICY "Allow service role to manage marketplace_settings" 
    ON public.marketplace_settings 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 5. Ensure store_settings table also has verified public read & service role access
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;
CREATE POLICY "Public read store_settings" 
    ON public.store_settings 
    FOR SELECT 
    TO public, anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Service role manages store_settings" ON public.store_settings;
CREATE POLICY "Service role manages store_settings" 
    ON public.store_settings 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 6. Immediately notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
