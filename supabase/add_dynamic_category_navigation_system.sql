-- ====================================================================
-- ZEBALPHA PRODUCTION DYNAMIC CATEGORY NAVIGATION & MANAGEMENT SYSTEM
-- Unified Hierarchical Categories & Seller Subcategory Request Schema
-- ====================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enhance categories table non-destructively
DO $$
BEGIN
    -- parent_id: NULL represents Main Category; Non-NULL represents Subcategory
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'parent_id') THEN
        ALTER TABLE public.categories ADD COLUMN parent_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;

    -- icon_key: stable icon identifier (e.g. 'shirt', 'dress', 'smartphone', 'laptop', 'sparkles', 'house', 'handbag', etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'icon_key') THEN
        ALTER TABLE public.categories ADD COLUMN icon_key VARCHAR(100) DEFAULT 'package';
    END IF;

    -- icon_url: optional custom uploaded icon/SVG URL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'icon_url') THEN
        ALTER TABLE public.categories ADD COLUMN icon_url TEXT;
    END IF;

    -- icon_source: AUTO (keyword-matched), ADMIN (manually set), FALLBACK (neutral default)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'icon_source') THEN
        ALTER TABLE public.categories ADD COLUMN icon_source VARCHAR(20) DEFAULT 'AUTO';
    END IF;

    -- display_order: for admin-controlled sorting order
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'display_order') THEN
        ALTER TABLE public.categories ADD COLUMN display_order INT DEFAULT 0;
    END IF;

    -- show_in_navigation: controls customer-facing category bar visibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'show_in_navigation') THEN
        ALTER TABLE public.categories ADD COLUMN show_in_navigation BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;

    -- created_by: admin/seller user UUID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'created_by') THEN
        ALTER TABLE public.categories ADD COLUMN created_by UUID NULL;
    END IF;

    -- main_category: text alias for backward compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'main_category') THEN
        ALTER TABLE public.categories ADD COLUMN main_category VARCHAR(255) NULL;
    END IF;

    -- sync sort_order to display_order if display_order is 0 and sort_order is present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'sort_order') THEN
        UPDATE public.categories SET display_order = sort_order WHERE display_order = 0 AND sort_order > 0;
    END IF;
END $$;

-- 3. Prevent circular hierarchy on categories
CREATE OR REPLACE FUNCTION public.check_category_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    current_parent UUID;
    depth INT := 0;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'Category cannot be its own parent.';
    END IF;

    current_parent := NEW.parent_id;
    WHILE current_parent IS NOT NULL LOOP
        depth := depth + 1;
        IF depth > 10 THEN
            RAISE EXCEPTION 'Circular parent-child category hierarchy detected.';
        END IF;
        SELECT parent_id INTO current_parent FROM public.categories WHERE id = current_parent;
        IF current_parent = NEW.id THEN
            RAISE EXCEPTION 'Circular parent-child category hierarchy detected.';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_category_hierarchy ON public.categories;
CREATE TRIGGER trg_check_category_hierarchy
BEFORE INSERT OR UPDATE OF parent_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.check_category_hierarchy();

-- 4. Create category_requests table for Seller Subcategory Proposals
CREATE TABLE IF NOT EXISTS public.category_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL,
    parent_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    proposed_name VARCHAR(255) NOT NULL,
    proposed_slug VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reviewed_by UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    approved_category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Subcategory ID support in products table (optional clean join)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'subcategory_id') THEN
        ALTER TABLE public.products ADD COLUMN subcategory_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_nav ON public.categories(show_in_navigation, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_category_requests_seller ON public.category_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_category_requests_status ON public.category_requests(status);
CREATE INDEX IF NOT EXISTS idx_products_category_sub ON public.products(category_id, subcategory_id);

-- 7. Row Level Security (RLS) Configuration
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_requests ENABLE ROW LEVEL SECURITY;

-- Categories RLS:
-- Public read active categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

-- Admin full access
DROP POLICY IF EXISTS "Service role full access categories" ON public.categories;
CREATE POLICY "Service role full access categories" ON public.categories
    FOR ALL USING (auth.role() = 'service_role');

-- Category Requests RLS:
-- Sellers can view their own requests
DROP POLICY IF EXISTS "Sellers can view own category requests" ON public.category_requests;
CREATE POLICY "Sellers can view own category requests" ON public.category_requests
    FOR SELECT USING (auth.uid() = seller_id OR auth.role() = 'service_role');

-- Sellers can submit requests
DROP POLICY IF EXISTS "Sellers can submit category requests" ON public.category_requests;
CREATE POLICY "Sellers can submit category requests" ON public.category_requests
    FOR INSERT WITH CHECK (auth.uid() = seller_id OR auth.role() = 'service_role');

-- Admin full access to category requests
DROP POLICY IF EXISTS "Service role full access category requests" ON public.category_requests;
CREATE POLICY "Service role full access category requests" ON public.category_requests
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Real Category Canonical Seed / Normalization (Preserving all existing IDs)
-- Ensure standard Main Categories exist if not already present
INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Men''s Fashion', 'mens-fashion', 'Men''s apparel, streetwear, polos, shirts & bottomwear', 'shirt', 'AUTO', 1, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('mens-fashion', 'men', 'men-fashion'));

INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Women''s Fashion', 'womens-fashion', 'Women''s ethnic wear, dresses, kurtis, tops & sarees', 'dress', 'AUTO', 2, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('womens-fashion', 'women', 'women-fashion'));

INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Home & Kitchen', 'home-kitchen', 'Home decor, furnishings, kitchen essentials & appliances', 'house', 'AUTO', 3, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('home-kitchen', 'home', 'kitchen'));

INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Electronics & Accessories', 'electronics', 'Mobile accessories, audio, headphones & smart devices', 'smartphone', 'AUTO', 4, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('electronics', 'electronics-accessories'));

INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Beauty & Care', 'beauty-care', 'Skincare, haircare, cosmetics & personal grooming', 'sparkles', 'AUTO', 5, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('beauty-care', 'beauty', 'cosmetics'));

INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Jewellery & Bags', 'jewellery-bags', 'Handbags, clutches, fashion jewellery & accessories', 'handbag', 'AUTO', 6, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('jewellery-bags', 'jewellery', 'bags'));

INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Footwear', 'footwear', 'Sneakers, formal shoes, casual footwear & sandals', 'footwear', 'AUTO', 7, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('footwear', 'shoes'));

-- Update icon_key for existing categories that might have default/null icon
UPDATE public.categories SET icon_key = 'shirt' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%men%' OR name ILIKE '%shirt%' OR name ILIKE '%polo%');
UPDATE public.categories SET icon_key = 'dress' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%women%' OR name ILIKE '%kurti%' OR name ILIKE '%saree%' OR name ILIKE '%dress%');
UPDATE public.categories SET icon_key = 'house' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%home%' OR name ILIKE '%kitchen%' OR name ILIKE '%decor%');
UPDATE public.categories SET icon_key = 'smartphone' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%electronic%' OR name ILIKE '%mobile%' OR name ILIKE '%phone%');
UPDATE public.categories SET icon_key = 'sparkles' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%beauty%' OR name ILIKE '%care%' OR name ILIKE '%skin%');
UPDATE public.categories SET icon_key = 'handbag' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%bag%' OR name ILIKE '%jewel%');
UPDATE public.categories SET icon_key = 'footwear' WHERE (icon_key IS NULL OR icon_key = 'package') AND (name ILIKE '%shoe%' OR name ILIKE '%footwear%' OR name ILIKE '%sneaker%');
