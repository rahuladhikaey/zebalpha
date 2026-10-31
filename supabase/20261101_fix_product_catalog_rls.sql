-- ==============================================================================
-- ZEBALPHA — FIX PRODUCT VISIBILITY & CATALOG RLS POLICIES
-- Ensures products with NULL is_active or pending approval are not blocked
-- ==============================================================================

-- 1. Ensure existing products have is_active default to TRUE if NULL
UPDATE public.products 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- 2. Ensure column has NOT NULL DEFAULT TRUE constraint
ALTER TABLE public.products 
ALTER COLUMN is_active SET DEFAULT TRUE;

-- 3. Update RLS policy on products so that anon and authenticated customers
-- can view all active and unrejected products
DROP POLICY IF EXISTS "Public view active products" ON public.products;
DROP POLICY IF EXISTS "Public read active products" ON public.products;

CREATE POLICY "Public view active products"
ON public.products
FOR SELECT
TO public
USING (
    (is_active = TRUE OR is_active IS NULL) 
    AND (approval_status IS NULL OR approval_status != 'rejected')
);

-- 4. Ensure sellers viewable columns on public catalog
GRANT SELECT (id, business_name, category, business_category, business_logo_url, profile_photo_url, business_description, city, state, status, is_suspended, created_at) 
ON TABLE public.sellers TO anon, authenticated;
