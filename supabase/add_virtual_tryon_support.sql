-- ====================================================================
-- ASALI SWAD / ZEBALPHA - AI VIRTUAL TRY-ON (VTO) SCHEMA SUPPORT
-- Adds optional dedicated VTO garment image and category attributes
-- ====================================================================

-- 1. Add Virtual Try-On columns to products table if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'virtual_tryon_image'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN virtual_tryon_image TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'virtual_tryon_category'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN virtual_tryon_category VARCHAR(100) DEFAULT 'upper_body';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'is_vto_enabled'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN is_vto_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

COMMENT ON COLUMN public.products.virtual_tryon_image IS 'Clean flat-lay or ghost-mannequin garment image specifically optimized for AI virtual try-on models';
COMMENT ON COLUMN public.products.virtual_tryon_category IS 'Garment category for AI VTO models: upper_body, lower_body, dresses, outerwear';
COMMENT ON COLUMN public.products.is_vto_enabled IS 'Controls whether Virtual Try-On button is shown for this product';
