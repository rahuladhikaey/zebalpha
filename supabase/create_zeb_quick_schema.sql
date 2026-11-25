-- ============================================================================
-- ZebQuick QUICK COMMERCE (5–6 HR DELIVERY) — DEDICATED DATABASE SCHEMA
-- Isolated from ZebAlpha (`public.*`), sharing `auth.users` & storage URLs.
--
-- IMPORTANT ONE-TIME SUPABASE SETTING:
--   Dashboard -> Settings -> API -> Exposed schemas -> add `zeb_quick`
--   so `public, zeb_quick` are both exposed to PostgREST / supabase-js.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS zeb_quick;

GRANT USAGE ON SCHEMA zeb_quick TO anon, authenticated, service_role;

-- 1. Allowed Subcategories (Controlled by SuperAdmin)
CREATE TABLE IF NOT EXISTS zeb_quick.allowed_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category_group VARCHAR(120) NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Serviceable Pincodes / Hyperlocal Corridors
CREATE TABLE IF NOT EXISTS zeb_quick.serviceable_pincodes (
  pincode VARCHAR(10) PRIMARY KEY,
  area_name VARCHAR(160) NOT NULL,
  city VARCHAR(120) NOT NULL,
  corridor_name VARCHAR(120) DEFAULT 'Sealdah-Krishnanagar' NOT NULL,
  lat NUMERIC(9, 6),
  lng NUMERIC(9, 6),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. ZebQuick Local Sellers (Linked to public.sellers)
CREATE TABLE IF NOT EXISTS zeb_quick.sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL UNIQUE REFERENCES public.sellers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_name VARCHAR(255) NOT NULL,
  pickup_pincode VARCHAR(10) NOT NULL,
  pickup_address TEXT,
  city VARCHAR(120) DEFAULT 'Kolkata',
  lat NUMERIC(9, 6),
  lng NUMERIC(9, 6),
  delivery_radius_km INT DEFAULT 15 NOT NULL,
  serviceable_pincodes TEXT[] DEFAULT '{}',
  is_approved BOOLEAN DEFAULT TRUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. ZebQuick Products (Zero duplicate images — references public.products)
CREATE TABLE IF NOT EXISTS zeb_quick.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  subcategory_slug VARCHAR(120) NOT NULL,
  category_group VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  zeb_quick_price NUMERIC(12, 2) NOT NULL,
  mrp NUMERIC(12, 2),
  zeb_quick_stock INT DEFAULT 10 NOT NULL,
  pickup_pincode VARCHAR(10) NOT NULL,
  delivery_eta_label VARCHAR(50) DEFAULT '5–6 Hours' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. ZebQuick Isolated Wishlist
CREATE TABLE IF NOT EXISTS zeb_quick.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zeb_quick_product_id UUID NOT NULL REFERENCES zeb_quick.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, zeb_quick_product_id)
);

-- 6. ZebQuick Isolated Orders (5–6 Hr Express SLA)
CREATE TABLE IF NOT EXISTS zeb_quick.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(60) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_pincode VARCHAR(10) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  delivery_fee NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  platform_fee NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  commission_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'COD' NOT NULL,
  payment_status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
  razorpay_order_id VARCHAR(120),
  razorpay_payment_id VARCHAR(120),
  order_status VARCHAR(40) DEFAULT 'PLACED' NOT NULL,
  promised_delivery_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours') NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. ZebQuick Order Items
CREATE TABLE IF NOT EXISTS zeb_quick.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES zeb_quick.orders(id) ON DELETE CASCADE,
  zeb_quick_product_id UUID REFERENCES zeb_quick.products(id) ON DELETE SET NULL,
  source_product_id UUID,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  size VARCHAR(50),
  color VARCHAR(50),
  image_url TEXT,
  quantity INT DEFAULT 1 NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  seller_earning NUMERIC(12, 2) NOT NULL,
  item_status VARCHAR(40) DEFAULT 'PLACED' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. ZebQuick Isolated Seller Payout Ledger
