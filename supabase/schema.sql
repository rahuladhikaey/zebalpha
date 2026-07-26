-- ====================================================================
-- ASALI SWAD - UNIFIED SINGLE SUPABASE PRODUCTION DATABASE SCHEMA
-- Target URL: https://bprkenwmheakcqryjupi.supabase.co
-- Features: Sellers, SuperAdmin, Customer, Products, Categories, Stock, Orders, RLS & Storage
-- ====================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. CORE SYSTEM & PROFILE TABLES
-- ====================================================================

-- PROFILES TABLE (Linked to auth.users)
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

-- ====================================================================
-- 3. SELLER NETWORK & MERCHANT TABLES
-- ====================================================================

-- SELLERS TABLE
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id VARCHAR(50),
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    full_name VARCHAR(255),
    mobile_number VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    pickup_address TEXT,
    warehouse_address TEXT,
    pickup_location TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    category VARCHAR(100) DEFAULT 'Grocery',
    business_category VARCHAR(100) DEFAULT 'Grocery',
    business_logo_url TEXT,
    profile_photo_url TEXT,
    business_description TEXT,
    profile_photo TEXT,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    fssai_license_number VARCHAR(14),
    fssai_certificate_url TEXT,
    fssai_status VARCHAR(50) DEFAULT 'Not Submitted' NOT NULL,
    fssai_expiry_date DATE,
    fssai_rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    settings_completion_pct INT DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'approved' NOT NULL,
    account_status VARCHAR(50) DEFAULT 'Active' NOT NULL,
    rejection_reason TEXT,
    delete_requested BOOLEAN DEFAULT FALSE NOT NULL,
    delete_date TIMESTAMPTZ,
    gstin VARCHAR(50),
    phonepay_number VARCHAR(50),
    phonepay_no VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MERCHANT VERIFICATION LOGS TABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.merchant_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID,
    performer_role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER PICKUP LOCATIONS TABLE (Shiprocket Courier Integration)
CREATE TABLE IF NOT EXISTS public.seller_pickup_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    name VARCHAR(255),
    location_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    shiprocket_location_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.seller_support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general' NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER SETTLEMENTS & PAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.seller_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    seller_name VARCHAR(255),
    seller_upi_id VARCHAR(100),
    seller_phonepe VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_deducted NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'COMPLETED' NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    utr_number VARCHAR(100),
    notes TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER REPORTS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.seller_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 4. PRODUCTS & INVENTORY CONTROL (Cloudinary Image CDN URLs)
-- ====================================================================

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
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

-- STOCK HISTORY LOGS
CREATE TABLE IF NOT EXISTS public.stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    package_name VARCHAR(100),
    previous_stock INT DEFAULT 0,
    new_stock INT DEFAULT 0,
    change_amount INT DEFAULT 0,
    change_type VARCHAR(50) DEFAULT 'ADJUSTMENT',
    change_reason TEXT,
    reason TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INVENTORY METADATA TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    stock_count INT DEFAULT 0,
    reserved_count INT DEFAULT 0,
    image_url TEXT,
    cloudinary_public_id TEXT,
    width INT,
    height INT,
    format VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 5. ORDERS, CARTS & CUSTOMER INTERACTIONS
-- ====================================================================

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    customer_name TEXT,
    phone VARCHAR(20),
    address TEXT,
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AS-CARDS LOYALTY & PRIVILEGE MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.card_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    card_type VARCHAR(50) DEFAULT 'Silver Privilege',
    status VARCHAR(50) DEFAULT 'APPROVED' NOT NULL,
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

-- STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
-- 6. SUPER ADMIN CONTROL & AUDIT TABLES
-- ====================================================================

-- ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'SUPER_ADMIN' NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN_STAFF')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 7. INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_sellers_user ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers(status);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_seller_support_tickets_seller ON public.seller_support_tickets(seller_id);

-- ====================================================================
-- 8. AUTOMATED TRIGGERS & FUNCTIONS (WITH DROP IF EXISTS FOR RE-RUNABILITY)
-- ====================================================================

-- TIMESTAMP UPDATE FUNCTION
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sellers_updated_at ON public.sellers;
CREATE TRIGGER trg_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTOMATIC PROFILE CREATION ON USER SIGNUP
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ====================================================================

-- ENABLE RLS ON ALL PUBLIC TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Clean old RLS policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END;
$$;

-- GRANT SCHEMA & TABLE PERMISSIONS TO ALL ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- POLICIES FOR ALL TABLES (ALLOWING PUBLIC READ/WRITE FOR APPLICATION APIS)

-- 1. Profiles
CREATE POLICY "Public Manage Profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. Categories
CREATE POLICY "Public Manage Categories" ON public.categories FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Sellers
CREATE POLICY "Public Manage Sellers" ON public.sellers FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Products
CREATE POLICY "Public Manage Products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Orders
CREATE POLICY "Public Manage Orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Cart Items
CREATE POLICY "Public Manage Cart Items" ON public.cart_items FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. User Addresses
CREATE POLICY "Public Manage User Addresses" ON public.user_addresses FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. Card Applications (AS-Cards)
CREATE POLICY "Public Manage Card Applications" ON public.card_applications FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. Notify Requests
CREATE POLICY "Public Manage Notify Requests" ON public.notify_requests FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. Stock History
CREATE POLICY "Public Manage Stock History" ON public.stock_history FOR ALL TO public USING (true) WITH CHECK (true);

-- 11. Inventory
CREATE POLICY "Public Manage Inventory" ON public.inventory FOR ALL TO public USING (true) WITH CHECK (true);

-- 12. Seller Pickup Locations
CREATE POLICY "Public Manage Seller Pickup Locations" ON public.seller_pickup_locations FOR ALL TO public USING (true) WITH CHECK (true);

-- 13. Seller Support Tickets
CREATE POLICY "Public Manage Seller Support Tickets" ON public.seller_support_tickets FOR ALL TO public USING (true) WITH CHECK (true);

-- 14. Seller Settlements
CREATE POLICY "Public Manage Seller Settlements" ON public.seller_settlements FOR ALL TO public USING (true) WITH CHECK (true);

-- 15. Seller Reports
CREATE POLICY "Public Manage Seller Reports" ON public.seller_reports FOR ALL TO public USING (true) WITH CHECK (true);

-- 16. Seller Notifications
CREATE POLICY "Public Manage Seller Notifications" ON public.seller_notifications FOR ALL TO public USING (true) WITH CHECK (true);

-- 17. Merchant Verification Logs
CREATE POLICY "Public Manage Merchant Verification Logs" ON public.merchant_verification_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- 18. Store Settings
CREATE POLICY "Public Manage Store Settings" ON public.store_settings FOR ALL TO public USING (true) WITH CHECK (true);

-- 19. Notifications
CREATE POLICY "Public Manage Notifications" ON public.notifications FOR ALL TO public USING (true) WITH CHECK (true);

-- 20. Admin Users
CREATE POLICY "Public Manage Admin Users" ON public.admin_users FOR ALL TO public USING (true) WITH CHECK (true);

-- 21. Admin Audit Logs
CREATE POLICY "Public Manage Admin Audit Logs" ON public.admin_audit_logs FOR ALL TO public USING (true) WITH CHECK (true);

