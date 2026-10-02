-- ==============================================================================
-- DELETE "Cherry Happy Day Graphic T-Shirt" AND BROKEN TEST PRODUCTS
-- Safe version: Checks if optional tables exist before deleting
-- ==============================================================================

DO $$
BEGIN
    -- 1. Clean order_items if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        DELETE FROM public.order_items WHERE product_id IN (
            SELECT id FROM public.products WHERE name ILIKE '%Cherry Happy Day%'
        );
    END IF;

    -- 2. Clean wishlist if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist') THEN
        DELETE FROM public.wishlist WHERE product_id IN (
            SELECT id FROM public.products WHERE name ILIKE '%Cherry Happy Day%'
        );
    END IF;

    -- 3. Clean cart if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart') THEN
        DELETE FROM public.cart WHERE product_id IN (
            SELECT id FROM public.products WHERE name ILIKE '%Cherry Happy Day%'
        );
    END IF;

    -- 4. Delete the product permanently
    DELETE FROM public.products WHERE name ILIKE '%Cherry Happy Day%';
END $$;
