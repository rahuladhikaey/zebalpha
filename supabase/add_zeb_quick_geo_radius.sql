-- ============================================================================
-- ZebQuick 25 km Hyperlocal Geospatial Radius Engine (Non-Destructive)
-- 1. Ensures lat/lng columns exist & defaults seller delivery_radius_km to 25 km
-- 2. Seeds accurate GPS coordinates for Sealdah -> Krishnanagar corridor pincodes
-- 3. Backfills zeb_quick.sellers.lat / lng from their pickup_pincode
-- 4. Seeds public.store_settings key 'zeb_quick_delivery_radius_km' = 25 km
-- ============================================================================

-- 1. Ensure lat/lng columns exist on serviceable_pincodes and sellers
ALTER TABLE zeb_quick.serviceable_pincodes
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6);

ALTER TABLE zeb_quick.sellers
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS delivery_radius_km INT DEFAULT 25 NOT NULL;

ALTER TABLE zeb_quick.sellers
  ALTER COLUMN delivery_radius_km SET DEFAULT 25;

-- Upgrade existing default 15 km sellers to 25 km hyperlocal radius
UPDATE zeb_quick.sellers
SET delivery_radius_km = 25,
    updated_at = NOW()
WHERE delivery_radius_km IS NULL OR delivery_radius_km < 25;

-- 2. Seed accurate GPS coordinates for all active/existing corridor pincodes
WITH coords(pincode, lat, lng) AS (
  VALUES
    ('700014', 22.564600, 88.369800), -- Sealdah / Entally
    ('700009', 22.576900, 88.367900), -- Sealdah / Amherst Street
    ('700004', 22.601300, 88.373700), -- Shyambazar / Bidhan Sarani
    ('700028', 22.622400, 88.419300), -- Dum Dum
    ('700030', 22.625800, 88.393500), -- Dum Dum / Sinthi
    ('700050', 22.633500, 88.378200), -- Sinthee / Baranagar
    ('700074', 22.642100, 88.417200), -- Dum Dum Cantonment
    ('700056', 22.662500, 88.382100), -- Belghoria / Agarpara
    ('700110', 22.698600, 88.389500), -- Sodepur
    ('700114', 22.693900, 88.375200), -- Sodepur / Panihati
    ('700115', 22.724200, 88.377200), -- Khardah
    ('700116', 22.724800, 88.379000), -- Khardah / Rahara
    ('700117', 22.721500, 88.373800), -- Khardah / B.T. Road
    ('700118', 22.738300, 88.373700), -- Titagarh / Barrackpore
    ('700119', 22.741200, 88.373100), -- Titagarh
    ('700120', 22.767400, 88.368800), -- Barrackpore
    ('700121', 22.766200, 88.359600), -- Barrackpore / Manirampur
    ('700122', 22.785200, 88.368100), -- Barrackpore / Palta
    ('700123', 22.805800, 88.370200), -- Ichapur
    ('700124', 22.722800, 88.480600), -- Barasat
    ('700125', 22.707200, 88.463100), -- Barasat / Hridaypur
    ('743122', 22.820400, 88.371200), -- Palta / Garulia
    ('743127', 22.833100, 88.380600), -- Shyamnagar West
    ('743144', 22.836400, 88.384900), -- Shyamnagar
    ('743132', 22.860200, 88.395800), -- Jagaddal / Kankinara
    ('743134', 22.943800, 88.420100), -- Halisahar East
    ('743145', 22.944200, 88.433500), -- Kanchrapara
    ('743165', 22.893800, 88.422000), -- Naihati
    ('743166', 22.936900, 88.422300), -- Halisahar
    ('741235', 22.975100, 88.434500), -- Kalyani
    ('741245', 22.968200, 88.477400), -- Kalyani / Gayeshpur
    ('741222', 23.077200, 88.519700), -- Chakdaha
    ('741201', 23.176300, 88.567900), -- Ranaghat
    ('741202', 23.197200, 88.556200), -- Ranaghat / Habibpur
    ('741254', 23.241400, 88.560800), -- Birnagar / Taherpur
    ('741127', 23.225400, 88.573500), -- Taherpur
    ('741404', 23.252800, 88.435700), -- Shantipur / Phulia
    ('741101', 23.401300, 88.502100), -- Krishnanagar
    ('741102', 23.412600, 88.504200), -- Krishnanagar / Ghurni
    ('741103', 23.409200, 88.484700)  -- Krishnanagar / Shaktinagar
)
UPDATE zeb_quick.serviceable_pincodes sp
SET lat = c.lat,
    lng = c.lng
FROM coords c
WHERE sp.pincode = c.pincode
  AND (sp.lat IS NULL OR sp.lng IS NULL);

-- 3. Backfill lat/lng on zeb_quick.sellers from their pickup_pincode
UPDATE zeb_quick.sellers s
SET lat = sp.lat,
    lng = sp.lng,
    updated_at = NOW()
FROM zeb_quick.serviceable_pincodes sp
WHERE s.pickup_pincode = sp.pincode
  AND sp.lat IS NOT NULL
  AND sp.lng IS NOT NULL
  AND (s.lat IS NULL OR s.lng IS NULL);

-- 4. Seed Admin-controllable Global ZebQuick Delivery Radius (default 25 km)
INSERT INTO public.store_settings (key, value)
VALUES ('zeb_quick_delivery_radius_km', '{"radius_km": 25}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Fast index for geospatial lookups
CREATE INDEX IF NOT EXISTS idx_zeb_quick_pincodes_lat_lng
  ON zeb_quick.serviceable_pincodes (lat, lng)
  WHERE is_active = TRUE;
