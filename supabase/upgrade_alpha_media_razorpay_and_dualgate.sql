-- =============================================================================
-- ZEBALPHA ALPHA MEDIA: RAZORPAY CHECKOUT (₹150 NEW + ₹50 UPGRADE),
-- 3-DAY PAYMENT DEADLINE & DUAL-GATE HARD LOCK (PAYMENT + PRODUCT DELIVERY)
-- Additive, idempotent migration on top of upgrade_alpha_media_influencer_ecosystem.sql
-- Safe to re-run multiple times in Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND seller_influencer_enrollments WITH RAZORPAY & 3-DAY DUE TRACKING
-- -----------------------------------------------------------------------------
ALTER TABLE public.seller_influencer_enrollments
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_payment_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_payment_purpose TEXT,
  ADD COLUMN IF NOT EXISTS pending_extension_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS pending_upgrade_mode TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Update payment_method constraint to include 'razorpay'
ALTER TABLE public.seller_influencer_enrollments
  DROP CONSTRAINT IF EXISTS chk_sie_payment_method;

ALTER TABLE public.seller_influencer_enrollments
  ADD CONSTRAINT chk_sie_payment_method CHECK (
    payment_method IN ('commission_only', 'razorpay', 'razorpay_upi', 'upi_manual', 'seller_balance', 'own_brand')
  );

ALTER TABLE public.seller_influencer_enrollments
  DROP CONSTRAINT IF EXISTS chk_sie_pending_purpose;

ALTER TABLE public.seller_influencer_enrollments
  ADD CONSTRAINT chk_sie_pending_purpose CHECK (
    pending_payment_purpose IS NULL OR pending_payment_purpose IN ('new_shoot_150', 'upgrade_50')
  );

CREATE INDEX IF NOT EXISTS idx_sie_payment_due
  ON public.seller_influencer_enrollments (payment_status, payment_due_at);

-- -----------------------------------------------------------------------------
-- 2. AUTHORITATIVE RAZORPAY PAYMENT TRANSACTIONS LEDGER (IDEMPOTENT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.influencer_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  enrollment_ids UUID[] NOT NULL DEFAULT '{}',
  purpose TEXT NOT NULL CHECK (purpose IN ('new_shoot_150', 'upgrade_50')),
  amount_inr NUMERIC(12, 2) NOT NULL CHECK (amount_inr > 0),
  duration_days INTEGER NOT NULL DEFAULT 7,
  upgrade_mode TEXT,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipt_seller
  ON public.influencer_payment_transactions (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ipt_order
  ON public.influencer_payment_transactions (razorpay_order_id);

ALTER TABLE public.influencer_payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers view own influencer payments" ON public.influencer_payment_transactions;
CREATE POLICY "Sellers view own influencer payments"
  ON public.influencer_payment_transactions
  FOR SELECT TO authenticated
  USING (auth.uid()::text = seller_id);

DROP POLICY IF EXISTS "Media leaders view all influencer payments" ON public.influencer_payment_transactions;
CREATE POLICY "Media leaders view all influencer payments"
  ON public.influencer_payment_transactions
  FOR SELECT TO authenticated
  USING (public.check_is_media_leader());

-- -----------------------------------------------------------------------------
-- 3. DUAL-GATE HARDENED MEDIA LEADER RPCs
--    Rule: For Seller Plan 2 (with_product_150), Media CANNOT assign a creator
--    or publish until BOTH:
--      Gate 1: payment_status IN ('paid', 'waived')
--      Gate 2: sample_status IN ('sample_received', 'in_shoot', 'shoot_completed', 'kept_at_studio')
-- -----------------------------------------------------------------------------

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
  v_is_plan2_seller BOOLEAN;
  v_paid_ok BOOLEAN;
  v_sample_ok BOOLEAN;
  v_next_workflow TEXT;
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

  v_is_plan2_seller := (v_enr.plan_type = 'with_product_150' AND COALESCE(v_enr.campaign_source, 'seller') = 'seller');
  v_paid_ok := (v_enr.payment_status IN ('paid', 'waived'));
  v_sample_ok := (v_next_sample IN ('sample_received', 'in_shoot', 'shoot_completed', 'kept_at_studio'));

  IF v_is_plan2_seller THEN
    IF v_paid_ok AND v_sample_ok THEN
      v_next_workflow := CASE
        WHEN v_enr.workflow_status IN ('awaiting_review', 'awaiting_payment', 'rejected') THEN 'accepted'
        ELSE v_enr.workflow_status
      END;
    ELSIF NOT v_paid_ok THEN
      v_next_workflow := 'awaiting_payment';
    ELSE
      v_next_workflow := 'awaiting_review';
    END IF;
  ELSE
    v_next_workflow := CASE
      WHEN v_enr.workflow_status IN ('awaiting_review', 'awaiting_payment', 'rejected') THEN 'accepted'
      ELSE v_enr.workflow_status
    END;
  END IF;

  UPDATE public.seller_influencer_enrollments
  SET workflow_status = v_next_workflow,
      sample_status = v_next_sample,
      accepted_by = CASE WHEN v_next_workflow = 'accepted' THEN COALESCE(accepted_by, auth.uid()) ELSE accepted_by END,
      accepted_by_name = CASE WHEN v_next_workflow = 'accepted' THEN COALESCE(accepted_by_name, v_actor) ELSE accepted_by_name END,
      accepted_at = CASE WHEN v_next_workflow = 'accepted' THEN COALESCE(accepted_at, NOW()) ELSE accepted_at END,
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
    COALESCE(
      NULLIF(trim(p_notes), ''),
      CASE
        WHEN p_sample_received AND NOT v_paid_ok THEN 'Product delivered to Alpha Studio — still locked awaiting ₹150 online payment'
        WHEN p_sample_received AND v_paid_ok THEN 'Product delivered + ₹150 payment verified — ready for Alpha Media shoot'
        ELSE 'Campaign accepted into Alpha Media production queue'
      END
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', p_enrollment_id,
    'sample_status', v_next_sample,
    'workflow_status', v_next_workflow,
    'dual_gate_ready', (NOT v_is_plan2_seller OR (v_paid_ok AND v_sample_ok))
  );
END;
$$;

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

  -- HARD DUAL-GATE ENFORCEMENT FOR PLAN 2 (With Product + ₹150)
  IF v_enr.plan_type = 'with_product_150' AND COALESCE(v_enr.campaign_source, 'seller') = 'seller' THEN
    IF v_enr.payment_status NOT IN ('paid', 'waived') THEN
      RAISE EXCEPTION 'Blocked: ₹150 payment is still pending. Media cannot proceed until payment is complete.';
    END IF;
    IF v_enr.sample_status NOT IN ('sample_received', 'in_shoot', 'shoot_completed', 'kept_at_studio') THEN
      RAISE EXCEPTION 'Blocked: Physical product delivery to Alpha Studio is not confirmed yet. Confirm product delivery first.';
    END IF;
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

  IF p_approve AND v_enr.plan_type = 'with_product_150' AND COALESCE(v_enr.campaign_source, 'seller') = 'seller' THEN
    IF v_enr.payment_status NOT IN ('paid', 'waived') THEN
      RAISE EXCEPTION 'Blocked: ₹150 payment must be completed before publishing this campaign.';
    END IF;
    IF v_enr.sample_status NOT IN ('sample_received', 'in_shoot', 'shoot_completed', 'kept_at_studio') THEN
      RAISE EXCEPTION 'Blocked: Product sample delivery must be confirmed before publishing.';
    END IF;
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
