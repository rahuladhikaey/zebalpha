-- =============================================================================
-- ZEBALPHA ALPHA MEDIA TEAM & 2-PLAN 7-DAY INFLUENCER MARKETING ECOSYSTEM
-- Additive, idempotent migration on top of:
--   1. supabase/20261109_enterprise_multi_panel_ecosystem_migration.sql
--   2. supabase/add_seller_marketing_and_branding_system.sql
-- Safe to re-run multiple times in Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND seller_influencer_enrollments (2 Plans + 7-Day Window + Workflow)
-- -----------------------------------------------------------------------------
ALTER TABLE public.seller_influencer_enrollments
  ADD COLUMN IF NOT EXISTS campaign_source TEXT NOT NULL DEFAULT 'seller',
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'without_product_1pct',
  ADD COLUMN IF NOT EXISTS fixed_fee_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'commission_only',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS sample_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS sample_return_preference TEXT DEFAULT 'return_after_shoot',
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'awaiting_review',
  ADD COLUMN IF NOT EXISTS accepted_by UUID,
  ADD COLUMN IF NOT EXISTS accepted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_creator_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_creator_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_creator_handle TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by UUID,
  ADD COLUMN IF NOT EXISTS assigned_by_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shoot_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shoot_brief TEXT,
  ADD COLUMN IF NOT EXISTS submitted_video_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_notes TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_feedback TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_duration_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS missed_clicks_after_expiry INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_attach_video_proof BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS seller_store_name TEXT;

-- Safely update CHECK constraints on seller_influencer_enrollments
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.seller_influencer_enrollments'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.seller_influencer_enrollments DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.seller_influencer_enrollments
  ADD CONSTRAINT chk_sie_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 25),
  ADD CONSTRAINT chk_sie_status CHECK (status IN ('pending', 'active', 'paused', 'expired', 'rejected', 'ended')),
  ADD CONSTRAINT chk_sie_campaign_source CHECK (campaign_source IN ('seller', 'zebalpha_own_brand')),
  ADD CONSTRAINT chk_sie_plan_type CHECK (plan_type IN ('without_product_1pct', 'with_product_150')),
  ADD CONSTRAINT chk_sie_payment_method CHECK (payment_method IN ('commission_only', 'upi_manual', 'seller_balance', 'razorpay_upi', 'own_brand')),
  ADD CONSTRAINT chk_sie_payment_status CHECK (payment_status IN ('not_required', 'pending', 'paid', 'deducted', 'waived')),
  ADD CONSTRAINT chk_sie_sample_status CHECK (sample_status IN ('not_required', 'awaiting_sample', 'sample_received', 'in_shoot', 'shoot_completed', 'sample_returned', 'kept_at_studio')),
  ADD CONSTRAINT chk_sie_workflow_status CHECK (workflow_status IN (
    'awaiting_payment', 'awaiting_review', 'accepted', 'assigned',
    'in_production', 'submitted_for_review', 'revision_needed',
    'live', 'expired', 'rejected', 'paused'
  ));

CREATE INDEX IF NOT EXISTS idx_sie_workflow_status
  ON public.seller_influencer_enrollments (workflow_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sie_assigned_creator
  ON public.seller_influencer_enrollments (assigned_creator_id, workflow_status);
CREATE INDEX IF NOT EXISTS idx_sie_expires_at
  ON public.seller_influencer_enrollments (expires_at);

-- -----------------------------------------------------------------------------
-- 2. EXTEND influencer_creator_links (7-Day Expiring Smart Link + Reactivation)
-- -----------------------------------------------------------------------------
ALTER TABLE public.influencer_creator_links
  ADD COLUMN IF NOT EXISTS campaign_source TEXT NOT NULL DEFAULT 'seller',
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'without_product_1pct',
  ADD COLUMN IF NOT EXISTS assigned_creator_id UUID,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS missed_clicks_after_expiry INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS published_by_name TEXT;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.influencer_creator_links'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%status%' OR pg_get_constraintdef(oid) ILIKE '%commission_rate%')
  LOOP
    EXECUTE format('ALTER TABLE public.influencer_creator_links DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.influencer_creator_links
  ADD CONSTRAINT chk_icl_status CHECK (status IN ('pending', 'active', 'expired', 'paused', 'ended')),
  ADD CONSTRAINT chk_icl_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 25);

CREATE INDEX IF NOT EXISTS idx_icl_assigned_creator
  ON public.influencer_creator_links (assigned_creator_id);
