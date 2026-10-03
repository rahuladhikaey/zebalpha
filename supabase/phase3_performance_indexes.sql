-- ==============================================================================
-- ZEBALPHA PHASE 3 — PRODUCTION PERFORMANCE DATABASE INDEXES
-- Purpose: Optimize critical queries for Customer Orders, Seller Dashboard,
--          Multi-vendor split orders, and Admin Dashboard filtering.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- INDEX 1: idx_orders_user_created
-- ------------------------------------------------------------------------------
-- WHY: Accelerates customer profile orders lookup by user ID with reverse chronological sort.
-- QUERY: SELECT * FROM public.orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100
-- EXPECTED BENEFIT: Converts full-table sequence scan to B-Tree index scan (<2ms execution).
-- WRITE COST: Low (only inserted on checkout order creation).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_orders_user_created;
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON public.orders (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- INDEX 2: idx_orders_seller_created
-- ------------------------------------------------------------------------------
-- WHY: Accelerates seller dashboard orders lookup for direct single-merchant orders.
-- QUERY: SELECT * FROM public.orders WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 200
-- EXPECTED BENEFIT: Eliminates full-table scan for seller orders view.
-- WRITE COST: Low (inserted on order creation).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_orders_seller_created;
CREATE INDEX IF NOT EXISTS idx_orders_seller_created 
ON public.orders (seller_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- INDEX 3: idx_orders_status_created
-- ------------------------------------------------------------------------------
-- WHY: Optimizes superadmin orders management view filtered by status.
-- QUERY: SELECT * FROM public.orders WHERE order_status = $1 ORDER BY created_at DESC
-- EXPECTED BENEFIT: Speeds up admin order pipeline filtering.
-- WRITE COST: Moderate (updated when order transitions: placed -> confirmed -> shipped -> delivered).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_orders_status_created;
CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON public.orders (order_status, created_at DESC);

-- ------------------------------------------------------------------------------
-- INDEX 4: idx_seller_orders_seller_created
-- ------------------------------------------------------------------------------
-- WHY: Accelerates multi-vendor split orders lookup by seller_id in seller dashboard.
-- QUERY: SELECT parent_order_id FROM public.seller_orders WHERE seller_id = $1
-- EXPECTED BENEFIT: Fast index-only or index scan for multi-vendor routing.
-- WRITE COST: Low (inserted on order placement).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_seller_orders_seller_created;
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller_created 
ON public.seller_orders (seller_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- INDEX 5: idx_seller_orders_parent_order_id
-- ------------------------------------------------------------------------------
-- WHY: Speeds up lookup of child seller sub-orders when viewing parent order details or admin tracking.
-- QUERY: SELECT * FROM public.seller_orders WHERE parent_order_id = $1
-- EXPECTED BENEFIT: Instant join/lookup from parent order to seller sub-orders.
-- WRITE COST: Low.
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_seller_orders_parent_order_id;
CREATE INDEX IF NOT EXISTS idx_seller_orders_parent_order_id 
ON public.seller_orders (parent_order_id);

-- ------------------------------------------------------------------------------
-- INDEX 6: idx_products_category_active_created
-- ------------------------------------------------------------------------------
-- WHY: Accelerates catalog listing and pagination by category.
-- QUERY: SELECT ... FROM public.products WHERE category_id = $1 AND is_active = true ORDER BY created_at DESC
-- EXPECTED BENEFIT: Index scan for product pagination, avoids seq scans on product catalog.
-- WRITE COST: Low (products updated infrequently compared to read traffic).
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_products_category_active_created;
CREATE INDEX IF NOT EXISTS idx_products_category_active_created 
ON public.products (category_id, is_active, created_at DESC);
