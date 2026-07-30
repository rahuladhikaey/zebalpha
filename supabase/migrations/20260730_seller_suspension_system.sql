-- ====================================================================
-- ASALI SWAD - SELLER ACCOUNT CONTROL SYSTEM (SUSPENSION & DELETION)
-- Target Schema: Supabase Database
-- ====================================================================

-- 1. ADD ACCOUNT STATE FIELDS TO SELLERS TABLE
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. CREATE OPTIMIZED STATUS INDEXES
CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_account_status ON public.sellers(account_status);
CREATE INDEX IF NOT EXISTS idx_sellers_is_suspended ON public.sellers(is_suspended);
CREATE INDEX IF NOT EXISTS idx_sellers_is_deleted ON public.sellers(is_deleted);

-- 3. STATUS CHANGE REACTION TRIGGER
-- Automatically disables login sessions (auth.users) and product listings (is_active)
CREATE OR REPLACE FUNCTION public.handle_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if relevant status flags actually changed
    IF (OLD.account_status IS DISTINCT FROM NEW.account_status) 
       OR (OLD.status IS DISTINCT FROM NEW.status)
       OR (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
       OR (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted) THEN
       
        NEW.last_status_change := NOW();
        
        -- If suspended or deleted: hide products and lock login
        IF NEW.account_status = 'Suspended' 
           OR NEW.status = 'suspended' 
           OR NEW.is_suspended = true 
           OR NEW.account_status = 'Deleted' 
           OR NEW.status = 'deleted' 
           OR NEW.is_deleted = true THEN
           
            -- Deactivate product listings
            UPDATE public.products 
            SET is_active = false 
            WHERE seller_id = NEW.id;
            
            -- Invalidate sessions & block login via auth.users.banned_until
            UPDATE auth.users
            SET banned_until = '3000-01-01 00:00:00+00'
            WHERE id = NEW.user_id;
            
        -- If active or approved: restore products and login
        ELSIF NEW.account_status = 'Active' OR NEW.status = 'approved' THEN
            -- Reactivate product listings
            UPDATE public.products 
            SET is_active = true 
            WHERE seller_id = NEW.id;
            
            -- Remove login ban
            UPDATE auth.users
            SET banned_until = NULL
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on sellers table
DROP TRIGGER IF EXISTS trigger_seller_status_change ON public.sellers;
CREATE TRIGGER trigger_seller_status_change
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.handle_seller_status_change();


-- 4. PRODUCT OPERATION CONSTRAINTS TRIGGER
-- Prevents suspended/deleted/pending sellers from creating/updating listings
CREATE OR REPLACE FUNCTION public.check_seller_status_for_product()
RETURNS TRIGGER AS $$
DECLARE
    v_account_status VARCHAR(50);
    v_status VARCHAR(50);
BEGIN
    SELECT account_status, status INTO v_account_status, v_status
    FROM public.sellers
    WHERE id = NEW.seller_id;

    IF v_account_status = 'Suspended' OR v_status = 'suspended' THEN
        RAISE EXCEPTION 'Seller account is suspended. Product operations are disabled.';
    ELSIF v_account_status = 'Deleted' OR v_status = 'deleted' THEN
        RAISE EXCEPTION 'Seller account is deleted. Product operations are disabled.';
    ELSIF v_account_status = 'Pending' OR v_status = 'pending' THEN
        RAISE EXCEPTION 'Seller account is pending approval. Cannot add products.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on products table
DROP TRIGGER IF EXISTS trigger_check_seller_status_for_product ON public.products;
CREATE TRIGGER trigger_check_seller_status_for_product
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_seller_status_for_product();


-- 5. TRANSACTIONAL PERMANENT DELETION RPC FUNCTION
-- Deletes all related records securely inside a single database transaction
CREATE OR REPLACE FUNCTION public.delete_seller_permanently(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user_id of the seller for auth deletion
    SELECT user_id INTO v_user_id FROM public.sellers WHERE id = p_seller_id;
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Deletes cascade/children first
    DELETE FROM public.products WHERE seller_id = p_seller_id;
    DELETE FROM public.inventory WHERE seller_id = p_seller_id;
    DELETE FROM public.seller_pickup_locations WHERE seller_id = p_seller_id;
    DELETE FROM public.seller_support_tickets WHERE seller_id = p_seller_id;
    DELETE FROM public.seller_notifications WHERE seller_id = p_seller_id;
    DELETE FROM public.seller_reports WHERE seller_id = p_seller_id;
    DELETE FROM public.merchant_verification_logs WHERE seller_id = p_seller_id;
    DELETE FROM public.seller_settlements WHERE seller_id = p_seller_id;
    
    -- Delete authentication record directly (cascades to profiles and sellers)
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