CREATE INDEX IF NOT EXISTS idx_icl_enrollment
  ON public.influencer_creator_links (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_icl_expires_at
  ON public.influencer_creator_links (expires_at);

-- -----------------------------------------------------------------------------
-- 3. EXTEND seller_marketing_events (Add influencer_expired_click)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.seller_marketing_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.seller_marketing_events DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.seller_marketing_events
  ADD CONSTRAINT chk_sme_event_type CHECK (event_type IN (
    'influencer_click',
    'influencer_expired_click',
    'influencer_order',
    'branding_impression',
    'branding_click',
    'branding_order'
  ));

-- -----------------------------------------------------------------------------
-- 4. PERMANENT AUDIT LOG TABLE (SuperAdmin Full Saved History — Immutable)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.influencer_campaign_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.seller_influencer_enrollments(id) ON DELETE SET NULL,
  link_id UUID REFERENCES public.influencer_creator_links(id) ON DELETE SET NULL,
  seller_id TEXT,
  product_id TEXT,
  product_name TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'payment_verified',
    'accepted',
    'rejected',
    'sample_received',
    'creator_assigned',
    'video_submitted',
    'revision_requested',
    'published_live',
    'expired',
    'renewed',
    'upgraded',
    'paused',
    'resumed',
    'admin_override'
  )),
  from_plan TEXT,
  to_plan TEXT,
  fee_charged_inr NUMERIC(12, 2) DEFAULT 0,
  duration_days INTEGER,
  actor_user_id UUID,
  actor_role TEXT,
  actor_name TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ical_enrollment
  ON public.influencer_campaign_audit_logs (enrollment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ical_seller
  ON public.influencer_campaign_audit_logs (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ical_created
  ON public.influencer_campaign_audit_logs (created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. ALPHA MEDIA TEAM & INFLUENCER PROFILES TABLE (Direct Invite + /apply)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  city TEXT,
  instagram_handle TEXT,
  youtube_handle TEXT,
  followers_count INTEGER DEFAULT 0,
  niche TEXT,
  sample_reel_url TEXT,
  upi_id TEXT,
  role_type TEXT NOT NULL DEFAULT 'INFLUENCER' CHECK (role_type IN ('MEDIA_LEADER', 'MEDIA_CREATOR', 'INFLUENCER')),
  onboarding_source TEXT NOT NULL DEFAULT 'self_apply' CHECK (onboarding_source IN ('admin_invite', 'self_apply')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_status
  ON public.media_creator_profiles (approval_status, is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_role
  ON public.media_creator_profiles (role_type);

-- -----------------------------------------------------------------------------
-- 6. SECURITY HELPER FUNCTIONS (Non-Recursive, Backward-Compatible)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_media_leader()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_app_memberships
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND (
        role IN ('OWNER', 'SUPER_ADMIN', 'MEDIA_LEADER', 'Media Admin')
        AND (app_name IN ('media', 'all', 'superadmin') OR role = 'OWNER')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_media_member()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_app_memberships
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND (app_name IN ('media', 'all') OR role = 'OWNER')
  );
END;
$$;

-- Update check_is_app_manager to recognize MEDIA_LEADER alongside Media Admin
CREATE OR REPLACE FUNCTION public.check_is_app_manager(p_app text)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_app_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE AND role = 'OWNER'
  ) THEN
    RETURN TRUE;
  END IF;

  IF p_app = 'media' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_app_memberships
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND app_name IN ('media', 'all')
        AND role IN ('Media Admin', 'MEDIA_LEADER')
    );
  ELSIF p_app = 'operations' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_app_memberships
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND app_name IN ('operations', 'all')
        AND role IN ('Operations Manager', 'HR Manager', 'Customer Support Manager', 'Seller Support Manager')
    );
  ELSIF p_app = 'superadmin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_app_memberships
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND app_name IN ('superadmin', 'all')
        AND role = 'SUPER_ADMIN'
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY POLICIES (Role Isolation Between Leader & Creator)
-- -----------------------------------------------------------------------------
ALTER TABLE public.influencer_campaign_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_creator_profiles ENABLE ROW LEVEL SECURITY;

-- seller_influencer_enrollments: Media Leaders see all; Creators see ONLY assigned
DROP POLICY IF EXISTS "Media leaders view all influencer enrollments" ON public.seller_influencer_enrollments;
CREATE POLICY "Media leaders view all influencer enrollments"
  ON public.seller_influencer_enrollments
  FOR SELECT TO authenticated
  USING (public.check_is_media_leader());

DROP POLICY IF EXISTS "Assigned creators view own influencer enrollments" ON public.seller_influencer_enrollments;
CREATE POLICY "Assigned creators view own influencer enrollments"
  ON public.seller_influencer_enrollments
  FOR SELECT TO authenticated
  USING (assigned_creator_id = auth.uid());

-- influencer_creator_links: Media Leaders see all; Assigned Creators see own
DROP POLICY IF EXISTS "Media leaders view all creator links" ON public.influencer_creator_links;
CREATE POLICY "Media leaders view all creator links"
  ON public.influencer_creator_links
  FOR SELECT TO authenticated
  USING (public.check_is_media_leader());

DROP POLICY IF EXISTS "Assigned creators view own creator links" ON public.influencer_creator_links;
CREATE POLICY "Assigned creators view own creator links"
  ON public.influencer_creator_links
  FOR SELECT TO authenticated
  USING (assigned_creator_id = auth.uid());

-- Public read on creator links updated so /go/ and ?ref= can inspect active/expired metadata
DROP POLICY IF EXISTS "Public read active creator links" ON public.influencer_creator_links;
CREATE POLICY "Public read active creator links"
  ON public.influencer_creator_links
  FOR SELECT
  USING (status IN ('active', 'expired'));

-- influencer_campaign_audit_logs: Media Leaders see all; Sellers see own; Creators see assigned
DROP POLICY IF EXISTS "Media leaders view all audit logs" ON public.influencer_campaign_audit_logs;
CREATE POLICY "Media leaders view all audit logs"
  ON public.influencer_campaign_audit_logs
  FOR SELECT TO authenticated
  USING (public.check_is_media_leader());

DROP POLICY IF EXISTS "Sellers view own campaign audit logs" ON public.influencer_campaign_audit_logs;
CREATE POLICY "Sellers view own campaign audit logs"
  ON public.influencer_campaign_audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid()::text = seller_id);

-- media_creator_profiles: Self-apply insert + own select + Media Leader full visibility
DROP POLICY IF EXISTS "Users can view own creator profile" ON public.media_creator_profiles;
CREATE POLICY "Users can view own creator profile"
  ON public.media_creator_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.check_is_media_leader());

