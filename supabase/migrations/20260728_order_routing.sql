-- Migration: Add seller_orders, order_items, payments, shipments, shipment_tracking, order_status_history, seller_settlements
BEGIN;

-- Seller Orders (one per seller per parent order)
CREATE TABLE IF NOT EXISTS public.seller_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    parent_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_order_number VARCHAR(50) UNIQUE NOT NULL,
    seller_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    shipping_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(10,2) DEFAULT 0.00,
    seller_earning NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Order items (per-seller granularity)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_order_id UUID NOT NULL REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE SET NULL,
    variant JSONB DEFAULT '{}'::jsonb,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10,2) DEFAULT 0.00,
    gst NUMERIC(10,2) DEFAULT 0.00,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    transaction_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Shipments
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_order_id UUID REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    shiprocket_order_id VARCHAR(100),
    shiprocket_shipment_id VARCHAR(100),
    awb_number VARCHAR(100),
    courier_name VARCHAR(100),
    tracking_url TEXT,
    shipping_label_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Shipment tracking events
CREATE TABLE IF NOT EXISTS public.shipment_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    event_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    location TEXT,
    status TEXT,
    raw JSONB
);

-- Order status history
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_order_id UUID REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    status_from VARCHAR(50),
    status_to VARCHAR(50),
    changed_by UUID,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seller settlements
CREATE TABLE IF NOT EXISTS public.seller_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
    seller_order_id UUID REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMIT;
