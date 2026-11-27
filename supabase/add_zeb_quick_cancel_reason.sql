-- ============================================================================
-- ZEBQUICK — ORDER CANCELLATION REASON & TIMESTAMP SUPPORT (20-MIN WINDOW)
-- Run once in Supabase SQL Editor.
-- ============================================================================

ALTER TABLE zeb_quick.orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