CREATE TABLE IF NOT EXISTS zeb_quick.seller_payout_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES zeb_quick.orders(id) ON DELETE CASCADE,
  gross_amount NUMERIC(12, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  net_earning NUMERIC(12, 2) NOT NULL,
  payout_status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast hyperlocal & SLA queries
CREATE INDEX IF NOT EXISTS idx_zeb_quick_pincodes_active ON zeb_quick.serviceable_pincodes (is_active, corridor_name);
CREATE INDEX IF NOT EXISTS idx_zeb_quick_sellers_pincode ON zeb_quick.sellers (pickup_pincode, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_zeb_quick_products_active_cat ON zeb_quick.products (is_active, category_group, subcategory_slug);
CREATE INDEX IF NOT EXISTS idx_zeb_quick_products_pincode ON zeb_quick.products (pickup_pincode, is_active);
CREATE INDEX IF NOT EXISTS idx_zeb_quick_orders_user ON zeb_quick.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zeb_quick_orders_status ON zeb_quick.orders (order_status, promised_delivery_at);
CREATE INDEX IF NOT EXISTS idx_zeb_quick_order_items_seller ON zeb_quick.order_items (seller_id, created_at DESC);

-- RLS Policies
ALTER TABLE zeb_quick.allowed_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.serviceable_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeb_quick.seller_payout_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active zeb_quick subcategories" ON zeb_quick.allowed_subcategories;
CREATE POLICY "Public read active zeb_quick subcategories" ON zeb_quick.allowed_subcategories
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read active zeb_quick pincodes" ON zeb_quick.serviceable_pincodes;
CREATE POLICY "Public read active zeb_quick pincodes" ON zeb_quick.serviceable_pincodes
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read active zeb_quick sellers" ON zeb_quick.sellers;
CREATE POLICY "Public read active zeb_quick sellers" ON zeb_quick.sellers
  FOR SELECT USING (is_active = TRUE AND is_approved = TRUE);

DROP POLICY IF EXISTS "Public read active zeb_quick products" ON zeb_quick.products;
CREATE POLICY "Public read active zeb_quick products" ON zeb_quick.products
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users manage own zeb_quick wishlist" ON zeb_quick.wishlists;
CREATE POLICY "Users manage own zeb_quick wishlist" ON zeb_quick.wishlists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own zeb_quick orders" ON zeb_quick.orders;
CREATE POLICY "Users read own zeb_quick orders" ON zeb_quick.orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own zeb_quick order_items" ON zeb_quick.order_items;
CREATE POLICY "Users read own zeb_quick order_items" ON zeb_quick.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM zeb_quick.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA zeb_quick TO service_role;
GRANT SELECT ON zeb_quick.allowed_subcategories, zeb_quick.serviceable_pincodes, zeb_quick.sellers, zeb_quick.products TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON zeb_quick.wishlists TO authenticated;
GRANT SELECT ON zeb_quick.orders, zeb_quick.order_items TO authenticated;

-- Seed Allowed Subcategories
INSERT INTO zeb_quick.allowed_subcategories (slug, name, category_group, keywords, display_order) VALUES
  ('bras', 'Bras', 'Women''s Innerwear', ARRAY['bra','bras','sports bra','padded bra'], 1),
  ('panties', 'Panties', 'Women''s Innerwear', ARRAY['panty','panties','hipster'], 2),
  ('camisoles', 'Camisoles', 'Women''s Innerwear', ARRAY['camisole','camisoles'], 3),
  ('slips', 'Slips', 'Women''s Innerwear', ARRAY['slip','slips','petticoat'], 4),
  ('womens-shorts', 'Women''s Shorts', 'Women''s Innerwear', ARRAY['women shorts','cycling shorts'], 5),
  ('shapewear', 'Shapewear', 'Women''s Innerwear', ARRAY['shapewear','body shaper'], 6),
  ('mens-underwear', 'Men''s Underwear', 'Men''s Innerwear', ARRAY['mens underwear','underwear'], 7),
  ('vest-sando-ganji', 'Vest / Sando Ganji', 'Men''s Innerwear', ARRAY['vest','sando','ganji','baniyan'], 8),
  ('boxer-shorts', 'Boxer Shorts', 'Men''s Innerwear', ARRAY['boxer','boxers','boxer shorts'], 9),
  ('trunks', 'Trunks', 'Men''s Innerwear', ARRAY['trunk','trunks'], 10),
  ('briefs', 'Briefs', 'Men''s Innerwear', ARRAY['brief','briefs'], 11),
  ('bermudas', 'Bermudas', 'Men''s Dailywear', ARRAY['bermuda','bermudas'], 12),
  ('sports-pants', 'Sports Pants', 'Men''s Dailywear', ARRAY['sports pant','sports pants','jogger','joggers'], 13),
  ('track-pants', 'Track Pants', 'Men''s Dailywear', ARRAY['track pant','track pants'], 14),
  ('lounge-pants', 'Lounge Pants', 'Men''s Dailywear', ARRAY['lounge pant','lounge pants','pyjama'], 15),
  ('mens-shorts', 'Shorts', 'Men''s Dailywear', ARRAY['shorts'], 16),
  ('belts', 'Belts', 'Fashion Accessories', ARRAY['belt','belts'], 17),
  ('money-purses', 'Money Purses', 'Fashion Accessories', ARRAY['money purse','purse'], 18),
  ('wallets', 'Wallets', 'Fashion Accessories', ARRAY['wallet','wallets'], 19),
  ('card-holders', 'Card Holders', 'Fashion Accessories', ARRAY['card holder','card holders'], 20),
  ('keychains', 'Keychains', 'Fashion Accessories', ARRAY['keychain','keychains'], 21),
  ('socks', 'Socks', 'Everyday Essentials', ARRAY['sock','socks'], 22),
  ('handkerchief', 'Handkerchief', 'Everyday Essentials', ARRAY['handkerchief','hanky','rumal'], 23),
  ('nightwear', 'Nightwear', 'Everyday Essentials', ARRAY['nightwear','nighty','sleepwear'], 24)
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Serviceable Corridor: Sealdah -> Krishnanagar
INSERT INTO zeb_quick.serviceable_pincodes (pincode, area_name, city, corridor_name, is_active) VALUES
  ('700014', 'Sealdah / Entally', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700009', 'Sealdah / Amherst Street', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700004', 'Shyambazar / Bidhan Sarani', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700028', 'Dum Dum', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700030', 'Dum Dum / Sinthi', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700050', 'Sinthee / Baranagar', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700074', 'Dum Dum Cantonment', 'Kolkata', 'Sealdah-Krishnanagar', TRUE),
  ('700056', 'Belghoria / Agarpara', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700110', 'Sodepur', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700114', 'Sodepur / Panihati', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700115', 'Khardah', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700118', 'Titagarh / Barrackpore', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700120', 'Barrackpore', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700122', 'Barrackpore / Palta', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('700123', 'Ichapur', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('743144', 'Shyamnagar', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('743132', 'Jagaddal / Kankinara', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('743165', 'Naihati', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('743166', 'Halisahar', 'North 24 Parganas', 'Sealdah-Krishnanagar', TRUE),
  ('741235', 'Kalyani', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741245', 'Kalyani / Gayeshpur', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741222', 'Chakdaha', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741201', 'Ranaghat', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741202', 'Ranaghat / Habibpur', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741404', 'Shantipur / Phulia', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741254', 'Birnagar / Taherpur', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741101', 'Krishnanagar', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741102', 'Krishnanagar / Ghurni', 'Nadia', 'Sealdah-Krishnanagar', TRUE),
  ('741103', 'Krishnanagar / Shaktinagar', 'Nadia', 'Sealdah-Krishnanagar', TRUE)
ON CONFLICT (pincode) DO NOTHING;
