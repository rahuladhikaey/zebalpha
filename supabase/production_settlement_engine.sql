-- ==============================================================================
-- ZEBALPHA PRODUCTION-SCALE SETTLEMENT ENGINE & CONCURRENCY PROTECTION
-- Balance Reservation, Row-Level Locking, Webhook Idempotency, 
-- Background Payout Queue, Immutable Ledger, Reconciliation & Admin Audit Logs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SELLER PAYOUT REQUESTS TABLE HARDENING
CREATE TABLE IF NOT EXISTS public.seller_payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    settlement_method_id UUID REFERENCES public.seller_settlement_methods(id) ON DELETE SET NULL,
    method_type VARCHAR(20) DEFAULT 'UPI' NOT NULL,
    destination_masked VARCHAR(100) NOT NULL,
    destination_upi VARCHAR(255),
    beneficiary_name VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(50) DEFAULT 'PROCESSING' NOT NULL CHECK (
        status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'RECONCILIATION_REQUIRED')
    ),
    provider VARCHAR(50) DEFAULT 'RAZORPAY',
    provider_payout_id VARCHAR(100),
    provider_status VARCHAR(50),
    utr_number VARCHAR(100),
    failure_reason TEXT,
    idempotency_key VARCHAR(150) UNIQUE,
    notes TEXT,
    retry_count INT DEFAULT 0 NOT NULL,
    last_reconciled_at TIMESTAMPTZ,
    stuck_flag BOOLEAN DEFAULT FALSE NOT NULL,
    reconciliation_notes TEXT,
    initiated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure all columns exist in seller_payout_requests
DO $$
BEGIN
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS destination_upi VARCHAR(255);
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ;
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS stuck_flag BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50);
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS provider_payout_id VARCHAR(100);
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS failure_reason TEXT;
    ALTER TABLE public.seller_payout_requests ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);
    
    -- Relax or update status check constraint to support RECONCILIATION_REQUIRED
    ALTER TABLE public.seller_payout_requests DROP CONSTRAINT IF EXISTS seller_payout_requests_status_check;
    ALTER TABLE public.seller_payout_requests ADD CONSTRAINT seller_payout_requests_status_check CHECK (
        status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'RECONCILIATION_REQUIRED')
    );
END $$;

CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON public.seller_payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.seller_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_idempotency ON public.seller_payout_requests(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payout_requests_provider_id ON public.seller_payout_requests(provider_payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON public.seller_payout_requests(created_at DESC);

-- 2. PAYOUT QUEUE TABLE (BACKGROUND WORKER QUEUE)
CREATE TABLE IF NOT EXISTS public.payout_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id UUID NOT NULL REFERENCES public.seller_payout_requests(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    destination_upi VARCHAR(255) NOT NULL,
    beneficiary_name VARCHAR(255),
    payout_number VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(150) NOT NULL,
    status VARCHAR(30) DEFAULT 'QUEUED' NOT NULL CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER')),
    attempts INT DEFAULT 0 NOT NULL,
    max_attempts INT DEFAULT 3 NOT NULL,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    error_message TEXT,
    next_attempt_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;
    ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 3;
    ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
    ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS locked_by VARCHAR(100);
    ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE public.payout_queue ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_payout_queue_status_next ON public.payout_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_payout_queue_payout_id ON public.payout_queue(payout_request_id);

-- 3. WEBHOOK EVENTS TABLE (WEBHOOK IDEMPOTENCY & AUDIT)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) DEFAULT 'RAZORPAY' NOT NULL,
    event_id VARCHAR(150) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    payload JSONB NOT NULL,
    signature TEXT,
    status VARCHAR(50) DEFAULT 'PROCESSED' NOT NULL CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED_DUPLICATE')),
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'RAZORPAY';
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS event_id VARCHAR(150);
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS payload JSONB;
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS signature TEXT;
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PROCESSED';
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_entity ON public.webhook_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON public.webhook_events(event_type);

-- 4. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR(100) NOT NULL,
    admin_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    payout_request_id UUID REFERENCES public.seller_payout_requests(id) ON DELETE SET NULL,
    previous_state JSONB DEFAULT '{}'::jsonb,
    new_state JSONB DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS admin_id VARCHAR(100);
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100);
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS target_seller_id UUID;
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS payout_request_id UUID;
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS previous_state JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS new_state JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
    ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_seller ON public.admin_audit_logs(target_seller_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_payout ON public.admin_audit_logs(payout_request_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- 5. IMMUTABLE FINANCIAL LEDGER EXPANSION
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_financial_ledger') THEN
        ALTER TABLE public.seller_financial_ledger DROP CONSTRAINT IF EXISTS seller_financial_ledger_transaction_type_check;
        ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS balance_before NUMERIC(12, 2) DEFAULT 0.00;
        ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2) DEFAULT 0.00;
        ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);
        ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
        ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);
    END IF;
