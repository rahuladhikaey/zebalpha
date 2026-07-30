-- ====================================================================
-- ASALI SWAD - ORDER TRACKING HISTORY, INDEXES, AND INTEGRITY AUDIT
-- Target Schema: Supabase Database
-- ====================================================================

-- 1. CREATE ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on Order Status History
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Order Status History" ON public.order_status_history;
CREATE POLICY "Public Read Order Status History" ON public.order_status_history FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Service Role Full Access Status History" ON public.order_status_history;
CREATE POLICY "Service Role Full Access Status History" ON public.order_status_history FOR ALL TO service_role USING (true);

-- 2. CREATE PERFORMANCE ANALYTICS INDEXES
-- Optimized indexing for Date-filtering, Status aggregations, and Dashboard calculations
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_perf ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_perf ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_perf ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_perf ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON public.order_status_history(created_at DESC);

-- 3. CASCADE FOREIGN KEY ASSURANCES
-- Make sure child order items and status histories are cleaned if an order is permanently deleted
ALTER TABLE public.order_status_history 
DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey,
ADD CONSTRAINT order_status_history_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
