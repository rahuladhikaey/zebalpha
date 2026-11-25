-- ============================================================================
-- GOα SHADOWFAX HYPERLOCAL MARKETPLACE (FORMAT 1A) TRACKING COLUMNS
-- Run in Supabase SQL Editor to store Shadowfax Rider / AWB / Webhook state.
-- ============================================================================

ALTER TABLE go_alpha.orders
  ADD COLUMN IF NOT EXISTS courier_partner VARCHAR(60) DEFAULT 'SHADOWFAX_HYPERLOCAL',
  ADD COLUMN IF NOT EXISTS shadowfax_order_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shadowfax_awb VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shadowfax_status VARCHAR(60),
  ADD COLUMN IF NOT EXISTS shadowfax_rider_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shadowfax_rider_phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS shadowfax_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS shadowfax_delivery_cost NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS shadowfax_raw_webhook JSONB;

CREATE INDEX IF NOT EXISTS idx_go_alpha_orders_sfx_id
  ON go_alpha.orders (shadowfax_order_id);
