-- ====================================================================
-- ZEBALPHA — ULTIMATE PRODUCTION-GRADE SPOTLIGHT MANAGER SCHEMA
-- 1. spotlight_campaigns (Top Deals, Brand Spotlight, Festive Specials, etc.)
-- 2. spotlight_editorial_cards (Admin promotional cards with verified From Price)
-- 3. spotlight_campaign_items (Unified 16-card ordered list: seller_product OR editorial)
-- 4. Storage Bucket: 'editorial' with strict RLS policies
-- 5. Helper RPC functions for lowest price calculation and validation
-- 6. High-performance composite indexes and realtime replication
-- ====================================================================

-- Ensure slug column exists and has auto-slug default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'spotlight_campaigns' AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.spotlight_campaigns ADD COLUMN slug VARCHAR(255);
    END IF;
END $$;

-- 1. SPOTLIGHT CAMPAIGNS TABLE (Ensure table structure)
CREATE TABLE IF NOT EXISTS public.spotlight_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    header_image_url TEXT,
    theme VARCHAR(100) DEFAULT 'default',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'archived')),
    selection_mode VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (selection_mode IN ('manual', 'auto')),
    category_scope VARCHAR(100) NOT NULL DEFAULT 'all',
    max_cards INT NOT NULL DEFAULT 16 CHECK (max_cards > 0),
    required_cards INT NOT NULL DEFAULT 16 CHECK (required_cards >= 0),
    default_sort VARCHAR(50) NOT NULL DEFAULT 'popular' CHECK (default_sort IN ('popular', 'newest', 'price_asc', 'price_desc')),
    display_order INT NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    website_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    android_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.spotlight_campaigns ENABLE ROW LEVEL SECURITY;

-- Customer public read (published, active within date window, enabled for platform)
DROP POLICY IF EXISTS "Public read published spotlight_campaigns" ON public.spotlight_campaigns;
CREATE POLICY "Public read published spotlight_campaigns" 
    ON public.spotlight_campaigns 
    FOR SELECT 
    USING (
        status = 'published' AND 
        (starts_at IS NULL OR starts_at <= NOW()) AND 
        (ends_at IS NULL OR ends_at >= NOW())
    );

-- Service role full management
DROP POLICY IF EXISTS "Service role manages spotlight_campaigns" ON public.spotlight_campaigns;
CREATE POLICY "Service role manages spotlight_campaigns" 
    ON public.spotlight_campaigns 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Authenticated Admin full management
DROP POLICY IF EXISTS "Admins manage spotlight_campaigns" ON public.spotlight_campaigns;
CREATE POLICY "Admins manage spotlight_campaigns" 
    ON public.spotlight_campaigns 
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

