-- ==============================================================================
-- ZEBALPHA PAYOUT HARDENING V2  (run AFTER production_settlement_engine.sql)
--
-- Fixes / adds:
--   * Transition-guarded, idempotent finalize_* RPCs (no SUCCESS<->FAILED flips)
--   * RECONCILIATION_REQUIRED money stays RESERVED (never released automatically)
--   * Real balance_before / balance_after on every withdrawal ledger entry
--   * Single source of truth for balances: seller_balance_summary()
--   * Idempotency check AFTER the seller row lock; key-reuse detection
--   * Atomic job claiming (FOR UPDATE SKIP LOCKED) + stale-lock recovery
--   * Webhook event queue (store -> claim -> process) with idempotency
--   * Auto-settlement enqueue through the same reserve/queue path
--   * Immutable ledger / events / reconciliation history (DB-enforced)
--   * payout_events timeline + payout_reconciliation_events history
--   * All money-moving RPCs locked down to service_role ONLY
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. SCHEMA ADDITIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS reconciliation_flag BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS reconciliation_issues JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS provider_last_checked_at TIMESTAMPTZ;
ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'MANUAL';

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_requests_idempotency
    ON public.seller_payout_requests(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_requests_recon_flag
    ON public.seller_payout_requests(reconciliation_flag) WHERE reconciliation_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_payout_requests_active
    ON public.seller_payout_requests(seller_id, status)
    WHERE status IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED');

-- One queue job per payout request (a payout can never be queued twice)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_queue_request ON public.payout_queue(payout_request_id);
ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS job_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE public.payout_queue DROP CONSTRAINT IF EXISTS payout_queue_status_check;
ALTER TABLE public.payout_queue ADD CONSTRAINT payout_queue_status_check
    CHECK (status IN ('QUEUED', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'FAILED', 'DEAD_LETTER'));

ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS auto_settlement_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Webhook queue columns
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.webhook_events DROP CONSTRAINT IF EXISTS webhook_events_status_check;
ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_status_check
    CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'IGNORED_DUPLICATE'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_queue ON public.webhook_events(status, received_at);

-- Ledger columns used by withdrawal entries
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS balance_before NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);

-- ------------------------------------------------------------------------------
-- 2. APPEND-ONLY HISTORY TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id UUID NOT NULL REFERENCES public.seller_payout_requests(id) ON DELETE RESTRICT,
    seller_id UUID,
    event_type VARCHAR(60) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    source VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_events_payout ON public.payout_events(payout_request_id, created_at);

