import { NextResponse } from 'next/server';
import { pushOrderToShiprocket } from '@/lib/shiprocket';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, orderData } = body;

    let targetPayload = orderData;

    if (orderId && (!orderData || !orderData.line_items)) {
      const { data: order, error: dbError } = await supabaseServer
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (dbError || !order) {
        return NextResponse.json({ success: false, error: 'Order not found in database.' }, { status: 404 });
      }

      targetPayload = {
        order_id: order.order_number || order.id,
        order_date: order.created_at,
        pickup_location: body.pickup_location || 'Primary',
        billing_address: order.shipping_address || {
          name: order.customer_name,
          address_line1: order.address,
          phone: order.phone,
        },
        shipping_address: order.shipping_address || {
          name: order.customer_name,
          address_line1: order.address,
          phone: order.phone,
        },
        line_items: Array.isArray(order.items) && order.items.length > 0 ? order.items : order.product_details,
        payment_method: order.payment_method || 'COD',
        sub_total: order.total_amount,
        shipping_charges: order.shipping_charge || 0,
        weight: body.weight || 0.5,
      };
    }

    if (!targetPayload) {
      return NextResponse.json(
        { success: false, error: 'Order details payload or valid orderId is required.' },
        { status: 400 }
      );
    }

    const result = await pushOrderToShiprocket(targetPayload);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to push order to Shiprocket' },
        { status: 400 }
      );
    }

    // Update DB if orderId was provided
    if (orderId || targetPayload.order_id) {
      const orderIdentifier = orderId || targetPayload.order_id;
      const updates = {
        shiprocket_order_id: String(result.shiprocket_order_id),
        shiprocket_shipment_id: String(result.shiprocket_shipment_id),
        shipment_id: String(result.shiprocket_shipment_id),
        tracking_number: result.awb_code || null,
        courier_name: result.courier_name || null,
        order_status: 'ready_to_ship',
        updated_at: new Date().toISOString(),
      };

      await supabaseServer.from('orders').update(updates).or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Order pushed to Shiprocket successfully.',
      data: result,
    });
  } catch (error: any) {
    console.error('[API create-order Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
