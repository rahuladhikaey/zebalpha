-- ====================================================================
-- ASALI SWAD - MASTER SUPABASE PRODUCTION DATABASE SCHEMA
-- Features: Sellers, SuperAdmin, Customer, Products, Categories, Stock, 
--           Order Routing, Weekly Settlements, Revenue System, RLS & Storage
-- ====================================================================

-- 1. SYSTEM EXTENSIONS
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
    main_category VARCHAR(100) DEFAULT 'Grocery',
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 3. SELLER NETWORK & ACCOUNT CONTROL TABLES
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
    
    -- Verification & Suspension audits
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID,
    suspension_reason TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    deletion_reason TEXT,
    last_status_change TIMESTAMPTZ DEFAULT NOW(),
    is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    
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

-- MERCHANT VERIFICATION LOGS TABLE
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

-- SELLER PICKUP LOCATIONS TABLE
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

-- ====================================================================
-- 4. PRODUCTS & INVENTORY CONTROL TABLES
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

-- NOTIFY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.notify_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 5. ORDERS, LOGISTICS, CARTS & MEMBER APPLICATION TABLES
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

-- SELLER ORDERS (One per seller per parent order)
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

-- ORDER ITEMS (Seller granular items)
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

-- CUSTOMER PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    transaction_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SHIPMENTS TABLE
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

-- SHIPMENT TRACKING EVENTS
CREATE TABLE IF NOT EXISTS public.shipment_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    event_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    location TEXT,
    status TEXT,
    raw JSONB
);

-- ORDER STATUS HISTORY TABLE
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

-- AS-CARDS MEMBERSHIP APPLICATIONS
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

-- STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NOTIFICATIONS TABLE (Customers alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER NOTIFICATIONS TABLE (Sellers alerts)
CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.seller_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 6. WEEKLY SELLER SETTLEMENTS SCHEMA
-- ====================================================================

-- SELLER SETTLEMENTS
CREATE TABLE IF NOT EXISTS public.seller_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_orders INT NOT NULL DEFAULT 0,
    gross_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    commission_deducted NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    platform_fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxes NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    transaction_id VARCHAR(100) UNIQUE,
    payment_date TIMESTAMPTZ,
    paid_by UUID,
    notes TEXT,
    receipt_number VARCHAR(100) UNIQUE,
    receipt_pdf_url TEXT,
    email_sent BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_seller_week UNIQUE(seller_id, week_number)
);

-- SETTLEMENT ORDERS RELATION TABLE
CREATE TABLE IF NOT EXISTS public.settlement_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES public.seller_settlements(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_settlement_order UNIQUE(settlement_id, order_id)
);

