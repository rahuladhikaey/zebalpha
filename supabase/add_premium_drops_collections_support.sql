-- ====================================================================
-- ZEBALPHA: Add Support for Premium Store, New Drops & Curated Collections
-- Run this in your Supabase SQL Editor to enable full marketplace tiering.
-- ====================================================================

-- 1. Extend products table with Premium, New Drop, and Collection metadata
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_new_drop BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS collection VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS drop_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_drop_date VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD';

-- 2. Indexes for fast filtering on customer store and admin analytics
CREATE INDEX IF NOT EXISTS idx_products_is_premium ON public.products(is_premium);
CREATE INDEX IF NOT EXISTS idx_products_is_new_drop ON public.products(is_new_drop);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection);
CREATE INDEX IF NOT EXISTS idx_products_tier ON public.products(tier);

-- 3. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
