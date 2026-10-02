-- ==============================================================================
-- ZEBALPHA — SELLER LIFECYCLE CASCADE TRIGGERS (SUSPENSION & DELETION)
-- Schema-safe: Adds is_active to sellers if missing and handles status changes
-- ==============================================================================

-- 1. Ensure is_active column exists on public.sellers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sellers' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.sellers ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Automatic Suspension Cascading: Hides all products when seller status changes
CREATE OR REPLACE FUNCTION fn_handle_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If seller is suspended, rejected, or inactive
    IF (NEW.status = 'suspended' OR NEW.status = 'rejected' OR NEW.is_active = false) THEN
        UPDATE public.products
        SET 
            is_active = false,
            is_approved = false,
            approval_status = 'suspended_by_merchant_action'
        WHERE seller_id = NEW.id::text OR seller_id = NEW.auth_id::text;
    
    -- If seller is reactivated / approved
    ELSIF (NEW.status = 'approved' AND (NEW.is_active = true OR NEW.is_active IS NULL) AND (OLD.status = 'suspended' OR OLD.is_active = false)) THEN
        UPDATE public.products
        SET 
            is_active = true,
            is_approved = true,
            approval_status = 'approved'
        WHERE seller_id = NEW.id::text OR seller_id = NEW.auth_id::text;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_seller_status_change ON public.sellers;
CREATE TRIGGER trg_seller_status_change
AFTER UPDATE OF status, is_active ON public.sellers
FOR EACH ROW EXECUTE FUNCTION fn_handle_seller_status_change();

-- 3. Automatic Hard Deletion Cascading: Permanently purges products & related data on seller deletion
CREATE OR REPLACE FUNCTION fn_handle_seller_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove cart items for seller's products
    DELETE FROM public.cart 
    WHERE product_id IN (
        SELECT id FROM public.products 
        WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text
    );

    -- Remove wishlist items for seller's products
    DELETE FROM public.wishlist 
    WHERE product_id IN (
        SELECT id FROM public.products 
        WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text
    );

    -- Clean stock history
    DELETE FROM public.stock_history 
    WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text;

    -- Delete all products listed by this seller
    DELETE FROM public.products 
    WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_seller_hard_delete ON public.sellers;
CREATE TRIGGER trg_seller_hard_delete
BEFORE DELETE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION fn_handle_seller_hard_delete();
