-- ==============================================================================
-- ASALISWAD / ZEBALPHA — RETURN, EXCHANGE, RTO & SELLER CLAIMS (SPF) WORKFLOW SCHEMA
-- 100% Compatible with Meesho Supplier & Customer Standards
-- Bulletproof, Safe & Idempotent SQL for Supabase PostgreSQL
-- ==============================================================================

-- 1. Extend orders table with cancellation, return & refund tracking columns
DO $$ 
BEGIN
    -- Cancellation fields
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'customer' | 'seller' | 'admin' | 'system'

    -- Return & Exchange fields
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_status TEXT; -- 'requested' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'lost' | 'no_return_no_charge' | 'disposed' | 'cancelled'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_type TEXT; -- 'CUSTOMER_RETURN' | 'RTO' | 'EXCHANGE'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS policy_type TEXT DEFAULT 'EASY_RETURN'; -- 'EASY_RETURN' | 'DEFECTIVE_ONLY'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_sub_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_description TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_images JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_bank_details JSONB; -- { upi_id, account_number, ifsc_code, account_holder_name, bank_name }
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_exchange_details JSONB; -- { preferred_size, preferred_color, notes }
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_delivered_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_tracking_number TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_courier_name TEXT DEFAULT 'Delhivery';

    -- Refund tracking fields
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'NONE'; -- 'NONE' | 'PENDING' | 'INITIATED' | 'COMPLETED' | 'FAILED'
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_mode TEXT DEFAULT 'ORIGINAL_SOURCE'; -- 'ORIGINAL_SOURCE' | 'UPI' | 'BANK_TRANSFER'
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
    suborder_id TEXT,
    user_id UUID,
    user_email TEXT,
    seller_id TEXT,
    product_id TEXT,
    product_name TEXT,
    product_image TEXT,
    sku TEXT,
    category TEXT DEFAULT 'Kitchen Utility',
    size TEXT DEFAULT 'Free Size',
    quantity INT DEFAULT 1,
    return_type TEXT NOT NULL DEFAULT 'CUSTOMER_RETURN',
    policy_type TEXT DEFAULT 'EASY_RETURN',
    status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    reason TEXT,
    sub_reason TEXT,
    customer_notes TEXT,
    customer_images JSONB DEFAULT '[]'::jsonb,
    refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    refund_mode TEXT DEFAULT 'ORIGINAL_SOURCE',
    upi_id TEXT,
    bank_details JSONB,
    exchange_details JSONB,
    refund_status TEXT DEFAULT 'PENDING',
    refund_id TEXT,
    awb_number TEXT,
    courier_partner TEXT DEFAULT 'Delhivery',
    expected_delivery_date TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    return_shipping_fee NUMERIC(10,2) DEFAULT 0.00,
    pod_url TEXT,
    admin_notes TEXT,
    seller_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure all columns exist on order_returns if table already existed previously
DO $$ 
BEGIN
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS suborder_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS user_email TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS seller_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS product_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS product_name TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS product_image TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Kitchen Utility';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'Free Size';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS return_type TEXT DEFAULT 'CUSTOMER_RETURN';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS policy_type TEXT DEFAULT 'EASY_RETURN';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'IN_TRANSIT';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS reason TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS sub_reason TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS customer_notes TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS customer_images JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS refund_mode TEXT DEFAULT 'ORIGINAL_SOURCE';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS upi_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS bank_details JSONB;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS exchange_details JSONB;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'PENDING';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS refund_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS awb_number TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS courier_partner TEXT DEFAULT 'Delhivery';
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS return_shipping_fee NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS pod_url TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS admin_notes TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS seller_notes TEXT;
END $$;


-- 3. Dedicated seller_claims table (Seller Protection Fund - SPF)
CREATE TABLE IF NOT EXISTS public.seller_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id TEXT UNIQUE NOT NULL, -- e.g. "CLM-2026-98124"
    return_id UUID REFERENCES public.order_returns(id) ON DELETE SET NULL,
    order_id TEXT NOT NULL,
    suborder_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    product_image TEXT,
    
    claim_type TEXT NOT NULL, -- 'WRONG_ITEM' | 'DAMAGED_ITEM' | 'MISSING_QUANTITY' | 'EMPTY_PACKAGE' | 'FAKE_DELIVERY'
    claim_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'
    
    seller_comments TEXT NOT NULL,
    unboxing_video_url TEXT,
    outer_box_image_url TEXT,
    item_damage_images JSONB DEFAULT '[]'::jsonb,
    
    -- Admin resolution
    approved_amount NUMERIC(10,2) DEFAULT 0.00,
    admin_remarks TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure all columns exist on seller_claims if table already existed previously
DO $$ 
BEGIN
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS claim_id TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS return_id UUID;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS order_id TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS suborder_id TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS seller_id TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS product_id TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS product_name TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS product_image TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS claim_type TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS claim_amount NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN';
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS seller_comments TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS unboxing_video_url TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS outer_box_image_url TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS item_damage_images JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS resolved_by UUID;
    ALTER TABLE public.seller_claims ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
END $$;


-- 4. Indexes for speed and fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_suborder_id ON public.order_returns(suborder_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_seller_id ON public.order_returns(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON public.order_returns(status);
CREATE INDEX IF NOT EXISTS idx_order_returns_awb ON public.order_returns(awb_number);

CREATE INDEX IF NOT EXISTS idx_seller_claims_seller_id ON public.seller_claims(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_claims_status ON public.seller_claims(status);
CREATE INDEX IF NOT EXISTS idx_seller_claims_claim_id ON public.seller_claims(claim_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to order_returns" ON public.order_returns;
DROP POLICY IF EXISTS "Customers view own returns" ON public.order_returns;
DROP POLICY IF EXISTS "Sellers view assigned returns" ON public.order_returns;
DROP POLICY IF EXISTS "Service role manages order_returns" ON public.order_returns;

CREATE POLICY "Customers view own returns" ON public.order_returns
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Sellers view assigned returns" ON public.order_returns
    FOR ALL TO authenticated USING (
        order_returns.seller_id = auth.uid()::text OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id::text = order_returns.seller_id AND s.user_id = auth.uid())
    );

CREATE POLICY "Service role manages order_returns" ON public.order_returns
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Sellers manage own claims" ON public.seller_claims;
DROP POLICY IF EXISTS "Service role manages seller_claims" ON public.seller_claims;

CREATE POLICY "Sellers manage own claims" ON public.seller_claims
    FOR ALL TO authenticated USING (
        seller_claims.seller_id = auth.uid()::text OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id::text = seller_claims.seller_id AND s.user_id = auth.uid())
    );

CREATE POLICY "Service role manages seller_claims" ON public.seller_claims
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Trigger for updated_at
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

DROP TRIGGER IF EXISTS trg_seller_claims_updated_at ON public.seller_claims;
CREATE TRIGGER trg_seller_claims_updated_at 
    BEFORE UPDATE ON public.seller_claims 
    FOR EACH ROW EXECUTE FUNCTION public.set_order_returns_updated_at();

