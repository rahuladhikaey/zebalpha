-- ==============================================================================
-- ZEBALPHA PHASE 4 — PRODUCTION CONCURRENCY & RELIABILITY HARDENING
-- Purpose: Atomic inventory reservation RPC with row-level locking to
--          completely prevent race conditions, overselling, and negative stock.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id UUID,
  p_quantity INT
) RETURNS JSONB AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- 1. Row-level lock on the product to serialize concurrent checkout attempts
  SELECT stock INTO v_current_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  -- 2. Verify product exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- 3. Verify sufficient stock is available
  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient stock', 
      'available', v_current_stock,
      'requested', p_quantity
    );
  END IF;

  -- 4. Calculate new stock level
  v_new_stock := v_current_stock - p_quantity;

  -- 5. Atomic update
  UPDATE public.products
  SET stock = v_new_stock,
      status = CASE WHEN v_new_stock > 0 THEN 'IN_STOCK' ELSE 'OUT_OF_STOCK' END,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true, 
    'previous_stock', v_current_stock, 
    'new_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
