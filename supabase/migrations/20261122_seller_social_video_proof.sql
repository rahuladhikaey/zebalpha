-- ============================================================================
-- ZebAlpha: Official Seller Social Page + Real Product & Packaging Video Proof
-- Zero-Egress Architecture: stores only short validated URLs (~60 bytes each).
-- Safe & Idempotent migration (run once in Supabase SQL Editor).
-- ============================================================================

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS social_page_url TEXT,
  ADD COLUMN IF NOT EXISTS social_platform VARCHAR(30);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_proof_url TEXT;

COMMENT ON COLUMN public.sellers.social_page_url IS
  'Validated official Instagram, Facebook, or YouTube shop page URL submitted by seller.';
COMMENT ON COLUMN public.sellers.social_platform IS
  'Detected official social platform (instagram, facebook, youtube).';
COMMENT ON COLUMN public.products.video_proof_url IS
  'Validated public Instagram Reel, Facebook Reel/Video, or YouTube Shorts URL serving as real product & intact packaging video proof.';
