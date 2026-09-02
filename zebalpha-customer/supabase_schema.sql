-- ====================================================================
-- ASALI SWAD - SUPABASE INSTANCE A (CUSTOMER / USER PART) MASTER SCHEMA & RLS SECURITY
-- Target URL: https://bprkenwmheakcqryjupi.supabase.co
-- Features: Auth Sync, Customer Profiles, Addresses, Orders, Cart, AS-Cards Loyalty, RLS Security
-- Image Storage: Cloudinary CDN (Metadata & URLs stored in Postgres tables)
-- ====================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. USER AUTHENTICATION & PROFILES
-- ====================================================================

-- PROFILES TABLE (Auto-synced with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_no VARCHAR(20) UNIQUE,
    gender VARCHAR(20) DEFAULT 'prefer_not_to_say',
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'customer' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 3. STOREFRONT CATALOG & SETTINGS (READ-ONLY FOR PUBLIC)
-- ====================================================================

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(10, 2) DEFAULT 0.00,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    brand VARCHAR(100),
    stock INT DEFAULT 0 NOT NULL,
    stock_count INT DEFAULT 0,
    sku VARCHAR(100),
    low_stock_limit INT DEFAULT 5 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE' NOT NULL,
    specifications JSONB DEFAULT '{}'::jsonb,
    offers JSONB DEFAULT '[]'::jsonb,
    packages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 4. CUSTOMER SHOPPING & USER DATA
-- ====================================================================

-- USER ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    name VARCHAR(255),
    phone VARCHAR(20),
    address_line TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    landmark TEXT,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    package_name VARCHAR(100) DEFAULT 'Standard',
    quantity INT DEFAULT 1 NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, product_id, package_name)
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    seller_id UUID,
    customer_name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    product_details JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    shipping_charge NUMERIC(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'COD' NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    order_status VARCHAR(50) DEFAULT 'placed' NOT NULL,
    shipping_address JSONB DEFAULT '{}'::jsonb,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    shipment_id VARCHAR(100),
    shiprocket_shipment_id VARCHAR(100),
    shiprocket_order_id VARCHAR(100),
    tracking_number VARCHAR(100),
    courier_name VARCHAR(100),
    shipping_label_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AS-CARDS PRIVILEGE MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.card_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    card_type VARCHAR(50) DEFAULT 'Silver Privilege',
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    card_number VARCHAR(50),
    coins INT DEFAULT 250 NOT NULL,
    expires_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NOTIFY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.notify_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 5. INDEXES FOR FAST QUERYING
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_category_instance_a ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug_instance_a ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user_instance_a ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number_instance_a ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_instance_a ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_instance_a ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_card_applications_user_instance_a ON public.card_applications(user_id);

-- ====================================================================
-- 6. AUTOMATED TRIGGERS & FUNCTIONS
-- ====================================================================

-- TIMESTAMP UPDATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at_inst_a BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated_at_inst_a BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_addresses_updated_at_inst_a BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated_at_inst_a BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cart_items_updated_at_inst_a BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone_no, avatar_url, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.phone,
        NEW.raw_user_meta_data->>'avatar_url',
        'customer',
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 7. ROW-LEVEL SECURITY (RLS) SECURITY HARDENING
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Clean existing policies safely
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- A. PUBLIC STOREFRONT READ POLICIES
CREATE POLICY "Public Read Active Products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Store Settings" ON public.store_settings FOR SELECT USING (true);

-- B. USER PROFILE POLICIES (STRICT OWNERSHIP)
CREATE POLICY "Users Read Own Profile" ON public.profiles FOR SELECT USING (auth.uid()::uuid = id OR auth.role() = 'service_role');
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid()::uuid = id) WITH CHECK (auth.uid()::uuid = id);

-- C. USER ADDRESSES POLICIES (STRICT OWNERSHIP)
CREATE POLICY "Users Read Own Addresses" ON public.user_addresses FOR SELECT USING (auth.uid()::uuid = user_id OR auth.role() = 'service_role');
CREATE POLICY "Users Insert Own Addresses" ON public.user_addresses FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Users Update Own Addresses" ON public.user_addresses FOR UPDATE USING (auth.uid()::uuid = user_id) WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Users Delete Own Addresses" ON public.user_addresses FOR DELETE USING (auth.uid()::uuid = user_id);

-- D. CART POLICIES (STRICT OWNERSHIP)
CREATE POLICY "Users Manage Own Cart" ON public.cart_items FOR ALL USING (auth.uid()::uuid = user_id OR auth.role() = 'service_role');

-- E. ORDERS POLICIES
CREATE POLICY "Anyone Can Place Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users Read Own Orders" ON public.orders FOR SELECT USING (auth.uid()::uuid = user_id OR auth.role() = 'service_role');

-- F. CARD APPLICATIONS & NOTIFICATIONS POLICIES
CREATE POLICY "Public Submit Card Application" ON public.card_applications FOR INSERT WITH CHECK (true);
-- Users read own applications; authenticated admin users can read ALL (needed for admin panel)
CREATE POLICY "Users Read Own Card Applications" ON public.card_applications FOR SELECT USING (auth.uid()::uuid = user_id OR auth.role() = 'service_role');
CREATE POLICY "Admin Read All Card Applications" ON public.card_applications FOR SELECT USING (auth.role() = 'authenticated');
-- Admin can update card status (approve/reject/assign card number)
CREATE POLICY "Admin Update Card Applications" ON public.card_applications FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role') WITH CHECK (true);
CREATE POLICY "Admin Delete Card Applications" ON public.card_applications FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Public Submit Notify Request" ON public.notify_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users Read Own Notifications" ON public.notifications FOR SELECT USING (auth.uid()::uuid = user_id OR auth.role() = 'service_role');
-- Allow admin broadcast notifications (no user_id required)
CREATE POLICY "Admin Insert Notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- G. SERVICE ROLE / ADMIN FULL ACCESS
CREATE POLICY "Service Role Full Access Profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access Products" ON public.products FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access Categories" ON public.categories FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access Orders" ON public.orders FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access Addresses" ON public.user_addresses FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access Cards" ON public.card_applications FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access Settings" ON public.store_settings FOR ALL TO service_role USING (true);

