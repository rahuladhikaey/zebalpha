import { supabaseServer } from '@/lib/supabaseServer';
import { createShiprocketOrder, getShiprocketToken } from '@/lib/shiprocket';
import { calculateFallbackEDD, aggregateMultiVendorEDD } from '@/lib/eddService';

type OrderItem = {
  id: string; // product id
  quantity: number;
  price: number;
  seller_id: string;
  variant?: any;
};

export type MasterOrderPayload = {
  user_id?: string | null;
  customer_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  discount_amount?: number;
  coupon_code?: string;
  notes?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  verifiedProductsMap?: Map<string, any> | Record<string, any>;
};

export async function createMasterOrder(payload: MasterOrderPayload) {
  const { user_id, customer_name, phone, address, items, total, payment_method, discount_amount, coupon_code, notes } = payload;
  const traceStart = Date.now();
  const trace: Record<string, number> = {};

  // Extract delivery pincode from address string
  let deliveryPincode = "";
  if (address) {
    const pinMatch = address.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || address.match(/\b(\d{6})\b/);
    if (pinMatch) deliveryPincode = pinMatch[1];
  }

  // Stage 1: Cart Validation
  const tCartStart = Date.now();
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Cart empty');
  }
  trace['cart_validation_ms'] = Date.now() - tCartStart;

  // Stage 2: Stock & Price Validation (Reuses verified catalog items if already loaded)
  const tStockStart = Date.now();
  const prodMap: Record<string, any> = {};
  const missingProductIds: string[] = [];

  for (const it of items) {
    let p: any = null;
    const lookupKey = String(it.id).toLowerCase();
    if (payload.verifiedProductsMap instanceof Map) {
      p = payload.verifiedProductsMap.get(lookupKey);
    } else if (payload.verifiedProductsMap && typeof payload.verifiedProductsMap === 'object') {
      p = (payload.verifiedProductsMap as any)[lookupKey] || (payload.verifiedProductsMap as any)[it.id];
    }
    if (p) {
      prodMap[it.id] = p;
    } else {
      missingProductIds.push(it.id);
    }
  }

  if (missingProductIds.length > 0) {
    const { data: fetchedProducts } = await supabaseServer
      .from('products')
      .select('id, name, price, stock, status, seller_id')
      .in('id', missingProductIds as any);
    (fetchedProducts || []).forEach((p: any) => { prodMap[p.id] = p; });
  }

  for (const it of items) {
    const p = prodMap[it.id];
    if (!p) {
      throw new Error(`Product not found in catalog: ${it.id}`);
    }
    const currentStock = Number(p.stock) || 0;
    const requestedQty = Number(it.quantity) || 1;
    if (p.status === "OUT_OF_STOCK" || currentStock < requestedQty) {
      throw new Error(`Product "${p.name || it.id}" is out of stock (available: ${currentStock}, requested: ${requestedQty})`);
    }
    if (p.price && Number(p.price) !== Number(it.price)) {
      console.log(`Product price differs (possibly discount or package): DB=${p.price}, Cart=${it.price}`);
    }
  }
  trace['stock_validation_ms'] = Date.now() - tStockStart;

  // Create parent order
  const orderNumber = `AS${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(1000+Math.random()*9000)}`;

  // Group items by seller (only if seller_id exists)
  const bySeller: Record<string, OrderItem[]> = {};
  for (const it of items) {
    const rawSeller = (prodMap[it.id] && prodMap[it.id].seller_id) || it.seller_id;
    const seller = (rawSeller && rawSeller !== 'null' && rawSeller !== 'undefined') ? rawSeller : null;
    if (seller) {
      if (!bySeller[seller]) bySeller[seller] = [];
      bySeller[seller].push(it);
    }
  }

  const sellerList = Object.keys(bySeller);
  const primarySellerId = sellerList.length === 1 ? sellerList[0] : null;

  const normPaymentMethod = String(payment_method || 'COD').toUpperCase();
  const isCodOrder = normPaymentMethod === 'COD' || normPaymentMethod.includes('CASH');

  // Stage 3: Parent Order Creation with Direct Payment Identifiers
  const tParentStart = Date.now();
  const { data: parentOrder, error: insertErr } = await supabaseServer.from('orders').insert([{
    order_number: orderNumber,
    user_id: user_id || null,
    seller_id: primarySellerId || undefined,
    customer_name,
    phone,
    address,
    items: items,
    product_details: items,
    total_amount: total,
    discount_amount: Number(discount_amount) || 0,
    notes: coupon_code ? `Coupon Applied: ${coupon_code}` : (notes || null),
    payment_method: isCodOrder ? 'COD' : normPaymentMethod,
    payment_status: isCodOrder ? 'PENDING' : 'COMPLETE',
    order_status: 'placed',
    razorpay_order_id: payload.razorpay_order_id || null,
    razorpay_payment_id: payload.razorpay_payment_id || null,
    razorpay_signature: payload.razorpay_signature || null,
  }]).select().single();

  if (insertErr || !parentOrder) throw new Error('Failed to create parent order: ' + (insertErr?.message || 'unknown'));
  trace['parent_order_creation_ms'] = Date.now() - tParentStart;

  const parentOrderId = parentOrder.id;

  // Stage 4: Seller Orders & Items Creation with Batching
  const tSellerStart = Date.now();
  const createdSellerEDDs: any[] = [];

  // Batch query all seller primary pickup locations in one single DB call
  const sellerPickupMap: Record<string, string> = {};
  if (sellerList.length > 0) {
    try {
      const { data: pickupLocs } = await supabaseServer
        .from('seller_pickup_locations')
        .select('seller_id, pin_code, pincode, is_default')
        .in('seller_id', sellerList);
      (pickupLocs || []).forEach((loc: any) => {
        const pin = loc.pin_code || loc.pincode;
        if (loc.seller_id && pin && (loc.is_default || !sellerPickupMap[loc.seller_id])) {
          sellerPickupMap[loc.seller_id] = pin;
        }
      });
    } catch (_) {}
  }

  for (const sellerId of sellerList) {
    try {
      const sellerItems = bySeller[sellerId];
      const sellerOrderNumber = `SO-${Date.now()}-${Math.floor(1000+Math.random()*9000)}`;

      let sellerTotal = 0;
      for (const si of sellerItems) sellerTotal += Number(si.price) * (si.quantity || 1);

      const pickupPin = sellerPickupMap[sellerId] || "700001";
      const sellerEDD = calculateFallbackEDD(pickupPin, deliveryPincode, new Date());
      createdSellerEDDs.push(sellerEDD);

      const { data: sellerOrder } = await supabaseServer.from('seller_orders').insert([{
        seller_id: sellerId,
        parent_order_id: parentOrderId,
        seller_order_number: sellerOrderNumber,
        total_amount: sellerTotal,
        expected_delivery_from: sellerEDD.expected_delivery_from,
        expected_delivery_to: sellerEDD.expected_delivery_to,
        expected_delivery_date: sellerEDD.expected_delivery_date,
        edd_source: sellerEDD.edd_source,
        edd_updated_at: new Date().toISOString()
      }]).select().single();

      if (sellerOrder) {
        // Create corresponding shipment record
        try {
          await supabaseServer.from('shipments').insert([{
            parent_order_id: parentOrderId,
            seller_order_id: sellerOrder.id,
            seller_id: sellerId,
            status: 'MANIFESTED',
            expected_delivery_from: sellerEDD.expected_delivery_from,
            expected_delivery_to: sellerEDD.expected_delivery_to,
            expected_delivery_date: sellerEDD.expected_delivery_date,
            edd_source: sellerEDD.edd_source,
            edd_updated_at: new Date().toISOString()
          }]);
        } catch (_) {}

        // Batch insert all order items for this seller in a single operation
        const itemsToInsert = sellerItems.map((si) => ({
          parent_order_id: parentOrderId,
          seller_order_id: sellerOrder.id,
          product_id: si.id,
          quantity: si.quantity,
          price: si.price,
          discount: 0,
          gst: 0,
          seller_id: sellerId,
        }));

        if (itemsToInsert.length > 0) {
          try {
            await supabaseServer.from('order_items').insert(itemsToInsert);
          } catch (oiErr) {
            console.warn("Order items batch insert notice:", oiErr);
          }
        }
      }
    } catch (soErr) {
      console.warn("Seller order record notice:", soErr);
    }
  }

  // Update parent order with aggregated EDD
  if (createdSellerEDDs.length > 0) {
    try {
      const parentEDD = aggregateMultiVendorEDD(createdSellerEDDs);
      await supabaseServer.from('orders').update({
        expected_delivery_from: parentEDD.expected_delivery_from,
        expected_delivery_to: parentEDD.expected_delivery_to,
        expected_delivery_date: parentEDD.expected_delivery_date,
        edd_source: parentEDD.edd_source,
        edd_updated_at: new Date().toISOString()
      }).eq('id', parentOrderId);
    } catch (parentEddErr) {
      console.warn("Parent order EDD update notice:", parentEddErr);
    }
  }

  trace['seller_orders_creation_ms'] = Date.now() - tSellerStart;

  // Stage 5: Atomic Inventory Reservation (Preserves row-level FOR UPDATE locking RPC and atomic fallback)
  const tStockReserveStart = Date.now();
  for (const it of items) {
    const reqQty = Number(it.quantity) || 1;
    try {
      // 1. Try atomic PostgreSQL RPC function with FOR UPDATE locking
      const { data: rpcRes, error: rpcErr } = await supabaseServer.rpc('decrement_product_stock', {
        p_product_id: it.id,
        p_quantity: reqQty
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        try {
          await supabaseServer.from('stock_history').insert({
            product_id: it.id,
            change_amount: -reqQty,
            reason: `Order Placed - ${parentOrderId}`,
            admin_user: 'System'
          });
        } catch (_) {}
        continue;
      }

      // 2. Fallback: Conditional update guarded against negative stock
      const { data: prod } = await supabaseServer.from('products').select('stock').eq('id', it.id).single();
      if (prod) {
        const currentStock = Number(prod.stock) || 0;
        const newStock = Math.max(0, currentStock - reqQty);
        await supabaseServer
          .from('products')
          .update({
            stock: newStock,
            status: newStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            updated_at: new Date().toISOString()
          })
          .eq('id', it.id)
          .gte('stock', reqQty); // Atomic guard: only updates if stock >= reqQty

        await supabaseServer.from('stock_history').insert({
          product_id: it.id,
          change_amount: -reqQty,
          reason: `Order Placed - ${parentOrderId}`,
          admin_user: 'System'
        });
      }
    } catch (stkErr) {
      console.warn("Stock reservation notice:", stkErr);
    }
  }
  trace['inventory_reservation_ms'] = Date.now() - tStockReserveStart;

  // Stage 6: Durable Payment Record
  const tPaymentStart = Date.now();
  try {
    await supabaseServer.from('payments').insert([{
      parent_order_id: parentOrderId,
      amount: total,
      method: isCodOrder ? 'COD' : normPaymentMethod,
      status: isCodOrder ? 'PENDING' : 'COMPLETE',
      transaction_reference: payload.razorpay_payment_id || null,
    }]);
  } catch (pErr) { console.error('Payment insert error', pErr); }
  trace['payment_record_ms'] = Date.now() - tPaymentStart;

  // Stage 7: Non-blocking Notifications (Does not delay customer response)
  const tNotifyStart = Date.now();
  const notificationPromises: Promise<any>[] = [];

  for (const sellerId of sellerList) {
    notificationPromises.push(
      Promise.resolve(
        supabaseServer.from('notifications').insert([{
          user_id: sellerId,
          title: 'New Order Received',
          message: `New order ${parentOrder.order_number} - ${bySeller[sellerId]?.length || 1} items`,
          type: 'order'
        }])
      ).catch(() => {})
    );
  }

  notificationPromises.push(
    Promise.resolve(
      supabaseServer.from('admin_users').select('id').limit(1).single().then((adminRes) => {
        if (adminRes.data?.id) {
          return supabaseServer.from('notifications').insert([{
            user_id: adminRes.data.id,
            title: 'New Order',
            message: `Order ${parentOrder.order_number} placed`,
            type: 'admin'
          }]);
        }
      })
    ).catch(() => {})
  );

  // Run notifications asynchronously without blocking response
  Promise.allSettled(notificationPromises).catch(() => {});
  trace['notifications_ms'] = Date.now() - tNotifyStart;

  const totalDurationMs = Date.now() - traceStart;
  console.log(`[CHECKOUT_TRACE] order_id=${parentOrder.id} order_number=${parentOrder.order_number} total_duration=${totalDurationMs}ms stages=${JSON.stringify(trace)}`);

  return parentOrder;
}
