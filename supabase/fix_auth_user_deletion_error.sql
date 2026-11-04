-- ==============================================================================
-- ZEBALPHA — FIX "Failed to delete user: Database error deleting user"
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

BEGIN;

-- 1. Fix fn_handle_seller_hard_delete() so it never crashes if auth_id or user_id is missing
CREATE OR REPLACE FUNCTION public.fn_handle_seller_hard_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id TEXT := to_jsonb(OLD)->>'id';
    v_user_id   TEXT := COALESCE(to_jsonb(OLD)->>'user_id', to_jsonb(OLD)->>'auth_id', '');
BEGIN
    -- Remove cart items for seller's products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart') THEN
        DELETE FROM public.cart 
        WHERE product_id::text IN (
            SELECT id::text FROM public.products 
            WHERE seller_id::text = v_seller_id OR (v_user_id <> '' AND seller_id::text = v_user_id)
        );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items') THEN
        DELETE FROM public.cart_items 
        WHERE product_id::text IN (
            SELECT id::text FROM public.products 
            WHERE seller_id::text = v_seller_id OR (v_user_id <> '' AND seller_id::text = v_user_id)
        );
    END IF;

    -- Remove wishlist items for seller's products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist') THEN
        DELETE FROM public.wishlist 
        WHERE product_id::text IN (
            SELECT id::text FROM public.products 
            WHERE seller_id::text = v_seller_id OR (v_user_id <> '' AND seller_id::text = v_user_id)
        );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
        DELETE FROM public.wishlists 
        WHERE product_id::text IN (
            SELECT id::text FROM public.products 
            WHERE seller_id::text = v_seller_id OR (v_user_id <> '' AND seller_id::text = v_user_id)
        );
    END IF;

    -- Clean stock history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_history') THEN
        DELETE FROM public.stock_history 
        WHERE seller_id::text = v_seller_id OR (v_user_id <> '' AND seller_id::text = v_user_id);
    END IF;

    -- Delete all products listed by this seller
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DELETE FROM public.products 
        WHERE seller_id::text = v_seller_id OR (v_user_id <> '' AND seller_id::text = v_user_id);
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Allow nullable columns on tables that use ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
         AND tc.table_schema = rc.constraint_schema
        JOIN information_schema.columns col
          ON col.table_schema = tc.table_schema
         AND col.table_name = tc.table_name
         AND col.column_name = kcu.column_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND rc.delete_rule = 'SET NULL'
          AND col.is_nullable = 'NO'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL;', r.table_schema, r.table_name, r.column_name);
    END LOOP;
END $$;

-- 3. Convert any RESTRICT / NO ACTION foreign keys referencing auth.users, profiles, sellers, products, or orders to CASCADE
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            ns.nspname AS table_schema,
            cl.relname AS table_name,
            con.conname AS constraint_name,
            att.attname AS column_name,
            fns.nspname AS foreign_schema,
            fcl.relname AS foreign_table,
            fatt.attname AS foreign_column
        FROM pg_constraint con
        JOIN pg_class cl ON con.conrelid = cl.oid
        JOIN pg_namespace ns ON cl.relnamespace = ns.oid
        JOIN pg_class fcl ON con.confrelid = fcl.oid
        JOIN pg_namespace fns ON fcl.relnamespace = fns.oid
        JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(con.conkey)
        JOIN pg_attribute fatt ON fatt.attrelid = fcl.oid AND fatt.attnum = ANY(con.confkey)
        WHERE con.contype = 'f'
          AND ns.nspname = 'public'
          AND con.confdeltype IN ('a', 'r') -- 'a' = NO ACTION, 'r' = RESTRICT
          AND (
              (fns.nspname = 'auth' AND fcl.relname = 'users')
              OR (fns.nspname = 'public' AND fcl.relname IN ('profiles', 'sellers', 'products', 'orders', 'seller_orders', 'seller_payout_requests', 'seller_settlements'))
          )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I;', r.table_schema, r.table_name, r.constraint_name);
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON DELETE CASCADE;',
            r.table_schema, r.table_name, r.constraint_name, r.column_name, r.foreign_schema, r.foreign_table, r.foreign_column
        );
    END LOOP;
END $$;

-- 4. Detach storage.objects ownership before deleting auth.users so Supabase Storage never blocks user deletion
CREATE OR REPLACE FUNCTION public.fn_cleanup_before_auth_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Unlink any uploaded files in storage.objects owned by this user
    BEGIN
        UPDATE storage.objects SET owner = NULL, owner_id = NULL WHERE owner = OLD.id OR owner_id = OLD.id::text;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if storage schema/columns differ
        NULL;
    END;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cleanup_before_auth_user_delete ON auth.users;
CREATE TRIGGER trg_cleanup_before_auth_user_delete
BEFORE DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_cleanup_before_auth_user_delete();

COMMIT;

