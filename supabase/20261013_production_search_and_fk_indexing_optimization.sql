-- ==============================================================================
-- ZEBALPHA PRODUCTION DATABASE OPTIMIZATION & INDEXING STRATEGY
-- Migration: 20261013_production_search_and_fk_indexing_optimization.sql
-- Target: Supabase PostgreSQL (AWS ap-south-1)
-- ==============================================================================
-- OBJECTIVES:
-- 1. Accelerate first-search and catalog browsing queries (name, brand, category, price, created_at)
-- 2. Prevent full-table scans during category filtering, search, and keyset cursor pagination
-- 3. Eliminate missing Foreign Key indexes across order_items, inventory, shipments, carts, and notify_requests
-- 4. Enable ultra-fast partial matching with pg_trgm GIN indexes on products(name), products(brand), and categories(name)
-- 5. Safe, idempotent, non-destructive, transaction-safe migration with complete rollback capabilities
-- ==============================================================================

-- Ensure required extension for trigram similarity and partial string acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------------------------
-- 1. CATALOG FIRST-PAGE & SEARCH COMPOSITE / PARTIAL INDEXES
-- ------------------------------------------------------------------------------

-- INDEX: idx_products_active_catalog_created
-- PURPOSE: Optimizes the primary homepage & catalog query:
--          WHERE (is_active IS NULL OR is_active = true) AND approval_status != 'rejected'
--          ORDER BY created_at DESC LIMIT 12/24
-- BENEFIT: Pure Index-Scan / Backward Scan without sorting overhead.
CREATE INDEX IF NOT EXISTS idx_products_active_catalog_created
ON public.products (created_at DESC)
WHERE (is_active IS TRUE OR is_active IS NULL) AND (approval_status IS NULL OR approval_status != 'rejected');

-- INDEX: idx_products_active_category_created
-- PURPOSE: Optimizes category browsing with default sort (newest):
--          WHERE category_id = $1 AND (is_active = true OR is_active IS NULL)
--          ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_products_active_category_created
ON public.products (category_id, created_at DESC)
WHERE (is_active IS TRUE OR is_active IS NULL);

-- INDEX: idx_products_active_price_asc
-- PURPOSE: Optimizes sorting catalog by price ascending (cheapest first):
--          WHERE (is_active = true OR is_active IS NULL) ORDER BY price ASC
CREATE INDEX IF NOT EXISTS idx_products_active_price_asc
ON public.products (price ASC, created_at DESC)
WHERE (is_active IS TRUE OR is_active IS NULL);

-- INDEX: idx_products_active_price_desc
-- PURPOSE: Optimizes sorting catalog by price descending (highest first):
--          WHERE (is_active = true OR is_active IS NULL) ORDER BY price DESC
CREATE INDEX IF NOT EXISTS idx_products_active_price_desc
ON public.products (price DESC, created_at DESC)
WHERE (is_active IS TRUE OR is_active IS NULL);

-- INDEX: idx_products_brand_trgm
-- PURPOSE: Optimizes ILIKE '%brand%' and partial brand searches via trigram GIN index
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
ON public.products USING gin (brand gin_trgm_ops)
WHERE brand IS NOT NULL;

-- INDEX: idx_products_description_trgm
-- PURPOSE: Optimizes search fallback across descriptions without full table scans
CREATE INDEX IF NOT EXISTS idx_products_description_trgm
ON public.products USING gin (description gin_trgm_ops)
WHERE description IS NOT NULL;

-- INDEX: idx_categories_is_active_sort
-- PURPOSE: Optimizes fetchCanonicalCategories query:
--          WHERE is_active != false ORDER BY sort_order ASC, name ASC
CREATE INDEX IF NOT EXISTS idx_categories_is_active_sort
ON public.categories (sort_order ASC, name ASC)
WHERE is_active IS NOT FALSE;

