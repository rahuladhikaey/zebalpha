-- Migration to support Sellers and Multi-Vendor architecture

-- 1. Alter public.profiles table to support user roles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';

-- 2. Alter public.products table to support seller ownership
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Update products RLS policies for sellers
CREATE POLICY "Sellers can manage own products" ON public.products
    FOR ALL
    TO authenticated
    USING (
        seller_id = auth.uid() 
        AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'seller')
    )
    WITH CHECK (
        seller_id = auth.uid() 
        AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'seller')
    );

-- 4. Update orders RLS policies for sellers
-- Allows a seller to view orders containing their products
CREATE POLICY "Sellers can view orders with own products" ON public.orders
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(product_details::jsonb) AS item
            JOIN public.products p ON p.id = (item->>'id')::bigint
            WHERE p.seller_id = auth.uid()
            AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'seller')
        )
    );
