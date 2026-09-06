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

  // Basic validations
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Cart empty');
  }

  // Validate products and stock
  const productIds = items.map(i => i.id);
  const { data: products } = await supabaseServer.from('products').select('id, price, stock, status, seller_id').in('id', productIds as any);
  const prodMap: Record<string, any> = {};
  (products || []).forEach((p: any) => prodMap[p.id] = p);

  for (const it of items) {
    const p = prodMap[it.id];
    if (!p) {
      console.warn(`Product not found in live DB: ${it.id}`);
      continue;
    }
    if (p.status === "OUT_OF_STOCK") {
      console.warn(`Product status out of stock: ${it.id}`);
    }
    if (p.price && Number(p.price) !== Number(it.price)) {
      console.log(`Product price differs (possibly discount or package): DB=${p.price}, Cart=${it.price}`);
    }
  }

  // Create parent order
  const orderNumber = `AS${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(1000+Math.random()*9000)}`;

  const { data: parentOrder, error: insertErr } = await supabaseServer.from('orders').insert([{
    order_number: orderNumber,
    user_id: user_id || null,
    customer_name,
    phone,
    address,
    items: items,
    product_details: items,
    total_amount: total,
    payment_method,
    payment_status: payment_method === 'COD' ? 'PENDING' : 'COMPLETE',
    order_status: 'placed'
  }]).select().single();

  if (insertErr || !parentOrder) throw new Error('Failed to create parent order: ' + (insertErr?.message || 'unknown'));

  const parentOrderId = parentOrder.id;

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

  // Create seller orders and order items
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

  // Reserve inventory safely for all items
  for (const it of items) {
    try {
      const { data: prod } = await supabaseServer.from('products').select('stock').eq('id', it.id).single();
      if (prod) {
        const newStock = Math.max(0, ((prod?.stock) || 0) - (it.quantity || 1));
        await supabaseServer.from('products').update({ stock: newStock, status: newStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK' }).eq('id', it.id);
        await supabaseServer.from('stock_history').insert({ product_id: it.id, change_amount: -(it.quantity || 1), reason: `Order Placed - ${parentOrderId}`, admin_user: 'System' });
      }
    } catch (stkErr) {
      console.warn("Stock reservation notice:", stkErr);
    }
  }

  // Create payment record (for COD, mark pending)
  try {
    await supabaseServer.from('payments').insert([{ parent_order_id: parentOrderId, amount: total, method: payment_method, status: payment_method === 'COD' ? 'PENDING' : 'PENDING' }]);
  } catch (pErr) { console.error('Payment insert error', pErr); }

  // Notify admin
  try {
    const adminRes = await supabaseServer.from('admin_users').select('id').limit(1).single();
    if (adminRes.data) {
      await supabaseServer.from('notifications').insert([{ user_id: adminRes.data.id, title: 'New Order', message: `Order ${parentOrder.order_number} placed`, type: 'admin' }]);
    }
  } catch (aErr) { console.error('Admin notify error', aErr); }

  return parentOrder;
}
