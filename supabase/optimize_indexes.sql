-- ==============================================================================
-- DATABASE PERFORMANCE & SCALABILITY OPTIMIZATION SCRIPT
-- Purpose: Accelerate query execution times and prevent DB bottlenecks under high user traffic.
-- ==============================================================================

-- 1. Composite B-Tree Indexes for Products Query Optimization
CREATE INDEX IF NOT EXISTS idx_products_category_active_created 
ON public.products (category_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_seller_active 
ON public.products (seller_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_status_approval 
ON public.products (status, approval_status) WHERE is_active = true;

-- 2. Indexing Orders & Transactions for High-Concurrency Checkout & Dashboards
CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON public.orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_status 
ON public.orders (seller_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items (order_id);

-- 3. GIN Trigram / Full Text Search Index for Product Names & Descriptions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
ON public.products USING gin (name gin_trgm_ops);

-- 4. Cursor-Based (Keyset) Pagination RPC Function for Efficient Infinite Scrolling
-- Avoids expensive OFFSET queries on large tables
CREATE OR REPLACE FUNCTION get_products_paginated_cursor(
    p_category_id UUID DEFAULT NULL,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    price NUMERIC,
    main_image TEXT,
    category_id UUID,
    seller_id UUID,
    stock INT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.price,
        p.main_image,
        p.category_id,
        p.seller_id,
        p.stock,
        p.created_at
    FROM public.products p
    WHERE 
        p.is_active = true
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (
            p_last_created_at IS NULL 
            OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
        )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT LEAST(p_limit, 100);
END;
$$;