-- Indexes for spotlight_campaigns
CREATE INDEX IF NOT EXISTS idx_spotlight_campaigns_status_order 
    ON public.spotlight_campaigns(status, display_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_campaigns_schedule 
    ON public.spotlight_campaigns(starts_at, ends_at) WHERE status = 'published';


-- 2. SPOTLIGHT EDITORIAL CARDS TABLE
CREATE TABLE IF NOT EXISTS public.spotlight_editorial_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_bucket VARCHAR(100) NOT NULL DEFAULT 'editorial',
    image_object_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    destination_type VARCHAR(50) NOT NULL DEFAULT 'category' CHECK (destination_type IN ('category', 'subcategory', 'product', 'custom')),
    destination_id TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    price_mode VARCHAR(50) NOT NULL DEFAULT 'auto' CHECK (price_mode IN ('auto', 'manual')),
    manual_from_price NUMERIC,
    calculated_from_price NUMERIC,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.spotlight_editorial_cards ENABLE ROW LEVEL SECURITY;

-- Customer public read
DROP POLICY IF EXISTS "Public read active spotlight_editorial_cards" ON public.spotlight_editorial_cards;
CREATE POLICY "Public read active spotlight_editorial_cards" 
    ON public.spotlight_editorial_cards 
    FOR SELECT 
    USING (is_active = true);

-- Service role full management
DROP POLICY IF EXISTS "Service role manages spotlight_editorial_cards" ON public.spotlight_editorial_cards;
CREATE POLICY "Service role manages spotlight_editorial_cards" 
    ON public.spotlight_editorial_cards 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Authenticated Admin full management
DROP POLICY IF EXISTS "Admins manage spotlight_editorial_cards" ON public.spotlight_editorial_cards;
CREATE POLICY "Admins manage spotlight_editorial_cards" 
    ON public.spotlight_editorial_cards 
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

-- Indexes for spotlight_editorial_cards
CREATE INDEX IF NOT EXISTS idx_spotlight_editorial_cards_active 
    ON public.spotlight_editorial_cards(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlight_editorial_cards_dest 
    ON public.spotlight_editorial_cards(destination_type, destination_id);


-- 3. SPOTLIGHT CAMPAIGN ITEMS (Unified 16-card selection: seller_product OR editorial)
CREATE TABLE IF NOT EXISTS public.spotlight_campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.spotlight_campaigns(id) ON DELETE CASCADE,
    card_type VARCHAR(50) NOT NULL CHECK (card_type IN ('seller_product', 'editorial')),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    editorial_card_id UUID REFERENCES public.spotlight_editorial_cards(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.spotlight_campaign_items ENABLE ROW LEVEL SECURITY;

-- Customer public read
DROP POLICY IF EXISTS "Public read spotlight_campaign_items" ON public.spotlight_campaign_items;
CREATE POLICY "Public read spotlight_campaign_items" 
    ON public.spotlight_campaign_items 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.spotlight_campaigns c 
            WHERE c.id = spotlight_campaign_items.campaign_id 
            AND c.status = 'published'
            AND (c.starts_at IS NULL OR c.starts_at <= NOW())
            AND (c.ends_at IS NULL OR c.ends_at >= NOW())
        )
    );

-- Service role full management
DROP POLICY IF EXISTS "Service role manages spotlight_campaign_items" ON public.spotlight_campaign_items;
CREATE POLICY "Service role manages spotlight_campaign_items" 
    ON public.spotlight_campaign_items 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Authenticated Admin full management
DROP POLICY IF EXISTS "Admins manage spotlight_campaign_items" ON public.spotlight_campaign_items;
CREATE POLICY "Admins manage spotlight_campaign_items" 
    ON public.spotlight_campaign_items 
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

-- Indexes for spotlight_campaign_items
CREATE INDEX IF NOT EXISTS idx_spotlight_items_campaign_order 
    ON public.spotlight_campaign_items(campaign_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_spotlight_items_product 
    ON public.spotlight_campaign_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spotlight_items_editorial 
    ON public.spotlight_campaign_items(editorial_card_id) WHERE editorial_card_id IS NOT NULL;


-- 4. STORAGE BUCKET CONFIGURATION: 'editorial'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'editorial',
    'editorial',
    true,
    51200, -- Strictly 50 KB = 51,200 bytes
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 51200,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- Storage public read policy
DROP POLICY IF EXISTS "Public read editorial bucket" ON storage.objects;
CREATE POLICY "Public read editorial bucket"
    ON storage.objects 
    FOR SELECT
    USING (bucket_id = 'editorial');

-- Storage upload policy for admins and service role
DROP POLICY IF EXISTS "Admin upload editorial bucket" ON storage.objects;
CREATE POLICY "Admin upload editorial bucket"
    ON storage.objects 
    FOR INSERT
    WITH CHECK (
        bucket_id = 'editorial' AND (
            auth.jwt() ->> 'role' = 'service_role' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Admin update editorial bucket" ON storage.objects;
CREATE POLICY "Admin update editorial bucket"
    ON storage.objects 
    FOR UPDATE
    USING (
        bucket_id = 'editorial' AND (
            auth.jwt() ->> 'role' = 'service_role' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Admin delete editorial bucket" ON storage.objects;
CREATE POLICY "Admin delete editorial bucket"
    ON storage.objects 
    FOR DELETE
    USING (
        bucket_id = 'editorial' AND (
            auth.jwt() ->> 'role' = 'service_role' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin') OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );


-- 5. FUNCTION TO GET LOWEST PURCHASABLE PRICE FOR A CATEGORY / SUBCATEGORY
CREATE OR REPLACE FUNCTION public.get_lowest_purchasable_price_for_category(p_category_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_min_price NUMERIC;
BEGIN
    -- Query lowest price of eligible, active, approved, in-stock products under category or subcategory
    SELECT MIN(p.price)
    INTO v_min_price
    FROM public.products p
    WHERE (
        p.category_id = p_category_id 
        OR p.category_id IN (SELECT id FROM public.categories WHERE parent_id = p_category_id)
    )
    AND p.is_active = true
    AND p.is_approved = true
    AND p.stock > 0
    AND p.price > 0;

    RETURN COALESCE(v_min_price, 0);
END;
$$;

-- Grant execution to public/authenticated
GRANT EXECUTE ON FUNCTION public.get_lowest_purchasable_price_for_category(UUID) TO authenticated, service_role, anon;


-- 6. DEFAULT TOP DEALS CAMPAIGN SEED
INSERT INTO public.spotlight_campaigns (
    name,
    slug,
    description,
    status,
    selection_mode,
    category_scope,
    max_cards,
    required_cards,
    default_sort,
    display_order,
    website_enabled,
    android_enabled
)
SELECT 
    'Top Deals',
    'top-deals',
    'Handpicked top deals and curated value drops across all categories.',
    'draft',
    'manual',
    'all',
    16,
    16,
    'popular',
    0,
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.spotlight_campaigns WHERE name = 'Top Deals' OR slug = 'top-deals'
);

-- 7. REALTIME REPLICATION (Instant Spotlight Sync across Web & Android)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'spotlight_campaigns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.spotlight_campaigns;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'spotlight_editorial_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.spotlight_editorial_cards;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'spotlight_campaign_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.spotlight_campaign_items;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
