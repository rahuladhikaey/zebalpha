-- ==============================================================================
-- ZEBALPHA ENTERPRISE — PERSONALIZED PRODUCT RECOMMENDATION SYSTEM
-- Migration: supabase/add_personalized_recommendation_system.sql
-- Purpose:
--   1. Cross-platform behavioral event collection (Web + Android App)
--   2. Recommendation impression & click attribution tracking
--   3. Anonymous session -> authenticated user merge RPC (secure cross-device sync)
--   4. Indexed catalog/recommendation query paths & automated retention purge
--   5. Strict RLS isolation (privacy-conscious analytics)
-- Backward Compatibility: Purely additive & idempotent (IF NOT EXISTS / OR REPLACE).
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CUSTOMER PRODUCT EVENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_product_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(128) NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL CHECK (
        event_type IN (
            'product_viewed',
            'product_searched',
            'category_viewed',
            'wishlist_added',
            'cart_added',
            'cart_removed',
            'product_purchased',
            'recommendation_clicked'
        )
    ),
    platform VARCHAR(16) NOT NULL DEFAULT 'website' CHECK (platform IN ('android', 'website')),
    search_query TEXT,
    recommendation_surface VARCHAR(64),
    recommendation_strategy VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    dedup_key VARCHAR(180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '180 days')
);