-- SETTLEMENT RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.settlement_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL UNIQUE REFERENCES public.seller_settlements(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SELLER PAYMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.seller_payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES public.seller_settlements(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    paid_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PAYMENT AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID REFERENCES public.seller_settlements(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    performed_by UUID,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    ip_address VARCHAR(100),
    user_agent TEXT,
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- 7. SUPER ADMIN CONFIGURATION TABLES
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
-- 8. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_sellers_user ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_account_status ON public.sellers(account_status);
CREATE INDEX IF NOT EXISTS idx_sellers_is_suspended ON public.sellers(is_suspended);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_seller_support_tickets_seller ON public.seller_support_tickets(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_settlements_seller ON public.seller_settlements(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_settlements_status ON public.seller_settlements(status);
CREATE INDEX IF NOT EXISTS idx_seller_payment_history_seller ON public.seller_payment_history(seller_id);

-- ====================================================================
-- 9. REAL-TIME VIEWS
-- ====================================================================

-- REVENUE SUMMARY VIEW
CREATE OR REPLACE VIEW public.seller_revenue_summary WITH (security_invoker = true) AS
SELECT
    s.id AS seller_id,
    COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE AND o.created_at < CURRENT_DATE + INTERVAL '1 day' AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS today_revenue,
    COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '1 day' AND o.created_at < CURRENT_DATE AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS yesterday_revenue,
    COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('week', CURRENT_DATE) AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS this_week_revenue,
    COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week') AND o.created_at < DATE_TRUNC('week', CURRENT_DATE) AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS last_week_revenue,
    COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS this_month_revenue,
    COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND o.created_at < DATE_TRUNC('month', CURRENT_DATE) AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS last_month_revenue,
    COALESCE(SUM(CASE WHEN o.created_at >= DATE_TRUNC('year', CURRENT_DATE) AND LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS this_year_revenue,
    COALESCE(SUM(CASE WHEN LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' THEN o.total_amount ELSE 0 END), 0) AS lifetime_revenue,
    
    COALESCE((SELECT SUM(net_amount) FROM public.seller_settlements WHERE seller_id::text = s.id::text AND status = 'PENDING'), 0) AS pending_settlement,
    COALESCE((SELECT SUM(net_amount) FROM public.seller_settlements WHERE seller_id::text = s.id::text AND status = 'PAID'), 0) AS paid_settlement,
    
    COALESCE(SUM(CASE 
        WHEN LOWER(o.order_status) IN ('delivered', 'completed') AND o.payment_status != 'REFUNDED' 
        AND NOT EXISTS (
            SELECT 1 FROM public.settlement_orders so 
            JOIN public.seller_settlements ss ON so.settlement_id::text = ss.id::text
            WHERE so.order_id::text = o.id::text AND ss.status = 'PAID'
        ) THEN o.total_amount 
        ELSE 0 
    END), 0) AS available_balance,
    
    COUNT(CASE WHEN o.created_at >= CURRENT_DATE AND o.created_at < CURRENT_DATE + INTERVAL '1 day' THEN 1 END) AS orders_today,
    COUNT(CASE WHEN o.created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) AS orders_this_week,
    COUNT(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS orders_this_month,
    COUNT(CASE WHEN o.created_at >= DATE_TRUNC('year', CURRENT_DATE) THEN 1 END) AS orders_this_year
FROM
    public.sellers s
LEFT JOIN
    public.orders o ON o.seller_id::text = s.id::text
GROUP BY
    s.id;

-- ====================================================================
-- 10. AUTOMATED SYSTEM TRIGGERS & TRIGGERS FUNCTIONS
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

-- PROFILE AUTOCREATION
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

-- SELLER ACCOUNT CONTROLS & SUSPENSIONS ACTION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.account_status IS DISTINCT FROM NEW.account_status) 
       OR (OLD.status IS DISTINCT FROM NEW.status)
       OR (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
       OR (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted) THEN
       
        NEW.last_status_change := NOW();
        
        -- Invalidate and block listings + session access
        IF NEW.account_status = 'Suspended' 
           OR NEW.status = 'suspended' 
           OR NEW.is_suspended = true 
           OR NEW.account_status = 'Deleted' 
           OR NEW.status = 'deleted' 
           OR NEW.is_deleted = true THEN
           
            UPDATE public.products SET is_active = false WHERE seller_id = NEW.id;
            
            UPDATE auth.users SET banned_until = '3000-01-01 00:00:00+00' WHERE id = NEW.user_id;
            
        ELSIF NEW.account_status = 'Active' OR NEW.status = 'approved' THEN
            UPDATE public.products SET is_active = true WHERE seller_id = NEW.id;
            
            UPDATE auth.users SET banned_until = NULL WHERE id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_seller_status_change ON public.sellers;
CREATE TRIGGER trigger_seller_status_change
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.handle_seller_status_change();

-- PREVENT OPERATIONS FROM SUSPENDED SELLERS
CREATE OR REPLACE FUNCTION public.check_seller_status_for_product()
RETURNS TRIGGER AS $$
DECLARE
    v_account_status VARCHAR(50);
    v_status VARCHAR(50);
BEGIN
    IF NEW.seller_id IS NOT NULL THEN
        SELECT account_status, status INTO v_account_status, v_status
        FROM public.sellers
        WHERE id::text = NEW.seller_id::text;
        
        IF v_account_status = 'Suspended' 
           OR v_status = 'suspended' 
           OR v_account_status = 'Deleted' 
           OR v_status = 'deleted' THEN
            RAISE EXCEPTION 'Operation not allowed: Seller account is suspended or deleted.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_seller_status ON public.products;
CREATE TRIGGER trigger_check_seller_status
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_seller_status_for_product();


-- ====================================================================
-- 11. CUSTOM SYSTEM RPC STORED PROCEDURES
-- ====================================================================

-- WEEKLY SETTLEMENTS CALCULATIONS
CREATE OR REPLACE FUNCTION public.get_or_create_seller_settlements(p_seller_id UUID)
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    week_number INT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    total_orders INT,
    gross_sales NUMERIC(12, 2),
    commission_deducted NUMERIC(12, 2),
    platform_fees NUMERIC(12, 2),
    taxes NUMERIC(12, 2),
    net_amount NUMERIC(12, 2),
    status VARCHAR(50),
    transaction_id VARCHAR(100),
    payment_date TIMESTAMPTZ,
    receipt_number VARCHAR(100),
    receipt_pdf_url TEXT,
    notes TEXT,
    email_sent BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_joining_date TIMESTAMPTZ;
    v_current_date TIMESTAMPTZ := NOW();
    v_week_start TIMESTAMPTZ;
    v_week_end TIMESTAMPTZ;
    v_week_num INT := 1;
    v_commission_pct NUMERIC;
    v_platform_fee_per_order NUMERIC;
    
    v_total_orders INT;
    v_gross_sales NUMERIC(12, 2);
    v_comm_amt NUMERIC(12, 2);
    v_plat_fees NUMERIC(12, 2);
    v_tax_amt NUMERIC(12, 2);
    v_net_amt NUMERIC(12, 2);
    
    v_existing_id UUID;
    v_existing_status VARCHAR(50);
BEGIN
    SELECT ss.created_at INTO v_joining_date FROM public.sellers ss WHERE ss.id::text = p_seller_id::text;
    IF NOT FOUND OR v_joining_date IS NULL THEN
        v_joining_date := '2026-08-10 00:00:00+00';
    END IF;
    
    v_joining_date := DATE_TRUNC('day', v_joining_date);

    SELECT COALESCE((value->>'globalCommissionPct')::numeric, 10.0) INTO v_commission_pct
    FROM public.store_settings WHERE key = 'marketplace_rules';
    IF v_commission_pct IS NULL THEN v_commission_pct := 10.0; END IF;

    SELECT 
        COALESCE((value->>'appCharge')::numeric, 5.0) + COALESCE((value->>'platformCharge')::numeric, 5.0)
    INTO v_platform_fee_per_order
    FROM public.store_settings WHERE key = 'marketplace_rules';
    IF v_platform_fee_per_order IS NULL THEN v_platform_fee_per_order := 10.0; END IF;

    v_week_start := v_joining_date;
    WHILE v_week_start <= v_current_date LOOP
        v_week_end := v_week_start + INTERVAL '7 days' - INTERVAL '1 second';
        
        SELECT ss.id, ss.status INTO v_existing_id, v_existing_status
        FROM public.seller_settlements ss
        WHERE ss.seller_id::text = p_seller_id::text AND ss.week_number = v_week_num;
        
        SELECT 
            COUNT(o.id),
            COALESCE(SUM(o.total_amount), 0.00)
        INTO 
            v_total_orders,
            v_gross_sales
        FROM public.orders o
        WHERE o.seller_id::text = p_seller_id::text
          AND LOWER(o.order_status) IN ('delivered', 'completed')
          AND o.payment_status != 'REFUNDED'
          AND o.created_at >= v_week_start
          AND o.created_at <= v_week_end;
          
        v_comm_amt := ROUND((v_gross_sales * (v_commission_pct / 100.0)), 2);
        v_plat_fees := ROUND((v_total_orders * v_platform_fee_per_order), 2);
        v_tax_amt := ROUND((v_gross_sales * 0.05), 2);
        v_net_amt := GREATEST(0.00, v_gross_sales - v_comm_amt - v_plat_fees - v_tax_amt);
        
        IF v_existing_id IS NULL THEN
            INSERT INTO public.seller_settlements (
                seller_id, week_number, start_date, end_date, total_orders, 
                gross_sales, commission_deducted, platform_fees, taxes, net_amount, status
            ) VALUES (
                p_seller_id, v_week_num, v_week_start, v_week_end, v_total_orders,
                v_gross_sales, v_comm_amt, v_plat_fees, v_tax_amt, v_net_amt, 'PENDING'
            );
        ELSIF v_existing_status = 'PENDING' THEN
            UPDATE public.seller_settlements ss
            SET total_orders = v_total_orders,
                gross_sales = v_gross_sales,
                commission_deducted = v_comm_amt,
                platform_fees = v_plat_fees,
                taxes = v_tax_amt,
                net_amount = v_net_amt,
                updated_at = NOW()
            WHERE ss.id = v_existing_id;
        END IF;
        
        v_week_start := v_week_start + INTERVAL '7 days';
        v_week_num := v_week_num + 1;
    END LOOP;

    RETURN QUERY
    SELECT 
        ss.id, ss.seller_id, ss.week_number, ss.start_date, ss.end_date, 
        ss.total_orders, ss.gross_sales, ss.commission_deducted, 
        ss.platform_fees, ss.taxes, ss.net_amount, ss.status, 
        ss.transaction_id, ss.payment_date, ss.receipt_number, 
        ss.receipt_pdf_url, ss.notes, ss.email_sent, ss.created_at
    FROM public.seller_settlements ss
    WHERE ss.seller_id::text = p_seller_id::text
    ORDER BY ss.week_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RUN SETTLEMENT GENERATION FOR ALL SELLERS
CREATE OR REPLACE FUNCTION public.get_or_create_all_settlements()
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    business_name VARCHAR(255),
    week_number INT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    total_orders INT,
    gross_sales NUMERIC(12, 2),
    commission_deducted NUMERIC(12, 2),
    platform_fees NUMERIC(12, 2),
    taxes NUMERIC(12, 2),
    net_amount NUMERIC(12, 2),
    status VARCHAR(50),
    transaction_id VARCHAR(100),
    payment_date TIMESTAMPTZ,
    receipt_number VARCHAR(100),
    receipt_pdf_url TEXT,
    notes TEXT,
    email_sent BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_seller RECORD;
BEGIN
    FOR v_seller IN SELECT s.id FROM public.sellers s LOOP
        PERFORM public.get_or_create_seller_settlements(v_seller.id);
    END LOOP;

    RETURN QUERY
    SELECT 
        ss.id, ss.seller_id, s.business_name, ss.week_number, ss.start_date, ss.end_date, 
        ss.total_orders, ss.gross_sales, ss.commission_deducted, 
        ss.platform_fees, ss.taxes, ss.net_amount, ss.status, 
        ss.transaction_id, ss.payment_date, ss.receipt_number, 
        ss.receipt_pdf_url, ss.notes, ss.email_sent, ss.created_at
    FROM public.seller_settlements ss
    JOIN public.sellers s ON ss.seller_id::text = s.id::text
    ORDER BY ss.end_date DESC, ss.week_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- TRANSACTIONAL MARK AS PAID PROCESS
CREATE OR REPLACE FUNCTION public.mark_settlement_as_paid(
    p_settlement_id UUID,
    p_transaction_id VARCHAR,
    p_admin_id UUID,
    p_notes TEXT,
    p_ip_address VARCHAR,
    p_user_agent TEXT,
    p_pdf_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_settlement RECORD;
    v_receipt_number VARCHAR(100);
    v_earlier_pending_count INT;
    v_updated_settlement JSONB;
BEGIN
    SELECT * INTO v_settlement FROM public.seller_settlements WHERE id::text = p_settlement_id::text FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Settlement not found';
    END IF;
    
    IF v_settlement.status = 'PAID' THEN
        RAISE EXCEPTION 'Settlement is already paid and locked';
    END IF;
    
    SELECT COUNT(*) INTO v_earlier_pending_count 
    FROM public.seller_settlements 
    WHERE seller_id::text = v_settlement.seller_id::text 
      AND week_number < v_settlement.week_number 
      AND status = 'PENDING';
      
    IF v_earlier_pending_count > 0 THEN
        RAISE EXCEPTION 'Cannot pay this settlement because earlier weeks are still pending payment';
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.seller_settlements WHERE transaction_id = p_transaction_id) THEN
        RAISE EXCEPTION 'PhonePe Transaction ID already exists in the system';
    END IF;
    
    v_receipt_number := 'REC-SET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || substring(p_settlement_id::text from 1 for 6) || '-' || FLOOR(RANDOM() * 10000)::text;
    
    UPDATE public.seller_settlements
    SET status = 'PAID',
        transaction_id = p_transaction_id,
        payment_date = NOW(),
        paid_by = p_admin_id,
        notes = p_notes,
        receipt_number = v_receipt_number,
        receipt_pdf_url = p_pdf_url,
        updated_at = NOW()
    WHERE id::text = p_settlement_id::text;
    
    INSERT INTO public.settlement_orders (settlement_id, order_id)
    SELECT p_settlement_id, o.id
    FROM public.orders o
    WHERE o.seller_id::text = v_settlement.seller_id::text
      AND LOWER(o.order_status) IN ('delivered', 'completed')
      AND o.created_at >= v_settlement.start_date
      AND o.created_at <= v_settlement.end_date
      AND NOT EXISTS (
          SELECT 1 FROM public.settlement_orders so
          JOIN public.seller_settlements ss ON so.settlement_id::text = ss.id::text
          WHERE so.order_id::text = o.id::text AND ss.status = 'PAID'
      );
      
    INSERT INTO public.settlement_receipts (settlement_id, receipt_number, pdf_url)
    VALUES (p_settlement_id, v_receipt_number, p_pdf_url);
    
    INSERT INTO public.seller_payment_history (settlement_id, seller_id, amount, transaction_id, payment_date, paid_by, notes)
    VALUES (p_settlement_id, v_settlement.seller_id, v_settlement.net_amount, p_transaction_id, NOW(), p_admin_id, p_notes);
    
    INSERT INTO public.payment_audit_logs (settlement_id, action, performed_by, previous_status, new_status, ip_address, user_agent, transaction_id, receipt_number, notes)
    VALUES (p_settlement_id, 'MARK_AS_PAID', p_admin_id, 'PENDING', 'PAID', p_ip_address, p_user_agent, p_transaction_id, v_receipt_number, p_notes);
    
    INSERT INTO public.seller_notifications (seller_id, message, read_status, created_at)
    VALUES (
        v_settlement.seller_id,
        '💰 Payout Completed: Your settlement of ₹' || v_settlement.net_amount || ' for Week ' || v_settlement.week_number || ' (' || TO_CHAR(v_settlement.start_date, 'DD Mon') || ' - ' || TO_CHAR(v_settlement.end_date, 'DD Mon YYYY') || ') has been successfully paid via PhonePe UPI. Transaction ID: ' || p_transaction_id || '. Check your email for the receipt.',
        false,
        NOW()
    );
    
    SELECT json_build_object(
        'id', ss.id,
        'seller_id', ss.seller_id,
        'week_number', ss.week_number,
        'start_date', ss.start_date,
        'end_date', ss.end_date,
        'gross_sales', ss.gross_sales,
        'commission_deducted', ss.commission_deducted,
        'platform_fees', ss.platform_fees,
        'taxes', ss.taxes,
        'net_amount', ss.net_amount,
        'status', ss.status,
        'transaction_id', ss.transaction_id,
        'payment_date', ss.payment_date,
        'receipt_number', ss.receipt_number,
        'receipt_pdf_url', ss.receipt_pdf_url
    ) INTO v_updated_settlement
    FROM public.seller_settlements ss
    WHERE ss.id::text = p_settlement_id::text;
    
    RETURN v_updated_settlement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PERMANENT DELETIONS RPC
CREATE OR REPLACE FUNCTION public.delete_seller_permanently(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id FROM public.sellers WHERE id::text = p_seller_id::text;
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    DELETE FROM public.products WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.inventory WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_pickup_locations WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_support_tickets WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_notifications WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_reports WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.merchant_verification_logs WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_settlements WHERE seller_id::text = p_seller_id::text;
    DELETE FROM auth.users WHERE id::text = v_user_id::text;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically delete auth.users record when a seller is deleted
CREATE OR REPLACE FUNCTION public.handle_seller_deleted()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
        DELETE FROM auth.users WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_seller_deleted ON public.sellers;
CREATE TRIGGER trigger_seller_deleted
    AFTER DELETE ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_seller_deleted();

-- ====================================================================
-- 12. ROW-LEVEL SECURITY (RLS) POLICIES WITH HARDENED ASSIGNMENTS
-- ====================================================================

-- Clean all old general policy rules
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END;
$$;

-- Enable security across tables
-- Enable security across tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payment_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_verification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_pickup_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reports DISABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.admin_users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. Profiles Policy (Sellers / Customers read own, Admin full control)
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins full manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- 2. Categories Policy (Public read, Admin manage)
CREATE POLICY "Public view categories" ON public.categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins full manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin());

-- 3. Sellers Policy (Public read approved sellers, Sellers manage own, Admins manage all)
CREATE POLICY "Public read approved sellers" ON public.sellers FOR SELECT TO public USING (status = 'approved');
CREATE POLICY "Sellers view own configuration" ON public.sellers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Sellers update own configuration" ON public.sellers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins full manage sellers" ON public.sellers FOR ALL TO authenticated USING (public.is_admin());

-- 4. Products Policy (Public read active products, Sellers manage own, Admins manage all)
CREATE POLICY "Public view active products" ON public.products FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Sellers view own products" ON public.products FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Sellers manage own products" ON public.products FOR ALL TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins full manage products" ON public.products FOR ALL TO authenticated USING (public.is_admin());

-- 5. Orders Policy
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Sellers view own assigned orders" ON public.orders FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins full manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin());

-- 6. Seller Orders (Order Routing)
CREATE POLICY "Sellers view own routed orders" ON public.seller_orders FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Sellers update own routed orders" ON public.seller_orders FOR UPDATE TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage routed orders" ON public.seller_orders FOR ALL TO authenticated USING (public.is_admin());

-- 7. Order Items (Order Routing)
CREATE POLICY "Sellers view routed order items" ON public.order_items FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Users view order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id::text = parent_order_id::text AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (public.is_admin());

-- 8. Payments
CREATE POLICY "Users view own order payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id::text = parent_order_id::text AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin());

-- 9. Shipments
CREATE POLICY "Sellers view own order shipments" ON public.shipments FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Sellers update own order shipments" ON public.shipments FOR UPDATE TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Users view own shipments" ON public.shipments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id::text = parent_order_id::text AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage shipments" ON public.shipments FOR ALL TO authenticated USING (public.is_admin());

-- 10. Shipment Tracking
CREATE POLICY "Sellers view tracking events" ON public.shipment_tracking FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id::text = shipment_id::text AND s.seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid())));
CREATE POLICY "Users view tracking events" ON public.shipment_tracking FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shipments s JOIN public.orders o ON o.id::text = s.parent_order_id::text WHERE s.id::text = shipment_id::text AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage tracking" ON public.shipment_tracking FOR ALL TO authenticated USING (public.is_admin());

-- 11. Order Status History
CREATE POLICY "Sellers view status changes" ON public.order_status_history FOR SELECT TO authenticated USING (seller_order_id::text IN (SELECT id::text FROM public.seller_orders WHERE seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid())));
CREATE POLICY "Users view status changes" ON public.order_status_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id::text = parent_order_id::text AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage status history" ON public.order_status_history FOR ALL TO authenticated USING (public.is_admin());

-- 12. Weekly Settlements
CREATE POLICY "Sellers view own settlements" ON public.seller_settlements FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage settlements" ON public.seller_settlements FOR ALL TO authenticated USING (public.is_admin());

-- 13. Settlement Orders
CREATE POLICY "Sellers view own settlement orders" ON public.settlement_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.seller_settlements ss WHERE ss.id::text = settlement_id::text AND ss.seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid())));
CREATE POLICY "Admins manage settlement orders" ON public.settlement_orders FOR ALL TO authenticated USING (public.is_admin());

-- 14. Settlement Receipts
CREATE POLICY "Sellers view own receipts" ON public.settlement_receipts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.seller_settlements ss WHERE ss.id::text = settlement_id::text AND ss.seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid())));
CREATE POLICY "Admins manage receipts" ON public.settlement_receipts FOR ALL TO authenticated USING (public.is_admin());

