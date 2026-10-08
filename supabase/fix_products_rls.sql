-- ==============================================================================
-- ZEBALPHA — FIX PRODUCTS TABLE RLS POLICIES & SCHEMA
-- Resolves product creation failures, RLS policy violations, and column schema cache issues
-- ==============================================================================

-- 1. Ensure optional columns exist if referenced directly by queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_premium') THEN
        ALTER TABLE public.products ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_new_drop') THEN
        ALTER TABLE public.products ADD COLUMN is_new_drop BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'collection') THEN
        ALTER TABLE public.products ADD COLUMN collection VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'target_drop_date') THEN
        ALTER TABLE public.products ADD COLUMN target_drop_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'tier') THEN
        ALTER TABLE public.products ADD COLUMN tier VARCHAR(50) DEFAULT 'STANDARD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock_count') THEN
        ALTER TABLE public.products ADD COLUMN stock_count INT DEFAULT 0;
    END IF;
END $$;

-- 2. Ensure indexes exist for fast lookup
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- 3. Enable Row-Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies on products to avoid conflicts
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'products'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', r.policyname);
    END LOOP;
END $$;

-- 5. Create resilient RLS policies for Products

-- (A) Public can view active products
CREATE POLICY "Public view active products"
ON public.products
FOR SELECT
TO public
USING (is_active = true);

-- (B) Authenticated sellers can view their own products (even if not active)
CREATE POLICY "Sellers view own products"
ON public.products
FOR SELECT
TO authenticated
USING (
    seller_id::text IN (
        SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role')
);

-- (C) Authenticated sellers can insert their own products
CREATE POLICY "Sellers insert own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id::text IN (
        SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role')
);

-- (D) Authenticated sellers can update their own products
CREATE POLICY "Sellers update own products"
ON public.products
FOR UPDATE
TO authenticated
USING (
    seller_id::text IN (
        SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
)
WITH CHECK (
    seller_id::text IN (
        SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
);

-- (E) Authenticated sellers can delete their own products
CREATE POLICY "Sellers delete own products"
ON public.products
FOR DELETE
TO authenticated
USING (
    seller_id::text IN (
        SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
);

-- (F) Super Admin full manage
CREATE POLICY "Admins full manage products"
ON public.products
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role')
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role', '') = 'admin')
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role', '') = 'super_admin')
);

-- 6. Grant privileges
GRANT ALL ON public.products TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
