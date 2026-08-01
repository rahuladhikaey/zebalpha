-- SQL Script to Fix Mutable Search Paths for Database Functions
-- Run this in your Supabase SQL Editor to resolve the 'Function Search Path Mutable' linter warnings.

-- 1. Fix handle_seller_status_change
CREATE OR REPLACE FUNCTION public.handle_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.account_status IS DISTINCT FROM NEW.account_status) 
       OR (OLD.status IS DISTINCT FROM NEW.status)
       OR (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
       OR (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted) THEN
       
        NEW.last_status_change := NOW();
        
        -- Invalidate and block listings + session access
        IF NEW.account_status = 'Suspended' 
           OR NEW.status = 'suspended' 
           OR NEW.is_suspended = true 
           OR NEW.account_status = 'Deleted' 
           OR NEW.status = 'deleted' 
           OR NEW.is_deleted = true THEN
           
            UPDATE public.products SET is_active = false WHERE seller_id = NEW.id;
            
            UPDATE auth.users SET banned_until = '3000-01-01 00:00:00+00' WHERE id = NEW.user_id;
            
        ELSIF NEW.account_status = 'Active' OR NEW.status = 'approved' THEN
            UPDATE public.products SET is_active = true WHERE seller_id = NEW.id;
            
            UPDATE auth.users SET banned_until = NULL WHERE id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. Fix check_seller_status_for_product
CREATE OR REPLACE FUNCTION public.check_seller_status_for_product()
RETURNS TRIGGER AS $$
DECLARE
    v_account_status VARCHAR(50);
    v_status VARCHAR(50);
BEGIN
    IF NEW.seller_id IS NOT NULL THEN
        SELECT account_status, status INTO v_account_status, v_status
        FROM public.sellers
        WHERE id::text = NEW.seller_id::text;
        
        IF v_account_status = 'Suspended' 
           OR v_status = 'suspended' 
           OR v_account_status = 'Deleted' 
           OR v_status = 'deleted' THEN
            RAISE EXCEPTION 'Operation not allowed: Seller account is suspended or deleted.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix delete_seller_permanently

CREATE OR REPLACE FUNCTION public.delete_seller_permanently(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id FROM public.sellers WHERE id::text = p_seller_id::text;
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
    DELETE FROM auth.users WHERE id::text = v_user_id::text;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 4. Fix handle_seller_deleted
CREATE OR REPLACE FUNCTION public.handle_seller_deleted()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
        DELETE FROM auth.users WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
