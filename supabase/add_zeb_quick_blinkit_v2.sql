-- ============================================================================
-- ZEBQUICK v2 — BLINKIT THEME COLORS, FEATURED SUBCATEGORIES & ZEBQUICK-ONLY PRODUCTS
-- Run once in Supabase SQL Editor.
-- ============================================================================

-- 1. Main Category dynamic header theme color (e.g. #faa040ff, #1E293B, #BAE6FD)
ALTER TABLE zeb_quick.main_categories
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#F8CB46';

-- 2. Subcategory "Featured" flag for Main Category Tab horizontal strip
ALTER TABLE zeb_quick.allowed_subcategories
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 3. ZebQuick-Only product isolation (never published to main ZebAlpha public.products)
ALTER TABLE zeb_quick.products
  ADD COLUMN IF NOT EXISTS is_zebquick_only BOOLEAN DEFAULT false;

ALTER TABLE zeb_quick.products
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE zeb_quick.products
  ALTER COLUMN source_product_id DROP NOT NULL;
