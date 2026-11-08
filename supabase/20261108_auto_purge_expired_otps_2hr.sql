-- ==============================================================================
-- ZEBALPHA: AUTOMATIC OTP 2-HOUR EXPIRY & PURGE ENGINE
-- ==============================================================================

-- 1. Ensure email_otps table exists with clean schema
CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Fast Index for Email Lookup & Expiry Purging
CREATE INDEX IF NOT EXISTS idx_email_otps_email_expires 
ON public.email_otps (email, expires_at);

-- 3. Cleanup Function: Purges all OTP records older than 2 hours
CREATE OR REPLACE FUNCTION public.purge_expired_otps()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.email_otps
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Automatic Trigger to clean up expired OTPs on every new insert
CREATE OR REPLACE FUNCTION public.trigger_purge_stale_otps()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.email_otps
    WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_purge_stale_otps ON public.email_otps;
CREATE TRIGGER trg_purge_stale_otps
BEFORE INSERT ON public.email_otps
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_purge_stale_otps();

