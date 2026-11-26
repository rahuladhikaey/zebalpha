-- ============================================================================
-- REMOVE NEW DROPS & PREMIUM STORE FROM DATABASE
-- Permanently removes New Drops & Premium Store columns and cleans product tiers.
-- Run once in Supabase SQL Editor.
-- ============================================================================

-- 1. Normalize any existing product tiers/statuses before dropping columns
UPDATE public.products
SET tier = 'STANDARD'
WHERE tier IN ('DROP', 'PREMIUM');

UPDATE public.products
SET status = 'ACTIVE'
WHERE status = 'COMING_SOON';

-- 2. Drop New Drops & Premium Store columns from public.products
ALTER TABLE public.products
  DROP COLUMN IF EXISTS is_new_drop,
  DROP COLUMN IF EXISTS target_drop_date,
  DROP COLUMN IF EXISTS is_premium;

-- 3. Drop any New Drops notification subscriptions table/rows if present
DROP TABLE IF EXISTS public.drop_notifications CASCADE;
DROP TABLE IF EXISTS public.new_drop_subscriptions CASCADE;