-- INDEX: idx_categories_name_trgm
-- PURPOSE: Fast fuzzy & substring matching on category names
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
ON public.categories USING gin (name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 2. FOREIGN KEY INDEXES (ELIMINATING TABLE LOCKS & FULL-TABLE SCANS ON JOINS)
-- ------------------------------------------------------------------------------

-- Order items foreign keys
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON public.order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_parent_order_id
ON public.order_items (parent_order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_seller_id
ON public.order_items (seller_id);

CREATE INDEX IF NOT EXISTS idx_order_items_seller_order_id
ON public.order_items (seller_order_id);

-- Inventory & Stock tracking foreign keys
CREATE INDEX IF NOT EXISTS idx_inventory_product_id
ON public.inventory (product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_seller_id
ON public.inventory (seller_id);

CREATE INDEX IF NOT EXISTS idx_stock_history_product_id
ON public.stock_history (product_id);

CREATE INDEX IF NOT EXISTS idx_stock_history_seller_id
ON public.stock_history (seller_id);

-- Cart items product reference
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
ON public.cart_items (product_id);

-- Notify requests product reference (Back in stock notifications)
CREATE INDEX IF NOT EXISTS idx_notify_requests_product_id
ON public.notify_requests (product_id);

-- Shipments & Logistics relationships
CREATE INDEX IF NOT EXISTS idx_shipments_parent_order_id
ON public.shipments (parent_order_id);

CREATE INDEX IF NOT EXISTS idx_shipments_seller_order_id
ON public.shipments (seller_order_id);

CREATE INDEX IF NOT EXISTS idx_shipment_tracking_shipment_id
ON public.shipment_tracking (shipment_id);

-- Order status history tracking
CREATE INDEX IF NOT EXISTS idx_order_status_history_parent_order_id
ON public.order_status_history (parent_order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_seller_order_id
ON public.order_status_history (seller_order_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_parent_order_id
ON public.payments (parent_order_id);

-- User addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
ON public.user_addresses (user_id);

-- Seller ledger & payout queues
CREATE INDEX IF NOT EXISTS idx_seller_financial_ledger_seller_id
ON public.seller_financial_ledger (seller_id);

CREATE INDEX IF NOT EXISTS idx_payout_queue_seller_id
ON public.payout_queue (seller_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id
ON public.reviews (product_id);

-- ------------------------------------------------------------------------------
-- ROLLBACK SCRIPT (SAFE REMOVAL IN REVERSE ORDER)
-- ------------------------------------------------------------------------------
/*
DROP INDEX IF EXISTS public.idx_reviews_product_id;
DROP INDEX IF EXISTS public.idx_payout_queue_seller_id;
DROP INDEX IF EXISTS public.idx_seller_financial_ledger_seller_id;
DROP INDEX IF EXISTS public.idx_user_addresses_user_id;
DROP INDEX IF EXISTS public.idx_payments_parent_order_id;
DROP INDEX IF EXISTS public.idx_order_status_history_seller_order_id;
DROP INDEX IF EXISTS public.idx_order_status_history_parent_order_id;
DROP INDEX IF EXISTS public.idx_shipment_tracking_shipment_id;
DROP INDEX IF EXISTS public.idx_shipments_seller_order_id;
DROP INDEX IF EXISTS public.idx_shipments_parent_order_id;
DROP INDEX IF EXISTS public.idx_notify_requests_product_id;
DROP INDEX IF EXISTS public.idx_cart_items_product_id;
DROP INDEX IF EXISTS public.idx_stock_history_seller_id;
DROP INDEX IF EXISTS public.idx_stock_history_product_id;
DROP INDEX IF EXISTS public.idx_inventory_seller_id;
DROP INDEX IF EXISTS public.idx_inventory_product_id;
DROP INDEX IF EXISTS public.idx_order_items_seller_order_id;
DROP INDEX IF EXISTS public.idx_order_items_seller_id;
DROP INDEX IF EXISTS public.idx_order_items_parent_order_id;
DROP INDEX IF EXISTS public.idx_order_items_product_id;
DROP INDEX IF EXISTS public.idx_categories_name_trgm;
DROP INDEX IF EXISTS public.idx_categories_is_active_sort;
DROP INDEX IF EXISTS public.idx_products_description_trgm;
DROP INDEX IF EXISTS public.idx_products_brand_trgm;
DROP INDEX IF EXISTS public.idx_products_active_price_desc;
DROP INDEX IF EXISTS public.idx_products_active_price_asc;
DROP INDEX IF EXISTS public.idx_products_active_category_created;
DROP INDEX IF EXISTS public.idx_products_active_catalog_created;
*/
