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
    if (!p) throw new Error(`Product not found: ${it.id}`);
    if (p.status !== 'IN_STOCK' && p.status !== 'AVAILABLE') throw new Error(`Product not available: ${it.id}`);
    if ((p.stock || 0) < it.quantity) throw new Error(`Insufficient stock for product ${it.id}`);
    // Price mismatch
    if (Number(p.price) !== Number(it.price)) throw new Error(`Price changed for product ${it.id}`);
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
    payment_status: payment_method === 'COD' ? 'PENDING' : 'PENDING',
    order_status: 'PENDING'
  }]).select().single();

  if (insertErr || !parentOrder) throw new Error('Failed to create parent order: ' + (insertErr?.message || 'unknown'));

  const parentOrderId = parentOrder.id;

  // Group items by seller
  const bySeller: Record<string, OrderItem[]> = {};
  for (const it of items) {
    const seller = (prodMap[it.id] && prodMap[it.id].seller_id) || it.seller_id;
    if (!bySeller[seller]) bySeller[seller] = [];
    bySeller[seller].push(it);
  }

  // Create seller orders and order items, reserve inventory
  const sellerOrderRecords: any[] = [];
  for (const sellerId of Object.keys(bySeller)) {
    const sellerItems = bySeller[sellerId];
    const sellerOrderNumber = `SO-${Date.now()}-${Math.floor(1000+Math.random()*9000)}`;

    // compute totals
    let sellerTotal = 0;
    for (const si of sellerItems) sellerTotal += Number(si.price) * si.quantity;

    const { data: sellerOrder } = await supabaseServer.from('seller_orders').insert([{
      seller_id: sellerId,
      parent_order_id: parentOrderId,
      seller_order_number: sellerOrderNumber,
      total_amount: sellerTotal
    }]).select().single();

    for (const si of sellerItems) {
      await supabaseServer.from('order_items').insert([{ parent_order_id: parentOrderId, seller_order_id: sellerOrder.id, product_id: si.id, quantity: si.quantity, price: si.price, discount: 0, gst: 0, seller_id: sellerId }]);

      // Reserve inventory
      const { data: prod } = await supabaseServer.from('products').select('stock').eq('id', si.id).single();
      const newStock = Math.max(0, ((prod?.stock) || 0) - si.quantity);
      await supabaseServer.from('products').update({ stock: newStock, status: newStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK' }).eq('id', si.id);
      await supabaseServer.from('stock_history').insert({ product_id: si.id, change_amount: -si.quantity, reason: `Order Placed - ${parentOrderId}`, admin_user: 'System' });
    }

    sellerOrderRecords.push({ sellerOrder });

    // Insert notification for seller
    try {
      await supabaseServer.from('notifications').insert([{ user_id: sellerId, title: 'New Order Received', message: `New order ${parentOrder.order_number} - ${sellerItems.length} items`, type: 'order' }]);
    } catch (nErr) { console.error('Notify seller error', nErr); }

    // Create shipment record (pending) and attempt to create Shiprocket shipment asynchronously
    try {
      const { data: shipment } = await supabaseServer.from('shipments').insert([{ parent_order_id: parentOrderId, seller_order_id: sellerOrder.id, seller_id: sellerId, status: 'PENDING' }]).select().single();

      // attempt to create shiprocket order (best-effort). Use service credentials from env
      try {
        const token = await getShiprocketToken();
        const shipData = {
          order_id: parentOrder.order_number,
          order_date: new Date().toISOString(),
          pickup_location: 'Seller Pickup',
          billing_customer_name: customer_name,
          billing_phone: phone,
          billing_address: address,
          shipping_customer_name: customer_name,
          shipping_phone: phone,
          shipping_address: address,
          order_items: sellerItems.map(si => ({ name: si.id, sku: si.id, units: si.quantity, selling_price: si.price }))
        };

        const shipResp = await createShiprocketOrder(token as any, shipData);
        if (shipResp) {
          await supabaseServer.from('shipments').update({ shiprocket_order_id: shipResp.order_id || shipResp.data?.order_id, shiprocket_shipment_id: shipResp.shipment_id || null, awb_number: shipResp.awb_number || null, courier_name: shipResp.courier_name || null, status: 'CREATED' }).eq('id', shipment.id);
        }
      } catch (srErr) {
        console.error('Shiprocket create error', srErr);
        await supabaseServer.from('shipments').update({ last_error: String(srErr), status: 'FAILED' }).eq('id', shipment.id);
      }
    } catch (sErr) {
      console.error('Shipment record error', sErr);
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
