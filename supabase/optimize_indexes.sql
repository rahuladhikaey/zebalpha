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

CREATE INDEX IF NOT EXISTS idx_products_price_active 
ON public.products (price, is_active);

CREATE INDEX IF NOT EXISTS idx_products_brand_active 
ON public.products (brand, is_active);

-- 2. Indexing Orders & Transactions for High-Concurrency Checkout & Dashboards
CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON public.orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_status 
ON public.orders (seller_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items (order_id);

-- 3. Full Text Search Index (tsvector & GIN Trigram) for Instant Search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_vector ON public.products;
CREATE TRIGGER trg_products_search_vector
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

-- 4. Keyset/Cursor-Based Pagination RPC Function (Slim Card DTO)
-- Prevents expensive OFFSET queries on 100,000+ dataset
CREATE OR REPLACE FUNCTION get_products_paginated_cursor(
    p_category_id UUID DEFAULT NULL,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 12
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    price NUMERIC,
    mrp NUMERIC,
    thumbnail_url TEXT,
    card_image_url TEXT,
    brand TEXT,
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
        COALESCE(p.slug, p.id::text) AS slug,
        p.price,
        COALESCE(p.mrp, p.price) AS mrp,
        COALESCE(p.thumbnail_url, p.main_image, p.image_url) AS thumbnail_url,
        COALESCE(p.card_image_url, p.main_image, p.image_url) AS card_image_url,
        p.brand,
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
    LIMIT LEAST(p_limit, 48);
END;
$$;

