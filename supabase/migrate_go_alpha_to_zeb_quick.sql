-- ============================================================================
-- MIGRATE EXISTING `go_alpha` SCHEMA & COLUMNS TO `zeb_quick`
-- Safe & Idempotent: Run once in Supabase SQL Editor.
--
-- IMPORTANT AFTER RUNNING:
--   Supabase Dashboard -> Integrations -> Data API -> Exposed schemas:
--   Add `zeb_quick` (so `public, zeb_quick` are exposed).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'go_alpha')
     AND NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'zeb_quick') THEN
    ALTER SCHEMA go_alpha RENAME TO zeb_quick;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'zeb_quick' AND table_name = 'products' AND column_name = 'go_alpha_price'
  ) THEN
    ALTER TABLE zeb_quick.products RENAME COLUMN go_alpha_price TO zeb_quick_price;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'zeb_quick' AND table_name = 'products' AND column_name = 'go_alpha_stock'
  ) THEN
    ALTER TABLE zeb_quick.products RENAME COLUMN go_alpha_stock TO zeb_quick_stock;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'zeb_quick' AND table_name = 'wishlists' AND column_name = 'go_alpha_product_id'
  ) THEN
    ALTER TABLE zeb_quick.wishlists RENAME COLUMN go_alpha_product_id TO zeb_quick_product_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'zeb_quick' AND table_name = 'order_items' AND column_name = 'go_alpha_product_id'
  ) THEN
    ALTER TABLE zeb_quick.order_items RENAME COLUMN go_alpha_product_id TO zeb_quick_product_id;
  END IF;
END $$;

GRANT USAGE ON SCHEMA zeb_quick TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA zeb_quick TO service_role;
GRANT SELECT ON zeb_quick.allowed_subcategories, zeb_quick.serviceable_pincodes, zeb_quick.sellers, zeb_quick.products TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON zeb_quick.wishlists TO authenticated;
GRANT SELECT ON zeb_quick.orders, zeb_quick.order_items TO authenticated;
