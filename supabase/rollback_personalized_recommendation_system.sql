-- ==============================================================================
-- ROLLBACK: supabase/rollback_personalized_recommendation_system.sql
-- Safely removes recommendation system tables, indexes, and helper functions.
-- ==============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.purge_expired_recommendation_data();
DROP FUNCTION IF EXISTS public.merge_anonymous_recommendation_events(TEXT, UUID);

DROP INDEX IF EXISTS public.idx_orders_user_created_rec;
DROP INDEX IF EXISTS public.idx_products_category_rec_active;
DROP INDEX IF EXISTS public.idx_products_rec_eligible;

DROP TABLE IF EXISTS public.recommendation_click_events CASCADE;
DROP TABLE IF EXISTS public.product_recommendation_impressions CASCADE;
DROP TABLE IF EXISTS public.customer_product_events CASCADE;

COMMIT;
