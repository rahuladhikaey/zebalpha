import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('[Shiprocket Next.js Webhook Received]:', JSON.stringify(payload));

    const {
      awb,
      shipment_id,
      order_id,
      current_status,
      status_code,
      courier_name,
      location,
    } = payload || {};

    if (!shipment_id && !awb && !order_id) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: missing identifiers' },
        { status: 400 }
      );
    }

    const code = Number(status_code);
    const statusStr = String(current_status || '').toUpperCase();

    let mappedOrderStatus = 'processing';
    let paymentStatusUpdate = null;

    if (code === 7 || statusStr.includes('DELIVERED')) {
      mappedOrderStatus = 'delivered';
      paymentStatusUpdate = 'PAID';
    } else if (code === 17 || statusStr.includes('OUT FOR DELIVERY')) {
      mappedOrderStatus = 'out_for_delivery';
    } else if (code === 13 || code === 18 || statusStr.includes('TRANSIT') || statusStr.includes('DISPATCHED')) {
      mappedOrderStatus = 'shipped';
    } else if (code === 6 || statusStr.includes('MANIFEST') || statusStr.includes('PICKUP SCHEDULED')) {
      mappedOrderStatus = 'ready_to_ship';
    } else if (code === 9 || code === 14 || code === 21 || statusStr.includes('RTO')) {
      mappedOrderStatus = 'rto';
    } else if (code === 10 || statusStr.includes('CANCELED') || statusStr.includes('CANCELLED')) {
      mappedOrderStatus = 'cancelled';
    }

    // Find order in DB
    let query = supabaseServer.from('orders').select('*');
    if (shipment_id) {
      query = query.or(`shipment_id.eq.${shipment_id},shiprocket_shipment_id.eq.${shipment_id}`);
    } else if (awb) {
      query = query.eq('tracking_number', awb);
    } else if (order_id) {
      query = query.or(`shiprocket_order_id.eq.${order_id},order_number.eq.${order_id},id.eq.${order_id}`);
    }

    const { data: order } = await query.maybeSingle();

    if (!order) {
      console.warn(`[Shiprocket Webhook] No matching order found for shipment_id: ${shipment_id}, awb: ${awb}`);
      return NextResponse.json(
        { success: true, message: 'Webhook acknowledged (Order not found)' },
        { status: 200 }
      );
    }

    // Define logistics status hierarchy to prevent out-of-order webhook regressions
    const STATUS_HIERARCHY: Record<string, number> = {
      placed: 1,
      processing: 2,
      ready_to_ship: 3,
      shipped: 4,
      out_for_delivery: 5,
      delivered: 6,
      rto: 6,
      cancelled: 6,
    };

    const currentRank = STATUS_HIERARCHY[String(order.order_status).toLowerCase()] || 0;
    const newRank = STATUS_HIERARCHY[String(mappedOrderStatus).toLowerCase()] || 0;

    // Reject regressions from terminal or higher state (e.g. delivered -> shipped)
    if (currentRank >= 6 && newRank < 6) {
      console.warn(`[Shiprocket Webhook] Ignoring backwards transition from '${order.order_status}' to '${mappedOrderStatus}' for order ${order.order_number}`);
      return NextResponse.json({
        success: true,
        message: `Order is already in terminal/advanced status '${order.order_status}'. Status update skipped.`,
        order_id: order.id,
        current_status: order.order_status,
      });
    }

    const updates: any = {
      order_status: mappedOrderStatus,
      updated_at: new Date().toISOString(),
    };

    if (paymentStatusUpdate) {
      updates.payment_status = paymentStatusUpdate;
    }
    if (courier_name) {
      updates.courier_name = courier_name;
    }
    if (awb) {
      updates.tracking_number = awb;
    }

    // Extract ETD/EDD from webhook payload if present
    const rawEtd = payload?.edd || payload?.etd || payload?.estimated_delivery_date;
    if (rawEtd) {
      const parsedEtd = new Date(rawEtd);
      if (!isNaN(parsedEtd.getTime())) {
        updates.expected_delivery_date = parsedEtd.toISOString();
        updates.expected_delivery_to = parsedEtd.toISOString();
        updates.edd_source = 'SHIPROCKET';
        updates.edd_updated_at = new Date().toISOString();
      }
    }

    if (mappedOrderStatus === 'delivered') {
      updates.actual_delivery_date = new Date().toISOString();
    }

    if (statusStr.includes('DELAY') || statusStr.includes('DELAYED')) {
      updates.is_delayed = true;
      updates.delayed_reason = current_status || 'Delayed in transit';
    }

    await supabaseServer.from('orders').update(updates).eq('id', order.id);

    // Update seller_orders table
    try {
      const sellerUpdates: any = {
        shipping_status: mappedOrderStatus,
        updated_at: new Date().toISOString(),
      };
      if (updates.expected_delivery_date) {
        sellerUpdates.expected_delivery_date = updates.expected_delivery_date;
        sellerUpdates.expected_delivery_to = updates.expected_delivery_to;
        sellerUpdates.edd_source = 'SHIPROCKET';
        sellerUpdates.edd_updated_at = updates.edd_updated_at;
      }
      if (updates.actual_delivery_date) {
        sellerUpdates.actual_delivery_date = updates.actual_delivery_date;
      }
      if (updates.is_delayed) {
        sellerUpdates.is_delayed = true;
        sellerUpdates.delayed_reason = updates.delayed_reason;
      }

      await supabaseServer.from('seller_orders').update(sellerUpdates).eq('parent_order_id', order.id);
    } catch (_) {}

    // Update shipments table if available
    try {
      const shpUpdates: any = {
        status: mappedOrderStatus,
        delivered_at: mappedOrderStatus === 'delivered' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (updates.expected_delivery_date) {
        shpUpdates.expected_delivery_date = updates.expected_delivery_date;
        shpUpdates.expected_delivery_to = updates.expected_delivery_to;
        shpUpdates.edd_source = 'SHIPROCKET';
        shpUpdates.edd_updated_at = updates.edd_updated_at;
      }
      if (updates.actual_delivery_date) {
        shpUpdates.actual_delivery_date = updates.actual_delivery_date;
      }
      if (updates.is_delayed) {
        shpUpdates.is_delayed = true;
        shpUpdates.delayed_reason = updates.delayed_reason;
      }

      await supabaseServer.from('shipments').update(shpUpdates).eq('parent_order_id', order.id);
    } catch (_) {}

    // Record tracking event
    try {
      await supabaseServer.from('shipment_tracking').insert([{
        event_time: new Date().toISOString(),
        location: location || 'Transit Hub',
        status: current_status || mappedOrderStatus,
        raw: payload,
      }]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully from Shiprocket webhook.',
      order_id: order.id,
      status: mappedOrderStatus,
    });
  } catch (error: any) {
    console.error('[Shiprocket Webhook Handler Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
