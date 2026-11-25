-- ============================================================================
-- ZebQuick QUICK COMMERCE — DYNAMIC MAIN CATEGORIES MANAGEMENT
-- Run in Supabase SQL Editor to enable SuperAdmin-created Main Categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS zeb_quick.main_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zeb_quick_main_cats_active
  ON zeb_quick.main_categories (is_active, display_order);

ALTER TABLE zeb_quick.main_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active zeb_quick main_categories" ON zeb_quick.main_categories;
CREATE POLICY "Public read active zeb_quick main_categories" ON zeb_quick.main_categories
  FOR SELECT USING (is_active = TRUE);

GRANT ALL ON zeb_quick.main_categories TO service_role;
GRANT SELECT ON zeb_quick.main_categories TO anon, authenticated;

-- Seed default 5 Main Categories
INSERT INTO zeb_quick.main_categories (slug, name, description, display_order, is_active) VALUES
  ('womens-innerwear', 'Women''s Innerwear', 'Bras, Panties, Camisoles, Slips, Shorts & Shapewear', 1, TRUE),
  ('mens-innerwear', 'Men''s Innerwear', 'Underwear, Vests, Boxers, Trunks & Briefs', 2, TRUE),
  ('mens-dailywear', 'Men''s Dailywear', 'Bermudas, Sports Pants, Track Pants, Lounge Pants & Shorts', 3, TRUE),
  ('fashion-accessories', 'Fashion Accessories', 'Belts, Money Purses, Wallets, Card Holders & Keychains', 4, TRUE),
  ('everyday-essentials', 'Everyday Essentials', 'Socks, Handkerchiefs & Nightwear', 5, TRUE)
ON CONFLICT (slug) DO NOTHING;
