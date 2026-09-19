import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA, supabaseB } from '../lib/supabase.js';
import {
  checkServiceability,
  pushOrderToShiprocket,
  trackShiprocketShipment,
  parseShiprocketWebhookPayload,
  getShiprocketToken,
} from '../services/shiprocket.js';

/**
 * 1. Serviceability & Rate Check Handler
 * Route: GET /api/shipping/check-serviceability or POST /api/shipping/check-serviceability
 * Takes: pickup_postcode, delivery_postcode, weight, cod
 */
export const checkServiceabilityHandler = async (req, res, next) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body;

    const pickup_postcode = params.pickup_postcode || params.pickup_pincode || params.origin_pincode;
    const delivery_postcode = params.delivery_postcode || params.delivery_pincode || params.destination_pincode;
    const weight = params.weight || params.weight_kg || 0.5;
    const cod = params.cod !== undefined ? params.cod : (params.is_cod || params.payment_mode === 'COD' ? 1 : 0);

    if (!pickup_postcode || !delivery_postcode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Both pickup_postcode and delivery_postcode are required.',
      });
    }

    const result = await checkServiceability({
      pickup_postcode,
      delivery_postcode,
      weight,
      cod,
      length: params.length || 15,
      width: params.width || 15,
      height: params.height || 10,
    });

    if (!result.success && !result.serviceable) {
      return res.status(HTTP_STATUS.OK).json({
        success: false,
        serviceable: false,
        message: result.message || 'Location is not serviceable for delivery.',
        couriers: [],
      });
    }

    return res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Order Push Handler
 * Route: POST /api/shipping/create-order or POST /api/shipping/push-order
 * Pushes order to Shiprocket POST /v1/external/orders/create/adhoc
 */
export const pushOrderHandler = async (req, res, next) => {
  try {
    const { orderId, orderData } = req.body;

    let targetOrderData = orderData;

    // If orderId is provided, fetch order details from database first
    if (orderId && (!orderData || !orderData.order_items)) {
      const { data: dbOrder, error: dbErr } = await supabaseA
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (dbErr || !dbOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: `Order with ID ${orderId} not found in database.`,
        });
      }

      // Map database order fields to Shiprocket payload structure
      targetOrderData = {
        order_id: dbOrder.order_number || dbOrder.id,
        order_date: dbOrder.created_at,
        pickup_location: req.body.pickup_location || 'Primary',
        billing_address: dbOrder.shipping_address || {
          name: dbOrder.customer_name,
          address_line1: dbOrder.address,
          phone: dbOrder.phone,
        },
        shipping_address: dbOrder.shipping_address || {
          name: dbOrder.customer_name,
          address_line1: dbOrder.address,
          phone: dbOrder.phone,
        },
        line_items: Array.isArray(dbOrder.items) && dbOrder.items.length > 0 ? dbOrder.items : dbOrder.product_details,
        payment_method: dbOrder.payment_method || 'COD',
        sub_total: dbOrder.total_amount,
        shipping_charges: dbOrder.shipping_charge || 0,
        weight: req.body.weight || 0.5,
      };
    }

    if (!targetOrderData) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Order details payload (orderData) or valid orderId is required.',
      });
    }

    const shiprocketResult = await pushOrderToShiprocket(targetOrderData);

    if (!shiprocketResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: shiprocketResult.error || 'Failed to push order to Shiprocket.',
        details: shiprocketResult.raw_error,
      });
    }

    // Update database records if orderId exists
    if (orderId || targetOrderData.order_id) {
      const orderIdentifier = orderId || targetOrderData.order_id;
      const updates = {
        shiprocket_order_id: shiprocketResult.shiprocket_order_id,
        shiprocket_shipment_id: shiprocketResult.shiprocket_shipment_id,
        shipment_id: shiprocketResult.shiprocket_shipment_id,
        tracking_number: shiprocketResult.awb_code || null,
        courier_name: shiprocketResult.courier_name || null,
        order_status: 'ready_to_ship',
        updated_at: new Date().toISOString(),
      };

      await supabaseA.from('orders').update(updates).or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`);
      await supabaseB.from('orders').update(updates).or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`);

      // Save record in shipments table
      try {
        await supabaseA.from('shipments').insert([{
          parent_order_id: orderId || null,
          shiprocket_order_id: String(shiprocketResult.shiprocket_order_id),
          shiprocket_shipment_id: String(shiprocketResult.shiprocket_shipment_id),
          awb_number: shiprocketResult.awb_code || null,
          courier_name: shiprocketResult.courier_name || null,
          status: 'ready_to_ship',
          created_at: new Date().toISOString(),
        }]);
      } catch (_) {}
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order pushed to Shiprocket successfully.',
      data: shiprocketResult,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Real-Time Tracking & Webhooks Handler
 * Route: POST /api/webhooks/shiprocket or POST /api/shipping/webhook
 * Handles Shiprocket status updates (Dispatched, In Transit, Delivered, RTO, etc.)
 */
