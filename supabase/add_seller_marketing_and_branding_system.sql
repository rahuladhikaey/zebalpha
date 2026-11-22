-- =============================================================================
-- ZEBALPHA SELLER MARKETING SUITE (1. INFLUENCER MARKETING + 2. APP BRANDING)
-- Idempotent migration: safe to re-run in Supabase SQL Editor.
-- =============================================================================

-- 1. Seller Influencer Marketing Catalog Enrollments
CREATE TABLE IF NOT EXISTS public.seller_influencer_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT,
  product_image TEXT,
  product_price NUMERIC(12, 2) DEFAULT 0,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (commission_rate >= 0.5 AND commission_rate <= 25),
  max_budget_cap NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  delivered_orders INTEGER NOT NULL DEFAULT 0,
  delivered_gmv NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_accrued NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_influencer_enrollments_seller
  ON public.seller_influencer_enrollments (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_seller_influencer_enrollments_product
  ON public.seller_influencer_enrollments (product_id);

-- 2. Creator / Alpha Media Tracking Links & Published Reels
CREATE TABLE IF NOT EXISTS public.influencer_creator_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.seller_influencer_enrollments(id) ON DELETE SET NULL,
  seller_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  creator_name TEXT NOT NULL DEFAULT 'Alpha Media Creator',
  creator_handle TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'youtube', 'facebook', 'zebalpha_app')),
  video_url TEXT,
  ref_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
  clicks INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  delivered_orders INTEGER NOT NULL DEFAULT 0,
  gmv NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influencer_creator_links_seller
  ON public.influencer_creator_links (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_influencer_creator_links_ref
  ON public.influencer_creator_links (ref_code);

-- 3. Seller Marketing Callback Requests (Routed to Alpha Media & Seller Support)
CREATE TABLE IF NOT EXISTS public.seller_marketing_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  seller_name TEXT,
  phone TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'influencer_marketing' CHECK (topic IN ('influencer_marketing', 'app_branding')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_marketing_callbacks_status
  ON public.seller_marketing_callbacks (status, created_at DESC);

-- 4. Seller App Branding Campaigns (Storefront Spotlight & Top Search Boost)
CREATE TABLE IF NOT EXISTS public.seller_branding_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  package_key TEXT NOT NULL CHECK (package_key IN ('launch_pilot', 'starter_boost', 'homepage_spotlight', 'brand_takeover')),
  placement_type TEXT NOT NULL CHECK (placement_type IN ('top_search', 'homepage_spotlight', 'brand_takeover')),
  product_ids TEXT[] NOT NULL DEFAULT '{}',
  headline TEXT NOT NULL,
  tagline TEXT,
  banner_image_url TEXT,
  cta_url TEXT,
  duration_days INTEGER NOT NULL DEFAULT 7,
  amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'launch_pilot' CHECK (payment_method IN ('launch_pilot', 'razorpay_upi', 'seller_balance', 'upi_manual')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('free_pilot', 'pending', 'paid', 'deducted', 'refunded')),
  payment_ref TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (approval_status IN ('pending_review', 'approved', 'live', 'rejected', 'paused', 'completed')),
  rejection_reason TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  attributed_orders INTEGER NOT NULL DEFAULT 0,
  attributed_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_branding_campaigns_seller
  ON public.seller_branding_campaigns (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_branding_campaigns_live
  ON public.seller_branding_campaigns (approval_status, starts_at, ends_at);

-- 5. Marketing Attribution & Analytics Events Ledger
CREATE TABLE IF NOT EXISTS public.seller_marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('influencer_click', 'influencer_order', 'branding_impression', 'branding_click', 'branding_order')),
  campaign_id UUID,
  ref_code TEXT,
  seller_id TEXT,
  product_id TEXT,
  order_id TEXT,
  order_amount NUMERIC(12, 2) DEFAULT 0,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_marketing_events_campaign
  ON public.seller_marketing_events (campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_seller_marketing_events_ref
  ON public.seller_marketing_events (ref_code, event_type);

-- Enable Row Level Security
ALTER TABLE public.seller_influencer_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_creator_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_marketing_callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_branding_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_marketing_events ENABLE ROW LEVEL SECURITY;

-- Public storefront read access for active/live branding campaigns only
DROP POLICY IF EXISTS "Public read live branding campaigns" ON public.seller_branding_campaigns;
CREATE POLICY "Public read live branding campaigns"
  ON public.seller_branding_campaigns
  FOR SELECT
  USING (approval_status IN ('approved', 'live'));

-- Public read access for active influencer links (for ?ref= validation)
DROP POLICY IF EXISTS "Public read active creator links" ON public.influencer_creator_links;
CREATE POLICY "Public read active creator links"
  ON public.influencer_creator_links
  FOR SELECT
  USING (status = 'active');

-- Authenticated sellers can view their own marketing records
DROP POLICY IF EXISTS "Sellers view own influencer enrollments" ON public.seller_influencer_enrollments;
CREATE POLICY "Sellers view own influencer enrollments"
  ON public.seller_influencer_enrollments
  FOR SELECT
  USING (auth.uid()::text = seller_id);

DROP POLICY IF EXISTS "Sellers view own branding campaigns" ON public.seller_branding_campaigns;
CREATE POLICY "Sellers view own branding campaigns"
  ON public.seller_branding_campaigns
  FOR SELECT
  USING (auth.uid()::text = seller_id);

DROP POLICY IF EXISTS "Sellers view own marketing callbacks" ON public.seller_marketing_callbacks;
CREATE POLICY "Sellers view own marketing callbacks"
  ON public.seller_marketing_callbacks
  FOR SELECT
  USING (auth.uid()::text = seller_id);
