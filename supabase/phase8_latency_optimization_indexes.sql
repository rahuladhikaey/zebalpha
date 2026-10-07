-- ==============================================================================
-- ZEBALPHA PHASE 8 — PRODUCTS & CHECKOUT LATENCY OPTIMIZATION INDEXES
-- Purpose: Provide targeted B-Tree indexes for Seller Products filtering, 
--          Admin moderation ordering, and batch logistics lookups.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- INDEX 1: idx_products_seller_created
-- ------------------------------------------------------------------------------
-- WHY: Accelerates seller dashboard products page query:
--      SELECT <slim_fields> FROM public.products WHERE seller_id = $1 ORDER BY created_at DESC
-- BENEFIT: Converts sequential table scan of products table into an indexed B-Tree range scan.
-- WRITE COST: Low (products are inserted/updated infrequently compared to catalog reads).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_products_seller_created;
CREATE INDEX IF NOT EXISTS idx_products_seller_created 
ON public.products (seller_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- INDEX 2: idx_products_approval_created
-- ------------------------------------------------------------------------------
-- WHY: Accelerates admin product approval dashboard filtering:
--      SELECT <slim_fields> FROM public.products WHERE approval_status = $1 ORDER BY created_at DESC
-- BENEFIT: Speeds up admin approval moderation queries across large product sets.
-- WRITE COST: Low.
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_products_approval_created;
CREATE INDEX IF NOT EXISTS idx_products_approval_created 
ON public.products (approval_status, created_at DESC);

-- ------------------------------------------------------------------------------
-- INDEX 3: idx_seller_pickup_locations_seller_default
-- ------------------------------------------------------------------------------
-- WHY: Accelerates multi-vendor checkout batch pickup location lookup:
--      SELECT seller_id, pin_code, pincode, is_default FROM public.seller_pickup_locations 
--      WHERE seller_id IN (...)
-- BENEFIT: Eliminates full table scan during checkout stage 4 batch logistics lookup.
-- WRITE COST: Negligible (locations configured once per seller).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_seller_pickup_locations_seller_default;
CREATE INDEX IF NOT EXISTS idx_seller_pickup_locations_seller_default 
ON public.seller_pickup_locations (seller_id, is_default);
