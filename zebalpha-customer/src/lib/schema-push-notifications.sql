-- ============================================================================
-- PUSH NOTIFICATIONS INFRASTRUCTURE FOR ZEBALPHA (Flipkart / Meesho Style)
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. Create table for storing Android FCM & Web Push device tokens
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    topics TEXT[] DEFAULT ARRAY['all', 'new_drops', 'orders', 'promotions'],
    device_info TEXT DEFAULT 'Mobile Device',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast batch dispatching
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_platform ON public.device_push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_id ON public.device_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_topics ON public.device_push_tokens USING GIN(topics);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated clients to register their own device token
CREATE POLICY "Allow public insert and update on device_push_tokens"
    ON public.device_push_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Automatically update updated_at timestamp on updates
CREATE OR REPLACE FUNCTION update_push_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_push_tokens_timestamp ON public.device_push_tokens;
CREATE TRIGGER trg_update_push_tokens_timestamp
    BEFORE UPDATE ON public.device_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_push_tokens_timestamp();

COMMENT ON TABLE public.device_push_tokens IS 'Stores FCM and Web Push tokens for Flipkart/Meesho style product drop and order status phone notifications';
