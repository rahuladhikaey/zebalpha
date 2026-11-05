-- ====================================================================
-- ZEBALPHA CUSTOMER INTELLIGENCE & LIVE USER MONITORING SCHEMA
-- Enterprise Customer 360°, Real-Time Heartbeats, Login Auditing,
-- and Configurable Repeat Purchase Segments (Flipkart / Meesho Architecture)
-- ====================================================================

-- 1. CUSTOMER SESSIONS & REAL-TIME HEARTBEATS
CREATE TABLE IF NOT EXISTS public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'website', -- 'android' or 'website'
    device_type VARCHAR(50) DEFAULT 'mobile', -- 'mobile', 'tablet', 'desktop'
    device_model TEXT,
    app_version VARCHAR(50),
    user_agent TEXT,
    ip_address TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_active ON public.customer_sessions(is_active, last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON public.customer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_platform ON public.customer_sessions(platform, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_session_id ON public.customer_sessions(session_id);

-- 2. CUSTOMER LOGIN & AUTHENTICATION AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.customer_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email_masked TEXT,
    phone_masked TEXT,
    login_method VARCHAR(50) NOT NULL DEFAULT 'email_password', -- 'email_password', 'google_oauth', 'phone_otp', 'session_restore'
    platform VARCHAR(20) NOT NULL DEFAULT 'website', -- 'android' or 'website'
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS' or 'FAILED'
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_logs_created ON public.customer_login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON public.customer_login_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON public.customer_login_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_method ON public.customer_login_logs(login_method, created_at DESC);

-- 3. ADMIN CUSTOMER 360° ACCESS AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.customer_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'VIEW_CUSTOMER_360', 'VIEW_CUSTOMER_ORDERS', 'EXPORT_CUSTOMER_DATA'
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_audit_logs_created ON public.customer_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_audit_logs_customer ON public.customer_audit_logs(customer_id);

-- 4. DYNAMIC REPEAT CUSTOMER & TIMEOUT CONFIGURATION
CREATE TABLE IF NOT EXISTS public.customer_segment_configs (
    id INT PRIMARY KEY DEFAULT 1,
    new_max_delivered INT DEFAULT 1 NOT NULL,
    repeat_min_delivered INT DEFAULT 2 NOT NULL,
    repeat_max_delivered INT DEFAULT 4 NOT NULL,
    loyal_min_delivered INT DEFAULT 5 NOT NULL,
    inactivity_timeout_seconds INT DEFAULT 120 NOT NULL, -- 2 minutes
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed default segmentation rule if table is empty
INSERT INTO public.customer_segment_configs (id, new_max_delivered, repeat_min_delivered, repeat_max_delivered, loyal_min_delivered, inactivity_timeout_seconds)
VALUES (1, 1, 2, 4, 5, 120)
ON CONFLICT (id) DO NOTHING;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segment_configs ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated clients to insert / update their own session heartbeats
CREATE POLICY "Allow public session heartbeats" ON public.customer_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow public insert of login events
CREATE POLICY "Allow public login event logging" ON public.customer_login_logs
    FOR INSERT
    WITH CHECK (true);

-- Allow read of segment configs
CREATE POLICY "Allow public read segment configs" ON public.customer_segment_configs
    FOR SELECT
    USING (true);

-- Super admin / service role full access
CREATE POLICY "Service role full access customer_sessions" ON public.customer_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customer_login_logs" ON public.customer_login_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customer_audit_logs" ON public.customer_audit_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customer_segment_configs" ON public.customer_segment_configs
    FOR ALL USING (auth.role() = 'service_role');
