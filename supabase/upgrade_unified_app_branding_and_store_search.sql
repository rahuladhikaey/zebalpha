-- =============================================================================
-- ZEBALPHA UNIFIED APP BRANDING + SELLER-BASED SEARCH & MINI-STOREFRONT ECOSYSTEM
-- 4-Package Suite:
--   Track 1 (App Offer & Festival Ads — Admin Approved):
--     1. app_offer_99_28d      (₹99  / 28 Days)
--     2. festival_mega_139_45d (₹139 / 45 Days)
--   Track 2 (Seller-Based Search + Mini-Storefront + PDP Store Link — Instant):
--     3. store_search_49_18d   (₹49  / 18 Days)
--     4. store_search_59_28d   (₹59  / 28 Days)
--
-- Idempotent additive migration: 100% safe to re-run in Supabase SQL Editor.
-- Preserves all legacy App Branding campaigns & history cleanly.
-- =============================================================================

-- 0. REPAIR EXISTING BROKEN fn_guard_seller_status_changes() TRIGGER FUNCTION
-- Previously referenced optional fields (e.g. OLD.is_approved) directly on record OLD,
-- causing ERROR 42703 on UPDATE to public.sellers when invoked from SQL Editor or non-admin contexts.
-- Rewritten safely with to_jsonb() while preserving 100% of admin/service_role security & guarding Store Pass fields!
CREATE OR REPLACE FUNCTION public.fn_guard_seller_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT := COALESCE(auth.jwt() ->> 'role', '');
  v_is_admin BOOLEAN := FALSE;
  old_j JSONB := to_jsonb(OLD);
  new_j JSONB := to_jsonb(NEW);
BEGIN
  -- Allow privileged SQL Editor roles and backend service_role
  IF v_jwt_role = 'service_role' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Preserve original check: allow verified platform admins in public.profiles
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role = 'super_admin' OR role = 'admin')
    ) INTO v_is_admin;
  END IF;

  -- If caller is NOT a verified platform admin, reject administrative or Store Pass tampering
  -- Uses to_jsonb() so missing optional columns never throw ERROR 42703
  IF NOT v_is_admin THEN
    IF (old_j->'status' IS DISTINCT FROM new_j->'status')
       OR (old_j->'account_status' IS DISTINCT FROM new_j->'account_status')
       OR (old_j->'is_suspended' IS DISTINCT FROM new_j->'is_suspended')
       OR (old_j->'is_approved' IS DISTINCT FROM new_j->'is_approved')
       OR (old_j->'seller_id' IS DISTINCT FROM new_j->'seller_id')
       OR (old_j->'store_pass_status' IS DISTINCT FROM new_j->'store_pass_status')
       OR (old_j->'store_pass_expires_at' IS DISTINCT FROM new_j->'store_pass_expires_at')
       OR (old_j->'store_pass_trial_used' IS DISTINCT FROM new_j->'store_pass_trial_used')
       OR (old_j->'store_slug_blocked' IS DISTINCT FROM new_j->'store_slug_blocked')
    THEN
      RAISE EXCEPTION 'Access Denied: Modifications to seller status, approval, suspension, or Store Pass are restricted to platform administrators.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 1. EXTEND public.sellers WITH MINI-STOREFRONT & STORE SEARCH PASS COLUMNS
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS store_slug TEXT,
  ADD COLUMN IF NOT EXISTS store_tagline TEXT,
  ADD COLUMN IF NOT EXISTS store_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS store_pass_plan TEXT,
  ADD COLUMN IF NOT EXISTS store_pass_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS store_pass_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_pass_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_pass_trial_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_pass_trial_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_pass_renewal_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_search_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_store_searches INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_store_visits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_slug_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_slug_block_reason TEXT;

