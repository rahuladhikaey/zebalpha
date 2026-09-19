-- ==============================================================================
-- ASALISWAD / ZEBALPHA — MEESHO-STYLE MULTI-VENDOR SHIPPING WORKFLOW SCHEMA
-- Bulletproof, Safe & 100% Idempotent SQL for Supabase PostgreSQL
-- ==============================================================================

-- 1. Table: seller_pickup_locations
CREATE TABLE IF NOT EXISTS public.seller_pickup_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS seller_id TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT 'Primary Warehouse';
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS contact_name TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS contact_phone TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS contact_email TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS address_line1 TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS address_line2 TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS landmark TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS pincode TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS approved_by TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS shiprocket_pickup_location_id TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS shiprocket_sync_status TEXT DEFAULT 'pending';
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS sync_error TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;


-- 2. Table: shipments
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS order_id TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS seller_id TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipment_number TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS awb_code TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_number TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS courier_name TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS courier_company_id TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS routing_hub TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS destination_code TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS return_code TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS label_url TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS manifest_url TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_url TEXT;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'manifested';
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'PREPAID';
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS cod_amount NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,3) DEFAULT 0.500;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS dimensions_cm JSONB DEFAULT '{"length": 15, "width": 15, "height": 10}'::jsonb;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS pickup_address_snapshot JSONB;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS dispatch_sla TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS label_generated_at TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;


-- 3. Table: shipping_events
CREATE TABLE IF NOT EXISTS public.shipping_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS shipment_id UUID;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS order_id TEXT;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS awb_code TEXT;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'manifested';
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS status_code TEXT;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS activity TEXT;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS actor_role TEXT;
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.shipping_events ADD COLUMN IF NOT EXISTS raw_payload JSONB;
END $$;


-- 4. Table: address_change_history
CREATE TABLE IF NOT EXISTS public.address_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    ALTER TABLE public.address_change_history ADD COLUMN IF NOT EXISTS seller_id TEXT;
    ALTER TABLE public.address_change_history ADD COLUMN IF NOT EXISTS pickup_location_id UUID;
    ALTER TABLE public.address_change_history ADD COLUMN IF NOT EXISTS previous_address JSONB;
    ALTER TABLE public.address_change_history ADD COLUMN IF NOT EXISTS new_address JSONB;
    ALTER TABLE public.address_change_history ADD COLUMN IF NOT EXISTS changed_by UUID;
    ALTER TABLE public.address_change_history ADD COLUMN IF NOT EXISTS reason TEXT;
END $$;


-- 5. Table: seller_orders (Multi-vendor split orders)
CREATE TABLE IF NOT EXISTS public.seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS parent_order_id TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS seller_order_number TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS seller_id TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS customer_id UUID;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS pickup_address_snapshot JSONB;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS shipping_charge NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS net_payout NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'placed';
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD';
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS shipment_id UUID;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS awb_code TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
    ALTER TABLE public.seller_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;


-- 6. Ensure main orders table has dispatch & courier fields
DO $$
BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipment_id TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS routing_hub TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_sla TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS label_generated_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_name TEXT;
END $$;


-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_seller_pickup_locations_seller_id ON public.seller_pickup_locations(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_pickup_locations_approval ON public.seller_pickup_locations(approval_status);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller_id ON public.shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_awb_code ON public.shipments(awb_code);
CREATE INDEX IF NOT EXISTS idx_shipping_events_order_id ON public.shipping_events(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_parent ON public.seller_orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON public.seller_orders(seller_id);


-- 8. Row Level Security Policies
ALTER TABLE public.seller_pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to seller_pickup_locations" ON public.seller_pickup_locations;
CREATE POLICY "Public access to seller_pickup_locations" ON public.seller_pickup_locations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to shipments" ON public.shipments;
CREATE POLICY "Public access to shipments" ON public.shipments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to shipping_events" ON public.shipping_events;
CREATE POLICY "Public access to shipping_events" ON public.shipping_events FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to address_change_history" ON public.address_change_history;
CREATE POLICY "Public access to address_change_history" ON public.address_change_history FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to seller_orders" ON public.seller_orders;
CREATE POLICY "Public access to seller_orders" ON public.seller_orders FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
