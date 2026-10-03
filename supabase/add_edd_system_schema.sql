-- ====================================================================
-- ZEBALPHA - EXPECTED DELIVERY DATE (EDD) SYSTEM SCHEMA MIGRATION
-- Idempotent, production-safe schema extension for EDD tracking
-- ====================================================================

DO $$ 
BEGIN
    -- 1. Add EDD columns to shipments
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS expected_delivery_from TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS expected_delivery_to TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS edd_source TEXT DEFAULT 'SERVER_ESTIMATE';
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS edd_updated_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT false;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delayed_reason TEXT;

    -- 2. Add EDD columns to seller_orders
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS expected_delivery_from TIMESTAMPTZ;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS expected_delivery_to TIMESTAMPTZ;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS edd_source TEXT DEFAULT 'SERVER_ESTIMATE';
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS edd_updated_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT false;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS delayed_reason TEXT;

    -- 3. Add EDD columns to parent orders
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_delivery_from TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_delivery_to TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edd_source TEXT DEFAULT 'SERVER_ESTIMATE';
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edd_updated_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT false;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delayed_reason TEXT;
END $$;

-- 4. Create EDD Audit Trail Table for Admin Overrides
CREATE TABLE IF NOT EXISTS public.edd_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL, -- 'order' | 'seller_order' | 'shipment'
    target_id UUID NOT NULL,
    old_edd_date TIMESTAMPTZ,
    new_edd_date TIMESTAMPTZ,
    old_source TEXT,
    new_source TEXT,
    reason TEXT NOT NULL,
    admin_id UUID,
    admin_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_edd_audit_target ON public.edd_audit_logs(target_type, target_id);
