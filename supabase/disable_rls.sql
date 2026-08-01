-- SQL Script to Disable Row-Level Security (RLS) on All Tables
-- Run this in your Supabase SQL Editor to resolve RLS violations.

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payment_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_verification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_pickup_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reports DISABLE ROW LEVEL SECURITY;

-- Grant broad schema permissions to make sure all clients (anon, authenticated) can execute functions & access tables
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
