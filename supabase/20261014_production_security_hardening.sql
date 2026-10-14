-- ==============================================================================
-- ZEBALPHA — ENTERPRISE PRODUCTION DATABASE SECURITY HARDENING MIGRATION
-- Migration Date: 2026-10-14
-- Scope: RPC Privileges, Least-Privilege Enforcement, Search Path Security, RLS Lock
-- ==============================================================================

-- 1. HARDEN RPC: delete_seller_permanently
-- Mitigates: Critical Unauthorized Account/Inventory Deletion via PostgREST RPC
CREATE OR REPLACE FUNCTION public.delete_seller_permanently(p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_jwt_role TEXT;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Check caller permissions: Must be service_role OR verified super_admin in public.users
    v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
    
    IF v_jwt_role != 'service_role' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND (role = 'super_admin' OR role = 'admin')
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Access Denied: Only super_admin or service_role can permanently delete a seller.';
        END IF;
    END IF;

    SELECT user_id INTO v_user_id FROM public.sellers WHERE id = p_seller_id;
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    DELETE FROM public.products WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.inventory WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_pickup_locations WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_support_tickets WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_notifications WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_reports WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.merchant_verification_logs WHERE seller_id::text = p_seller_id::text;
    DELETE FROM public.seller_settlements WHERE seller_id::text = p_seller_id::text;
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN TRUE;
END;
$$;

-- Restrict execution of delete_seller_permanently to service_role only
REVOKE ALL ON FUNCTION public.delete_seller_permanently(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_seller_permanently(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.delete_seller_permanently(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_seller_permanently(UUID) TO service_role;


-- 2. HARDEN RPC: atomic_restock_order_item
-- Mitigates: Stock Manipulation / Fraudulent Restocking via Unauthorized RPC Call
CREATE OR REPLACE FUNCTION public.atomic_restock_order_item(
    p_product_id TEXT,
    p_quantity INT,
    p_seller_id TEXT,
    p_order_number TEXT,
    p_reason TEXT DEFAULT 'Customer Return Restock'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock INT;
    v_new_stock INT;
    v_prod_seller_id TEXT;
    v_jwt_role TEXT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
    END IF;

    -- Lock and get product stock atomically
    SELECT stock, seller_id::text INTO v_current_stock, v_prod_seller_id
    FROM public.products
    WHERE id::text = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found');
    END IF;

    -- Verify authorization: service_role, admin, or the specific seller who owns the product
    v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
    IF v_jwt_role = 'service_role' THEN
        v_is_authorized := TRUE;
    ELSE
        -- Check if user is admin
        SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND (role = 'super_admin' OR role = 'admin')
        ) INTO v_is_authorized;

        -- If not admin, check if user is the product owner
        IF NOT v_is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM public.sellers
                WHERE user_id = auth.uid()
                AND id::text = v_prod_seller_id
            ) INTO v_is_authorized;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller does not own product or lack privileges');
    END IF;

    v_new_stock := COALESCE(v_current_stock, 0) + p_quantity;

    -- Update product stock
    UPDATE public.products
    SET stock = v_new_stock,
        updated_at = NOW()
    WHERE id::text = p_product_id;

    -- Log stock change audit trail if seller_stock_history exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seller_stock_history') THEN
        INSERT INTO public.seller_stock_history (
            seller_id,
            product_id,
            previous_stock,
            new_stock,
            change_reason,
            created_at
        ) VALUES (
            COALESCE(p_seller_id, v_prod_seller_id),
            p_product_id,
            v_current_stock,
            v_new_stock,
            COALESCE(p_reason, 'Restocked +' || p_quantity || ' units from Order #' || p_order_number),
            NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'quantity_added', p_quantity
    );
END;
$$;

-- Revoke execution from public/anon to avoid unauthenticated inventory tampering
REVOKE ALL ON FUNCTION public.atomic_restock_order_item(TEXT, INT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_restock_order_item(TEXT, INT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.atomic_restock_order_item(TEXT, INT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_restock_order_item(TEXT, INT, TEXT, TEXT, TEXT) TO authenticated;


-- 3. FIX MUTABLE SEARCH PATHS ON TRIGGER & SETTLEMENT FUNCTIONS
-- Mitigates: Search Path Hijacking / Privilege Escalation in SECURITY DEFINER Triggers

CREATE OR REPLACE FUNCTION public.fn_handle_seller_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.fn_handle_seller_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove cart items for seller's products (if cart table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart') THEN
        DELETE FROM public.cart 
        WHERE product_id IN (
            SELECT id FROM public.products 
            WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text
        );
    END IF;

    -- Clean stock history (if stock_history table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_history') THEN
        DELETE FROM public.stock_history 
        WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text;
    END IF;

    -- Delete all products listed by this seller
    DELETE FROM public.products 
    WHERE seller_id = OLD.id::text OR seller_id = OLD.auth_id::text;

    RETURN OLD;
END;
$$;


-- 4. VERIFY & ENFORCE RLS ON CRITICAL TABLES
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payout_queue ENABLE ROW LEVEL SECURITY;

-- Ensure webhook_events and payout_queue are service_role only
DROP POLICY IF EXISTS "Deny public access on webhook_events" ON public.webhook_events;
CREATE POLICY "Deny public access on webhook_events" ON public.webhook_events
    FOR ALL TO public
    USING (false);

DROP POLICY IF EXISTS "Service role manages webhook_events" ON public.webhook_events;
CREATE POLICY "Service role manages webhook_events" ON public.webhook_events
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Deny public access on payout_queue" ON public.payout_queue;
CREATE POLICY "Deny public access on payout_queue" ON public.payout_queue
    FOR ALL TO public
    USING (false);

DROP POLICY IF EXISTS "Service role manages payout_queue" ON public.payout_queue;
CREATE POLICY "Service role manages payout_queue" ON public.payout_queue
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
