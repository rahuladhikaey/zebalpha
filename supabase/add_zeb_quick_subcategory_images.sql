-- ============================================================================
-- ZEBQUICK — SUBCATEGORY IMAGE SUPPORT FOR BLINKIT-STYLE SPLIT UI
-- Run once in Supabase SQL Editor.
-- ============================================================================

ALTER TABLE zeb_quick.allowed_subcategories
  ADD COLUMN IF NOT EXISTS image_url TEXT;
