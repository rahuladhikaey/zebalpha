import { supabaseA, supabaseB } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { pushOrderToShiprocket, cancelShiprocketOrder } from '../services/shiprocket.js';
import { initiateRazorpayRefund } from '../services/razorpayRefundService.js';
import { cacheService } from '../services/cacheService.js';

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

        // Invalidate public cache for affected product
        cacheService.invalidateProductCache(pId).catch(() => {});
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

/**
 * -------------------------------------------------------------
 * MEESHO / FLIPKART STYLE CANCELLATION & RETURN CONTROLLERS
 * -------------------------------------------------------------
 */

/**
 * Cancel Order (Customer, Seller, or Admin)
 * 1. Checks eligibility: order must not be delivered or already cancelled
 * 2. Restocks product inventory in Supabase
 * 3. Records stock history log
 * 4. Updates order status to 'cancelled' with cancellation reason and notes
 * 5. If prepaid, marks refund_status to 'INITIATED'
 * 6. Cancels live order in Shiprocket if shipment/order was synced
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, comment, cancelled_by } = req.body;

    if (!id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Order ID is required' });
    }

    // Query order from Supabase
    let query = supabaseA.from('orders').select('*');
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('order_number', id);
    }

    const { data: orderData, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !orderData) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Order not found' });
    }

    const currentStatus = String(orderData.order_status || '').toLowerCase();

    // Check cancellation eligibility
    if (currentStatus === 'cancelled') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Order is already cancelled' });
    }
    if (currentStatus === 'delivered') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Order has already been delivered. Please request a Return or Exchange instead of cancellation.'
      });
    }

    const cancelledByRole = String(cancelled_by || (req.user?.role ? req.user.role.toLowerCase() : 'customer')).toLowerCase();
    const isCustomerCancellation = cancelledByRole === 'customer';

    // Strict 2-hour cancellation policy for customer cancellations (Meesho / Flipkart Standard)
    if (isCustomerCancellation && orderData.created_at) {
      const orderCreatedAt = new Date(orderData.created_at).getTime();
      const diffHours = (Date.now() - orderCreatedAt) / (1000 * 60 * 60);

      if (diffHours > 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Orders can only be cancelled within 2 hours of placement. As your order is now being processed for dispatch, cancellation is no longer available. You may request a Return or Exchange after delivery.'
        });
      }
    }

    const nowIso = new Date().toISOString();
    const isPrepaid = String(orderData.payment_method || '').toUpperCase() !== 'COD' && String(orderData.payment_status || '').toUpperCase() === 'PAID';

    const updates = {
      order_status: 'cancelled',
      cancellation_reason: reason || 'Customer requested cancellation',
      cancellation_comment: comment || '',
      cancelled_at: nowIso,
      cancelled_by: cancelled_by || (req.user?.role ? req.user.role.toLowerCase() : 'customer'),
      updated_at: nowIso,
    };

    if (isPrepaid) {
      const paymentId = orderData.payment_id || orderData.razorpay_payment_id;
      updates.refund_status = 'INITIATED';
      updates.refund_mode = 'ORIGINAL_SOURCE';
      updates.refund_amount = orderData.total_amount || 0;
      updates.refund_initiated_at = nowIso;
      updates.refund_notes = `Automated refund initiated for cancellation of Order #${orderData.order_number}`;

      // Automatically trigger Razorpay Refund API if payment_id exists
      if (paymentId) {
        try {
          const rzpResult = await initiateRazorpayRefund({
            paymentId,
            amountInRupees: orderData.total_amount,
            notes: {
              order_id: String(orderData.id),
              order_number: String(orderData.order_number),
              cancellation_reason: reason || 'Customer cancellation'
            }
          });

          if (rzpResult.success) {
            updates.refund_status = 'COMPLETED';
            updates.refund_completed_at = nowIso;
            updates.razorpay_refund_id = rzpResult.refundId;
            updates.refund_transaction_id = rzpResult.refundId;
            updates.refund_notes = `Refund of ₹${orderData.total_amount} processed successfully via Razorpay (Refund ID: ${rzpResult.refundId})`;
          } else {
            updates.refund_notes = `Refund initiated (Manual sync required: ${rzpResult.error || 'Pending settlement'})`;
          }
        } catch (rfErr) {
          console.warn('[Cancel Order Razorpay Refund Warning]:', rfErr.message);
        }
      }
    }

    // Update in Supabase A
    await supabaseA.from('orders').update(updates).eq('id', orderData.id);

    // Update in Supabase B
    await supabaseB.from('orders').update(updates).eq('id', orderData.id);
    if (orderData.order_number) {
      await supabaseB.from('orders').update(updates).ilike('order_number', `${orderData.order_number}%`);
    }

    // 2. Restock product quantities
    let items = orderData.items || orderData.product_details || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (_) { items = []; }
    }
    if (!Array.isArray(items) && items && typeof items === 'object') {
      items = [items];
    }

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const pId = item.product_id || item.id;
        const qty = Number(item.quantity) || 1;
        if (!pId) continue;

        try {
          const { data: currentProduct } = await supabaseB
            .from('products')
            .select('id, stock, seller_id')
            .eq('id', pId)
            .maybeSingle();

          if (currentProduct) {
            const currentStock = Number(currentProduct.stock) || 0;
            const restoredStock = currentStock + qty;

            await supabaseB
              .from('products')
              .update({ stock: restoredStock, updated_at: nowIso })
              .eq('id', pId);

            // Log stock restoration
            try {
              await supabaseB.from('seller_stock_history').insert([{
                seller_id: currentProduct.seller_id || orderData.seller_id,
                product_id: pId,
                previous_stock: currentStock,
                new_stock: restoredStock,
                change_reason: `Restocked ${qty} units due to cancellation of Order #${orderData.order_number}`
              }]);
              // Invalidate cache
              cacheService.invalidateProductCache(pId).catch(() => {});
            } catch (_) {}
          }
        } catch (restockErr) {
          console.warn('[Stock Restock Warning]:', restockErr.message);
        }
      }
    }

    // 3. Cancel with Shiprocket if synced
    try {
      const srOrderId = orderData.shiprocket_order_id || orderData.shiprocket_shipment_id;
      if (srOrderId) {
        cancelShiprocketOrder([srOrderId]).catch(e => console.warn('[Shiprocket Cancellation Notice]:', e.message));
      }
    } catch (_) {}

    // 4. Notify seller
    if (orderData.seller_id) {
      try {
        await supabaseB.from('seller_notifications').insert([{
          seller_id: orderData.seller_id,
          message: `🚫 Order #${orderData.order_number} was cancelled by ${cancelled_by || 'customer'}. Reason: ${reason || 'N/A'}. Inventory has been automatically restocked.`,
          read_status: false
        }]);
      } catch (_) {}
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order cancelled successfully and inventory has been restocked.',
      data: {
        ...orderData,
        ...updates
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit Return or Exchange Request (Customer)
 * 1. Validates delivery status
 * 2. Checks 7-day return window from delivery
 * 3. Records return details, selected items, photos, and refund bank/UPI details
 * 4. Inserts into order_returns table & updates orders table
 * 5. Notifies seller & superadmin
 */
