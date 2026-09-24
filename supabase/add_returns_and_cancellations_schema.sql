-- ==============================================================================
-- ASALISWAD / ZEBALPHA — RETURN, EXCHANGE & CANCELLATION WORKFLOW SCHEMA
-- Compatible with Meesho & Flipkart standards
-- Bulletproof, Safe & 100% Idempotent SQL for Supabase PostgreSQL
-- ==============================================================================

-- 1. Extend orders table with cancellation, return & refund tracking columns
DO $$ 
BEGIN
    -- Cancellation fields
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'customer' | 'seller' | 'admin'

    -- Return & Exchange fields
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_status TEXT; -- 'requested' | 'approved' | 'rejected' | 'picked_up' | 'received' | 'completed' | 'cancelled'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_type TEXT; -- 'RETURN' | 'EXCHANGE'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_sub_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_description TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_images JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_bank_details JSONB; -- { upi_id, account_number, ifsc_code, account_holder_name, bank_name }
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_exchange_details JSONB; -- { preferred_size, preferred_color, notes }
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_approved_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_rejected_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_rejection_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_picked_up_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_tracking_number TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_courier_name TEXT;

    -- Refund tracking fields
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'NONE'; -- 'NONE' | 'PENDING' | 'INITIATED' | 'COMPLETED' | 'FAILED'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_mode TEXT DEFAULT 'ORIGINAL_SOURCE'; -- 'ORIGINAL_SOURCE' | 'UPI'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_id TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_id TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_notes TEXT;

    -- Delivery date tracking (used to calculate 7-day return window)
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
END $$;


-- 2. Dedicated order_returns table for full return history, audit trail & multi-item returns
CREATE TABLE IF NOT EXISTS public.order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    user_id UUID,
    user_email TEXT,
    seller_id TEXT,
    return_type TEXT NOT NULL DEFAULT 'RETURN', -- 'RETURN' | 'EXCHANGE'
    status TEXT NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKED_UP' | 'RECEIVED' | 'REFUNDED' | 'COMPLETED' | 'CANCELLED'
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason TEXT NOT NULL,
    sub_reason TEXT,
    description TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    refund_mode TEXT DEFAULT 'ORIGINAL_SOURCE', -- 'ORIGINAL_SOURCE' | 'UPI'
    upi_id TEXT,
    bank_details JSONB, -- { upi_id }
    exchange_details JSONB, -- { preferred_size, preferred_color, notes }
    refund_amount NUMERIC(10,2) DEFAULT 0.00,
    refund_status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'INITIATED' | 'COMPLETED' | 'FAILED'
    razorpay_refund_id TEXT,
    refund_transaction_id TEXT,
    rejection_reason TEXT,
    pickup_awb TEXT,
    pickup_courier TEXT,
    admin_notes TEXT,
    seller_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- 3. Indexes for speed and fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_order_number ON public.order_returns(order_number);
CREATE INDEX IF NOT EXISTS idx_order_returns_user_id ON public.order_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_seller_id ON public.order_returns(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON public.order_returns(status);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON public.orders(return_status);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON public.orders(cancelled_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to order_returns" ON public.order_returns;
DROP POLICY IF EXISTS "Customers view own returns" ON public.order_returns;
DROP POLICY IF EXISTS "Sellers view assigned returns" ON public.order_returns;
DROP POLICY IF EXISTS "Service role manages order_returns" ON public.order_returns;

CREATE POLICY "Customers view own returns" ON public.order_returns
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Sellers view assigned returns" ON public.order_returns
    FOR SELECT TO authenticated USING (
        order_returns.seller_id = auth.uid()::text OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id::text = order_returns.seller_id AND s.user_id = auth.uid())
    );

CREATE POLICY "Service role manages order_returns" ON public.order_returns
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_order_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_returns_updated_at ON public.order_returns;
CREATE TRIGGER trg_order_returns_updated_at 
    BEFORE UPDATE ON public.order_returns 
    FOR EACH ROW EXECUTE FUNCTION public.set_order_returns_updated_at();