END $$;

-- 6. RPC: CONCURRENCY-SAFE BALANCE RESERVATION & WITHDRAWAL INITIATION
CREATE OR REPLACE FUNCTION public.reserve_seller_balance_for_withdrawal(
    p_seller_id UUID,
    p_amount NUMERIC(12, 2),
    p_idempotency_key TEXT,
    p_payout_number TEXT,
    p_destination_masked TEXT,
    p_destination_upi TEXT,
    p_beneficiary_name TEXT,
    p_settlement_method_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_seller RECORD;
    v_gross_sales NUMERIC(12, 2) := 0.00;
    v_total_deductions NUMERIC(12, 2) := 0.00;
    v_net_earnings NUMERIC(12, 2) := 0.00;
    v_total_settled NUMERIC(12, 2) := 0.00;
    v_reserved_balance NUMERIC(12, 2) := 0.00;
    v_available_balance NUMERIC(12, 2) := 0.00;
    v_existing_payout RECORD;
    v_new_payout_id UUID;
    v_queue_id UUID;
    v_balance_before NUMERIC(12, 2) := 0.00;
    v_balance_after NUMERIC(12, 2) := 0.00;
BEGIN
    -- STEP 1: Check Idempotency Key first
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_payout
        FROM public.seller_payout_requests
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_payout.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent', true,
                'payout_id', v_existing_payout.id,
                'payout_number', v_existing_payout.payout_number,
                'status', v_existing_payout.status,
                'amount', v_existing_payout.amount,
                'message', 'Idempotent request already processed.'
            );
        END IF;
    END IF;

    -- STEP 2: Row-Level Exclusive Lock on the Seller to guarantee 100% concurrency safety
    SELECT * INTO v_seller 
    FROM public.sellers 
    WHERE id = p_seller_id 
    FOR UPDATE;

    IF v_seller.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SELLER_NOT_FOUND',
            'message', 'Seller account does not exist.'
        );
    END IF;

    IF v_seller.status IS NOT NULL AND LOWER(v_seller.status) IN ('suspended', 'banned', 'frozen', 'blocked') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SELLER_SUSPENDED',
            'message', 'Seller account is suspended and ineligible for withdrawal.'
        );
    END IF;

    -- STEP 3: Prevent duplicate active processing requests
    IF EXISTS (
        SELECT 1 FROM public.seller_payout_requests 
        WHERE seller_id = p_seller_id 
        AND status IN ('PENDING', 'PROCESSING')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTIVE_PAYOUT_IN_PROGRESS',
            'message', 'A withdrawal request is currently processing. Please wait for it to complete.'
        );
    END IF;

    -- STEP 4: Calculate accurate real-time balances directly from completed ledger & active reservations
    -- Aggregate Completed Credits (Gross Sales)
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_gross_sales
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id 
    AND status = 'COMPLETED'
    AND entry_type = 'CREDIT'
    AND transaction_type IN ('SALE', 'SALE_CREDIT', 'ADJUSTMENT_CREDIT');

    -- Aggregate Completed Deductions
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_deductions
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id 
    AND status = 'COMPLETED'
    AND entry_type = 'DEBIT'
    AND transaction_type IN (
        'COMMISSION', 'COMMISSION_DEDUCTION', 'FIXED_FEE', 'SHIPPING_FEE', 
        'COLLECTION_FEE', 'REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 
        'TAX', 'CHARGEBACK', 'PENALTY', 'ADJUSTMENT_DEBIT'
    );

    v_net_earnings := GREATEST(0.00, v_gross_sales - v_total_deductions);

    -- Aggregate Total Settled (Completed Withdrawals)
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_settled
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id 
    AND status = 'COMPLETED'
    AND transaction_type IN ('SETTLEMENT', 'WITHDRAWAL_SUCCESS');

    -- Subtract any reversals from total settled
    DECLARE
        v_reversed_amt NUMERIC(12, 2) := 0.00;
    BEGIN
        SELECT COALESCE(SUM(amount), 0.00)
        INTO v_reversed_amt
        FROM public.seller_financial_ledger
        WHERE seller_id = p_seller_id 
        AND status = 'COMPLETED'
        AND transaction_type IN ('SETTLEMENT_REVERSAL', 'WITHDRAWAL_REVERSED');
        
        v_total_settled := GREATEST(0.00, v_total_settled - v_reversed_amt);
    END;

    -- Aggregate Reserved/In-Flight Withdrawals
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_reserved_balance
    FROM public.seller_payout_requests
    WHERE seller_id = p_seller_id 
    AND status IN ('PENDING', 'PROCESSING');

    -- Real-time Available Balance
    v_available_balance := GREATEST(0.00, v_net_earnings - v_total_settled - v_reserved_balance);
    v_balance_before := v_available_balance;

    -- STEP 5: Validate Balance vs Requested Amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_AMOUNT',
            'message', 'Withdrawal amount must be greater than zero.'
        );
    END IF;

    IF p_amount > v_available_balance THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_BALANCE',
            'available_balance', v_available_balance,
            'requested_amount', p_amount,
            'reserved_balance', v_reserved_balance,
            'message', 'Requested amount exceeds available balance.'
        );
    END IF;

    v_balance_after := v_balance_before - p_amount;

    -- STEP 6: Atomically insert Payout Request (PROCESSING)
    INSERT INTO public.seller_payout_requests (
        payout_number,
        seller_id,
        settlement_method_id,
        method_type,
        destination_masked,
        destination_upi,
        beneficiary_name,
        amount,
        currency,
        status,
        provider,
        idempotency_key,
        notes,
        initiated_at
    ) VALUES (
        p_payout_number,
        p_seller_id,
        p_settlement_method_id,
        'UPI',
        p_destination_masked,
        p_destination_upi,
        p_beneficiary_name,
        p_amount,
        'INR',
        'PROCESSING',
        'RAZORPAY',
        p_idempotency_key,
        'UPI Payout to ' || p_destination_masked,
        NOW()
    )
    RETURNING id INTO v_new_payout_id;

    -- STEP 7: Insert Balance Reservation in Immutable Financial Ledger (WITHDRAWAL_REQUESTED)
    INSERT INTO public.seller_financial_ledger (
        seller_id,
        transaction_type,
        entry_type,
        amount,
        currency,
        balance_before,
        balance_after,
        status,
        description,
        reference_id,
        reference_type,
        idempotency_key,
        metadata,
        created_at
    ) VALUES (
        p_seller_id,
        'WITHDRAWAL_REQUESTED',
        'DEBIT',
        p_amount,
        'INR',
        v_balance_before,
        v_balance_after,
        'PENDING',
        'Balance Reserved for UPI Withdrawal (' || p_payout_number || ') to ' || p_destination_masked,
        p_payout_number,
        'PAYOUT_REQUEST',
        'LEDGER_RES_' || p_idempotency_key,
        jsonb_build_object(
            'payout_id', v_new_payout_id,
            'payout_number', p_payout_number,
            'destination_upi', p_destination_upi,
            'beneficiary_name', p_beneficiary_name
        ),
        NOW()
    );

    -- STEP 8: Push Job to Background Payout Queue
    INSERT INTO public.payout_queue (
        payout_request_id,
        seller_id,
        amount,
        destination_upi,
        beneficiary_name,
        payout_number,
        idempotency_key,
        status,
        next_attempt_at
    ) VALUES (
        v_new_payout_id,
        p_seller_id,
        p_amount,
        p_destination_upi,
        p_beneficiary_name,
        p_payout_number,
        p_idempotency_key,
        'QUEUED',
        NOW()
    )
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_new_payout_id,
        'payout_number', p_payout_number,
        'queue_id', v_queue_id,
        'amount', p_amount,
        'status', 'PROCESSING',
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'reserved_amount', p_amount,
        'destination_masked', p_destination_masked,
        'message', 'Balance reserved and withdrawal queued successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: FINALIZE PAYOUT SUCCESS
