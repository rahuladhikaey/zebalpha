import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function mapShadowfaxStatusToGoAlpha(sfxStatus: string): string {
  const s = String(sfxStatus || "").toUpperCase();
  if (s === "DELIVERED") return "DELIVERED";
  if (s === "DISPATCHED" || s === "PICKED_UP" || s === "ARRIVED_AT_DROP") return "OUT_FOR_DELIVERY";
  if (s === "ACCEPTED" || s === "ALLOTTED" || s === "ARRIVED_AT_PICKUP") return "PACKED";
  if (s === "CANCELLED" || s === "CANCELLED_BY_CUSTOMER") return "CANCELLED";
  return "PACKED";
}

async function handleWebhook(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const clientOrderId = String(
      payload.client_order_id || payload.coid || payload.order_number || ""
    ).trim();
    const sfxOrderId = String(payload.sfx_order_id || payload.order_id || payload.id || "").trim();
    const sfxStatus = String(payload.order_status || payload.status || "").trim().toUpperCase();

    if (!clientOrderId && !sfxOrderId) {
      return NextResponse.json({ success: false, error: "Missing order identifier" }, { status: 400 });
    }

    const db = getSupabaseServer().schema("go_alpha");

    // Idempotency lookup by order_number or shadowfax_order_id
    let query = db.from("orders").select("id, order_status, shadowfax_status");
    if (clientOrderId) {
      query = query.eq("order_number", clientOrderId);
    } else {
      query = query.eq("shadowfax_order_id", sfxOrderId);
    }
    const { data: existing } = await query.maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: true, ignored: true, reason: "Order not found" });
    }

    const mappedStatus = mapShadowfaxStatusToGoAlpha(sfxStatus);
    const riderName = payload.rider_name || payload.delivery_boy_name || null;
    const riderPhone = payload.rider_contact || payload.delivery_boy_phone || null;
    const trackingUrl = payload.tracking_url || payload.track_url || null;
    const awb = payload.awb_number || payload.awb || sfxOrderId || null;

    // Idempotent update: avoid re-writing delivered_at if already DELIVERED
    const updatePayload: Record<string, any> = {
      shadowfax_status: sfxStatus || existing.shadowfax_status,
      order_status: existing.order_status === "DELIVERED" ? "DELIVERED" : mappedStatus,
      shadowfax_raw_webhook: payload,
      updated_at: new Date().toISOString(),
    };
    if (sfxOrderId) updatePayload.shadowfax_order_id = sfxOrderId;
    if (awb) updatePayload.shadowfax_awb = awb;
    if (riderName) updatePayload.shadowfax_rider_name = riderName;
    if (riderPhone) updatePayload.shadowfax_rider_phone = riderPhone;
    if (trackingUrl) updatePayload.shadowfax_tracking_url = trackingUrl;
    if (mappedStatus === "DELIVERED" && existing.order_status !== "DELIVERED") {
      updatePayload.delivered_at = new Date().toISOString();
    }

    await db.from("orders").update(updatePayload).eq("id", existing.id);
    if (existing.order_status !== "DELIVERED") {
      await db.from("order_items").update({ item_status: mappedStatus }).eq("order_id", existing.id);
    }

    return NextResponse.json({ success: true, order_id: existing.id, status: mappedStatus });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Webhook error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleWebhook(req);
}

export async function PUT(req: Request) {
  return handleWebhook(req);
}