CREATE TABLE IF NOT EXISTS public.payout_reconciliation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id UUID NOT NULL REFERENCES public.seller_payout_requests(id) ON DELETE RESTRICT,
    seller_id UUID,
    issue_types TEXT[] NOT NULL DEFAULT '{}',
    local_status VARCHAR(50),
    provider_status VARCHAR(50),
    local_amount NUMERIC(12, 2),
    provider_amount NUMERIC(12, 2),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    source VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    triggered_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recon_events_payout ON public.payout_reconciliation_events(payout_request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recon_events_seller ON public.payout_reconciliation_events(seller_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forbid_update_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.forbid_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    RAISE EXCEPTION '% rows can never be deleted', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_events_immutable ON public.payout_events;
CREATE TRIGGER trg_payout_events_immutable BEFORE UPDATE OR DELETE ON public.payout_events
    FOR EACH ROW EXECUTE FUNCTION public.forbid_update_delete();

DROP TRIGGER IF EXISTS trg_recon_events_immutable ON public.payout_reconciliation_events;
CREATE TRIGGER trg_recon_events_immutable BEFORE UPDATE OR DELETE ON public.payout_reconciliation_events
    FOR EACH ROW EXECUTE FUNCTION public.forbid_update_delete();

DROP TRIGGER IF EXISTS trg_admin_audit_no_delete ON public.admin_audit_logs;
CREATE TRIGGER trg_admin_audit_no_delete BEFORE DELETE ON public.admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.forbid_delete();

-- Ledger: never deleted; monetary/identity columns never changed.
-- Legacy sale-hold rows may still move PENDING/HELD -> COMPLETED/REVERSED (status only),
-- but every WITHDRAWAL_* entry is completely frozen.
CREATE OR REPLACE FUNCTION public.enforce_ledger_immutability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'seller_financial_ledger is immutable: DELETE is not allowed' USING ERRCODE = 'restrict_violation';
    END IF;

    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type
       OR NEW.entry_type IS DISTINCT FROM OLD.entry_type
       OR NEW.reference_id IS DISTINCT FROM OLD.reference_id
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.balance_before IS DISTINCT FROM OLD.balance_before
       OR NEW.balance_after IS DISTINCT FROM OLD.balance_after
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'seller_financial_ledger is immutable: financial columns cannot be modified' USING ERRCODE = 'restrict_violation';
    END IF;

    IF OLD.transaction_type LIKE 'WITHDRAWAL\_%' AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'seller_financial_ledger is immutable: withdrawal entries cannot change status' USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_immutable ON public.seller_financial_ledger;
CREATE TRIGGER trg_ledger_immutable BEFORE UPDATE OR DELETE ON public.seller_financial_ledger
    FOR EACH ROW EXECUTE FUNCTION public.enforce_ledger_immutability();

-- ------------------------------------------------------------------------------
-- 4. BALANCE SOURCE OF TRUTH
--    available = net earnings - withdrawn - reserved
--    reserved  = payouts that may STILL succeed: PENDING / PROCESSING / RECONCILIATION_REQUIRED
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seller_balance_summary(p_seller_id UUID DEFAULT NULL)
RETURNS TABLE (
    seller_id UUID,
    gross_sales NUMERIC,
    deductions NUMERIC,
    net_earnings NUMERIC,
    withdrawn NUMERIC,
    reserved NUMERIC,
    available NUMERIC,
    pending NUMERIC
)
LANGUAGE sql STABLE SET search_path = public AS $$
    WITH l AS (
        SELECT
            fl.seller_id,
            COALESCE(SUM(CASE WHEN fl.status = 'COMPLETED' AND fl.entry_type = 'CREDIT'
                AND fl.transaction_type IN ('SALE', 'SALE_CREDIT', 'ADJUSTMENT_CREDIT') THEN fl.amount END), 0) AS gross,
            COALESCE(SUM(CASE WHEN fl.status = 'COMPLETED' AND fl.entry_type = 'DEBIT'
                AND fl.transaction_type IN ('COMMISSION', 'COMMISSION_DEDUCTION', 'FIXED_FEE', 'SHIPPING_FEE',
                    'COLLECTION_FEE', 'REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 'TAX', 'CHARGEBACK',
                    'PENALTY', 'ADJUSTMENT_DEBIT') THEN fl.amount END), 0) AS ded,
            COALESCE(SUM(CASE WHEN fl.status = 'COMPLETED'
                AND fl.transaction_type IN ('SETTLEMENT', 'WITHDRAWAL_SUCCESS') THEN fl.amount END), 0)
            - COALESCE(SUM(CASE WHEN fl.status = 'COMPLETED'
                AND fl.transaction_type IN ('SETTLEMENT_REVERSAL', 'WITHDRAWAL_REVERSED') THEN fl.amount END), 0) AS wd,
            COALESCE(SUM(CASE WHEN fl.status = 'PENDING'
                AND fl.transaction_type IN ('SALE', 'SALE_CREDIT') THEN fl.amount END), 0) AS pend
        FROM public.seller_financial_ledger fl
        WHERE (p_seller_id IS NULL OR fl.seller_id = p_seller_id)
        GROUP BY fl.seller_id
    ),
    r AS (
        SELECT pr.seller_id, COALESCE(SUM(pr.amount), 0) AS res
        FROM public.seller_payout_requests pr
        WHERE pr.status IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED')
          AND (p_seller_id IS NULL OR pr.seller_id = p_seller_id)
        GROUP BY pr.seller_id
    )
    SELECT
        COALESCE(l.seller_id, r.seller_id),
        COALESCE(l.gross, 0),
        COALESCE(l.ded, 0),
        GREATEST(0, COALESCE(l.gross, 0) - COALESCE(l.ded, 0)),
        COALESCE(l.wd, 0),
        COALESCE(r.res, 0),
        GREATEST(0, GREATEST(0, COALESCE(l.gross, 0) - COALESCE(l.ded, 0)) - COALESCE(l.wd, 0) - COALESCE(r.res, 0)),
        COALESCE(l.pend, 0)
    FROM l FULL OUTER JOIN r ON l.seller_id = r.seller_id;
$$;

-- ------------------------------------------------------------------------------
-- 5. EVENT HELPERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_payout_event(
    p_payout_id UUID, p_type TEXT, p_from TEXT, p_to TEXT, p_source TEXT, p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.payout_events (payout_request_id, seller_id, event_type, from_status, to_status, source, details)
    SELECT id, seller_id, p_type, p_from, p_to, COALESCE(p_source, 'SYSTEM'), COALESCE(p_details, '{}'::jsonb)
    FROM public.seller_payout_requests WHERE id = p_payout_id;
END;
$$;

-- Flags a payout for human investigation. NEVER changes a finalized status or any balance.
-- Non-final payouts (PENDING/PROCESSING) move to RECONCILIATION_REQUIRED (money stays reserved).
CREATE OR REPLACE FUNCTION public.flag_payout_reconciliation(
    p_payout_id UUID,
    p_issue_types TEXT[],
    p_notes TEXT,
    p_source TEXT DEFAULT 'SYSTEM',
    p_provider_status TEXT DEFAULT NULL,
    p_provider_amount NUMERIC DEFAULT NULL,
    p_triggered_by TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payout RECORD;
    v_new_status TEXT;
BEGIN
    SELECT * INTO v_payout FROM public.seller_payout_requests WHERE id = p_payout_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    v_new_status := CASE WHEN v_payout.status IN ('PENDING', 'PROCESSING') THEN 'RECONCILIATION_REQUIRED' ELSE v_payout.status END;

    UPDATE public.seller_payout_requests
    SET status = v_new_status,
        reconciliation_flag = TRUE,
        stuck_flag = stuck_flag OR ('STUCK_PROCESSING' = ANY(p_issue_types)),
        reconciliation_issues = reconciliation_issues || to_jsonb(p_issue_types),
        reconciliation_notes = p_notes,
        last_reconciled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    INSERT INTO public.payout_reconciliation_events (
        payout_request_id, seller_id, issue_types, local_status, provider_status,
        local_amount, provider_amount, details, source, triggered_by
    ) VALUES (
        p_payout_id, v_payout.seller_id, p_issue_types, v_payout.status, p_provider_status,
        v_payout.amount, p_provider_amount, jsonb_build_object('notes', p_notes), COALESCE(p_source, 'SYSTEM'), p_triggered_by
    );

    PERFORM public.log_payout_event(p_payout_id, 'RECONCILIATION_FLAGGED', v_payout.status, v_new_status, p_source,
        jsonb_build_object('issues', p_issue_types, 'notes', p_notes));

    RETURN jsonb_build_object('success', true, 'status', v_new_status, 'flagged', true);
END;
$$;

-- Records a clean reconciliation pass (history only; no state change)
CREATE OR REPLACE FUNCTION public.record_reconciliation_check(
    p_payout_id UUID, p_provider_status TEXT, p_provider_amount NUMERIC,
    p_source TEXT DEFAULT 'SYSTEM', p_triggered_by TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payout RECORD;
BEGIN
    SELECT * INTO v_payout FROM public.seller_payout_requests WHERE id = p_payout_id;
    IF NOT FOUND THEN RETURN; END IF;

    UPDATE public.seller_payout_requests
    SET last_reconciled_at = NOW(), provider_last_checked_at = NOW(), updated_at = NOW()
    WHERE id = p_payout_id;

    INSERT INTO public.payout_reconciliation_events (
        payout_request_id, seller_id, issue_types, local_status, provider_status,
        local_amount, provider_amount, details, source, triggered_by
    ) VALUES (
        p_payout_id, v_payout.seller_id, '{}', v_payout.status, p_provider_status,
        v_payout.amount, p_provider_amount, jsonb_build_object('notes', COALESCE(p_notes, 'In sync')),
        COALESCE(p_source, 'SYSTEM'), p_triggered_by
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RESERVATION (balance reservation + idempotency + concurrency + queue insert)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reserve_seller_balance_for_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.reserve_seller_balance_for_withdrawal(
    p_seller_id UUID,
    p_amount NUMERIC,
    p_idempotency_key TEXT,
    p_payout_number TEXT,
    p_destination_masked TEXT,
    p_destination_upi TEXT,
    p_beneficiary_name TEXT,
    p_settlement_method_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'MANUAL'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller RECORD;
    v_existing RECORD;
    v_available NUMERIC := 0;
    v_reserved NUMERIC := 0;
    v_amount NUMERIC := ROUND(COALESCE(p_amount, 0), 2);
    v_payout_id UUID;
    v_queue_id UUID;
BEGIN
    IF p_idempotency_key IS NULL OR LENGTH(TRIM(p_idempotency_key)) < 8 OR LENGTH(p_idempotency_key) > 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_IDEMPOTENCY_KEY',
            'message', 'A unique idempotency key (8-100 chars) is required.');
    END IF;

    IF v_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT',
            'message', 'Withdrawal amount must be greater than zero.');
    END IF;

    -- Row-level lock: every reservation for this seller is serialized from here on
    SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND', 'message', 'Seller account does not exist.');
    END IF;

    -- Idempotency (checked AFTER the lock so concurrent duplicates are serialized, not raced)
    SELECT * INTO v_existing FROM public.seller_payout_requests WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        IF v_existing.seller_id <> p_seller_id OR v_existing.amount <> v_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'IDEMPOTENCY_KEY_REUSED',
                'message', 'This idempotency key was already used for a different request.');
        END IF;
        RETURN jsonb_build_object('success', true, 'idempotent', true,
            'payout_id', v_existing.id, 'payout_number', v_existing.payout_number,
            'status', v_existing.status, 'amount', v_existing.amount,
            'message', 'Idempotent request already received.');
    END IF;

    IF v_seller.status IS NOT NULL AND LOWER(v_seller.status) IN ('suspended', 'banned', 'frozen', 'blocked') THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_SUSPENDED',
            'message', 'Seller account is suspended and ineligible for withdrawal.');
    END IF;

    IF EXISTS (SELECT 1 FROM public.seller_payout_requests
               WHERE seller_id = p_seller_id AND status IN ('PENDING', 'PROCESSING')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACTIVE_PAYOUT_IN_PROGRESS',
            'message', 'A withdrawal is already processing. Please wait for it to complete.');
    END IF;

    SELECT COALESCE(b.available, 0), COALESCE(b.reserved, 0)
    INTO v_available, v_reserved
    FROM public.seller_balance_summary(p_seller_id) b;
    v_available := COALESCE(v_available, 0);
    v_reserved := COALESCE(v_reserved, 0);

    IF v_amount > v_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE',
            'available_balance', v_available, 'reserved_balance', v_reserved, 'requested_amount', v_amount,
            'message', 'Requested amount exceeds available balance.');
    END IF;

    BEGIN
        INSERT INTO public.seller_payout_requests (
            payout_number, seller_id, settlement_method_id, method_type, destination_masked, destination_upi,
            beneficiary_name, amount, currency, status, provider, idempotency_key, notes, source, initiated_at
        ) VALUES (
            p_payout_number, p_seller_id, p_settlement_method_id, 'UPI', p_destination_masked, p_destination_upi,
            p_beneficiary_name, v_amount, 'INR', 'PROCESSING', 'RAZORPAY', p_idempotency_key,
            'UPI Payout to ' || p_destination_masked, COALESCE(p_source, 'MANUAL'), NOW()
        ) RETURNING id INTO v_payout_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST',
            'message', 'Duplicate withdrawal request detected.');
    END;

    INSERT INTO public.seller_financial_ledger (
        seller_id, transaction_type, entry_type, amount, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        p_seller_id, 'WITHDRAWAL_REQUESTED', 'DEBIT', v_amount, 'INR', v_available, v_available - v_amount,
        'COMPLETED',
        'Balance reserved for UPI withdrawal (' || p_payout_number || ') to ' || p_destination_masked,
        p_payout_number, 'PAYOUT_REQUEST', 'LEDGER_REQ_' || p_payout_number,
        jsonb_build_object('payout_id', v_payout_id, 'payout_number', p_payout_number,
                           'destination_masked', p_destination_masked, 'source', COALESCE(p_source, 'MANUAL'))
    );

    INSERT INTO public.payout_queue (
        payout_request_id, seller_id, amount, destination_upi, beneficiary_name,
        payout_number, idempotency_key, status, job_type, next_attempt_at
    ) VALUES (
        v_payout_id, p_seller_id, v_amount, p_destination_upi, p_beneficiary_name,
        p_payout_number, p_idempotency_key, 'QUEUED', COALESCE(p_source, 'MANUAL'), NOW()
    ) RETURNING id INTO v_queue_id;

    PERFORM public.log_payout_event(v_payout_id, 'WITHDRAWAL_REQUESTED', NULL, 'PROCESSING', 'SELLER',
        jsonb_build_object('amount', v_amount, 'destination_masked', p_destination_masked, 'source', COALESCE(p_source, 'MANUAL')));
    PERFORM public.log_payout_event(v_payout_id, 'BALANCE_RESERVED', 'PROCESSING', 'PROCESSING', 'SYSTEM',
        jsonb_build_object('available_before', v_available, 'available_after', v_available - v_amount, 'reserved_amount', v_amount));
    PERFORM public.log_payout_event(v_payout_id, 'PAYOUT_QUEUED', 'PROCESSING', 'PROCESSING', 'SYSTEM',
        jsonb_build_object('queue_id', v_queue_id));

    RETURN jsonb_build_object(
        'success', true, 'payout_id', v_payout_id, 'payout_number', p_payout_number, 'queue_id', v_queue_id,
        'amount', v_amount, 'status', 'PROCESSING',
        'balance_before', v_available, 'balance_after', v_available - v_amount,
        'reserved_amount', v_reserved + v_amount, 'destination_masked', p_destination_masked,
        'message', 'Balance reserved and withdrawal queued.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. DISPATCH MARKER (called by worker after Razorpay ACCEPTED the payout)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_payout_dispatched(
    p_payout_id UUID, p_provider_payout_id TEXT, p_provider_status TEXT, p_utr TEXT DEFAULT NULL, p_source TEXT DEFAULT 'WORKER'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payout RECORD;
    v_available NUMERIC := 0;
    v_new_status TEXT;
BEGIN
    SELECT * INTO v_payout FROM public.seller_payout_requests WHERE id = p_payout_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    -- Never regress a finalized payout
    IF v_payout.status NOT IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED') THEN
        RETURN jsonb_build_object('success', true, 'unchanged', true, 'status', v_payout.status);
    END IF;

    -- Nothing new to record
    IF v_payout.status = 'PROCESSING'
       AND v_payout.provider_payout_id IS NOT DISTINCT FROM p_provider_payout_id
       AND v_payout.provider_status IS NOT DISTINCT FROM p_provider_status THEN
        UPDATE public.seller_payout_requests SET provider_last_checked_at = NOW() WHERE id = p_payout_id;
        RETURN jsonb_build_object('success', true, 'unchanged', true, 'status', v_payout.status);
    END IF;

    v_new_status := 'PROCESSING';

    UPDATE public.seller_payout_requests
    SET status = v_new_status,
        provider_payout_id = COALESCE(p_provider_payout_id, provider_payout_id),
        provider_status = p_provider_status,
        utr_number = COALESCE(p_utr, utr_number),
        provider_last_checked_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    UPDATE public.payout_queue
    SET status = 'DISPATCHED', error_message = NULL, updated_at = NOW()
    WHERE payout_request_id = p_payout_id AND status IN ('QUEUED', 'PROCESSING', 'DEAD_LETTER');

    SELECT COALESCE(b.available, 0) INTO v_available FROM public.seller_balance_summary(v_payout.seller_id) b;
    v_available := COALESCE(v_available, 0);

    INSERT INTO public.seller_financial_ledger (
        seller_id, transaction_type, entry_type, amount, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        v_payout.seller_id, 'WITHDRAWAL_PROCESSING', 'DEBIT', v_payout.amount, 'INR', v_available, v_available,
        'COMPLETED',
        'Payout accepted by Razorpay (' || v_payout.payout_number || '), awaiting final status',
        v_payout.payout_number, 'PAYOUT_REQUEST', 'LEDGER_PROC_' || v_payout.payout_number,
        jsonb_build_object('payout_id', p_payout_id, 'provider_payout_id', p_provider_payout_id, 'provider_status', p_provider_status)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    PERFORM public.log_payout_event(p_payout_id, 'PAYOUT_CREATED', v_payout.status, v_new_status, p_source,
        jsonb_build_object('provider_payout_id', p_provider_payout_id, 'provider_status', p_provider_status));

    RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. FINALIZERS (transition-guarded, idempotent, ledger-before/after accurate)
--    Allowed:  PENDING | PROCESSING | RECONCILIATION_REQUIRED  ->  SUCCESS | FAILED | CANCELLED | REVERSED
--              SUCCESS -> REVERSED
--    Anything else is REFUSED and flagged RECONCILIATION (no money moves).
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finalize_payout_success(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.finalize_payout_failure(UUID, TEXT);
DROP FUNCTION IF EXISTS public.finalize_payout_reversal(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.finalize_payout_success(
    p_payout_id UUID, p_provider_payout_id TEXT, p_utr_number TEXT, p_source TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payout RECORD;
    v_available NUMERIC := 0;
BEGIN
    SELECT * INTO v_payout FROM public.seller_payout_requests WHERE id = p_payout_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    IF v_payout.status IN ('SUCCESS', 'COMPLETED') THEN
        IF v_payout.utr_number IS NULL AND p_utr_number IS NOT NULL THEN
            UPDATE public.seller_payout_requests SET utr_number = p_utr_number, updated_at = NOW() WHERE id = p_payout_id;
            PERFORM public.log_payout_event(p_payout_id, 'UTR_RECORDED', v_payout.status, v_payout.status, p_source,
                jsonb_build_object('utr', p_utr_number));
        END IF;
        RETURN jsonb_build_object('success', true, 'already_completed', true, 'payout_number', v_payout.payout_number);
    END IF;

    IF v_payout.status NOT IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED') THEN
        PERFORM public.flag_payout_reconciliation(p_payout_id, ARRAY['LATE_SUCCESS_AFTER_' || v_payout.status],
            'Provider reported PROCESSED but local payout is already ' || v_payout.status || '. Possible money released while payout succeeded.',
            p_source, 'processed', NULL, NULL);
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION', 'current_status', v_payout.status);
    END IF;

    PERFORM 1 FROM public.sellers WHERE id = v_payout.seller_id FOR UPDATE;
    SELECT COALESCE(b.available, 0) INTO v_available FROM public.seller_balance_summary(v_payout.seller_id) b;
    v_available := COALESCE(v_available, 0);

    UPDATE public.seller_payout_requests
    SET status = 'SUCCESS',
        provider_payout_id = COALESCE(p_provider_payout_id, provider_payout_id),
        utr_number = COALESCE(p_utr_number, utr_number),
        provider_status = 'processed',
        stuck_flag = FALSE,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    UPDATE public.payout_queue SET status = 'COMPLETED', updated_at = NOW() WHERE payout_request_id = p_payout_id;

    -- Reserved -> Withdrawn: available balance is unchanged
    INSERT INTO public.seller_financial_ledger (
        seller_id, transaction_type, entry_type, amount, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        v_payout.seller_id, 'WITHDRAWAL_SUCCESS', 'DEBIT', v_payout.amount, 'INR', v_available, v_available,
        'COMPLETED',
        'UPI payout completed (' || v_payout.payout_number || '). UTR: ' || COALESCE(p_utr_number, 'N/A'),
        v_payout.payout_number, 'PAYOUT_REQUEST', 'LEDGER_SUCC_' || v_payout.payout_number,
        jsonb_build_object('payout_id', p_payout_id, 'utr', p_utr_number, 'provider_payout_id', p_provider_payout_id)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    PERFORM public.log_payout_event(p_payout_id, 'FINAL_STATUS', v_payout.status, 'SUCCESS', p_source,
        jsonb_build_object('utr', p_utr_number, 'provider_payout_id', p_provider_payout_id));

    RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'payout_number', v_payout.payout_number,
        'status', 'SUCCESS', 'utr', p_utr_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_payout_failure(
    p_payout_id UUID, p_failure_reason TEXT, p_final_status TEXT DEFAULT 'FAILED', p_source TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payout RECORD;
    v_available NUMERIC := 0;
    v_final TEXT := CASE WHEN UPPER(COALESCE(p_final_status, 'FAILED')) = 'CANCELLED' THEN 'CANCELLED' ELSE 'FAILED' END;
BEGIN
    SELECT * INTO v_payout FROM public.seller_payout_requests WHERE id = p_payout_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    IF v_payout.status IN ('FAILED', 'CANCELLED') THEN
        RETURN jsonb_build_object('success', true, 'already_failed', true, 'payout_number', v_payout.payout_number);
    END IF;

    IF v_payout.status NOT IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED') THEN
        PERFORM public.flag_payout_reconciliation(p_payout_id, ARRAY['FAILURE_AFTER_' || v_payout.status],
            'Provider reported ' || v_final || ' but local payout is already ' || v_payout.status || '. Balance NOT changed.',
            p_source, LOWER(v_final), NULL, NULL);
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION', 'current_status', v_payout.status);
    END IF;

    PERFORM 1 FROM public.sellers WHERE id = v_payout.seller_id FOR UPDATE;
    SELECT COALESCE(b.available, 0) INTO v_available FROM public.seller_balance_summary(v_payout.seller_id) b;
    v_available := COALESCE(v_available, 0);

    UPDATE public.seller_payout_requests
    SET status = v_final,
        failure_reason = p_failure_reason,
        provider_status = LOWER(v_final),
        stuck_flag = FALSE,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    UPDATE public.payout_queue SET status = 'FAILED', error_message = p_failure_reason, updated_at = NOW()
    WHERE payout_request_id = p_payout_id;

    -- Reserved -> Available: balance after = before + amount
    INSERT INTO public.seller_financial_ledger (
        seller_id, transaction_type, entry_type, amount, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        v_payout.seller_id, 'WITHDRAWAL_FAILED', 'CREDIT', v_payout.amount, 'INR', v_available, v_available + v_payout.amount,
        'COMPLETED',
        'Reserved amount released, withdrawal ' || LOWER(v_final) || ' (' || v_payout.payout_number || '): ' || COALESCE(p_failure_reason, 'Provider rejection'),
        v_payout.payout_number, 'PAYOUT_REQUEST', 'LEDGER_FAIL_' || v_payout.payout_number,
        jsonb_build_object('payout_id', p_payout_id, 'failure_reason', p_failure_reason, 'final_status', v_final)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    PERFORM public.log_payout_event(p_payout_id, 'FINAL_STATUS', v_payout.status, v_final, p_source,
        jsonb_build_object('failure_reason', p_failure_reason));

    RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'payout_number', v_payout.payout_number,
        'status', v_final, 'failure_reason', p_failure_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_payout_reversal(
    p_payout_id UUID, p_reason TEXT, p_source TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payout RECORD;
    v_available NUMERIC := 0;
BEGIN
    SELECT * INTO v_payout FROM public.seller_payout_requests WHERE id = p_payout_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    IF v_payout.status = 'REVERSED' THEN
        RETURN jsonb_build_object('success', true, 'already_reversed', true, 'payout_number', v_payout.payout_number);
    END IF;

    IF v_payout.status IN ('FAILED', 'CANCELLED') THEN
        PERFORM public.flag_payout_reconciliation(p_payout_id, ARRAY['UNEXPECTED_REVERSAL'],
            'Provider reported REVERSED but local payout is ' || v_payout.status || '. Balance NOT changed.',
            p_source, 'reversed', NULL, NULL);
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION', 'current_status', v_payout.status);
    END IF;

    PERFORM 1 FROM public.sellers WHERE id = v_payout.seller_id FOR UPDATE;
    SELECT COALESCE(b.available, 0) INTO v_available FROM public.seller_balance_summary(v_payout.seller_id) b;
    v_available := COALESCE(v_available, 0);

    -- A reversal proves the payout had been processed: book the missing WITHDRAWAL_SUCCESS first
    -- (same transaction) so that Reserved -> Withdrawn -> Available always balances.
    IF v_payout.status IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED') THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, transaction_type, entry_type, amount, currency, balance_before, balance_after,
            status, description, reference_id, reference_type, idempotency_key, metadata
        ) VALUES (
            v_payout.seller_id, 'WITHDRAWAL_SUCCESS', 'DEBIT', v_payout.amount, 'INR', v_available, v_available,
            'COMPLETED',
            'Payout processed before reversal (' || v_payout.payout_number || ')',
            v_payout.payout_number, 'PAYOUT_REQUEST', 'LEDGER_SUCC_' || v_payout.payout_number,
            jsonb_build_object('payout_id', p_payout_id, 'implied_by', 'REVERSAL')
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    UPDATE public.seller_payout_requests
    SET status = 'REVERSED',
        failure_reason = p_reason,
        provider_status = 'reversed',
        stuck_flag = FALSE,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    UPDATE public.payout_queue SET status = 'COMPLETED', updated_at = NOW() WHERE payout_request_id = p_payout_id;

    INSERT INTO public.seller_financial_ledger (
        seller_id, transaction_type, entry_type, amount, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        v_payout.seller_id, 'WITHDRAWAL_REVERSED', 'CREDIT', v_payout.amount, 'INR', v_available, v_available + v_payout.amount,
        'COMPLETED',
        'Payout reversed (' || v_payout.payout_number || '): ' || COALESCE(p_reason, 'Provider reversal') || '. Amount restored to available balance.',
        v_payout.payout_number, 'PAYOUT_REQUEST', 'LEDGER_REV_' || v_payout.payout_number,
        jsonb_build_object('payout_id', p_payout_id, 'reversal_reason', p_reason)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    PERFORM public.log_payout_event(p_payout_id, 'FINAL_STATUS', v_payout.status, 'REVERSED', p_source,
        jsonb_build_object('reason', p_reason));

    -- Reversal of a previously successful payout is always worth a human look
    PERFORM public.flag_payout_reconciliation(p_payout_id, ARRAY['PAYOUT_REVERSED'],
        'Payout reversed by provider: ' || COALESCE(p_reason, 'n/a'), p_source, 'reversed', NULL, NULL);

    RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'REVERSED');
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. QUEUE CLAIMING (safe with any number of workers / instances)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_payout_jobs(
    p_worker TEXT, p_limit INT DEFAULT 10, p_stale_seconds INT DEFAULT 300
) RETURNS SETOF public.payout_queue LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    WITH c AS (
        SELECT q.id
        FROM public.payout_queue q
        JOIN public.seller_payout_requests r ON r.id = q.payout_request_id
        WHERE r.status IN ('PENDING', 'PROCESSING')
          AND (
                (q.status = 'QUEUED' AND q.next_attempt_at <= NOW())
             OR (q.status = 'PROCESSING' AND q.locked_at < NOW() - make_interval(secs => p_stale_seconds))
          )
        ORDER BY q.created_at
        LIMIT GREATEST(1, LEAST(p_limit, 100))
        FOR UPDATE OF q SKIP LOCKED
    )
    UPDATE public.payout_queue q
    SET status = 'PROCESSING', locked_at = NOW(), locked_by = p_worker, updated_at = NOW()
    FROM c WHERE q.id = c.id
    RETURNING q.*;
$$;

-- Records a safe retry (called only after reconciliation proved no payout exists at provider)
CREATE OR REPLACE FUNCTION public.requeue_payout_job(
    p_job_id UUID, p_delay_seconds INT, p_error TEXT
) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    UPDATE public.payout_queue
    SET status = 'QUEUED', attempts = attempts + 1, error_message = p_error,
        next_attempt_at = NOW() + make_interval(secs => p_delay_seconds),
        locked_at = NULL, locked_by = NULL, updated_at = NOW()
    WHERE id = p_job_id;
$$;

-- ------------------------------------------------------------------------------
-- 10. WEBHOOK QUEUE (store -> claim -> process)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_webhook_event(
    p_event_id TEXT, p_event_type TEXT, p_entity_id TEXT, p_payload JSONB, p_signature TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id UUID;
    v_status TEXT;
BEGIN
    INSERT INTO public.webhook_events (provider, event_id, event_type, entity_id, payload, signature, status, received_at)
    VALUES ('RAZORPAY', p_event_id, p_event_type, p_entity_id, p_payload, p_signature, 'RECEIVED', NOW())
    ON CONFLICT (event_id) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NOT NULL THEN
        RETURN jsonb_build_object('is_new', true, 'id', v_id);
    END IF;

    SELECT status INTO v_status FROM public.webhook_events WHERE event_id = p_event_id;
    RETURN jsonb_build_object('is_new', false, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_webhook_events(
    p_limit INT DEFAULT 20, p_stale_seconds INT DEFAULT 300, p_max_attempts INT DEFAULT 8
) RETURNS SETOF public.webhook_events LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    WITH c AS (
        SELECT w.id
        FROM public.webhook_events w
        WHERE w.provider = 'RAZORPAY'
          AND w.attempts < p_max_attempts
          AND (
                w.status = 'RECEIVED'
             OR (w.status = 'FAILED' AND COALESCE(w.processing_started_at, 'epoch'::timestamptz) < NOW() - make_interval(secs => 30 * GREATEST(w.attempts, 1)))
             OR (w.status = 'PROCESSING' AND w.processing_started_at < NOW() - make_interval(secs => p_stale_seconds))
          )
        ORDER BY w.received_at
        LIMIT GREATEST(1, LEAST(p_limit, 100))
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.webhook_events w
    SET status = 'PROCESSING', attempts = w.attempts + 1, processing_started_at = NOW()
    FROM c WHERE w.id = c.id
    RETURNING w.*;
$$;

CREATE OR REPLACE FUNCTION public.complete_webhook_event(
    p_id UUID, p_status TEXT, p_error TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    UPDATE public.webhook_events
    SET status = p_status, last_error = p_error, error_message = p_error,
        processed_at = CASE WHEN p_status IN ('PROCESSED', 'IGNORED') THEN NOW() ELSE processed_at END
    WHERE id = p_id;
$$;

-- ------------------------------------------------------------------------------
-- 11. AUTOMATIC SETTLEMENT (same reservation -> queue -> worker path)
--     Sellers must opt in (sellers.auto_settlement_enabled) and have a VERIFIED UPI.
--     Idempotency key = auto_<seller>_<period>  => at most one auto payout per seller per period.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_auto_settlements(
    p_period_key TEXT, p_min_amount NUMERIC DEFAULT 500, p_limit INT DEFAULT 200
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r RECORD;
    v_result JSONB;
    v_queued INT := 0;
    v_skipped INT := 0;
    v_failed INT := 0;
BEGIN
    FOR r IN
        SELECT s.id AS seller_id,
               m.id AS method_id,
               COALESCE(m.upi_id, m.destination_raw) AS upi,
               m.masked_destination,
               COALESCE(m.verified_name, s.business_name, 'Seller Settlement') AS beneficiary,
               b.available
        FROM public.sellers s
        JOIN LATERAL (
            SELECT * FROM public.seller_settlement_methods sm
            WHERE sm.seller_id = s.id AND sm.method_type = 'UPI' AND sm.is_verified = TRUE AND sm.status = 'VERIFIED'
            ORDER BY sm.is_default DESC, sm.created_at DESC LIMIT 1
        ) m ON TRUE
        JOIN public.seller_balance_summary() b ON b.seller_id = s.id
        WHERE s.auto_settlement_enabled = TRUE
          AND LOWER(COALESCE(s.status, '')) NOT IN ('suspended', 'banned', 'frozen', 'blocked')
          AND b.available >= p_min_amount
          AND NOT EXISTS (SELECT 1 FROM public.seller_payout_requests pr
                          WHERE pr.seller_id = s.id AND pr.status IN ('PENDING', 'PROCESSING'))
        ORDER BY b.available DESC
        LIMIT GREATEST(1, LEAST(p_limit, 1000))
    LOOP
        BEGIN
            v_result := public.reserve_seller_balance_for_withdrawal(
                r.seller_id, r.available, 'auto_' || r.seller_id::text || '_' || p_period_key,
                'AUT-' || UPPER(SUBSTR(REPLACE(r.seller_id::text, '-', ''), 1, 12)) || '-' || REPLACE(p_period_key, '-', ''),
                r.masked_destination, r.upi, r.beneficiary, r.method_id, 'AUTO_SETTLEMENT'
            );
            IF (v_result->>'success')::boolean AND COALESCE((v_result->>'idempotent')::boolean, FALSE) = FALSE THEN
                v_queued := v_queued + 1;
            ELSE
                v_skipped := v_skipped + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object('queued', v_queued, 'skipped', v_skipped, 'failed', v_failed, 'period', p_period_key);
END;
$$;

-- ------------------------------------------------------------------------------
-- 12. ADMIN AGGREGATES
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_admin_settlement_overview();

CREATE OR REPLACE FUNCTION public.get_admin_settlement_overview(p_stuck_minutes INT DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_bal RECORD;
    v_p RECORD;
    v_q RECORD;
    v_w BIGINT;
BEGIN
    SELECT COALESCE(SUM(net_earnings), 0) AS earnings, COALESCE(SUM(pending), 0) AS pending,
           COALESCE(SUM(available), 0) AS available, COALESCE(SUM(reserved), 0) AS reserved,
           COALESCE(SUM(withdrawn), 0) AS withdrawn
    INTO v_bal FROM public.seller_balance_summary();

    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING')) AS proc_c,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING', 'PROCESSING')), 0) AS proc_a,
        COUNT(*) FILTER (WHERE status IN ('SUCCESS', 'COMPLETED')) AS succ_c,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('SUCCESS', 'COMPLETED')), 0) AS succ_a,
        COUNT(*) FILTER (WHERE status IN ('FAILED', 'CANCELLED')) AS fail_c,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('FAILED', 'CANCELLED')), 0) AS fail_a,
        COUNT(*) FILTER (WHERE status = 'REVERSED') AS rev_c,
        COALESCE(SUM(amount) FILTER (WHERE status = 'REVERSED'), 0) AS rev_a,
        COUNT(*) FILTER (WHERE status = 'RECONCILIATION_REQUIRED' OR reconciliation_flag) AS recon_c,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED')
                         AND created_at < NOW() - make_interval(mins => p_stuck_minutes)) AS stuck_c
    INTO v_p FROM public.seller_payout_requests;

    SELECT COUNT(*) FILTER (WHERE status = 'QUEUED') AS queued,
           COUNT(*) FILTER (WHERE status = 'DEAD_LETTER') AS dead
    INTO v_q FROM public.payout_queue;

    SELECT COUNT(*) INTO v_w FROM public.webhook_events
    WHERE provider = 'RAZORPAY' AND status IN ('RECEIVED', 'FAILED', 'PROCESSING')
      AND received_at < NOW() - INTERVAL '5 minutes';

    RETURN jsonb_build_object(
        'total_seller_earnings', v_bal.earnings,
        'total_pending_balance', v_bal.pending,
        'total_available_balance', v_bal.available,
        'total_reserved_balance', v_bal.reserved,
        'total_withdrawn', v_bal.withdrawn,
        'total_withdrawals_count', v_p.total,
        'total_payout_amount', v_p.succ_a,
        'total_processing_payouts', v_p.proc_c,
        'total_processing_amount', v_p.proc_a,
        'total_successful_payouts', v_p.succ_c,
        'total_successful_amount', v_p.succ_a,
        'total_failed_payouts', v_p.fail_c,
        'failed_payout_count', v_p.fail_c,
        'total_failed_amount', v_p.fail_a,
        'total_reversed_payouts', v_p.rev_c,
        'total_reversed_amount', v_p.rev_a,
        'reconciliation_issues_count', v_p.recon_c,
        'stuck_payouts_count', v_p.stuck_c,
        'queued_jobs', v_q.queued,
        'dead_letter_jobs', v_q.dead,
        'unprocessed_webhooks', v_w
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_seller_balances(
    p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0
) RETURNS TABLE (
    seller_id UUID, business_name TEXT, owner_name TEXT, email TEXT,
    net_earnings NUMERIC, pending NUMERIC, available NUMERIC, reserved NUMERIC, withdrawn NUMERIC,
    payouts_count BIGINT, flagged_count BIGINT, total_count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT s.id, s.business_name::text, s.owner_name::text, s.email::text,
           COALESCE(b.net_earnings, 0), COALESCE(b.pending, 0), COALESCE(b.available, 0),
           COALESCE(b.reserved, 0), COALESCE(b.withdrawn, 0),
           (SELECT COUNT(*) FROM public.seller_payout_requests pr WHERE pr.seller_id = s.id),
           (SELECT COUNT(*) FROM public.seller_payout_requests pr WHERE pr.seller_id = s.id
              AND (pr.status = 'RECONCILIATION_REQUIRED' OR pr.reconciliation_flag)),
           COUNT(*) OVER ()
    FROM public.sellers s
    LEFT JOIN public.seller_balance_summary() b ON b.seller_id = s.id
    WHERE p_search IS NULL OR p_search = ''
       OR s.business_name ILIKE '%' || p_search || '%'
       OR s.owner_name ILIKE '%' || p_search || '%'
       OR s.email ILIKE '%' || p_search || '%'
       OR s.id::text = p_search
    ORDER BY COALESCE(b.available, 0) DESC, s.business_name
    LIMIT GREATEST(1, LEAST(p_limit, 200)) OFFSET GREATEST(0, p_offset);
$$;

-- ------------------------------------------------------------------------------
-- 13. LOCK DOWN: money-moving RPCs are service_role ONLY
--     (SECURITY DEFINER functions are otherwise callable by any logged-in user via PostgREST!)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    fn TEXT;
BEGIN
    FOREACH fn IN ARRAY ARRAY[
        'public.reserve_seller_balance_for_withdrawal(uuid,numeric,text,text,text,text,text,uuid,text)',
        'public.mark_payout_dispatched(uuid,text,text,text,text)',
        'public.finalize_payout_success(uuid,text,text,text)',
        'public.finalize_payout_failure(uuid,text,text,text)',
        'public.finalize_payout_reversal(uuid,text,text)',
        'public.flag_payout_reconciliation(uuid,text[],text,text,text,numeric,text)',
        'public.record_reconciliation_check(uuid,text,numeric,text,text,text)',
        'public.log_payout_event(uuid,text,text,text,text,jsonb)',
        'public.claim_payout_jobs(text,int,int)',
        'public.requeue_payout_job(uuid,int,text)',
        'public.record_webhook_event(text,text,text,jsonb,text)',
        'public.claim_webhook_events(int,int,int)',
        'public.complete_webhook_event(uuid,text,text)',
        'public.enqueue_auto_settlements(text,numeric,int)',
        'public.get_admin_settlement_overview(int)',
        'public.admin_list_seller_balances(text,int,int)',
        'public.seller_balance_summary(uuid)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 14. RLS for new tables (service role only; sellers never read internal history)
-- ------------------------------------------------------------------------------
ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_reconciliation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages payout events" ON public.payout_events;
CREATE POLICY "Service role manages payout events" ON public.payout_events FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role manages recon events" ON public.payout_reconciliation_events;
CREATE POLICY "Service role manages recon events" ON public.payout_reconciliation_events FOR ALL TO service_role USING (true);
