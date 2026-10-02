-- ==============================================================================
-- DELETE "Cherry Happy Day Graphic T-Shirt" AND BROKEN TEST PRODUCTS
-- ==============================================================================

-- 1. Delete associated cart, wishlist, and order items first
DELETE FROM public.cart WHERE product_id IN (
    SELECT id FROM public.products WHERE name ILIKE '%Cherry Happy Day%'
);

DELETE FROM public.wishlist WHERE product_id IN (
    SELECT id FROM public.products WHERE name ILIKE '%Cherry Happy Day%'
);

DELETE FROM public.order_items WHERE product_id IN (
    SELECT id FROM public.products WHERE name ILIKE '%Cherry Happy Day%'
);

-- 2. Delete the product row
DELETE FROM public.products WHERE name ILIKE '%Cherry Happy Day%';
