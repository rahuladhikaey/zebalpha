-- ============================================================================
-- ZEBALPHA UNIVERSAL FLIPKART-STYLE CATEGORY STOREFRONT ENGINE (SDUI)
-- 100% Admin-Controlled Per-Category Themes, Modular Widgets & Seller Spotlights
-- Idempotent, Non-Destructive Production Migration
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. category_storefront_layouts: Per-Main-Category SDUI Blueprint
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.category_storefront_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  theme_preset TEXT NOT NULL DEFAULT 'fashion_streetwear_lime',
  theme_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cat_storefront_layouts_cat
  ON public.category_storefront_layouts(category_id);

CREATE INDEX IF NOT EXISTS idx_cat_storefront_layouts_enabled
  ON public.category_storefront_layouts(is_enabled);

-- ----------------------------------------------------------------------------
-- 2. category_spotlight_requests: Seller -> Admin Category Storefront Slots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.category_spotlight_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  seller_name TEXT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  target_widget TEXT NOT NULL DEFAULT 'BRAND_SPOTLIGHT_GRID'
    CHECK (target_widget IN ('HERO_CAROUSEL', 'BRAND_SPOTLIGHT_GRID', 'CURATED_SHELF', 'COMBO_KITS_MARQUEE')),
  brand_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  offer_badge TEXT NOT NULL DEFAULT 'Up to 40% Off',
  banner_image_url TEXT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  destination_url TEXT NULL,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT NULL,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cat_spotlight_req_status
  ON public.category_spotlight_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cat_spotlight_req_cat
  ON public.category_spotlight_requests(category_id, status);

CREATE INDEX IF NOT EXISTS idx_cat_spotlight_req_seller
  ON public.category_spotlight_requests(seller_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.category_storefront_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_spotlight_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read enabled category storefronts" ON public.category_storefront_layouts;
CREATE POLICY "Public read enabled category storefronts"
  ON public.category_storefront_layouts
  FOR SELECT
  USING (is_enabled = true OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access category storefronts" ON public.category_storefront_layouts;
CREATE POLICY "Service role full access category storefronts"
  ON public.category_storefront_layouts
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read approved category spotlights" ON public.category_spotlight_requests;
CREATE POLICY "Public read approved category spotlights"
  ON public.category_spotlight_requests
  FOR SELECT
  USING (status = 'APPROVED' OR auth.uid() = seller_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Sellers submit own category spotlights" ON public.category_spotlight_requests;
CREATE POLICY "Sellers submit own category spotlights"
  ON public.category_spotlight_requests
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access category spotlights" ON public.category_spotlight_requests;
CREATE POLICY "Service role full access category spotlights"
  ON public.category_spotlight_requests
  FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4. Auto-Seed Default Storefront Records for Existing Main Categories
--    (Empty widgets[] tells runtime to hydrate rich category-matched presets
--     until Admin explicitly saves custom edits from Category Storefront Studio)
-- ----------------------------------------------------------------------------
INSERT INTO public.category_storefront_layouts (category_id, is_enabled, theme_preset, theme_tokens, widgets)
SELECT
  c.id,
  true,
  CASE
    WHEN c.slug ILIKE '%beauty%' OR c.name ILIKE '%beauty%' OR c.name ILIKE '%skin%' OR c.name ILIKE '%cosmetic%'
      THEN 'beauty_glam_rose'
    WHEN c.slug ILIKE '%women%' OR c.name ILIKE '%women%' OR c.name ILIKE '%girl%' OR c.name ILIKE '%ethnic%'
      THEN 'women_editorial_blush'
    WHEN c.slug ILIKE '%electronic%' OR c.name ILIKE '%electronic%' OR c.name ILIKE '%mobile%'
      THEN 'electronics_slate_blue'
    WHEN c.slug ILIKE '%jewel%' OR c.slug ILIKE '%home%' OR c.name ILIKE '%jewel%'
      THEN 'luxe_champagne_gold'
    ELSE 'fashion_streetwear_lime'
  END,
  '{}'::jsonb,
  '[]'::jsonb
FROM public.categories c
WHERE c.parent_id IS NULL
  AND (c.is_active IS NULL OR c.is_active = true)
ON CONFLICT (category_id) DO NOTHING;

COMMIT;