CREATE INDEX IF NOT EXISTS idx_cpe_user_created
    ON public.customer_product_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cpe_session_created
    ON public.customer_product_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cpe_product_event_created
    ON public.customer_product_events (product_id, event_type, created_at DESC)
    WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cpe_category_event_created
    ON public.customer_product_events (category_id, event_type, created_at DESC)
    WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cpe_event_type_created
    ON public.customer_product_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cpe_platform_created
    ON public.customer_product_events (platform, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpe_dedup_key_unique
    ON public.customer_product_events (dedup_key)
    WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cpe_expires_at
    ON public.customer_product_events (expires_at);

-- ------------------------------------------------------------------------------
-- 2. PRODUCT RECOMMENDATION IMPRESSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_recommendation_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(128) NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    surface VARCHAR(64) NOT NULL DEFAULT 'suggested_for_you' CHECK (
        surface IN ('suggested_for_you', 'recently_viewed', 'similar_products', 'trending', 'recommended_page')
    ),
    strategy VARCHAR(64) NOT NULL DEFAULT 'hybrid',
    position_index INT NOT NULL DEFAULT 0,
    platform VARCHAR(16) NOT NULL DEFAULT 'website' CHECK (platform IN ('android', 'website')),
    impression_token VARCHAR(180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_pri_product_created
    ON public.product_recommendation_impressions (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pri_surface_created
    ON public.product_recommendation_impressions (surface, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pri_user_created
    ON public.product_recommendation_impressions (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pri_session_created
    ON public.product_recommendation_impressions (session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pri_token_unique
    ON public.product_recommendation_impressions (impression_token)
    WHERE impression_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pri_expires_at
    ON public.product_recommendation_impressions (expires_at);

-- ------------------------------------------------------------------------------
-- 3. RECOMMENDATION CLICK & ATTRIBUTION EVENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recommendation_click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(128) NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    surface VARCHAR(64) NOT NULL DEFAULT 'suggested_for_you' CHECK (
        surface IN ('suggested_for_you', 'recently_viewed', 'similar_products', 'trending', 'recommended_page')
    ),
    strategy VARCHAR(64) NOT NULL DEFAULT 'hybrid',
    position_index INT NOT NULL DEFAULT 0,
    platform VARCHAR(16) NOT NULL DEFAULT 'website' CHECK (platform IN ('android', 'website')),
    added_to_cart BOOLEAN NOT NULL DEFAULT FALSE,
    added_to_wishlist BOOLEAN NOT NULL DEFAULT FALSE,
    purchased BOOLEAN NOT NULL DEFAULT FALSE,
    attributed_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    attributed_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    attributed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days')
);

CREATE INDEX IF NOT EXISTS idx_rce_product_created
    ON public.recommendation_click_events (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rce_category_created
    ON public.recommendation_click_events (category_id, created_at DESC)
    WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rce_user_created
    ON public.recommendation_click_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rce_session_created
    ON public.recommendation_click_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rce_surface_platform_created
    ON public.recommendation_click_events (surface, platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rce_added_to_cart
    ON public.recommendation_click_events (added_to_cart, created_at DESC)
    WHERE added_to_cart = TRUE;

CREATE INDEX IF NOT EXISTS idx_rce_purchased
    ON public.recommendation_click_events (purchased, created_at DESC)
    WHERE purchased = TRUE;

CREATE INDEX IF NOT EXISTS idx_rce_expires_at
    ON public.recommendation_click_events (expires_at);

-- ------------------------------------------------------------------------------
-- 4. SUPPORTING INDEXES ON EXISTING CATALOG & ORDER TABLES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_rec_eligible
    ON public.products (created_at DESC)
    WHERE (is_active IS TRUE OR is_active IS NULL)
      AND (approval_status IS NULL OR approval_status <> 'rejected');

CREATE INDEX IF NOT EXISTS idx_products_category_rec_active
    ON public.products (category_id, created_at DESC)
    WHERE (is_active IS TRUE OR is_active IS NULL);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_rec
    ON public.orders (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. STRICT ROW-LEVEL SECURITY (PRIVACY-CONSCIOUS ACCESS CONTROL)
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_click_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_product_events FROM anon, public;
REVOKE ALL ON TABLE public.product_recommendation_impressions FROM anon, public;
REVOKE ALL ON TABLE public.recommendation_click_events FROM anon, public;

GRANT SELECT ON TABLE public.customer_product_events TO authenticated;
GRANT SELECT ON TABLE public.product_recommendation_impressions TO authenticated;
GRANT SELECT ON TABLE public.recommendation_click_events TO authenticated;

GRANT ALL ON TABLE public.customer_product_events TO service_role;
GRANT ALL ON TABLE public.product_recommendation_impressions TO service_role;
GRANT ALL ON TABLE public.recommendation_click_events TO service_role;

DROP POLICY IF EXISTS "Users can view own product events" ON public.customer_product_events;
CREATE POLICY "Users can view own product events"
    ON public.customer_product_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to customer_product_events" ON public.customer_product_events;
CREATE POLICY "Service role full access to customer_product_events"
    ON public.customer_product_events
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view own recommendation impressions" ON public.product_recommendation_impressions;
CREATE POLICY "Users can view own recommendation impressions"
    ON public.product_recommendation_impressions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to product_recommendation_impressions" ON public.product_recommendation_impressions;
CREATE POLICY "Service role full access to product_recommendation_impressions"
    ON public.product_recommendation_impressions
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view own recommendation clicks" ON public.recommendation_click_events;
CREATE POLICY "Users can view own recommendation clicks"
    ON public.recommendation_click_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to recommendation_click_events" ON public.recommendation_click_events;
CREATE POLICY "Service role full access to recommendation_click_events"
    ON public.recommendation_click_events
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- ------------------------------------------------------------------------------
-- 6. ANONYMOUS SESSION -> AUTHENTICATED USER SYNC FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_anonymous_recommendation_events(
    p_session_id TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_events_updated INT := 0;
    v_impressions_updated INT := 0;
    v_clicks_updated INT := 0;
BEGIN
    IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 OR p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'merged_events', 0,
            'merged_impressions', 0,
            'merged_clicks', 0
        );
    END IF;

    -- Associate anonymous events from the last 30 days belonging to this session_id
    UPDATE public.customer_product_events
    SET user_id = p_user_id
    WHERE session_id = p_session_id
      AND user_id IS NULL
      AND created_at >= NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_events_updated = ROW_COUNT;

    UPDATE public.product_recommendation_impressions
    SET user_id = p_user_id
    WHERE session_id = p_session_id
      AND user_id IS NULL
      AND created_at >= NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_impressions_updated = ROW_COUNT;

    UPDATE public.recommendation_click_events
    SET user_id = p_user_id
    WHERE session_id = p_session_id
      AND user_id IS NULL
      AND created_at >= NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_clicks_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'merged_events', v_events_updated,
        'merged_impressions', v_impressions_updated,
        'merged_clicks', v_clicks_updated
    );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_anonymous_recommendation_events(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_anonymous_recommendation_events(TEXT, UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 7. DATA RETENTION PURGE FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_recommendation_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_events INT := 0;
    v_deleted_impressions INT := 0;
    v_deleted_clicks INT := 0;
BEGIN
    DELETE FROM public.customer_product_events
    WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

    DELETE FROM public.product_recommendation_impressions
    WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_impressions = ROW_COUNT;

    DELETE FROM public.recommendation_click_events
    WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_clicks = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_events', v_deleted_events,
        'deleted_impressions', v_deleted_impressions,
        'deleted_clicks', v_deleted_clicks
    );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_recommendation_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_recommendation_data() TO service_role;

COMMIT;
