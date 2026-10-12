import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA, supabaseB } from '../lib/supabase.js';
import {
  checkServiceability,
  pushOrderToShiprocket,
  trackShiprocketShipment,
  parseShiprocketWebhookPayload,
  getShiprocketToken,
} from '../services/shiprocket.js';
import { initiateRazorpayRefund } from '../services/razorpayRefundService.js';

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

      // Idempotency: Prevent duplicate Shiprocket shipment creation if already dispatched
      if (dbOrder.shiprocket_order_id || dbOrder.shiprocket_shipment_id || dbOrder.tracking_number) {
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'Order has already been dispatched to Shiprocket.',
          alreadyPushed: true,
          data: {
            shiprocket_order_id: dbOrder.shiprocket_order_id,
            shiprocket_shipment_id: dbOrder.shiprocket_shipment_id || dbOrder.shipment_id,
            awb_code: dbOrder.tracking_number,
            courier_name: dbOrder.courier_name
          }
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
      is_rto,
      is_reverse_return,
    } = parsed;

    // 1. Idempotency Check: Prevent duplicate event processing via webhook_events
    const eventIdentifier = String(
      payload.event_id ||
      payload.id ||
      `SR_${awb_code || shipment_id || order_id}_${raw_status || mapped_order_status}_${payload.current_timestamp || payload.event_time || payload.scans?.[0]?.date || ''}`
    ).substring(0, 150);

    const { data: existingEvent } = await supabaseA
      .from('webhook_events')
      .select('id, status')
      .eq('provider', 'SHIPROCKET')
      .eq('event_id', eventIdentifier)
      .maybeSingle();

    if (existingEvent && existingEvent.status === 'PROCESSED') {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Duplicate webhook event ignored (already processed).',
        event_id: eventIdentifier,
      });
    }

    // 2. Identify Target Order & Return
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
      // Check if this matches a reverse return in order_returns by pickup_awb
      if (awb_code || shipment_id) {
        let retQuery = supabaseA.from('order_returns').select('*');
        if (awb_code) retQuery = retQuery.eq('pickup_awb', awb_code);
        else retQuery = retQuery.eq('shiprocket_return_shipment_id', shipment_id);
        const { data: reverseRecord } = await retQuery.maybeSingle();

        if (reverseRecord) {
          const nowIso = new Date().toISOString();
          let newRetStatus = 'PICKED_UP';
          if (mapped_order_status === 'return_in_transit') newRetStatus = 'IN_TRANSIT';
          if (mapped_order_status === 'return_delivered') newRetStatus = 'RECEIVED';

          await supabaseA.from('order_returns').update({
            status: newRetStatus,
            updated_at: nowIso,
          }).eq('id', reverseRecord.id);

          await supabaseA.from('orders').update({
            return_status: newRetStatus.toLowerCase(),
            order_status: `return_${newRetStatus.toLowerCase()}`,
            updated_at: nowIso,
          }).or(`id.eq.${reverseRecord.order_id},order_number.eq.${reverseRecord.order_number}`);

          return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: `Reverse return #${reverseRecord.id} updated to ${newRetStatus}`,
            return_status: newRetStatus,
          });
        }
      }

      console.warn(`[Shiprocket Webhook] No order or return matched in database for AWB: ${awb_code}, Shipment: ${shipment_id}, Order: ${order_id}`);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook acknowledged (Order record not found in system).',
      });
    }

    const nowIso = new Date().toISOString();

    // 3. Status Hierarchy & Out-of-Order Regression Protection
    const STATUS_HIERARCHY = {
      'placed': 1,
      'processing': 2,
      'ready_to_ship': 3,
      'shipped': 4,
      'out_for_delivery': 5,
      'delivered': 6,
      'rto_initiated': 6,
      'rto_in_transit': 7,
      'rto_delivered': 8,
      'return_requested': 6,
      'return_approved': 7,
      'return_picked_up': 8,
      'return_in_transit': 9,
      'return_delivered': 10,
      'returned': 11,
      'cancelled': 6,
    };

    const currentRank = STATUS_HIERARCHY[String(order.order_status).toLowerCase()] || 0;
    const newRank = STATUS_HIERARCHY[String(mapped_order_status).toLowerCase()] || 0;

    // Reject regressions from terminal forward state (e.g. delivered -> shipped)
    if (currentRank >= 6 && newRank < 6 && !is_rto && !is_reverse_return) {
      console.warn(`[Shiprocket Webhook] Ignoring backwards transition from '${order.order_status}' to '${mapped_order_status}' for order ${order.order_number}`);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Order is already in terminal/advanced status '${order.order_status}'. Status update skipped.`,
        order_id: order.id,
        current_status: order.order_status,
      });
    }

    // 4. ROUTE CASE A: REVERSE RETURN WORKFLOW
    if (is_reverse_return) {
      let retQuery = supabaseA.from('order_returns').select('*');
      if (awb_code) retQuery = retQuery.or(`pickup_awb.eq.${awb_code},order_id.eq.${order.id}`);
      else retQuery = retQuery.eq('order_id', order.id);
      const { data: activeReturn } = await retQuery.maybeSingle();

      let newReturnStatus = 'PICKED_UP';
      if (mapped_order_status === 'return_in_transit') newReturnStatus = 'IN_TRANSIT';
      if (mapped_order_status === 'return_delivered') newReturnStatus = 'RECEIVED';

      if (activeReturn) {
        await supabaseA.from('order_returns').update({
          status: newReturnStatus,
          pickup_awb: awb_code || activeReturn.pickup_awb,
          updated_at: nowIso,
        }).eq('id', activeReturn.id);
      }

      await supabaseA.from('orders').update({
        return_status: newReturnStatus.toLowerCase(),
        order_status: mapped_order_status,
        updated_at: nowIso,
      }).eq('id', order.id);
      await supabaseB.from('orders').update({
        return_status: newReturnStatus.toLowerCase(),
        order_status: mapped_order_status,
        updated_at: nowIso,
      }).eq('id', order.id);
    }
    // 5. ROUTE CASE B: RTO (RETURN TO ORIGIN) WORKFLOW
    else if (is_rto) {
      const orderUpdate = {
        order_status: mapped_order_status,
        rto_awb: awb_code || order.rto_awb || order.tracking_number,
        rto_reason: payload.rto_reason || payload.reason || raw_status,
        updated_at: nowIso,
      };

      if (mapped_order_status === 'rto_initiated') {
        orderUpdate.rto_initiated_at = order.rto_initiated_at || nowIso;
      } else if (mapped_order_status === 'rto_delivered') {
        orderUpdate.rto_delivered_at = order.rto_delivered_at || nowIso;

        // Atomic restocking upon confirmed physical receipt at merchant hub
        if (!order.is_restocked) {
          const itemsToRestock = order.items || order.product_details || [];
          if (Array.isArray(itemsToRestock)) {
            for (const item of itemsToRestock) {
              const pId = item.product_id || item.id;
              const qty = Number(item.quantity || item.units || 1);
              if (pId) {
                try {
                  await supabaseB.rpc('atomic_restock_order_item', {
                    p_product_id: pId,
                    p_quantity: qty,
                    p_seller_id: order.seller_id || null,
                    p_order_number: String(order.order_number || order.id),
                    p_reason: 'RTO_DELIVERED_RESTOCK',
                  });
                } catch (rstErr) {
                  console.warn(`[RTO Restock Warning] Product ${pId}:`, rstErr.message);
                }
              }
            }
          }
          orderUpdate.is_restocked = true;
          orderUpdate.restocked_at = nowIso;
        }

        // Refund policy:
        // Prepaid: Refund customer through Razorpay
        // COD: Uncollected COD receives NO refund
        const isPrepaid = String(order.payment_method || '').toUpperCase() !== 'COD';
        const isPaid = String(order.payment_status || '').toUpperCase() === 'PAID';

        if (isPrepaid && (isPaid || order.payment_id) && !order.razorpay_refund_id) {
          try {
            const rzpRes = await initiateRazorpayRefund({
              paymentId: order.payment_id || order.razorpay_payment_id,
              amountInRupees: order.total_amount,
              notes: {
                order_id: String(order.id),
                order_number: String(order.order_number),
                reason: 'Customer RTO delivery - auto refund',
              },
              idempotencyKey: `rto_refund_${order.id}`,
            });
            if (rzpRes.success) {
              orderUpdate.refund_status = 'COMPLETED';
              orderUpdate.refund_completed_at = nowIso;
              orderUpdate.razorpay_refund_id = rzpRes.refundId;
              orderUpdate.refund_transaction_id = rzpRes.refundId;
            }
          } catch (rfErr) {
            console.warn('[RTO Razorpay Refund Error]:', rfErr.message);
          }
        } else if (!isPrepaid) {
          orderUpdate.refund_status = 'NOT_APPLICABLE';
        }

        // Debit Seller RTO shipping charge into seller_financial_ledger
        if (order.seller_id) {
          try {
            await supabaseA.rpc('record_rto_charge_event', {
              p_order_id: order.id,
              p_seller_id: order.seller_id,
              p_shipment_id: shipment_id || awb_code || 'RTO_SHIPMENT',
              p_amount_minor: 6000, // Standard ₹60 RTO charge
              p_reason: 'Courier Return-to-Origin (RTO) confirmed delivery fee',
            });
          } catch (ledgerErr) {
            console.warn('[RTO Ledger Debit Warning]:', ledgerErr.message);
          }
        }
      }

      await supabaseA.from('orders').update(orderUpdate).eq('id', order.id);
      await supabaseB.from('orders').update(orderUpdate).eq('id', order.id);
    }
    // 6. ROUTE CASE C: FORWARD SHIPMENT WORKFLOW
    else {
      const orderUpdate = {
        order_status: mapped_order_status,
        updated_at: nowIso,
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
      if (mapped_order_status === 'delivered') {
        orderUpdate.delivered_at = nowIso;
        if (String(order.payment_method || '').toUpperCase() === 'COD') {
          orderUpdate.payment_status = 'PAID';
        }
      }

      await supabaseA.from('orders').update(orderUpdate).eq('id', order.id);
      await supabaseB.from('orders').update(orderUpdate).eq('id', order.id);

      const shipmentUpdate = {
        status: mapped_order_status,
        updated_at: nowIso,
      };
      if (mapped_order_status === 'delivered') {
        shipmentUpdate.delivered_at = nowIso;
      }
      await supabaseA.from('shipments').update(shipmentUpdate).eq('parent_order_id', order.id);
    }

    // 7. Audit Logging in shipment_tracking & shipping_events
    try {
      await supabaseA.from('shipment_tracking').insert([{
        event_time: nowIso,
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
        event_timestamp: nowIso,
      }]);
    } catch (_) {}

    // 8. Persist Webhook Event in webhook_events for Idempotency
    try {
      await supabaseA.from('webhook_events').upsert([{
        provider: 'SHIPROCKET',
        event_id: eventIdentifier,
        event_type: raw_status || mapped_order_status,
        entity_id: String(order.id),
        awb_code: awb_code || null,
        order_id: order.id,
        payload: payload,
        status: 'PROCESSED',
        created_at: nowIso,
      }], { onConflict: 'event_id' });
    } catch (whErr) {
      console.warn('[webhook_events Upsert Warning]:', whErr.message);
    }

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
