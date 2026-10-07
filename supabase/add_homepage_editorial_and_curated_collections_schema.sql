-- ====================================================================
-- ZEBALPHA — HOMEPAGE EDITORIAL & CURATED COLLECTIONS SCHEMA (COMPLETE)
-- Section 1: Curated Collections (1:1 Square)
-- Section 2: Woven to Be Remembered (3:4 Editorial Carousel)
-- Section 3: Storage Bucket, Policies, Realtime & Composite Indexes
-- ====================================================================

-- 1. CURATED COLLECTIONS TABLE (1:1 Square Homepage Section)
CREATE TABLE IF NOT EXISTS public.curated_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    short_description TEXT,
    link_url TEXT,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.curated_collections ENABLE ROW LEVEL SECURITY;

-- Customer public read (active records only)
DROP POLICY IF EXISTS "Public read active curated_collections" ON public.curated_collections;
CREATE POLICY "Public read active curated_collections" 
    ON public.curated_collections 
    FOR SELECT 
    USING (is_active = true);

-- Service role full management
DROP POLICY IF EXISTS "Service role manages curated_collections" ON public.curated_collections;
CREATE POLICY "Service role manages curated_collections" 
    ON public.curated_collections 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Authenticated Admin full management
DROP POLICY IF EXISTS "Admins manage curated_collections" ON public.curated_collections;
CREATE POLICY "Admins manage curated_collections" 
    ON public.curated_collections 
    FOR ALL 
    TO authenticated 
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'admin')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'admin')
    );

-- Composite Index for fast active ordering
CREATE INDEX IF NOT EXISTS idx_curated_collections_active_order 
    ON public.curated_collections(is_active, display_order ASC);


-- 2. EDITORIAL CARDS TABLE (Woven to Be Remembered - 3:4 Portrait Carousel)
CREATE TABLE IF NOT EXISTS public.editorial_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'ZEBALPHA EDIT',
    price NUMERIC,
    badge VARCHAR(100) DEFAULT 'EDITORIAL DROP',
    href TEXT DEFAULT '/products',
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.editorial_cards ENABLE ROW LEVEL SECURITY;

-- Customer public read (active records only)
DROP POLICY IF EXISTS "Public read active editorial_cards" ON public.editorial_cards;
CREATE POLICY "Public read active editorial_cards" 
    ON public.editorial_cards 
    FOR SELECT 
    USING (is_active = true);

-- Service role full management
DROP POLICY IF EXISTS "Service role manages editorial_cards" ON public.editorial_cards;
CREATE POLICY "Service role manages editorial_cards" 
    ON public.editorial_cards 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Authenticated Admin full management
DROP POLICY IF EXISTS "Admins manage editorial_cards" ON public.editorial_cards;
CREATE POLICY "Admins manage editorial_cards" 
    ON public.editorial_cards 
    FOR ALL 
    TO authenticated 
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'admin')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'admin')
    );

-- Composite Index for fast active ordering
CREATE INDEX IF NOT EXISTS idx_editorial_cards_active_order 
    ON public.editorial_cards(is_active, display_order ASC);


-- 3. STORAGE BUCKET CONFIGURATION ('editorial-images')
INSERT INTO storage.buckets (id, name, public)
VALUES ('editorial-images', 'editorial-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage public read policy
DROP POLICY IF EXISTS "Public read editorial images" ON storage.objects;
CREATE POLICY "Public read editorial images"
    ON storage.objects 
    FOR SELECT
    USING (bucket_id = 'editorial-images');

-- Storage upload policy for admins and service role
DROP POLICY IF EXISTS "Admin upload editorial images" ON storage.objects;
CREATE POLICY "Admin upload editorial images"
    ON storage.objects 
    FOR INSERT
    WITH CHECK (
        bucket_id = 'editorial-images' AND (
            auth.jwt() ->> 'role' = 'service_role' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            auth.role() = 'authenticated'
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
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            auth.role() = 'authenticated'
        )
    );


-- 4. REALTIME REPLICATION (Instant Homepage Sync)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'curated_collections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.curated_collections;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'editorial_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.editorial_cards;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Publication alters may be restricted in non-superuser cloud tiers; safe fallback
    NULL;
END $$;
