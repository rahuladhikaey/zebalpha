import { supabaseServer } from '@/lib/supabaseServer';
import { createShiprocketOrder, getShiprocketToken } from '@/lib/shiprocket';

type OrderItem = {
  id: string; // product id
  quantity: number;
  price: number;
  seller_id: string;
  variant?: any;
};

export async function createMasterOrder(payload: {
  user_id?: string | null;
  customer_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
}) {
  const { user_id, customer_name, phone, address, items, total, payment_method } = payload;
  const traceStart = Date.now();
  const trace: Record<string, number> = {};

  // Stage 1: Cart Validation
  const tCartStart = Date.now();
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Cart empty');
  }
  trace['cart_validation_ms'] = Date.now() - tCartStart;

  // Stage 2: Stock & Price Validation
  const tStockStart = Date.now();
  const productIds = items.map(i => i.id);
  const { data: products } = await supabaseServer.from('products').select('id, price, stock, status, seller_id').in('id', productIds as any);
  const prodMap: Record<string, any> = {};
  (products || []).forEach((p: any) => prodMap[p.id] = p);

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

  // Stage 3: Parent Order Creation
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
    payment_method: isCodOrder ? 'COD' : normPaymentMethod,
    payment_status: isCodOrder ? 'PENDING' : 'COMPLETE',
    order_status: 'placed'
  }]).select().single();

  if (insertErr || !parentOrder) throw new Error('Failed to create parent order: ' + (insertErr?.message || 'unknown'));
  trace['parent_order_creation_ms'] = Date.now() - tParentStart;

  const parentOrderId = parentOrder.id;

  // Stage 4: Seller Orders & Items Creation
  const tSellerStart = Date.now();
  const sellerOrderRecords: any[] = [];
  for (const sellerId of Object.keys(bySeller)) {
    try {
      const sellerItems = bySeller[sellerId];
      const sellerOrderNumber = `SO-${Date.now()}-${Math.floor(1000+Math.random()*9000)}`;

      let sellerTotal = 0;
      for (const si of sellerItems) sellerTotal += Number(si.price) * (si.quantity || 1);

      const { data: sellerOrder } = await supabaseServer.from('seller_orders').insert([{
        seller_id: sellerId,
        parent_order_id: parentOrderId,
        seller_order_number: sellerOrderNumber,
        total_amount: sellerTotal
      }]).select().single();

      if (sellerOrder) {
        for (const si of sellerItems) {
          try {
            await supabaseServer.from('order_items').insert([{
              parent_order_id: parentOrderId,
              seller_order_id: sellerOrder.id,
              product_id: si.id,
              quantity: si.quantity,
              price: si.price,
              discount: 0,
              gst: 0,
              seller_id: sellerId
            }]);
          } catch (oiErr) {
            console.warn("Order item insert notice:", oiErr);
          }
        }
        sellerOrderRecords.push({ sellerOrder });

        // Insert notification for seller
        try {
          await supabaseServer.from('notifications').insert([{
            user_id: sellerId,
            title: 'New Order Received',
            message: `New order ${parentOrder.order_number} - ${sellerItems.length} items`,
            type: 'order'
          }]);
        } catch (nErr) {}
      }
    } catch (soErr) {
      console.warn("Seller order record notice:", soErr);
    }
  }
  trace['seller_orders_creation_ms'] = Date.now() - tSellerStart;

  // Stage 5: Atomic Inventory Reservation
  const tStockReserveStart = Date.now();
  for (const it of items) {
    const reqQty = Number(it.quantity) || 1;
    try {
      // 1. Try atomic PostgreSQL RPC function if installed
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

  // Stage 6: Payment Record & Notification
  const tPaymentStart = Date.now();
  try {
    await supabaseServer.from('payments').insert([{ parent_order_id: parentOrderId, amount: total, method: payment_method, status: payment_method === 'COD' ? 'PENDING' : 'PENDING' }]);
  } catch (pErr) { console.error('Payment insert error', pErr); }
  trace['payment_record_ms'] = Date.now() - tPaymentStart;

  // Stage 7: Admin Notification
  const tNotifyStart = Date.now();
  try {
    const adminRes = await supabaseServer.from('admin_users').select('id').limit(1).single();
    if (adminRes.data) {
      await supabaseServer.from('notifications').insert([{ user_id: adminRes.data.id, title: 'New Order', message: `Order ${parentOrder.order_number} placed`, type: 'admin' }]);
    }
  } catch (aErr) { console.error('Admin notify error', aErr); }
  trace['notifications_ms'] = Date.now() - tNotifyStart;

  const totalDurationMs = Date.now() - traceStart;
  console.log(`[CHECKOUT_TRACE] order_id=${parentOrder.id} order_number=${parentOrder.order_number} total_duration=${totalDurationMs}ms stages=${JSON.stringify(trace)}`);

  return parentOrder;
}