-- Ensure store_pass_status stays within allowed enum values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sellers_store_pass_status_check'
      AND conrelid = 'public.sellers'::regclass
  ) THEN
    ALTER TABLE public.sellers
      ADD CONSTRAINT sellers_store_pass_status_check
      CHECK (store_pass_status IN ('inactive', 'active', 'expired'));
  END IF;
END $$;

-- Auto-backfill unique URL-safe store_slug for existing sellers that don't have one yet
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  short_suffix TEXT;
  reserved_slugs TEXT[] := ARRAY[
    'zebalpha', 'official', 'admin', 'superadmin', 'seller', 'sellers',
    'support', 'store', 'stores', 'shop', 'api', 'login', 'signup',
    'cart', 'checkout', 'products', 'product', 'go', 'new-drops',
    'categories', 'profile', 'orders', 'wishlist', 'media', 'help'
  ];
BEGIN
  FOR rec IN
    SELECT id::text AS sid, COALESCE(NULLIF(TRIM(business_name), ''), 'seller-store') AS bname
    FROM public.sellers
    WHERE store_slug IS NULL OR TRIM(store_slug) = ''
  LOOP
    base_slug := LOWER(REGEXP_REPLACE(rec.bname, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := TRIM(BOTH '-' FROM base_slug);
    IF LENGTH(base_slug) < 3 THEN
      base_slug := 'shop-' || COALESCE(NULLIF(base_slug, ''), 'brand');
    END IF;
    base_slug := LEFT(base_slug, 32);
    short_suffix := LOWER(RIGHT(REGEXP_REPLACE(rec.sid, '[^a-zA-Z0-9]', '', 'g'), 4));
    IF short_suffix = '' THEN
      short_suffix := '1001';
    END IF;

    IF base_slug = ANY(reserved_slugs) THEN
      candidate_slug := base_slug || '-' || short_suffix;
    ELSE
      candidate_slug := base_slug;
    END IF;

    -- Guarantee uniqueness if another seller already owns candidate_slug
    IF EXISTS (
      SELECT 1 FROM public.sellers
      WHERE LOWER(store_slug) = LOWER(candidate_slug)
        AND id::text <> rec.sid
    ) THEN
      candidate_slug := LEFT(base_slug, 27) || '-' || short_suffix;
    END IF;

    -- Final collision guard
    IF EXISTS (
      SELECT 1 FROM public.sellers
      WHERE LOWER(store_slug) = LOWER(candidate_slug)
        AND id::text <> rec.sid
    ) THEN
      candidate_slug := LEFT(base_slug, 22) || '-' || short_suffix || '-' || FLOOR(100 + RANDOM() * 899)::int::text;
    END IF;

    UPDATE public.sellers
    SET store_slug = candidate_slug
    WHERE id::text = rec.sid
      AND (store_slug IS NULL OR TRIM(store_slug) = '');
  END LOOP;
END $$;

-- Unique case-insensitive store_slug index + fast search lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_store_slug_lower
  ON public.sellers (LOWER(store_slug))
  WHERE store_slug IS NOT NULL AND TRIM(store_slug) <> '';

CREATE INDEX IF NOT EXISTS idx_sellers_business_name_lower
  ON public.sellers (LOWER(business_name))
  WHERE business_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sellers_active_store_pass
  ON public.sellers (store_pass_status, store_pass_expires_at DESC)
  WHERE store_pass_status = 'active' AND store_slug_blocked = FALSE;

CREATE INDEX IF NOT EXISTS idx_products_seller_active_created
  ON public.products (seller_id, is_active, created_at DESC);


-- 2. EXPAND public.seller_branding_campaigns FOR THE 4 NEW UNIFIED PACKAGES
ALTER TABLE public.seller_branding_campaigns
  ADD COLUMN IF NOT EXISTS offer_badge TEXT,
  ADD COLUMN IF NOT EXISTS payment_order_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_txn_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Safely replace CHECK constraints on package_key, placement_type & payment_method
-- while remaining 100% backward-compatible with legacy records
DO $$
DECLARE
  c_rec RECORD;
BEGIN
  FOR c_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.seller_branding_campaigns'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%package_key%'
        OR pg_get_constraintdef(oid) ILIKE '%placement_type%'
        OR pg_get_constraintdef(oid) ILIKE '%payment_method%'
      )
  LOOP
    EXECUTE FORMAT('ALTER TABLE public.seller_branding_campaigns DROP CONSTRAINT IF EXISTS %I', c_rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.seller_branding_campaigns
  ADD CONSTRAINT seller_branding_campaigns_package_key_check
  CHECK (package_key IN (
    'app_offer_99_28d',
    'festival_mega_139_45d',
    'store_search_free_60d',
    'store_search_49_18d',
    'store_search_59_28d',
    -- Legacy keys kept strictly for backward compatibility with historical rows
    'launch_pilot',
    'starter_boost',
    'homepage_spotlight',
    'brand_takeover'
  ));

ALTER TABLE public.seller_branding_campaigns
  ADD CONSTRAINT seller_branding_campaigns_placement_type_check
  CHECK (placement_type IN (
    'top_search',
    'homepage_spotlight',
    'brand_takeover',
    'store_search'
  ));

ALTER TABLE public.seller_branding_campaigns
  ADD CONSTRAINT seller_branding_campaigns_payment_method_check
  CHECK (payment_method IN (
    'online_checkout',
    'seller_balance',
    'free_trial',
    -- Legacy methods kept for backward compatibility
    'launch_pilot',
    'razorpay_upi',
    'upi_manual'
  ));


-- 3. PERMANENT FINANCIAL AUDIT LEDGER FOR ALL APP BRANDING & STORE PASS PAYMENTS
CREATE TABLE IF NOT EXISTS public.seller_branding_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  store_name TEXT,
  campaign_id UUID REFERENCES public.seller_branding_campaigns(id) ON DELETE SET NULL,
  package_key TEXT NOT NULL,
  track_type TEXT NOT NULL CHECK (track_type IN ('app_ad', 'store_pass')),
  amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 18,
  payment_method TEXT NOT NULL DEFAULT 'online_checkout',
  gateway_order_id TEXT,
  gateway_payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_branding_tx_seller
  ON public.seller_branding_transactions (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_branding_tx_track
  ON public.seller_branding_transactions (track_type, status, created_at DESC);

ALTER TABLE public.seller_branding_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers view own branding transactions" ON public.seller_branding_transactions;
CREATE POLICY "Sellers view own branding transactions"
  ON public.seller_branding_transactions
  FOR SELECT
  USING (auth.uid()::text = seller_id);


-- 4. ATOMIC METRIC INCREMENT RPC (STORE SEARCHES, VISITS, MISSED TRAFFIC FOMO)
CREATE OR REPLACE FUNCTION public.increment_seller_store_metric(
  p_seller_id TEXT,
  p_metric TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_seller_id IS NULL OR TRIM(p_seller_id) = '' THEN
    RETURN;
  END IF;

  IF p_metric = 'store_search' THEN
    UPDATE public.sellers
    SET store_search_count = COALESCE(store_search_count, 0) + 1
    WHERE id::text = p_seller_id;
  ELSIF p_metric = 'store_visit' THEN
    UPDATE public.sellers
    SET store_visit_count = COALESCE(store_visit_count, 0) + 1
    WHERE id::text = p_seller_id;
  ELSIF p_metric = 'missed_search' THEN
    UPDATE public.sellers
    SET missed_store_searches = COALESCE(missed_store_searches, 0) + 1
    WHERE id::text = p_seller_id;
  ELSIF p_metric = 'missed_visit' THEN
    UPDATE public.sellers
    SET missed_store_visits = COALESCE(missed_store_visits, 0) + 1
    WHERE id::text = p_seller_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_seller_store_metric(TEXT, TEXT) TO service_role;