-- 15. Seller Payment History
CREATE POLICY "Sellers view payment history" ON public.seller_payment_history FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage payment history" ON public.seller_payment_history FOR ALL TO authenticated USING (public.is_admin());

-- 16. Payment Audit Logs
CREATE POLICY "Admins manage audit logs" ON public.payment_audit_logs FOR ALL TO authenticated USING (public.is_admin());

-- 17. Seller Notifications
CREATE POLICY "Sellers read own alerts" ON public.seller_notifications FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage seller alerts" ON public.seller_notifications FOR ALL TO authenticated USING (public.is_admin());

-- 18. Cart Items
CREATE POLICY "Users manage own carts" ON public.cart_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 19. User Addresses
CREATE POLICY "Users manage own addresses" ON public.user_addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 20. Store Settings
CREATE POLICY "Public read store settings" ON public.store_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage store settings" ON public.store_settings FOR ALL TO authenticated USING (public.is_admin());

-- 21. Admin Users / Logs (Security Lockdown)
CREATE POLICY "Admins view admin lists" ON public.admin_users FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins view admin audits" ON public.admin_audit_logs FOR ALL TO authenticated USING (public.is_admin());

-- 22. Merchant Verification Logs
CREATE POLICY "Sellers view own verification logs" ON public.merchant_verification_logs FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage verification logs" ON public.merchant_verification_logs FOR ALL TO authenticated USING (public.is_admin());

