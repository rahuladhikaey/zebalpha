-- ==============================================================================
-- ZEBALPHA PHASE 5 — RPC SECURITY HARDENING & LEAST-PRIVILEGE MIGRATION
-- File: supabase/phase5_rpc_security_and_indexes.sql
-- 
-- Status: MANUAL EXECUTION REQUIRED (In Supabase SQL Editor)
-- 
-- Audit Finding:
-- PostgreSQL by default grants EXECUTE to PUBLIC on newly created functions.
-- Verification confirmed:
--   - service_role_can_execute: true
--   - anon_can_execute: true (SECURITY RISK: Client-side anon key could execute RPC)
-- 
-- Production Model:
--   - service_role: EXECUTE (Used by backend/orderRouter via service role key)
--   - anon: NO EXECUTE (Blocked from public REST API)
--   - authenticated: NO EXECUTE (Blocked from direct client invocation)
-- ==============================================================================

-- 1. Lock search_path to prevent search_path hijacking
ALTER FUNCTION public.decrement_product_stock(uuid, integer) 
  SET search_path = public, pg_temp;

-- 2. Revoke execute privileges from public, anonymous, and standard authenticated roles
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) 
  FROM PUBLIC, anon, authenticated;

-- 3. Grant execute privileges strictly to service_role
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) 
  TO service_role;

-- ==============================================================================
-- VERIFICATION QUERY (Execute in Supabase SQL Editor to confirm)
-- ==============================================================================
SELECT 
  has_function_privilege('service_role', 'public.decrement_product_stock(uuid,integer)', 'EXECUTE') AS service_role_can_execute,
  has_function_privilege('anon', 'public.decrement_product_stock(uuid,integer)', 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', 'public.decrement_product_stock(uuid,integer)', 'EXECUTE') AS authenticated_can_execute;

-- Expected result:
-- service_role_can_execute = true
-- anon_can_execute = false
-- authenticated_can_execute = false

-- ==============================================================================
-- ROLLBACK STATEMENTS (Only if needed to reverse)
-- ==============================================================================
-- GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO PUBLIC;