export const requestReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      return_type = 'RETURN', // 'RETURN' or 'EXCHANGE'
      items = [],
      reason,
      sub_reason,
      description,
      images = [],
      refund_mode,
      upi_id,
      bank_details = null,
      exchange_details = null,
    } = req.body;

    if (!id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Order ID is required' });
    }

    if (!reason) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Return reason is required' });
    }

    // Query order from Supabase
    let query = supabaseA.from('orders').select('*');
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('order_number', id);
    }

    const { data: orderData, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !orderData) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Order not found' });
    }

    const currentStatus = String(orderData.order_status || '').toLowerCase();
    if (currentStatus !== 'delivered') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Only delivered orders are eligible for return or exchange. Current status: ' + currentStatus
      });
    }

    // 7-day return window validation
    const deliveryDate = orderData.delivered_at || orderData.updated_at || orderData.created_at;
    if (deliveryDate) {
      const daysSinceDelivery = (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 10) { // Giving generous 10-day window
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'The return window for this order has expired (Standard return window is 7 days from delivery).'
        });
      }
    }

    const nowIso = new Date().toISOString();
    const isCod = String(orderData.payment_method || '').toUpperCase() === 'COD';
    const finalRefundMode = isCod ? 'UPI' : 'ORIGINAL_SOURCE';
    const cleanedUpiId = isCod ? String(upi_id || bank_details?.upi_id || '').trim() : null;

    if (isCod && !cleanedUpiId && return_type.toUpperCase() !== 'EXCHANGE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'A valid UPI ID is required for Cash On Delivery (COD) refunds.'
      });
    }

    const returnItemsList = items.length > 0 ? items : (orderData.items || orderData.product_details || []);
    const calculatedRefundAmount = Array.isArray(returnItemsList)
      ? returnItemsList.reduce((sum, it) => sum + (Number(it.subtotal) || (Number(it.price || 0) * (Number(it.quantity) || 1))), 0)
      : Number(orderData.total_amount) || 0;

    const returnRecord = {
      order_id: String(orderData.id),
      order_number: String(orderData.order_number || orderData.id),
      user_id: orderData.user_id || req.user?.id || null,
      user_email: orderData.email || req.user?.email || null,
      seller_id: orderData.seller_id || null,
      return_type: return_type.toUpperCase() === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN',
      status: 'REQUESTED',
      items: returnItemsList,
      reason,
      sub_reason: sub_reason || reason,
      description: description || '',
      images: Array.isArray(images) ? images : [],
      refund_mode: finalRefundMode,
      upi_id: cleanedUpiId,
      bank_details: cleanedUpiId ? { upi_id: cleanedUpiId } : null,
      exchange_details: exchange_details || null,
      refund_amount: calculatedRefundAmount > 0 ? calculatedRefundAmount : Number(orderData.total_amount) || 0,
      refund_status: 'PENDING',
      created_at: nowIso,
      updated_at: nowIso
    };

    // Insert into order_returns table
    let returnId = null;
    try {
      const { data: insertedReturn, error: returnErr } = await supabaseA
        .from('order_returns')
        .insert([returnRecord])
        .select();

      if (!returnErr && insertedReturn?.[0]) {
        returnId = insertedReturn[0].id;
      }
    } catch (e) {
      console.warn('[order_returns insertion notice]:', e.message);
    }

    // Update order status
    const orderUpdates = {
      order_status: 'return_requested',
      return_status: 'requested',
      return_type: returnRecord.return_type,
      return_reason: reason,
      return_sub_reason: sub_reason || reason,
      return_description: description || '',
      return_images: returnRecord.images,
      return_items: returnRecord.items,
      refund_mode: finalRefundMode,
      upi_id: cleanedUpiId,
      return_bank_details: cleanedUpiId ? { upi_id: cleanedUpiId } : null,
      return_exchange_details: exchange_details,
      return_requested_at: nowIso,
      refund_status: 'PENDING',
      refund_amount: returnRecord.refund_amount,
      updated_at: nowIso
    };

    await supabaseA.from('orders').update(orderUpdates).eq('id', orderData.id);
    await supabaseB.from('orders').update(orderUpdates).eq('id', orderData.id);

    // Notify seller
    if (orderData.seller_id) {
      try {
        await supabaseB.from('seller_notifications').insert([{
          seller_id: orderData.seller_id,
          message: `🔄 New ${returnRecord.return_type} request submitted for Order #${orderData.order_number}! Reason: ${reason}. Please review in Returns tab.`,
          read_status: false
        }]);
      } catch (_) {}
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `${returnRecord.return_type === 'EXCHANGE' ? 'Exchange' : 'Return'} request submitted successfully! Our team and merchant will review and schedule pickup.`,
      data: {
        return_id: returnId,
        ...orderUpdates
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Return Requests (Filtered for Customer, Seller, or Super Admin)
 */
export const getOrderReturns = async (req, res, next) => {
  try {
    const { sellerId, userId, orderId, status } = req.query;

    let query = supabaseA.from('order_returns').select('*').order('created_at', { ascending: false });

    if (orderId) {
      query = query.or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
    }
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Specific Return Details
 */
export const getReturnDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = supabaseA.from('order_returns').select('*');
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (isUuid) {
      query = query.or(`id.eq.${id},order_id.eq.${id}`);
    } else {
      query = query.eq('order_number', id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Return record not found' });
    }

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Return Status (Seller or Super Admin)
 * Handles APPROVE, REJECT, MARK_PICKED_UP, CONFIRM_RECEIVED, REFUND_COMPLETED
 */
export const updateReturnStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status, // 'APPROVED' | 'REJECTED' | 'PICKED_UP' | 'RECEIVED' | 'COMPLETED'
      rejection_reason,
      pickup_awb,
      pickup_courier,
      admin_notes,
      seller_notes,
      refund_transaction_id,
    } = req.body;

    if (!status) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'New status is required' });
    }

    const upperStatus = status.toUpperCase();
    const nowIso = new Date().toISOString();

    // Fetch existing return record
    let returnQuery = supabaseA.from('order_returns').select('*');
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (isUuid) {
      returnQuery = returnQuery.or(`id.eq.${id},order_id.eq.${id}`);
    } else {
      returnQuery = returnQuery.eq('order_number', id);
    }

    const { data: existingReturn } = await returnQuery.maybeSingle();

    const returnUpdates = {
      status: upperStatus,
      updated_at: nowIso,
    };
    if (rejection_reason) returnUpdates.rejection_reason = rejection_reason;
    if (pickup_awb) returnUpdates.pickup_awb = pickup_awb;
    if (pickup_courier) returnUpdates.pickup_courier = pickup_courier;
    if (admin_notes) returnUpdates.admin_notes = admin_notes;
    if (seller_notes) returnUpdates.seller_notes = seller_notes;
    if (refund_transaction_id) {
      returnUpdates.refund_transaction_id = refund_transaction_id;
      returnUpdates.refund_status = 'COMPLETED';
    }

    // Map to order table updates
    const orderUpdates = {
      updated_at: nowIso,
    };

    if (upperStatus === 'APPROVED') {
      orderUpdates.order_status = 'return_approved';
      orderUpdates.return_status = 'approved';
      orderUpdates.return_approved_at = nowIso;
      if (pickup_awb) orderUpdates.return_tracking_number = pickup_awb;
      if (pickup_courier) orderUpdates.return_courier_name = pickup_courier;
    } else if (upperStatus === 'REJECTED') {
      orderUpdates.order_status = 'return_rejected';
      orderUpdates.return_status = 'rejected';
      orderUpdates.return_rejected_at = nowIso;
      orderUpdates.return_rejection_reason = rejection_reason || 'Return request rejected by merchant';
    } else if (upperStatus === 'PICKED_UP') {
      orderUpdates.order_status = 'return_picked_up';
      orderUpdates.return_status = 'picked_up';
      orderUpdates.return_picked_up_at = nowIso;
    } else if (upperStatus === 'RECEIVED' || upperStatus === 'COMPLETED') {
      orderUpdates.order_status = 'returned';
      orderUpdates.return_status = 'completed';
      orderUpdates.return_completed_at = nowIso;
      orderUpdates.refund_status = 'COMPLETED';
      orderUpdates.refund_completed_at = nowIso;
      returnUpdates.refund_status = 'COMPLETED';

      // Check if original order was prepaid
      const targetOrdKey = existingReturn?.order_id || existingReturn?.order_number || id;
      let targetOrder = null;
      try {
        const { data: ord } = await supabaseA
          .from('orders')
          .select('*')
          .or(`id.eq.${targetOrdKey},order_number.eq.${targetOrdKey}`)
          .maybeSingle();
        targetOrder = ord;
      } catch (_) {}

      const isPrepaid = targetOrder && String(targetOrder.payment_method || '').toUpperCase() !== 'COD';
      const paymentId = targetOrder?.payment_id || targetOrder?.razorpay_payment_id;

      if (isPrepaid && paymentId && !targetOrder.razorpay_refund_id) {
        try {
          const rzpRes = await initiateRazorpayRefund({
            paymentId,
            amountInRupees: existingReturn?.refund_amount || targetOrder.total_amount,
            notes: {
              order_id: String(targetOrder.id),
              order_number: String(targetOrder.order_number),
              return_id: String(existingReturn?.id || id),
              reason: existingReturn?.reason || 'Customer Return Completion'
            }
          });
          if (rzpRes.success) {
            orderUpdates.razorpay_refund_id = rzpRes.refundId;
            orderUpdates.refund_transaction_id = rzpRes.refundId;
            orderUpdates.refund_notes = `Refund of ₹${existingReturn?.refund_amount || targetOrder.total_amount} processed via Razorpay (Refund ID: ${rzpRes.refundId})`;
            returnUpdates.razorpay_refund_id = rzpRes.refundId;
            returnUpdates.refund_transaction_id = rzpRes.refundId;
          }
        } catch (rfErr) {
          console.warn('[Return Razorpay Refund Trigger Warning]:', rfErr.message);
        }
      } else if (refund_transaction_id) {
        orderUpdates.refund_transaction_id = refund_transaction_id;
        returnUpdates.refund_transaction_id = refund_transaction_id;
      }

      // Restock inventory upon receiving returned item
      if (existingReturn?.items && Array.isArray(existingReturn.items)) {
        for (const item of existingReturn.items) {
          const pId = item.product_id || item.id;
          const qty = Number(item.quantity) || 1;
          if (!pId) continue;

          try {
            const { data: prod } = await supabaseB.from('products').select('stock').eq('id', pId).maybeSingle();
            if (prod) {
              const newStock = (Number(prod.stock) || 0) + qty;
              await supabaseB.from('products').update({ stock: newStock }).eq('id', pId);
            }
          } catch (_) {}
        }
      }
    }

    // Update in order_returns table if exists
    if (existingReturn?.id) {
      await supabaseA.from('order_returns').update(returnUpdates).eq('id', existingReturn.id);
    }

    // Update in orders table
    const targetOrderId = existingReturn?.order_id || id;
    const isOrderUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetOrderId);

    if (isOrderUuid) {
      await supabaseA.from('orders').update(orderUpdates).eq('id', targetOrderId);
      await supabaseB.from('orders').update(orderUpdates).eq('id', targetOrderId);
    } else {
      await supabaseA.from('orders').update(orderUpdates).eq('order_number', targetOrderId);
      await supabaseB.from('orders').update(orderUpdates).eq('order_number', targetOrderId);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Return status successfully updated to ${upperStatus}`,
      data: { ...returnUpdates, ...orderUpdates }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Process Order Refund Record
 */
export const processOrderRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refund_amount, transaction_id, notes } = req.body;

    const nowIso = new Date().toISOString();
    const refundUpdates = {
      refund_status: 'COMPLETED',
      refund_amount: Number(refund_amount) || 0,
      refund_transaction_id: transaction_id || `REF-${Date.now()}`,
      refund_completed_at: nowIso,
      refund_notes: notes || 'Refund processed successfully',
      updated_at: nowIso
    };

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (isUuid) {
      await supabaseA.from('orders').update(refundUpdates).eq('id', id);
      await supabaseB.from('orders').update(refundUpdates).eq('id', id);
      await supabaseA.from('order_returns').update({ refund_status: 'COMPLETED', refund_transaction_id: refundUpdates.refund_transaction_id }).eq('order_id', id);
    } else {
      await supabaseA.from('orders').update(refundUpdates).eq('order_number', id);
      await supabaseB.from('orders').update(refundUpdates).eq('order_number', id);
      await supabaseA.from('order_returns').update({ refund_status: 'COMPLETED', refund_transaction_id: refundUpdates.refund_transaction_id }).eq('order_number', id);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Refund recorded and processed successfully.',
      data: refundUpdates
    });
  } catch (err) {
    next(err);
  }
};