CREATE OR REPLACE FUNCTION public.finalize_payout_success(
    p_payout_id UUID,
    p_provider_payout_id TEXT,
    p_utr_number TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_payout RECORD;
    v_last_balance NUMERIC(12, 2) := 0.00;
BEGIN
    SELECT * INTO v_payout 
    FROM public.seller_payout_requests 
    WHERE id = p_payout_id 
    FOR UPDATE;

    IF v_payout.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    IF v_payout.status = 'SUCCESS' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true, 'payout_number', v_payout.payout_number);
    END IF;

    -- Update payout status
    UPDATE public.seller_payout_requests
    SET status = 'SUCCESS',
        provider_payout_id = COALESCE(p_provider_payout_id, provider_payout_id),
        utr_number = COALESCE(p_utr_number, utr_number),
        provider_status = 'processed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    -- Update payout queue job
    UPDATE public.payout_queue
    SET status = 'COMPLETED',
        updated_at = NOW()
    WHERE payout_request_id = p_payout_id;

    -- Insert WITHDRAWAL_SUCCESS ledger entry
    INSERT INTO public.seller_financial_ledger (
        seller_id,
        transaction_type,
        entry_type,
        amount,
        currency,
        balance_before,
        balance_after,
        status,
        description,
        reference_id,
        reference_type,
        idempotency_key,
        metadata,
        created_at
    ) VALUES (
        v_payout.seller_id,
        'WITHDRAWAL_SUCCESS',
        'DEBIT',
        v_payout.amount,
        'INR',
        0.00,
        0.00,
        'COMPLETED',
        'UPI Payout Completed (' || v_payout.payout_number || '). UTR: ' || COALESCE(p_utr_number, 'N/A'),
        v_payout.payout_number,
        'PAYOUT_REQUEST',
        'LEDGER_SUCC_' || v_payout.idempotency_key,
        jsonb_build_object(
            'payout_id', p_payout_id,
            'payout_number', v_payout.payout_number,
            'utr', p_utr_number,
            'provider_payout_id', p_provider_payout_id
        ),
        NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_id,
        'payout_number', v_payout.payout_number,
        'status', 'SUCCESS',
        'utr', p_utr_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: FINALIZE PAYOUT FAILURE
CREATE OR REPLACE FUNCTION public.finalize_payout_failure(
    p_payout_id UUID,
    p_failure_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_payout RECORD;
BEGIN
    SELECT * INTO v_payout 
    FROM public.seller_payout_requests 
    WHERE id = p_payout_id 
    FOR UPDATE;

    IF v_payout.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    IF v_payout.status = 'FAILED' THEN
        RETURN jsonb_build_object('success', true, 'already_failed', true, 'payout_number', v_payout.payout_number);
    END IF;

    -- Update payout status
    UPDATE public.seller_payout_requests
    SET status = 'FAILED',
        failure_reason = p_failure_reason,
        provider_status = 'failed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    -- Update payout queue job
    UPDATE public.payout_queue
    SET status = 'FAILED',
        error_message = p_failure_reason,
        updated_at = NOW()
    WHERE payout_request_id = p_payout_id;

    -- Insert WITHDRAWAL_FAILED rollback ledger entry (restores balance to Available)
    INSERT INTO public.seller_financial_ledger (
        seller_id,
        transaction_type,
        entry_type,
        amount,
        currency,
        balance_before,
        balance_after,
        status,
        description,
        reference_id,
        reference_type,
        idempotency_key,
        metadata,
        created_at
    ) VALUES (
        v_payout.seller_id,
        'WITHDRAWAL_FAILED',
        'CREDIT',
        v_payout.amount,
        'INR',
        0.00,
        0.00,
        'COMPLETED',
        'Rollback of failed withdrawal (' || v_payout.payout_number || '): ' || COALESCE(p_failure_reason, 'Provider rejection'),
        v_payout.payout_number,
        'PAYOUT_REQUEST',
        'LEDGER_FAIL_' || v_payout.idempotency_key,
        jsonb_build_object(
            'payout_id', p_payout_id,
            'payout_number', v_payout.payout_number,
            'failure_reason', p_failure_reason
        ),
        NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_id,
        'payout_number', v_payout.payout_number,
        'status', 'FAILED',
        'failure_reason', p_failure_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: FINALIZE PAYOUT REVERSAL
CREATE OR REPLACE FUNCTION public.finalize_payout_reversal(
    p_payout_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_payout RECORD;
BEGIN
    SELECT * INTO v_payout 
    FROM public.seller_payout_requests 
    WHERE id = p_payout_id 
    FOR UPDATE;

    IF v_payout.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_NOT_FOUND');
    END IF;

    IF v_payout.status = 'REVERSED' THEN
        RETURN jsonb_build_object('success', true, 'already_reversed', true);
    END IF;

    UPDATE public.seller_payout_requests
    SET status = 'REVERSED',
        failure_reason = p_reason,
        provider_status = 'reversed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payout_id;

    -- Insert WITHDRAWAL_REVERSED ledger entry
    INSERT INTO public.seller_financial_ledger (
        seller_id,
        transaction_type,
        entry_type,
        amount,
        currency,
        balance_before,
        balance_after,
        status,
        description,
        reference_id,
        reference_type,
        idempotency_key,
        metadata,
        created_at
    ) VALUES (
        v_payout.seller_id,
        'WITHDRAWAL_REVERSED',
        'CREDIT',
        v_payout.amount,
        'INR',
        0.00,
        0.00,
        'COMPLETED',
        'Reversal adjustment for withdrawal (' || v_payout.payout_number || '): ' || COALESCE(p_reason, 'Provider reversal'),
        v_payout.payout_number,
        'PAYOUT_REQUEST',
        'LEDGER_REV_' || v_payout.idempotency_key,
        jsonb_build_object(
            'payout_id', p_payout_id,
            'payout_number', v_payout.payout_number,
            'reversal_reason', p_reason
        ),
        NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_id,
        'status', 'REVERSED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: ADMIN SETTLEMENT OVERVIEW AGGREGATION
CREATE OR REPLACE FUNCTION public.get_admin_settlement_overview()
RETURNS JSONB AS $$
DECLARE
    v_gross_sales NUMERIC(12, 2) := 0.00;
    v_total_deductions NUMERIC(12, 2) := 0.00;
    v_net_seller_earnings NUMERIC(12, 2) := 0.00;
    v_total_withdrawn NUMERIC(12, 2) := 0.00;
    v_total_reserved NUMERIC(12, 2) := 0.00;
    v_total_available NUMERIC(12, 2) := 0.00;
    v_total_pending_escrow NUMERIC(12, 2) := 0.00;
    v_total_withdrawals_count BIGINT := 0;
    v_processing_count BIGINT := 0;
    v_processing_amount NUMERIC(12, 2) := 0.00;
    v_success_count BIGINT := 0;
    v_success_amount NUMERIC(12, 2) := 0.00;
    v_failed_count BIGINT := 0;
    v_failed_amount NUMERIC(12, 2) := 0.00;
    v_reversed_count BIGINT := 0;
    v_reversed_amount NUMERIC(12, 2) := 0.00;
    v_reconciliation_issues_count BIGINT := 0;
    v_stuck_payouts_count BIGINT := 0;
BEGIN
    -- 1. Net Earnings
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_gross_sales
    FROM public.seller_financial_ledger
    WHERE status = 'COMPLETED' AND entry_type = 'CREDIT' 
    AND transaction_type IN ('SALE', 'SALE_CREDIT', 'ADJUSTMENT_CREDIT');

    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_deductions
    FROM public.seller_financial_ledger
    WHERE status = 'COMPLETED' AND entry_type = 'DEBIT' 
    AND transaction_type IN ('COMMISSION', 'COMMISSION_DEDUCTION', 'FIXED_FEE', 'SHIPPING_FEE', 'COLLECTION_FEE', 'REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 'TAX', 'CHARGEBACK', 'PENALTY', 'ADJUSTMENT_DEBIT');

    v_net_seller_earnings := GREATEST(0.00, v_gross_sales - v_total_deductions);

    -- 2. Pending in Escrow
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_pending_escrow
    FROM public.seller_financial_ledger
    WHERE status = 'PENDING' AND transaction_type IN ('SALE', 'SALE_CREDIT');

    -- 3. Withdrawn (Successful)
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(amount), 0.00)
    INTO v_success_count, v_success_amount
    FROM public.seller_payout_requests
    WHERE status IN ('SUCCESS', 'COMPLETED');

    v_total_withdrawn := v_success_amount;

    -- 4. Processing Payouts & Reserved Balance
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(amount), 0.00)
    INTO v_processing_count, v_processing_amount
    FROM public.seller_payout_requests
    WHERE status IN ('PENDING', 'PROCESSING');

    v_total_reserved := v_processing_amount;

    -- 5. Failed Payouts
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(amount), 0.00)
    INTO v_failed_count, v_failed_amount
    FROM public.seller_payout_requests
    WHERE status = 'FAILED';

    -- 6. Reversed Payouts
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(amount), 0.00)
    INTO v_reversed_count, v_reversed_amount
    FROM public.seller_payout_requests
    WHERE status = 'REVERSED';

    -- 7. Total Withdrawals Count
    SELECT COALESCE(COUNT(*), 0)
    INTO v_total_withdrawals_count
    FROM public.seller_payout_requests;

    -- 8. Reconciliation Issues
    SELECT COALESCE(COUNT(*), 0)
    INTO v_reconciliation_issues_count
    FROM public.seller_payout_requests
    WHERE status = 'RECONCILIATION_REQUIRED';

    -- 9. Stuck / Long Processing Payouts (> 30 mins)
    SELECT COALESCE(COUNT(*), 0)
    INTO v_stuck_payouts_count
    FROM public.seller_payout_requests
    WHERE status IN ('PENDING', 'PROCESSING')
    AND created_at < NOW() - INTERVAL '30 minutes';

    -- 10. Total Available Balance across all sellers
    v_total_available := GREATEST(0.00, v_net_seller_earnings - v_total_withdrawn - v_total_reserved);

    RETURN jsonb_build_object(
        'total_seller_earnings', v_net_seller_earnings,
        'total_pending_balance', v_total_pending_escrow,
        'total_available_balance', v_total_available,
        'total_reserved_balance', v_total_reserved,
        'total_withdrawn', v_total_withdrawn,
        'total_withdrawals_count', v_total_withdrawals_count,
        'total_processing_payouts', v_processing_count,
        'total_processing_amount', v_processing_amount,
        'total_successful_payouts', v_success_count,
        'total_successful_amount', v_success_amount,
        'total_failed_payouts', v_failed_count,
        'total_failed_amount', v_failed_amount,
        'total_reversed_payouts', v_reversed_count,
        'total_reversed_amount', v_reversed_amount,
        'reconciliation_issues_count', v_reconciliation_issues_count,
        'stuck_payouts_count', v_stuck_payouts_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES FOR SECURE TABLES
ALTER TABLE public.payout_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages payout queue" ON public.payout_queue;
CREATE POLICY "Service role manages payout queue" ON public.payout_queue FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role manages webhook events" ON public.webhook_events;
CREATE POLICY "Service role manages webhook events" ON public.webhook_events FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role manages admin audit logs" ON public.admin_audit_logs;
CREATE POLICY "Service role manages admin audit logs" ON public.admin_audit_logs FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Admins view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins view audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
