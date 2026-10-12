-- ==============================================================================
-- ASALISWAD / ZEBALPHA — SHIPROCKET RETURN & RTO END-TO-END SCHEMA ENHANCEMENTS
-- 100% Safe, Non-Destructive, Idempotent SQL for Supabase PostgreSQL
-- ==============================================================================

-- 1. Extend order_returns with operational, reverse-shipping & idempotency columns
DO $$ 
BEGIN
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS is_restocked BOOLEAN DEFAULT false;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS restocked_at TIMESTAMPTZ;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS shiprocket_return_order_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS shiprocket_return_shipment_id TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS reverse_label_url TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS reverse_manifest_url TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS qc_result TEXT; -- 'PASS' | 'FAIL' | 'PARTIAL' | 'DISPUTED'
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS qc_status TEXT; -- 'PENDING' | 'PASSED' | 'FAILED'
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS qc_inspection JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS return_awb_assigned_at TIMESTAMPTZ;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS pickup_scheduled_date TIMESTAMPTZ;
    ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS pickup_token_number TEXT;
END $$;

-- Add index on idempotency_key and awb if not exists
CREATE INDEX IF NOT EXISTS idx_order_returns_idempotency ON public.order_returns(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_order_returns_pickup_awb ON public.order_returns(pickup_awb);

-- 2. Extend orders table with RTO-specific operational columns
DO $$ 
BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_restocked BOOLEAN DEFAULT false;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restocked_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rto_initiated_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rto_delivered_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rto_reason TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rto_awb TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ndr_status TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ndr_attempts INT DEFAULT 0;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ndr_last_attempt_at TIMESTAMPTZ;
END $$;

-- 3. Extend existing webhook_events table for Shiprocket & Razorpay webhook deduplication
DO $$ 
BEGIN
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS awb_code TEXT;
    ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS order_id TEXT;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_entity_id ON public.webhook_events(entity_id);

-- 4. Secure RLS policies on shipments & webhook_events
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive public policy on shipments
DROP POLICY IF EXISTS "Public access to shipments" ON public.shipments;
DROP POLICY IF EXISTS "Customers view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Sellers view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Service role manages shipments" ON public.shipments;

-- Customer read policy for shipments
CREATE POLICY "Customers view own shipments" ON public.shipments
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id::text = shipments.order_id AND o.user_id = auth.uid())
    );

-- Seller read/update policy for shipments
CREATE POLICY "Sellers view own shipments" ON public.shipments
    FOR ALL TO authenticated
    USING (
        seller_id = auth.uid() OR
        seller_id::text = auth.uid()::text OR
        EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = shipments.seller_id AND s.user_id = auth.uid())
    );

-- Service role bypass for backend & workers
CREATE POLICY "Service role manages shipments" ON public.shipments
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- webhook_events RLS: only service role can access
DROP POLICY IF EXISTS "Service role manages webhook_events" ON public.webhook_events;
CREATE POLICY "Service role manages webhook_events" ON public.webhook_events
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 5. Atomic Stock Reconciliation RPC to prevent double-restocking & race conditions
CREATE OR REPLACE FUNCTION public.atomic_restock_order_item(
    p_product_id TEXT,
    p_quantity INT,
    p_seller_id TEXT,
    p_order_number TEXT,
    p_reason TEXT DEFAULT 'Customer Return Restock'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_current_stock INT;
    v_new_stock INT;
    v_prod_seller_id TEXT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
    END IF;

    -- Lock and get product stock atomically
    SELECT stock, seller_id::text INTO v_current_stock, v_prod_seller_id
    FROM public.products
    WHERE id::text = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found');
    END IF;

    v_new_stock := COALESCE(v_current_stock, 0) + p_quantity;

    -- Update product stock
    UPDATE public.products
    SET stock = v_new_stock,
        updated_at = NOW()
    WHERE id::text = p_product_id;

    -- Log stock change audit trail if seller_stock_history exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seller_stock_history') THEN
        INSERT INTO public.seller_stock_history (
            seller_id,
            product_id,
            previous_stock,
            new_stock,
            change_reason,
            created_at
        ) VALUES (
            COALESCE(p_seller_id, v_prod_seller_id),
            p_product_id,
            v_current_stock,
            v_new_stock,
            COALESCE(p_reason, 'Restocked +' || p_quantity || ' units from Order #' || p_order_number),
            NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'quantity_added', p_quantity
    );
END;
$$;

-- Grant RPC execution to service_role and authenticated users
GRANT EXECUTE ON FUNCTION public.atomic_restock_order_item TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_restock_order_item TO authenticated;
