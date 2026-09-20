import { supabaseA, supabaseB } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { pushOrderToShiprocket } from '../services/shiprocket.js';

/**
 * Fetch orders for Customer (from Supabase A) or Seller (from Supabase B)
 */
export const getOrders = async (req, res, next) => {
  try {
    const { sellerId, customerId } = req.query;

    if (sellerId) {
      // Query Supabase B for seller-specific orders
      const { data, error } = await supabaseB
        .from('orders')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(HTTP_STATUS.OK).json({ success: true, data });
    }

    // Query Supabase A for customer-specific orders
    let query = supabaseA.from('orders').select('*').order('created_at', { ascending: false });
    if (customerId) {
      query = query.eq('user_id', customerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Transactional Order Placement Sync:
 * 1. Save customer order in Supabase A
 * 2. Map items to seller_id and write seller order to Supabase B
 * 3. Reduce seller inventory in Supabase B
 * 4. Notify seller instantly in Supabase B
 */
export const createOrder = async (req, res, next) => {
  try {
    const orderData = req.body;
    const orderNumber = orderData.order_number || `AS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const items = orderData.items || orderData.product_details || [];

    // Parse address string for pincode/city/state if not explicitly provided
    const addressStr = typeof orderData.address === 'string' ? orderData.address : '';
    let parsedPincode = orderData.pincode;
    if (!parsedPincode && addressStr) {
      const pinMatch = addressStr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || addressStr.match(/\b(\d{6})\b/);
      if (pinMatch) parsedPincode = pinMatch[1];
    }
    let parsedCity = orderData.city;
    if (!parsedCity && addressStr) {
      const cityMatch = addressStr.match(/(?:Vill|Village|City|Town)\s*[:\-]\s*([^,]+)/i);
      if (cityMatch) parsedCity = cityMatch[1].trim();
    }
    let parsedState = orderData.state;
    if (!parsedState && addressStr) {
      const stateMatch = addressStr.match(/(?:P\.O|PO|State)\s*[:\-]\s*([^,]+)/i);
      if (stateMatch) parsedState = stateMatch[1].trim();
    }

    const customerOrderPayload = {
      ...orderData,
      city: parsedCity || orderData.city || null,
      state: parsedState || orderData.state || null,
      pincode: parsedPincode || orderData.pincode || null,
      shipping_address: orderData.shipping_address || {
        name: orderData.customer_name || 'Customer',
        phone: orderData.phone || '',
        address: orderData.address || '',
        city: parsedCity || 'Kolkata',
        state: parsedState || 'West Bengal',
        pincode: parsedPincode || '700001'
      },
      items: items,
      product_details: items,
      order_number: orderNumber,
      created_at: new Date().toISOString()
    };

    // 1. Save Customer Order in Supabase A
    const { data: customerOrder, error: customerErr } = await supabaseA
      .from('orders')
      .insert([customerOrderPayload])
      .select();

    if (customerErr) throw customerErr;
    const placedOrder = customerOrder[0];

    // Automatically Sync/Save Customer Address into user_addresses table
    if (placedOrder.user_id) {
      try {
        const rawAddr = placedOrder.address || placedOrder.shipping_address || {};
        const addrStr = typeof rawAddr === 'string' ? rawAddr : (rawAddr.address || rawAddr.address_line || '');
        const pincodeStr = String(placedOrder.pincode || (typeof rawAddr === 'object' ? rawAddr.pincode : '') || '').replace(/\D/g, '').slice(0, 6);

        const { data: existingAddr } = await supabaseA
          .from('user_addresses')
          .select('id')
          .eq('user_id', placedOrder.user_id)
          .maybeSingle();

        const addrPayload = {
          user_id: placedOrder.user_id,
          user_email: placedOrder.email || null,
          name: placedOrder.customer_name || 'Customer',
          phone: String(placedOrder.phone || '').replace(/\D/g, '').slice(0, 10),
          address_line: addrStr,
          address_line1: placedOrder.city || 'City',
          address_line2: placedOrder.state || 'State',
          city: placedOrder.city || 'Kolkata',
          state: placedOrder.state || 'West Bengal',
          pincode: pincodeStr || '700001',
          landmark: typeof rawAddr === 'object' ? (rawAddr.landmark || rawAddr.addressDetail || '') : '',
          is_default: true,
          updated_at: new Date().toISOString()
        };

        if (existingAddr) {
          await supabaseA.from('user_addresses').update(addrPayload).eq('id', existingAddr.id);
        } else {
          await supabaseA.from('user_addresses').insert([{ ...addrPayload, created_at: new Date().toISOString() }]);
        }
      } catch (addrSyncErr) {
        console.warn('[user_addresses Sync Notice]:', addrSyncErr.message);
      }
    }

    // 2. Identify sellers and process items for Supabase B
    const sellerItemMap = {};

    for (const item of items) {
      const pId = item.product_id || item.id;
      if (!pId) continue;

      // Query product details from Supabase B to get seller_id
      const { data: product } = await supabaseB
        .from('products')
        .select('id, seller_id, stock')
        .eq('id', pId)
        .single();

      const sellerId = item.seller_id || product?.seller_id;
      if (sellerId) {
        if (!sellerItemMap[sellerId]) {
          sellerItemMap[sellerId] = [];
        }
        sellerItemMap[sellerId].push({ item, currentStock: product?.stock || 0 });
      }
    }

    // 3. Sync to Supabase B per seller & update inventory
    let sellerIndex = 0;
    for (const [sellerId, sellerItemsList] of Object.entries(sellerItemMap)) {
      const sellerItems = sellerItemsList.map(i => i.item);
      const sellerSubtotal = sellerItems.reduce((sum, i) => sum + (i.subtotal || (i.price * i.quantity)), 0);

      // Create seller order in Supabase B with a unique order number per seller
      const sellerOrderNumber = `${orderNumber}-S${sellerIndex}`;
      const sellerOrderPayload = {
        order_number: sellerOrderNumber,
        seller_id: sellerId,
        user_id: placedOrder.user_id,
        customer_name: placedOrder.customer_name || 'Customer',
        phone: placedOrder.phone || '',
        address: placedOrder.address || '',
        city: placedOrder.city || parsedCity || null,
        state: placedOrder.state || parsedState || null,
        pincode: placedOrder.pincode || parsedPincode || null,
        shipping_address: placedOrder.shipping_address || customerOrderPayload.shipping_address,
        items: sellerItems,
        product_details: sellerItems,
        total_amount: sellerSubtotal || placedOrder.total_amount,
        payment_method: placedOrder.payment_method || 'COD',
        payment_status: placedOrder.payment_status || 'PENDING',
        order_status: 'placed',
        created_at: new Date().toISOString()
      };

      await supabaseB.from('orders').insert([sellerOrderPayload]);
      sellerIndex++;

      // Reduce stock in Supabase B
      for (const { item, currentStock } of sellerItemsList) {
        const pId = item.product_id || item.id;
        const qty = item.quantity || 1;
        const newStock = Math.max(0, currentStock - qty);

        await supabaseB
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', pId);

        // Record stock history log
        await supabaseB.from('stock_history').insert([{
          seller_id: sellerId,
          product_id: pId,
          previous_stock: currentStock,
          new_stock: newStock,
          change_amount: -qty,
          change_type: 'ORDER_DEDUCTION',
          change_reason: `Stock deducted for Order #${orderNumber}`
        }]);
      }

      // Notify seller instantly in Supabase B
      await supabaseB.from('seller_notifications').insert([{
        seller_id: sellerId,
        message: `📦 New order #${orderNumber} received! Check orders dashboard to process dispatch.`,
        read_status: false
      }]);
    }

    // Instant Auto-Sync to Shiprocket on Checkout
    try {
      pushOrderToShiprocket(placedOrder)
        .then(async (srRes) => {
          console.log(`✓ [Auto-Shiprocket Instant Push] Order #${placedOrder.order_number} synced to Shiprocket. Order ID:`, srRes?.shiprocket_order_id || 'OK');
          if (srRes?.shiprocket_order_id) {
            await supabaseA.from('orders').update({
              shiprocket_order_id: String(srRes.shiprocket_order_id),
              shiprocket_shipment_id: String(srRes.shiprocket_shipment_id || ''),
              updated_at: new Date().toISOString()
            }).eq('id', placedOrder.id);
          }
        })
        .catch((srErr) => {
          console.warn(`[Auto-Shiprocket Push Notice] Order #${placedOrder.order_number} auto-push notice:`, srErr?.message || srErr);
        });
    } catch (e) {
      console.warn('[Auto-Shiprocket Exception Notice]:', e);
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Order created and synchronized across Supabase A & B successfully.',
      data: placedOrder
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update order status (Syncs Supabase A & B)
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Verify order existence and seller ownership
    const { data: existingOrder, error: fetchErr } = await supabaseA
      .from('orders')
      .select('id, seller_id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existingOrder) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Order not found' });
    }

    if (!isSuperAdmin && String(existingOrder.seller_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: You do not have permission to update an order belonging to another merchant'
      });
    }

    const { order_status, payment_status, payment_method, tracking_number, courier_name, shipping_label_url } = req.body;

    const updateFields = { updated_at: new Date().toISOString() };
    if (order_status) updateFields.order_status = order_status;
    // Only SUPER_ADMIN can manually overwrite payment_status or payment_method
    if (isSuperAdmin) {
      if (payment_status) updateFields.payment_status = payment_status;
      if (payment_method) updateFields.payment_method = payment_method;
    }
    if (tracking_number) updateFields.tracking_number = tracking_number;
    if (courier_name) updateFields.courier_name = courier_name;
    if (shipping_label_url) updateFields.shipping_label_url = shipping_label_url;

    // Update in Supabase A
    const { data: updatedA } = await supabaseA
      .from('orders')
      .update(updateFields)
      .eq('id', id)
      .select();

    // Update in Supabase B
    await supabaseB
      .from('orders')
      .update(updateFields)
      .eq('id', id);

    res.status(HTTP_STATUS.OK).json({ success: true, data: updatedA?.[0] || updateFields });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete order
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

    if (isUuid) {
      await supabaseA.from('orders').delete().eq('id', id);
      await supabaseB.from('orders').delete().eq('id', id);
    } else {
      await supabaseA.from('orders').delete().eq('order_number', id);
      await supabaseB.from('orders').delete().eq('order_number', id);
    }

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Order deleted successfully from both databases.' });
  } catch (err) {
    next(err);
  }
};
