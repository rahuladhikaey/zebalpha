-- ==============================================================================
-- ZEBALPHA LOGISTICS, 2-IN-1 SHIPPING LABELS & WAREHOUSE PICKUP SCHEMA SYNC
-- Safe, Idempotent SQL: Safe to run multiple times without losing existing data.
-- ==============================================================================

-- 1. Ensure 'seller_pickup_locations' table exists with all standard columns
CREATE TABLE IF NOT EXISTS public.seller_pickup_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT,
    user_id UUID,
    name TEXT DEFAULT 'Primary Warehouse',
    location_name TEXT DEFAULT 'Primary Warehouse',
    phone TEXT,
    email TEXT,
    address TEXT,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add any missing columns to 'seller_pickup_locations'
DO $$ 
BEGIN
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS location_name TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS address_line1 TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS pincode TEXT;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.seller_pickup_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

-- 2. Ensure 'sellers' table has all required warehouse & GST fields
DO $$ 
BEGIN
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS pickup_address TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS pickup_location TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS warehouse_address TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS pincode TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS mobile_number TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS gstin TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS enrolment_no TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS business_name TEXT;
    ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS store_name TEXT;
END $$;

-- 3. Ensure 'orders' table has all logistics tracking & barcode columns
DO $$ 
BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipment_id TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS routing_hub TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS destination_code TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_code TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_sla TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS label_generated_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_scanned_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
END $$;

-- 4. Enable RLS and add open policies for seller pickup locations
ALTER TABLE public.seller_pickup_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read seller_pickup_locations" ON public.seller_pickup_locations;
CREATE POLICY "Allow authenticated users to read seller_pickup_locations"
    ON public.seller_pickup_locations FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert seller_pickup_locations" ON public.seller_pickup_locations;
CREATE POLICY "Allow authenticated users to insert seller_pickup_locations"
    ON public.seller_pickup_locations FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update seller_pickup_locations" ON public.seller_pickup_locations;
CREATE POLICY "Allow authenticated users to update seller_pickup_locations"
    ON public.seller_pickup_locations FOR UPDATE
    TO authenticated, anon
    USING (true);

-- Done!
