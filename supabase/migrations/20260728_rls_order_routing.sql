-- Migration: RLS policies for order routing tables
BEGIN;

-- Enable RLS on new tables
ALTER TABLE IF EXISTS public.seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_settlements ENABLE ROW LEVEL SECURITY;

-- Seller Orders: Sellers see and manage their own orders
CREATE POLICY "Sellers view own seller_orders" ON public.seller_orders FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid));

CREATE POLICY "Sellers update own seller_orders" ON public.seller_orders FOR UPDATE TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid))
  WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage seller_orders" ON public.seller_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Order Items: Sellers can view their items; customers can view items for their orders
CREATE POLICY "Sellers view own order_items" ON public.order_items FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid));

CREATE POLICY "Users view own order_items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = parent_order_id AND o.user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage order_items" ON public.order_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Payments: Customers can view payments for their orders; service role manages
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = parent_order_id AND o.user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage payments" ON public.payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Shipments: Sellers see shipments for their seller_id; customers see shipments for their orders
CREATE POLICY "Sellers view own shipments" ON public.shipments FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid));

CREATE POLICY "Sellers update own shipments" ON public.shipments FOR UPDATE TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid))
  WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid));

CREATE POLICY "Users view own shipments" ON public.shipments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = parent_order_id AND o.user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage shipments" ON public.shipments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Shipment tracking: allow sellers/customers to view linked tracking events
CREATE POLICY "Sellers view own shipment_tracking" ON public.shipment_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid)));

CREATE POLICY "Users view own shipment_tracking" ON public.shipment_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shipments s JOIN public.orders o ON o.id = s.parent_order_id WHERE s.id = shipment_id AND o.user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage shipment_tracking" ON public.shipment_tracking FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Order status history: accessible to seller, customer, admin
CREATE POLICY "Sellers view own order_status_history" ON public.order_status_history FOR SELECT TO authenticated
  USING (seller_order_id IN (SELECT id FROM public.seller_orders WHERE seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid)));

CREATE POLICY "Users view own order_status_history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = parent_order_id AND o.user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage order_status_history" ON public.order_status_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seller settlements: sellers can view their settlements
CREATE POLICY "Sellers view own settlements" ON public.seller_settlements FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()::uuid));

CREATE POLICY "Service role manage seller_settlements" ON public.seller_settlements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
