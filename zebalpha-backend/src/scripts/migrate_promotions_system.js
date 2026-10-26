import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../back.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SEED_SLOTS = [
  {
    slot_number: 1,
    title: 'Festive Lights',
    price_label: 'From ₹69',
    image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/home-kitchen'
  },
  {
    slot_number: 2,
    title: 'Diwali Decor',
    price_label: 'From ₹69',
    image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/home-kitchen'
  },
  {
    slot_number: 3,
    title: 'Puja Essentials',
    price_label: 'From ₹79',
    image_url: 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/home-kitchen'
  },
  {
    slot_number: 4,
    title: 'Car Audio',
    price_label: 'From ₹999',
    image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/audio-headphones'
  },
  {
    slot_number: 5,
    title: 'Shoe Rack',
    price_label: 'From ₹99',
    image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/home-kitchen'
  },
  {
    slot_number: 6,
    title: 'Kitchen Bestseller',
    price_label: 'From ₹69',
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/kitchenware-storage'
  },
  {
    slot_number: 7,
    title: "Men's T-shirt",
    price_label: 'From ₹99',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/t-shirts'
  },
  {
    slot_number: 8,
    title: 'Premium Looks',
    price_label: 'Up to 80% OFF',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/dresses-jumpsuits'
  },
  {
    slot_number: 9,
    title: 'Silk Saree',
    price_label: 'From ₹239',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/sarees-blouses'
  },
  {
    slot_number: 10,
    title: 'Facewashes',
    price_label: 'From ₹79',
    image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/skincare'
  },
  {
    slot_number: 11,
    title: 'Power Bank',
    price_label: 'From ₹235',
    image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/mobile-accessories'
  },
  {
    slot_number: 12,
    title: 'Blanket & Bedsheet',
    price_label: 'From ₹199',
    image_url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/bedsheets-curtains'
  },
  {
    slot_number: 13,
    title: 'Fitness Essentials',
    price_label: 'From ₹99',
    image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/mens-fashion'
  },
  {
    slot_number: 14,
    title: 'Car Subwoofer',
    price_label: 'From ₹2,499',
    image_url: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/audio-headphones'
  },
  {
    slot_number: 15,
    title: 'Wallpaper & Sticker',
    price_label: 'From ₹59',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/home-kitchen'
  },
  {
    slot_number: 16,
    title: 'Skincare & Haircare',
    price_label: 'From ₹49',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
    destination_type: 'category',
    destination_url: '/categories/haircare'
  }
];

async function migrate() {
  console.log('⚡ Starting Promotional Showcase Schema Migration...');

  await pool.query(`
    -- 1. CAMPAIGNS TABLE
    CREATE TABLE IF NOT EXISTS public.promotional_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(100) NOT NULL DEFAULT 'TOP DEALS',
        subtitle TEXT DEFAULT 'Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger',
        slug VARCHAR(100) UNIQUE NOT NULL,
        theme_preset VARCHAR(50) NOT NULL DEFAULT 'diwali_silver_ornate',
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused')),
        total_slots INT NOT NULL DEFAULT 16,
        grid_columns INT NOT NULL DEFAULT 4,
        display_order INT NOT NULL DEFAULT 0,
        website_enabled BOOLEAN NOT NULL DEFAULT true,
        android_enabled BOOLEAN NOT NULL DEFAULT true,
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 2. CAMPAIGN SLOTS TABLE
    CREATE TABLE IF NOT EXISTS public.promotional_campaign_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES public.promotional_campaigns(id) ON DELETE CASCADE,
        slot_number INT NOT NULL CHECK (slot_number BETWEEN 1 AND 16),
        title VARCHAR(100) NOT NULL,
        price_label VARCHAR(50) NOT NULL,
        image_url TEXT NOT NULL,
        destination_type VARCHAR(30) NOT NULL DEFAULT 'category' CHECK (destination_type IN ('category', 'subcategory', 'collection', 'custom')),
        destination_id VARCHAR(100),
        destination_url TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_slot_per_campaign UNIQUE (campaign_id, slot_number)
    );

    -- 3. INDEXES
    CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_status ON public.promotional_campaigns(status, display_order);
    CREATE INDEX IF NOT EXISTS idx_promotional_slots_campaign ON public.promotional_campaign_slots(campaign_id, slot_number);

    -- 4. ENABLE RLS
    ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.promotional_campaign_slots ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Public read access for published campaigns" ON public.promotional_campaigns;
    DROP POLICY IF EXISTS "Public read access for campaign slots" ON public.promotional_campaign_slots;
    DROP POLICY IF EXISTS "Full access for authenticated or service role" ON public.promotional_campaigns;
    DROP POLICY IF EXISTS "Full access for authenticated or service role slots" ON public.promotional_campaign_slots;

    -- Public Read
    CREATE POLICY "Public read access for published campaigns"
      ON public.promotional_campaigns FOR SELECT
      USING (status = 'published');

    CREATE POLICY "Public read access for campaign slots"
      ON public.promotional_campaign_slots FOR SELECT
      USING (is_active = true);

    -- Full access for service_role or authenticated
    CREATE POLICY "Full access for authenticated or service role"
      ON public.promotional_campaigns FOR ALL
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Full access for authenticated or service role slots"
      ON public.promotional_campaign_slots FOR ALL
      USING (true)
      WITH CHECK (true);
  `);

  console.log('✅ Tables and RLS policies created successfully.');

  // Check if TOP DEALS campaign already exists
  const campaignRes = await pool.query(`SELECT id FROM public.promotional_campaigns WHERE slug = 'top-deals'`);
  let campaignId;

  if (campaignRes.rows.length === 0) {
    console.log('Seeding initial "TOP DEALS" campaign...');
    const insertRes = await pool.query(`
      INSERT INTO public.promotional_campaigns (
        title, subtitle, slug, theme_preset, status, total_slots, grid_columns, display_order, website_enabled, android_enabled
      ) VALUES (
        'TOP DEALS',
        'Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger',
        'top-deals',
        'diwali_silver_ornate',
        'published',
        16,
        4,
        1,
        true,
        true
      ) RETURNING id;
    `);
    campaignId = insertRes.rows[0].id;
    console.log(`Created "TOP DEALS" campaign with ID: ${campaignId}`);
  } else {
    campaignId = campaignRes.rows[0].id;
    console.log(`"TOP DEALS" campaign already exists with ID: ${campaignId}`);
  }

  // Seed the 16 slots
  console.log('Seeding 16 slots for "TOP DEALS"...');
  for (const slot of SEED_SLOTS) {
    await pool.query(`
      INSERT INTO public.promotional_campaign_slots (
        campaign_id, slot_number, title, price_label, image_url, destination_type, destination_url, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (campaign_id, slot_number) DO UPDATE SET
        title = EXCLUDED.title,
        price_label = EXCLUDED.price_label,
        image_url = EXCLUDED.image_url,
        destination_type = EXCLUDED.destination_type,
        destination_url = EXCLUDED.destination_url,
        is_active = true,
        updated_at = NOW();
    `, [
      campaignId,
      slot.slot_number,
      slot.title,
      slot.price_label,
      slot.image_url,
      slot.destination_type,
      slot.destination_url
    ]);
  }

  console.log('✅ All 16 slots seeded successfully!');

  // Verify count
  const countRes = await pool.query(
    'SELECT count(*) FROM public.promotional_campaign_slots WHERE campaign_id = $1',
    [campaignId]
  );
  console.log(`Verification: Total slots in DB for campaign: ${countRes.rows[0].count}`);

  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
