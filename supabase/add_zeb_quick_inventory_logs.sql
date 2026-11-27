-- ============================================================================
-- ZEBQUICK EXPRESS — ISOLATED STOCK INVENTORY, LOW-STOCK LIMITS & STOCK LOGS
-- Completely isolated from main ZebAlpha (public.products / public.stock_history).
-- Non-destructive & idempotent: safe to run once in Supabase SQL Editor.
-- ============================================================================

-- 1. Add independent Low-Stock Alert threshold on zeb_quick.products
ALTER TABLE zeb_quick.products
  ADD COLUMN IF NOT EXISTS low_stock_limit INT DEFAULT 5 NOT NULL;

-- 2. Isolated ZebQuick Stock Audit / Restock Log Table
CREATE TABLE IF NOT EXISTS zeb_quick.stock_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zeb_quick_product_id UUID NOT NULL REFERENCES zeb_quick.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_title VARCHAR(255) NOT NULL,
  previous_stock INT NOT NULL DEFAULT 0,
  new_stock INT NOT NULL DEFAULT 0,
  change_amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zeb_quick_stock_history_seller
  ON zeb_quick.stock_history (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zeb_quick_stock_history_product
  ON zeb_quick.stock_history (zeb_quick_product_id, created_at DESC);

-- RLS & Grants
ALTER TABLE zeb_quick.stock_history ENABLE ROW LEVEL SECURITY;

GRANT ALL ON zeb_quick.stock_history TO service_role;
GRANT SELECT ON zeb_quick.stock_history TO authenticated;
