-- =============================================================================
-- ZebAlpha: Global Product Ratings & Reviews RLS + Uniqueness Migration
-- Idempotent migration ensuring reviews are cleanly indexed, deduplicated,
-- readable globally when approved, and writable/updatable securely by owners.
-- =============================================================================

-- 1. Ensure rating constraint & defaults exist cleanly
ALTER TABLE public.reviews
  ALTER COLUMN is_approved SET DEFAULT true;

ALTER TABLE public.reviews
  ALTER COLUMN comment SET DEFAULT '';

-- 2. Fast lookup indexes for global rating aggregation
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved
  ON public.reviews (product_id, is_approved)
  WHERE is_approved = true;

-- 3. Remove duplicate (product_id, user_id) rows keeping the most recent update
DELETE FROM public.reviews a
USING public.reviews b
WHERE a.user_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.product_id = b.product_id
  AND (
    COALESCE(a.updated_at, a.created_at) < COALESCE(b.updated_at, b.created_at)
    OR (COALESCE(a.updated_at, a.created_at) = COALESCE(b.updated_at, b.created_at) AND a.id < b.id)
  );

-- 4. One active review per authenticated user per product (allows seamless updates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_product_user
  ON public.reviews (product_id, user_id)
  WHERE user_id IS NOT NULL;

-- 5. Enable Row Level Security & replace policies idempotently
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved reviews" ON public.reviews;
CREATE POLICY "Public can read approved reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_approved = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert own reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert own reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "Authenticated users can update own reviews" ON public.reviews;
CREATE POLICY "Authenticated users can update own reviews"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "Authenticated users can delete own reviews" ON public.reviews;
CREATE POLICY "Authenticated users can delete own reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