-- 23. Seller Pickup Locations
CREATE POLICY "Sellers manage own pickup locations" ON public.seller_pickup_locations FOR ALL TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage pickup locations" ON public.seller_pickup_locations FOR ALL TO authenticated USING (public.is_admin());

-- 24. Seller Support Tickets
CREATE POLICY "Sellers manage own tickets" ON public.seller_support_tickets FOR ALL TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage tickets" ON public.seller_support_tickets FOR ALL TO authenticated USING (public.is_admin());

-- 25. Stock History
CREATE POLICY "Sellers view own stock history" ON public.stock_history FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage stock history" ON public.stock_history FOR ALL TO authenticated USING (public.is_admin());

-- 26. Inventory
CREATE POLICY "Sellers manage own inventory" ON public.inventory FOR ALL TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage inventory" ON public.inventory FOR ALL TO authenticated USING (public.is_admin());

-- 27. Notify Requests
CREATE POLICY "Public create notify requests" ON public.notify_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Sellers view own product notifications" ON public.notify_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id::text = product_id::text AND p.seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid())));
CREATE POLICY "Admins manage notify requests" ON public.notify_requests FOR ALL TO authenticated USING (public.is_admin());

-- 28. Seller Reports
CREATE POLICY "Sellers view own reports" ON public.seller_reports FOR SELECT TO authenticated USING (seller_id::text IN (SELECT id::text FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage reports" ON public.seller_reports FOR ALL TO authenticated USING (public.is_admin());

-- 29. Notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin());

-- 30. Card Applications
CREATE POLICY "Users create own applications" ON public.card_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own applications" ON public.card_applications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage applications" ON public.card_applications FOR ALL TO authenticated USING (public.is_admin());

-- Grant DB schema access to service layers
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;