DROP POLICY IF EXISTS "Applicants can create own pending creator profile" ON public.media_creator_profiles;
CREATE POLICY "Applicants can create own pending creator profile"
  ON public.media_creator_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND onboarding_source = 'self_apply'
    AND approval_status = 'pending'
    AND is_active = FALSE
  );

-- -----------------------------------------------------------------------------
-- 8. ATOMIC SECURITY DEFINER RPCs FOR MEDIA PANEL (Zero Service-Role Exposure)
-- -----------------------------------------------------------------------------

-- Helper to resolve actor display name
CREATE OR REPLACE FUNCTION public._media_actor_name(p_uid UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT COALESCE(NULLIF(full_name, ''), email) INTO v_name
  FROM public.media_creator_profiles
  WHERE user_id = p_uid
  LIMIT 1;

  IF v_name IS NULL THEN
    SELECT email INTO v_name FROM auth.users WHERE id = p_uid LIMIT 1;
  END IF;

  RETURN COALESCE(v_name, 'Media Leader');
END;
$$;

-- RPC 1: Approve a pending /apply Creator or Influencer & grant media membership
CREATE OR REPLACE FUNCTION public.media_approve_creator_application(
  p_profile_id UUID,
  p_role TEXT DEFAULT 'INFLUENCER'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile public.media_creator_profiles%ROWTYPE;
  v_clean_role TEXT;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can approve creators.';
  END IF;

  v_clean_role := CASE
    WHEN p_role IN ('MEDIA_LEADER', 'MEDIA_CREATOR', 'INFLUENCER') THEN p_role
    ELSE 'INFLUENCER'
  END;

  SELECT * INTO v_profile FROM public.media_creator_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Creator profile not found.';
  END IF;

  UPDATE public.media_creator_profiles
  SET role_type = v_clean_role,
      approval_status = 'approved',
      rejection_reason = NULL,
      approved_by = auth.uid(),
      approved_at = NOW(),
      is_active = TRUE,
      updated_at = NOW()
  WHERE id = p_profile_id;

  INSERT INTO public.user_app_memberships (user_id, app_name, role, is_active, granted_by, updated_at)
  VALUES (v_profile.user_id, 'media', v_clean_role, TRUE, auth.uid(), NOW())
  ON CONFLICT (user_id, app_name)
  DO UPDATE SET role = EXCLUDED.role, is_active = TRUE, granted_by = auth.uid(), updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'profile_id', p_profile_id, 'role', v_clean_role);
END;
$$;

-- RPC 2: Reject a pending /apply Creator application
CREATE OR REPLACE FUNCTION public.media_reject_creator_application(
  p_profile_id UUID,
  p_reason TEXT DEFAULT 'Application did not meet Alpha Media criteria'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can reject applications.';
  END IF;

  UPDATE public.media_creator_profiles
  SET approval_status = 'rejected',
      rejection_reason = COALESCE(NULLIF(trim(p_reason), ''), 'Application did not meet Alpha Media criteria'),
      is_active = FALSE,
      updated_at = NOW()
  WHERE id = p_profile_id;

  RETURN jsonb_build_object('success', true, 'profile_id', p_profile_id);
END;
$$;

-- RPC 3: 1-Click Suspend / Restore Creator access (preserves all historical data)
CREATE OR REPLACE FUNCTION public.media_toggle_creator_access(
  p_profile_id UUID,
  p_active BOOLEAN
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile public.media_creator_profiles%ROWTYPE;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can manage team access.';
  END IF;

  SELECT * INTO v_profile FROM public.media_creator_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Creator profile not found.';
  END IF;

  UPDATE public.media_creator_profiles
  SET is_active = p_active,
      approval_status = CASE WHEN p_active THEN 'approved' ELSE 'suspended' END,
      updated_at = NOW()
  WHERE id = p_profile_id;

  UPDATE public.user_app_memberships
  SET is_active = p_active,
      updated_at = NOW()
  WHERE user_id = v_profile.user_id
    AND app_name = 'media';

  RETURN jsonb_build_object('success', true, 'is_active', p_active);
END;
$$;

-- RPC 4: Media Leader Accepts Awaiting Campaign (and optionally confirms Plan 2 sample)
CREATE OR REPLACE FUNCTION public.media_leader_accept_campaign(
  p_enrollment_id UUID,
  p_sample_received BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_enr public.seller_influencer_enrollments%ROWTYPE;
  v_actor TEXT;
  v_next_sample TEXT;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can accept campaigns.';
  END IF;

  SELECT * INTO v_enr FROM public.seller_influencer_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign enrollment not found.';
  END IF;

  v_actor := public._media_actor_name(auth.uid());

  v_next_sample := CASE
    WHEN v_enr.plan_type = 'with_product_150' AND p_sample_received THEN 'sample_received'
    WHEN v_enr.plan_type = 'with_product_150' AND v_enr.sample_status = 'not_required' THEN 'awaiting_sample'
    ELSE v_enr.sample_status
  END;

  UPDATE public.seller_influencer_enrollments
  SET workflow_status = CASE
        WHEN workflow_status IN ('awaiting_review', 'awaiting_payment', 'rejected') THEN 'accepted'
        ELSE workflow_status
      END,
      sample_status = v_next_sample,
      accepted_by = COALESCE(accepted_by, auth.uid()),
      accepted_by_name = COALESCE(accepted_by_name, v_actor),
      accepted_at = COALESCE(accepted_at, NOW()),
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_enrollment_id;

  INSERT INTO public.influencer_campaign_audit_logs (
    enrollment_id, seller_id, product_id, product_name,
    event_type, to_plan, actor_user_id, actor_role, actor_name, notes
  ) VALUES (
    v_enr.id, v_enr.seller_id, v_enr.product_id, v_enr.product_name,
    CASE WHEN p_sample_received THEN 'sample_received' ELSE 'accepted' END,
    v_enr.plan_type, auth.uid(), 'MEDIA_LEADER', v_actor,
    COALESCE(NULLIF(trim(p_notes), ''), CASE WHEN p_sample_received THEN 'Physical sample confirmed at Alpha Studio' ELSE 'Campaign accepted into Alpha Media production queue' END)
  );

  RETURN jsonb_build_object('success', true, 'enrollment_id', p_enrollment_id, 'sample_status', v_next_sample);
END;
$$;

-- RPC 5: Media Leader Rejects Campaign with Reason
CREATE OR REPLACE FUNCTION public.media_leader_reject_campaign(
  p_enrollment_id UUID,
  p_reason TEXT DEFAULT 'Catalog images or details need improvement before shoot'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_enr public.seller_influencer_enrollments%ROWTYPE;
  v_actor TEXT;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can reject campaigns.';
  END IF;

  SELECT * INTO v_enr FROM public.seller_influencer_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign enrollment not found.';
  END IF;

  v_actor := public._media_actor_name(auth.uid());

  UPDATE public.seller_influencer_enrollments
  SET workflow_status = 'rejected',
      status = 'rejected',
      rejection_reason = COALESCE(NULLIF(trim(p_reason), ''), 'Catalog images or details need improvement'),
      updated_at = NOW()
  WHERE id = p_enrollment_id;

  INSERT INTO public.influencer_campaign_audit_logs (
    enrollment_id, seller_id, product_id, product_name,
    event_type, to_plan, actor_user_id, actor_role, actor_name, notes
  ) VALUES (
    v_enr.id, v_enr.seller_id, v_enr.product_id, v_enr.product_name,
    'rejected', v_enr.plan_type, auth.uid(), 'MEDIA_LEADER', v_actor,
    COALESCE(NULLIF(trim(p_reason), ''), 'Rejected by Media Leader')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC 6: Media Leader Assigns Creator / Editor to Accepted Campaign
CREATE OR REPLACE FUNCTION public.media_leader_assign_creator(
  p_enrollment_id UUID,
  p_creator_user_id UUID,
  p_deadline TIMESTAMPTZ DEFAULT NULL,
  p_brief TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_enr public.seller_influencer_enrollments%ROWTYPE;
  v_creator public.media_creator_profiles%ROWTYPE;
  v_actor TEXT;
  v_creator_name TEXT;
  v_creator_handle TEXT;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can assign creators.';
  END IF;

  SELECT * INTO v_enr FROM public.seller_influencer_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign enrollment not found.';
  END IF;

  SELECT * INTO v_creator FROM public.media_creator_profiles WHERE user_id = p_creator_user_id LIMIT 1;
  v_creator_name := COALESCE(v_creator.full_name, public._media_actor_name(p_creator_user_id));
  v_creator_handle := COALESCE(v_creator.instagram_handle, v_creator.youtube_handle, '@zebalpha_official');
  v_actor := public._media_actor_name(auth.uid());

  UPDATE public.seller_influencer_enrollments
  SET workflow_status = 'assigned',
      sample_status = CASE WHEN plan_type = 'with_product_150' AND sample_status = 'sample_received' THEN 'in_shoot' ELSE sample_status END,
      accepted_by = COALESCE(accepted_by, auth.uid()),
      accepted_by_name = COALESCE(accepted_by_name, v_actor),
      accepted_at = COALESCE(accepted_at, NOW()),
      assigned_creator_id = p_creator_user_id,
      assigned_creator_name = v_creator_name,
      assigned_creator_handle = v_creator_handle,
      assigned_by = auth.uid(),
      assigned_by_name = v_actor,
      assigned_at = NOW(),
      shoot_deadline = COALESCE(p_deadline, NOW() + INTERVAL '48 hours'),
      shoot_brief = NULLIF(trim(COALESCE(p_brief, '')), ''),
      revision_feedback = NULL,
      updated_at = NOW()
  WHERE id = p_enrollment_id;

  -- Keep creator link metadata in sync
  UPDATE public.influencer_creator_links
  SET assigned_creator_id = p_creator_user_id,
      creator_name = v_creator_name,
      creator_handle = v_creator_handle,
      updated_at = NOW()
  WHERE enrollment_id = p_enrollment_id;

  INSERT INTO public.influencer_campaign_audit_logs (
    enrollment_id, seller_id, product_id, product_name,
    event_type, to_plan, actor_user_id, actor_role, actor_name, notes, metadata
  ) VALUES (
    v_enr.id, v_enr.seller_id, v_enr.product_id, v_enr.product_name,
    'creator_assigned', v_enr.plan_type, auth.uid(), 'MEDIA_LEADER', v_actor,
    format('Assigned to %s (%s)', v_creator_name, v_creator_handle),
    jsonb_build_object('creator_user_id', p_creator_user_id, 'deadline', COALESCE(p_deadline, NOW() + INTERVAL '48 hours'))
  );

  RETURN jsonb_build_object('success', true, 'assigned_creator_name', v_creator_name);
END;
$$;

-- RPC 7: Assigned Creator Submits Edited Reel / Video for Media Leader Review
CREATE OR REPLACE FUNCTION public.media_creator_submit_reel(
  p_enrollment_id UUID,
  p_video_url TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_enr public.seller_influencer_enrollments%ROWTYPE;
  v_actor TEXT;
BEGIN
  SELECT * INTO v_enr FROM public.seller_influencer_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found.';
  END IF;

  IF v_enr.assigned_creator_id IS DISTINCT FROM auth.uid() AND NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only the assigned creator can submit this shoot.';
  END IF;

  IF NULLIF(trim(COALESCE(p_video_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Video or Reel URL is required.';
  END IF;

  v_actor := public._media_actor_name(auth.uid());

  UPDATE public.seller_influencer_enrollments
  SET workflow_status = 'submitted_for_review',
      sample_status = CASE WHEN plan_type = 'with_product_150' THEN 'shoot_completed' ELSE sample_status END,
      submitted_video_url = trim(p_video_url),
      submitted_notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      submitted_at = NOW(),
      revision_feedback = NULL,
      updated_at = NOW()
  WHERE id = p_enrollment_id;

  INSERT INTO public.influencer_campaign_audit_logs (
    enrollment_id, seller_id, product_id, product_name,
    event_type, to_plan, actor_user_id, actor_role, actor_name, notes, metadata
  ) VALUES (
    v_enr.id, v_enr.seller_id, v_enr.product_id, v_enr.product_name,
    'video_submitted', v_enr.plan_type, auth.uid(), 'MEDIA_CREATOR', v_actor,
    COALESCE(NULLIF(trim(p_notes), ''), 'Reel submitted for Media Leader approval'),
    jsonb_build_object('video_url', trim(p_video_url))
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC 8: Media Leader Reviews Reel -> Either Request Revision OR Approve & Start 7-Day Live Link!
CREATE OR REPLACE FUNCTION public.media_leader_review_reel(
  p_enrollment_id UUID,
  p_approve BOOLEAN,
  p_published_url TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT 'instagram',
  p_feedback TEXT DEFAULT NULL,
  p_attach_video_proof BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_enr public.seller_influencer_enrollments%ROWTYPE;
  v_actor TEXT;
  v_final_url TEXT;
  v_platform TEXT;
  v_starts TIMESTAMPTZ;
  v_expires TIMESTAMPTZ;
  v_duration INTEGER;
  v_link_id UUID;
  v_ref_code TEXT;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can approve & publish reels.';
  END IF;

  SELECT * INTO v_enr FROM public.seller_influencer_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign enrollment not found.';
  END IF;

  v_actor := public._media_actor_name(auth.uid());

  IF NOT p_approve THEN
    UPDATE public.seller_influencer_enrollments
    SET workflow_status = 'revision_needed',
        revision_feedback = COALESCE(NULLIF(trim(p_feedback), ''), 'Please adjust framing/audio and re-submit'),
        updated_at = NOW()
    WHERE id = p_enrollment_id;

    INSERT INTO public.influencer_campaign_audit_logs (
      enrollment_id, seller_id, product_id, product_name,
      event_type, to_plan, actor_user_id, actor_role, actor_name, notes
    ) VALUES (
      v_enr.id, v_enr.seller_id, v_enr.product_id, v_enr.product_name,
      'revision_requested', v_enr.plan_type, auth.uid(), 'MEDIA_LEADER', v_actor,
      COALESCE(NULLIF(trim(p_feedback), ''), 'Revision requested by Media Leader')
    );

    RETURN jsonb_build_object('success', true, 'status', 'revision_needed');
  END IF;

  v_final_url := COALESCE(NULLIF(trim(p_published_url), ''), v_enr.submitted_video_url);
  v_platform := CASE
    WHEN p_platform IN ('instagram', 'youtube', 'facebook', 'zebalpha_app') THEN p_platform
    ELSE 'instagram'
  END;
  v_duration := GREATEST(1, COALESCE(v_enr.link_duration_days, 7));
  v_starts := NOW();
  v_expires := v_starts + make_interval(days => v_duration);

  UPDATE public.seller_influencer_enrollments
  SET status = 'active',
      workflow_status = 'live',
      submitted_video_url = COALESCE(v_final_url, submitted_video_url),
      approved_by = auth.uid(),
      approved_by_name = v_actor,
      approved_at = v_starts,
      starts_at = v_starts,
      expires_at = v_expires,
      auto_attach_video_proof = (p_attach_video_proof OR v_enr.auto_attach_video_proof OR v_enr.plan_type = 'with_product_150'),
      revision_feedback = NULL,
      updated_at = NOW()
  WHERE id = p_enrollment_id;

  -- Activate existing persistent creator link or create one
  SELECT id, ref_code INTO v_link_id, v_ref_code
  FROM public.influencer_creator_links
  WHERE enrollment_id = p_enrollment_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_link_id IS NOT NULL THEN
    UPDATE public.influencer_creator_links
    SET status = 'active',
        video_url = COALESCE(v_final_url, video_url),
        platform = v_platform,
        plan_type = v_enr.plan_type,
        campaign_source = v_enr.campaign_source,
        assigned_creator_id = v_enr.assigned_creator_id,
        creator_name = COALESCE(v_enr.assigned_creator_name, creator_name, 'Alpha Media Creator'),
        creator_handle = COALESCE(v_enr.assigned_creator_handle, creator_handle, '@zebalpha_official'),
        commission_rate = v_enr.commission_rate,
        starts_at = v_starts,
        expires_at = v_expires,
        published_by = auth.uid(),
        published_by_name = v_actor,
        updated_at = NOW()
    WHERE id = v_link_id;
  ELSE
    v_ref_code := 'INF-' || UPPER(LEFT(REGEXP_REPLACE(v_enr.product_id, '[^a-zA-Z0-9]', '', 'g'), 4)) || '-' || FLOOR(1000 + RANDOM() * 9000)::TEXT;
    INSERT INTO public.influencer_creator_links (
      enrollment_id, seller_id, product_id, campaign_source, plan_type,
      assigned_creator_id, creator_name, creator_handle, platform, video_url,
      ref_code, commission_rate, status, starts_at, expires_at,
      published_by, published_by_name
    ) VALUES (
      v_enr.id, v_enr.seller_id, v_enr.product_id, v_enr.campaign_source, v_enr.plan_type,
      v_enr.assigned_creator_id,
      COALESCE(v_enr.assigned_creator_name, 'Alpha Media Creator'),
      COALESCE(v_enr.assigned_creator_handle, '@zebalpha_official'),
      v_platform, v_final_url, v_ref_code, v_enr.commission_rate,
      'active', v_starts, v_expires, auth.uid(), v_actor
    )
    RETURNING id INTO v_link_id;
  END IF;

  -- Optionally attach verified video proof to product page for Plan 2
  IF (p_attach_video_proof OR v_enr.plan_type = 'with_product_150') AND v_final_url IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.products SET video_proof_url = $1 WHERE id::text = $2'
      USING v_final_url, v_enr.product_id;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      NULL;
    END;
  END IF;

  INSERT INTO public.influencer_campaign_audit_logs (
    enrollment_id, link_id, seller_id, product_id, product_name,
    event_type, to_plan, duration_days, actor_user_id, actor_role, actor_name, notes, metadata
  ) VALUES (
    v_enr.id, v_link_id, v_enr.seller_id, v_enr.product_id, v_enr.product_name,
    'published_live', v_enr.plan_type, v_duration, auth.uid(), 'MEDIA_LEADER', v_actor,
    format('Reel published & 7-day link %s activated until %s', v_ref_code, TO_CHAR(v_expires, 'DD Mon YYYY HH24:MI')),
    jsonb_build_object('ref_code', v_ref_code, 'video_url', v_final_url, 'platform', v_platform, 'expires_at', v_expires)
  );

  RETURN jsonb_build_object('success', true, 'ref_code', v_ref_code, 'starts_at', v_starts, 'expires_at', v_expires);
END;
$$;

-- RPC 9: Media Leader Creates a ZebAlpha Own-Brand Shoot Campaign
CREATE OR REPLACE FUNCTION public.media_leader_create_own_brand_campaign(
  p_product_id TEXT,
  p_product_name TEXT,
  p_product_image TEXT DEFAULT NULL,
  p_product_price NUMERIC DEFAULT 0,
  p_creator_user_id UUID DEFAULT NULL,
  p_brief TEXT DEFAULT NULL,
  p_deadline TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor TEXT;
  v_enr_id UUID;
  v_ref_code TEXT;
  v_creator_name TEXT;
  v_creator_handle TEXT;
BEGIN
  IF NOT public.check_is_media_leader() THEN
    RAISE EXCEPTION 'Unauthorized: Only Media Leader or Owner can create Own-Brand campaigns.';
  END IF;

  v_actor := public._media_actor_name(auth.uid());

  IF p_creator_user_id IS NOT NULL THEN
    SELECT full_name, COALESCE(instagram_handle, youtube_handle, '@zebalpha_official')
    INTO v_creator_name, v_creator_handle
    FROM public.media_creator_profiles
    WHERE user_id = p_creator_user_id
    LIMIT 1;
  END IF;

  INSERT INTO public.seller_influencer_enrollments (
    seller_id, seller_store_name, product_id, product_name, product_image, product_price,
    campaign_source, plan_type, commission_rate, fixed_fee_inr,
    payment_method, payment_status, sample_status,
    status, workflow_status, link_duration_days, auto_attach_video_proof,
    accepted_by, accepted_by_name, accepted_at,
    assigned_creator_id, assigned_creator_name, assigned_creator_handle,
    assigned_by, assigned_by_name, assigned_at,
    shoot_deadline, shoot_brief
  ) VALUES (
    'zebalpha-own-brand', 'ZebAlpha Official Brand', p_product_id, p_product_name, p_product_image, COALESCE(p_product_price, 0),
    'zebalpha_own_brand', 'with_product_150', 0, 0,
    'own_brand', 'waived', 'sample_received',
    'pending', CASE WHEN p_creator_user_id IS NOT NULL THEN 'assigned' ELSE 'accepted' END, 30, TRUE,
    auth.uid(), v_actor, NOW(),
    p_creator_user_id, v_creator_name, v_creator_handle,
    CASE WHEN p_creator_user_id IS NOT NULL THEN auth.uid() ELSE NULL END,
    CASE WHEN p_creator_user_id IS NOT NULL THEN v_actor ELSE NULL END,
    CASE WHEN p_creator_user_id IS NOT NULL THEN NOW() ELSE NULL END,
    COALESCE(p_deadline, NOW() + INTERVAL '48 hours'),
    NULLIF(trim(COALESCE(p_brief, '')), '')
  )
  ON CONFLICT (seller_id, product_id)
  DO UPDATE SET
    product_name = EXCLUDED.product_name,
    product_image = EXCLUDED.product_image,
    product_price = EXCLUDED.product_price,
    workflow_status = EXCLUDED.workflow_status,
    assigned_creator_id = COALESCE(EXCLUDED.assigned_creator_id, public.seller_influencer_enrollments.assigned_creator_id),
    assigned_creator_name = COALESCE(EXCLUDED.assigned_creator_name, public.seller_influencer_enrollments.assigned_creator_name),
    assigned_creator_handle = COALESCE(EXCLUDED.assigned_creator_handle, public.seller_influencer_enrollments.assigned_creator_handle),
    shoot_brief = COALESCE(EXCLUDED.shoot_brief, public.seller_influencer_enrollments.shoot_brief),
    shoot_deadline = COALESCE(EXCLUDED.shoot_deadline, public.seller_influencer_enrollments.shoot_deadline),
    updated_at = NOW()
  RETURNING id INTO v_enr_id;

  IF NOT EXISTS (SELECT 1 FROM public.influencer_creator_links WHERE enrollment_id = v_enr_id) THEN
    v_ref_code := 'ZEB-' || UPPER(LEFT(REGEXP_REPLACE(p_product_id, '[^a-zA-Z0-9]', '', 'g'), 4)) || '-' || FLOOR(1000 + RANDOM() * 9000)::TEXT;
    INSERT INTO public.influencer_creator_links (
      enrollment_id, seller_id, product_id, campaign_source, plan_type,
      assigned_creator_id, creator_name, creator_handle, platform,
      ref_code, commission_rate, status
    ) VALUES (
      v_enr_id, 'zebalpha-own-brand', p_product_id, 'zebalpha_own_brand', 'with_product_150',
      p_creator_user_id, COALESCE(v_creator_name, 'Alpha Media Studio'),
      COALESCE(v_creator_handle, '@zebalpha_official'), 'instagram',
      v_ref_code, 0, 'pending'
    );
  END IF;

  INSERT INTO public.influencer_campaign_audit_logs (
    enrollment_id, seller_id, product_id, product_name,
    event_type, to_plan, actor_user_id, actor_role, actor_name, notes
  ) VALUES (
    v_enr_id, 'zebalpha-own-brand', p_product_id, p_product_name,
    'created', 'with_product_150', auth.uid(), 'MEDIA_LEADER', v_actor,
    'ZebAlpha Own-Brand campaign dispatched in Alpha Media Studio'
  );

  RETURN jsonb_build_object('success', true, 'enrollment_id', v_enr_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_media_leader() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_media_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_approve_creator_application(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_reject_creator_application(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_toggle_creator_access(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_leader_accept_campaign(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_leader_reject_campaign(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_leader_assign_creator(UUID, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_creator_submit_reel(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_leader_review_reel(UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_leader_create_own_brand_campaign(TEXT, TEXT, TEXT, NUMERIC, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
