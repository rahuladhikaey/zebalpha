import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";

/**
 * Shiprocket Webhook Receiver
 * Listens for tracking updates and automatically synchronizes
 * Supabase `orders` and `shipments` tables in real time.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const awb = payload.awb || payload.awb_code || payload.tracking_number;
    const orderId = payload.order_id || payload.order_number;
    const currentStatus = String(payload.current_status || payload.status || "").toLowerCase().trim();

    if (!awb && !orderId) {
      return NextResponse.json({ success: false, message: "Missing AWB or order_id" }, { status: 400 });
    }

    // Map Shiprocket courier status to Zebalpha system status
    let mappedStatus = "";
    if (currentStatus.includes("delivered")) {
      mappedStatus = "delivered";
    } else if (currentStatus.includes("out for delivery")) {
      mappedStatus = "out_for_delivery";
    } else if (currentStatus.includes("in transit") || currentStatus.includes("shipped") || currentStatus.includes("picked up")) {
      mappedStatus = "shipped";
    } else if (currentStatus.includes("cancelled") || currentStatus.includes("canceled")) {
      mappedStatus = "cancelled";
    } else if (currentStatus.includes("rto")) {
      mappedStatus = "rto";
    }

    if (mappedStatus) {
      // 1. Update orders table
      let query = supabaseServer.from("orders").update({
        order_status: mappedStatus,
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      });

      if (awb) {
        query = query.or(`tracking_number.eq.${awb},id.eq.${orderId}`);
      } else {
        query = query.or(`id.eq.${orderId},order_number.eq.${orderId}`);
      }

      await query;

      // 2. Update shipments table
      if (awb) {
        await supabaseServer
          .from("shipments")
          .update({
            status: mappedStatus,
            current_status: payload.current_status || mappedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("awb_code", awb);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (err: any) {
    console.error("Shiprocket webhook error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