export const webhookHandler = async (req, res, next) => {
  try {
    const payload = req.body;
    console.log('[Shiprocket Webhook Event Received]:', JSON.stringify(payload));

    const parsed = parseShiprocketWebhookPayload(payload);
    if (!parsed.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid webhook payload: ${parsed.reason}`,
      });
    }

    const {
      awb_code,
      shipment_id,
      order_id,
      mapped_order_status,
      payment_status_update,
      raw_status,
      courier_name,
      location,
    } = parsed;

    // Search for order in Supabase by shipment_id, tracking_number (AWB), shiprocket_order_id, or order_number
    let query = supabaseA.from('orders').select('*');
    if (shipment_id) {
      query = query.or(`shipment_id.eq.${shipment_id},shiprocket_shipment_id.eq.${shipment_id}`);
    } else if (awb_code) {
      query = query.eq('tracking_number', awb_code);
    } else if (order_id) {
      query = query.or(`shiprocket_order_id.eq.${order_id},order_number.eq.${order_id},id.eq.${order_id}`);
    } else {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook received but missing identifiers (shipment_id / awb / order_id).',
      });
    }

    const { data: order, error: findErr } = await query.maybeSingle();

    if (findErr || !order) {
      console.warn(`[Shiprocket Webhook] No order matched in database for AWB: ${awb_code}, Shipment: ${shipment_id}, Order: ${order_id}`);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook acknowledged (Order record not found in system).',
      });
    }

    // Build update object for order
    const orderUpdate = {
      order_status: mapped_order_status,
      updated_at: new Date().toISOString(),
    };

    if (payment_status_update) {
      orderUpdate.payment_status = payment_status_update;
    }
    if (courier_name) {
      orderUpdate.courier_name = courier_name;
    }
    if (awb_code) {
      orderUpdate.tracking_number = awb_code;
    }

    // Update main order status in Supabase A & B
    await supabaseA.from('orders').update(orderUpdate).eq('id', order.id);
    await supabaseB.from('orders').update(orderUpdate).eq('id', order.id);

    // Update shipments table
    const shipmentUpdate = {
      status: mapped_order_status,
      updated_at: new Date().toISOString(),
    };
    if (mapped_order_status === 'delivered') {
      shipmentUpdate.delivered_at = new Date().toISOString();
    }
    await supabaseA.from('shipments').update(shipmentUpdate).eq('parent_order_id', order.id);

    // Insert tracking audit log into shipment_tracking / shipping_events
    try {
      await supabaseA.from('shipment_tracking').insert([{
        event_time: new Date().toISOString(),
        location: location || 'Transit Hub',
        status: raw_status || mapped_order_status,
        raw: payload,
      }]);
    } catch (_) {}

    try {
      await supabaseA.from('shipping_events').insert([{
        order_id: order.id,
        awb_code: awb_code || order.tracking_number,
        status: mapped_order_status,
        location: location || 'Hub',
        activity: `Shiprocket Update: ${raw_status || mapped_order_status}`,
        actor_role: 'shiprocket_webhook',
        raw_payload: payload,
        event_timestamp: new Date().toISOString(),
      }]);
    } catch (_) {}

    console.log(`✓ [Shiprocket Webhook Handled] Order #${order.order_number || order.id} updated to status: ${mapped_order_status}`);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order status updated successfully from Shiprocket webhook.',
      order_id: order.id,
      status: mapped_order_status,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Real-time Tracking Handler
 * Route: GET /api/shipping/track/:orderId
 */
export const trackShipmentHandler = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const { data: order, error: findErr } = await supabaseA
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (findErr || !order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Order not found.',
      });
    }

    const shipmentId = order.shiprocket_shipment_id || order.shipment_id || order.tracking_number;
    if (!shipmentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Order has not been assigned a Shiprocket shipment or AWB code yet.',
      });
    }

    const liveTracking = await trackShiprocketShipment(shipmentId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      courier_name: order.courier_name,
      tracking_number: order.tracking_number,
      order_status: order.order_status,
      live_tracking: liveTracking.tracking_data || null,
    });
  } catch (err) {
    next(err);
  }
};
