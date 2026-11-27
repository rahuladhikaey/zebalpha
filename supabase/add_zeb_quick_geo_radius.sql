-- ============================================================================
-- ZebQuick 17 km Pure Automatic Hyperlocal GPS Engine (Zero Hardcoded Pincodes)
-- 1. Ensures lat/lng columns exist on serviceable_pincodes & sellers
-- 2. Sets delivery_radius_km default & active setting to 17 km
-- 3. All GPS coordinates are auto-resolved dynamically (India Post + OSM + Photon)
--    and cached automatically in Supabase on first use.
-- ============================================================================

ALTER TABLE zeb_quick.serviceable_pincodes
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6);

ALTER TABLE zeb_quick.sellers
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS delivery_radius_km INT DEFAULT 17 NOT NULL;

ALTER TABLE zeb_quick.sellers
  ALTER COLUMN delivery_radius_km SET DEFAULT 17;

-- Update all existing sellers to the 17 km hyperlocal radius
UPDATE zeb_quick.sellers
SET delivery_radius_km = 17,
    updated_at = NOW();

-- Set live Admin-controllable Global ZebQuick Delivery Radius to 17 km
INSERT INTO public.store_settings (key, value)
VALUES ('zeb_quick_delivery_radius_km', '{"radius_km": 17}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = '{"radius_km": 17}'::jsonb;

-- Fast index for geospatial lookups
CREATE INDEX IF NOT EXISTS idx_zeb_quick_pincodes_lat_lng
  ON zeb_quick.serviceable_pincodes (lat, lng)
  WHERE is_active = TRUE;
