-- ============================================================================
-- ZEBALPHA SERVER-DRIVEN UI (SDUI) & DYNAMIC STOREFRONT LAYOUT ENGINE
-- FlipKart / Meesho Multi-Widget Architecture (Zero Extra Egress, Single-Key Cache)
-- ============================================================================

BEGIN;

-- 1. Ensure promotional_campaigns & promotional_campaign_slots exist for the 16-Slot Festive Grid
CREATE TABLE IF NOT EXISTS public.promotional_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'TOP DEALS',
  subtitle TEXT NOT NULL DEFAULT 'Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger',
  slug TEXT NOT NULL UNIQUE DEFAULT 'top-deals',
  theme_preset TEXT NOT NULL DEFAULT 'champagne_gold_luxury',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused')),
  total_slots INTEGER NOT NULL DEFAULT 16,
  grid_columns INTEGER NOT NULL DEFAULT 4,
  website_enabled BOOLEAN NOT NULL DEFAULT true,
  android_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotional_campaign_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.promotional_campaigns(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 16),
  title TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  destination_type TEXT NOT NULL DEFAULT 'category',
  destination_url TEXT NOT NULL DEFAULT '/products',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, slot_number)
);

-- Enable RLS with public read for published campaigns
ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_campaign_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read promotional_campaigns" ON public.promotional_campaigns;
CREATE POLICY "Public read promotional_campaigns"
  ON public.promotional_campaigns
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read promotional_campaign_slots" ON public.promotional_campaign_slots;
CREATE POLICY "Public read promotional_campaign_slots"
  ON public.promotional_campaign_slots
  FOR SELECT
  USING (true);

-- Seed default 'top-deals' campaign if missing
INSERT INTO public.promotional_campaigns (
  title,
  subtitle,
  slug,
  theme_preset,
  status,
  total_slots,
  grid_columns,
  website_enabled,
  android_enabled,
  display_order
)
VALUES (
  'TOP DEALS',
  'Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger',
  'top-deals',
  'champagne_gold_luxury',
  'draft',
  16,
  4,
  true,
  true,
  1
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed default SDUI Homepage Layout Blueprint in store_settings (if not already present)
DO $$
DECLARE
  v_default_sdui JSONB := '{
    "version": 1,
    "updated_at": "2026-11-24T00:00:00.000Z",
    "global_theme": {
      "header_backdrop": "festive_coral_gold",
      "announcement_bar_enabled": true,
      "trust_bar_enabled": true,
      "free_shipping_threshold": 499,
      "trust_badges": [
        { "icon": "truck", "title": "Free Delivery", "subtitle": "on ₹499+" },
        { "icon": "shield", "title": "Easy Returns", "subtitle": "5-Day Policy" },
        { "icon": "badge", "title": "Secure Shopping", "subtitle": "100% Safe" }
      ],
      "marquee_items": [
        { "icon": "crown", "text": "ZEBALPHA • CLOTHING FOR THE CULTURE" },
        { "icon": "flame", "text": "NEW SEASON DROP • AUTHENTIC STREETWEAR" },
        { "icon": "shield", "text": "100% PREMIUM COMBED COTTON" },
        { "icon": "truck", "text": "FREE EXPRESS SHIPPING ON ORDERS OVER ₹499" },
        { "icon": "tag", "text": "FLAT ₹100 OFF ON 1ST ORDER (CODE: FIRST100)" }
      ]
    },
    "widgets": [
      {
        "id": "hero_carousel",
        "widget_type": "HERO_CAROUSEL",
        "title": "Main Hero Banners",
        "subtitle": "Top sliding promotional banners",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 1,
        "config": {}
      },
      {
        "id": "trust_badge_strip",
        "widget_type": "TRUST_BADGE_STRIP",
        "title": "3-Column Trust & Delivery Strip",
        "subtitle": "Free Delivery, Easy Returns, Secure Shopping",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 2,
        "config": {}
      },
      {
        "id": "marquee_ticker",
        "widget_type": "MARQUEE_TICKER",
        "title": "Scrolling Champagne-Gold Offer Marquee",
        "subtitle": "Continuous promotional announcement ticker",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 3,
        "config": {}
      },
      {
        "id": "curated_collections",
        "widget_type": "CURATED_COLLECTIONS",
        "title": "Curated Collections",
        "subtitle": "Handpicked styles for the culture",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 4,
        "config": {}
      },
      {
        "id": "promo_drop_carousel",
        "widget_type": "PROMO_DROP_CAROUSEL",
        "title": "1st Order ₹100 OFF & New Season Drop Slider",
        "subtitle": "Auto-sliding conversion cards",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 5,
        "config": {
          "show_first_order_slide": true,
          "show_new_drop_slide": true
        }
      },
      {
        "id": "flash_deal_strip",
        "widget_type": "FLASH_DEAL_STRIP",
        "title": "Flash Culture Deals",
        "subtitle": "Limited-time price drops — grab before timer ends",
        "enabled": false,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 6,
        "config": {
          "badge_text": "LIVE FLASH SALE",
          "ends_at": "",
          "product_ids": [],
          "max_items": 8,
          "cta_label": "View All Deals",
          "cta_href": "/products"
        }
      },
      {
        "id": "festive_16_slot_grid",
        "widget_type": "FESTIVE_16_SLOT_GRID",
        "title": "TOP DEALS",
        "subtitle": "Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 7,
        "config": {
          "campaign_slug": "top-deals"
        }
      },
      {
        "id": "custom_studio_editorial",
        "widget_type": "CUSTOM_STUDIO_EDITORIAL",
        "title": "Customize & Wear Your Art",
        "subtitle": "Tap any artwork below to open Custom Studio with that exact design ready on tees, hoodies & totes.",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 8,
        "config": {
          "eyebrow": "ZEBALPHA CUSTOM STUDIO",
          "title_line_1": "Customize &",
          "title_line_2": "Wear Your Art"
        }
      },
      {
        "id": "seller_brand_spotlight",
        "widget_type": "SELLER_BRAND_SPOTLIGHT",
        "title": "Featured Brand Showcase",
        "subtitle": "Spotlight • Emerging Indian Brands",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 9,
        "config": {}
      },
      {
        "id": "featured_product_feed",
        "widget_type": "FEATURED_PRODUCT_FEED",
        "title": "Our Products",
        "subtitle": "Streetwear, polos, hoodies & curated culture drops",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 10,
        "config": {
          "cta_label": "Create",
          "cta_href": "/customize"
        }
      },
      {
        "id": "recently_viewed",
        "widget_type": "RECENTLY_VIEWED",
        "title": "Recently Viewed",
        "subtitle": "Pick up right where you left off",
        "enabled": true,
        "web_enabled": true,
        "app_enabled": true,
        "display_order": 11,
        "config": {}
      }
    ]
  }'::jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM public.store_settings WHERE key = 'sdui_homepage_layout_v1') THEN
      INSERT INTO public.store_settings (key, value, updated_at)
      VALUES ('sdui_homepage_layout_v1', v_default_sdui, now());
    END IF;
  END IF;
END $$;

COMMIT;
