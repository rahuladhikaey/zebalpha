import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import { initiateRazorpayRefund } from "@/shared/utils/razorpayRefund";
import crypto from "crypto";

/**
 * Shiprocket Webhook Receiver
 * Listens for tracking updates and synchronizes Supabase orders, shipments,
 * order_returns, inventory restock, and seller settlements in real time.
 */
export async function POST(req: Request) {
  try {
    // 1. TIMING-SAFE CRYPTOGRAPHIC WEBHOOK AUTHENTICATION (FINDING-06)
    const webhookSecret = (process.env.SHIPROCKET_WEBHOOK_SECRET || "").trim();
    if (webhookSecret) {
      const rawToken = req.headers.get("x-shiprocket-token") || req.headers.get("x-api-key") || req.headers.get("authorization") || "";
      const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7).trim() : rawToken.trim();
      const expBuf = Buffer.from(webhookSecret);
      const provBuf = Buffer.from(token);
      if (expBuf.length !== provBuf.length || !crypto.timingSafeEqual(expBuf, provBuf)) {
        console.warn("[Shiprocket Webhook] Rejected unauthorized webhook with invalid secret token.");
        return NextResponse.json({ success: false, message: "Unauthorized: Invalid or missing webhook token." }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: false, message: "Server misconfiguration: SHIPROCKET_WEBHOOK_SECRET is required." }, { status: 500 });
    }

    const payload = await req.json();
    console.log("[Shiprocket Webhook Seller Receiver]:", JSON.stringify(payload));

    const awb = payload.awb || payload.awb_code || payload.tracking_number;
    const orderId = payload.order_id || payload.order_number;
    const shipmentId = payload.shipment_id;
    const currentStatus = String(payload.current_status || payload.status || "").trim();
    const statusUpper = currentStatus.toUpperCase();
    const statusCode = Number(payload.current_status_id || payload.status_code || 0);

    if (!awb && !orderId && !shipmentId) {
      return NextResponse.json({ success: false, message: "Missing AWB, order_id, or shipment_id" }, { status: 400 });
    }

    // 1. Map Shiprocket courier status to Zebalpha system status
    let mappedStatus = "";
    let isRto = false;
    let isReverseReturn = false;

    if (
      statusUpper.includes("RTO DELIVERED") ||
      statusUpper.includes("RTO-DELIVERED") ||
      statusCode === 14
    ) {
      mappedStatus = "rto_delivered";
      isRto = true;
    } else if (
      statusUpper.includes("RTO IN TRANSIT") ||
      statusUpper.includes("RTO IN-TRANSIT") ||
      statusUpper.includes("RTO OFD") ||
      statusCode === 38 ||
      statusCode === 39
    ) {
      mappedStatus = "rto_in_transit";
      isRto = true;
    } else if (
      statusUpper.includes("RTO INITIATED") ||
      statusUpper.includes("RTO-INITIATED") ||
      statusUpper.includes("RTO REQUESTED") ||
      statusUpper.includes("RTO") ||
      statusCode === 12
    ) {
      mappedStatus = "rto_initiated";
      isRto = true;
    } else if (statusUpper.includes("RETURN PICKED UP") || statusUpper.includes("REVERSE PICKED UP")) {
      mappedStatus = "return_picked_up";
      isReverseReturn = true;
    } else if (statusUpper.includes("RETURN IN TRANSIT") || statusUpper.includes("REVERSE IN TRANSIT")) {
      mappedStatus = "return_in_transit";
      isReverseReturn = true;
    } else if (statusUpper.includes("RETURN DELIVERED") || statusUpper.includes("REVERSE DELIVERED")) {
      mappedStatus = "return_delivered";
      isReverseReturn = true;
    } else if (statusCode === 7 || statusUpper.includes("DELIVERED")) {
      mappedStatus = "delivered";
    } else if (statusCode === 17 || statusUpper.includes("OUT FOR DELIVERY")) {
      mappedStatus = "out_for_delivery";
    } else if (
      statusCode === 13 ||
      statusCode === 18 ||
      statusUpper.includes("IN TRANSIT") ||
      statusUpper.includes("SHIPPED") ||
      statusUpper.includes("PICKED UP")
    ) {
      mappedStatus = "shipped";
    } else if (statusCode === 6 || statusUpper.includes("MANIFEST") || statusUpper.includes("PICKUP SCHEDULED")) {
      mappedStatus = "ready_to_ship";
    } else if (statusCode === 10 || statusUpper.includes("CANCELLED") || statusUpper.includes("CANCELED")) {
      mappedStatus = "cancelled";
    }

    if (!mappedStatus) {
      return NextResponse.json({ success: true, message: `Ignored unmapped raw status: ${currentStatus}` });
    }

    // 2. Idempotency Check: Prevent duplicate webhook execution
    const eventIdentifier = String(
      payload.event_id ||
      payload.id ||
      `SR_${awb || shipmentId || orderId}_${mappedStatus}_${payload.current_timestamp || payload.event_time || payload.scans?.[0]?.date || ""}`
    ).substring(0, 150);

    const { data: existingEvent } = await supabaseServer
      .from("webhook_events")
      .select("id, status")
      .eq("provider", "SHIPROCKET")
      .eq("event_id", eventIdentifier)
      .maybeSingle();

    if (existingEvent && existingEvent.status === "PROCESSED") {
      return NextResponse.json({
        success: true,
        message: "Duplicate webhook event ignored (already processed).",
        event_id: eventIdentifier,
      });
    }

    // 3. Locate Target Order
    let query = supabaseServer.from("orders").select("*");
    if (shipmentId) {
      query = query.or(`shipment_id.eq.${shipmentId},shiprocket_shipment_id.eq.${shipmentId}`);
    } else if (awb) {
      query = query.eq("tracking_number", awb);
    } else if (orderId) {
      query = query.or(`shiprocket_order_id.eq.${orderId},order_number.eq.${orderId},id.eq.${orderId}`);
    }

    const { data: order, error: findErr } = await query.maybeSingle();

    if (findErr || !order) {
      // Check if this matches a reverse return in order_returns by pickup_awb
      if (awb || shipmentId) {
        let retQuery = supabaseServer.from("order_returns").select("*");
        if (awb) retQuery = retQuery.eq("pickup_awb", awb);
        else retQuery = retQuery.eq("shiprocket_return_shipment_id", shipmentId);
        const { data: reverseRecord } = await retQuery.maybeSingle();

        if (reverseRecord) {
          const nowIso = new Date().toISOString();
          let newRetStatus = "PICKED_UP";
          if (mappedStatus === "return_in_transit") newRetStatus = "IN_TRANSIT";
          if (mappedStatus === "return_delivered") newRetStatus = "RECEIVED";

          await supabaseServer.from("order_returns").update({
            status: newRetStatus,
            updated_at: nowIso,
          }).eq("id", reverseRecord.id);

          await supabaseServer.from("orders").update({
            return_status: newRetStatus.toLowerCase(),
            order_status: `return_${newRetStatus.toLowerCase()}`,
            updated_at: nowIso,
          }).or(`id.eq.${reverseRecord.order_id},order_number.eq.${reverseRecord.order_number}`);

          return NextResponse.json({
            success: true,
            message: `Reverse return #${reverseRecord.id} updated to ${newRetStatus}`,
            return_status: newRetStatus,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Webhook acknowledged (Order record not found in system).",
      });
    }

    const nowIso = new Date().toISOString();

    // 4. Status Hierarchy Check to prevent out-of-order regressions
    const STATUS_HIERARCHY: Record<string, number> = {
      placed: 1,
      processing: 2,
      ready_to_ship: 3,
      shipped: 4,
      out_for_delivery: 5,
      delivered: 6,
      rto_initiated: 6,
      rto_in_transit: 7,
      rto_delivered: 8,
      return_requested: 6,
      return_approved: 7,
      return_picked_up: 8,
      return_in_transit: 9,
      return_delivered: 10,
      returned: 11,
      cancelled: 6,
    };

    const currentRank = STATUS_HIERARCHY[String(order.order_status).toLowerCase()] || 0;
    const newRank = STATUS_HIERARCHY[String(mappedStatus).toLowerCase()] || 0;

    if (currentRank >= 6 && newRank < 6 && !isRto && !isReverseReturn) {
      return NextResponse.json({
        success: true,
        message: `Order is already in terminal/advanced status '${order.order_status}'. Status update skipped.`,
        order_id: order.id,
      });
    }

    // 5. ROUTE CASE A: REVERSE RETURN
    if (isReverseReturn) {
      let retQuery = supabaseServer.from("order_returns").select("*");
      if (awb) retQuery = retQuery.or(`pickup_awb.eq.${awb},order_id.eq.${order.id}`);
      else retQuery = retQuery.eq("order_id", order.id);
      const { data: activeReturn } = await retQuery.maybeSingle();

      let newReturnStatus = "PICKED_UP";
      if (mappedStatus === "return_in_transit") newReturnStatus = "IN_TRANSIT";
      if (mappedStatus === "return_delivered") newReturnStatus = "RECEIVED";

      if (activeReturn) {
        await supabaseServer.from("order_returns").update({
          status: newReturnStatus,
          pickup_awb: awb || activeReturn.pickup_awb,
          updated_at: nowIso,
        }).eq("id", activeReturn.id);
      }

      await supabaseServer.from("orders").update({
        return_status: newReturnStatus.toLowerCase(),
        order_status: mappedStatus,
        updated_at: nowIso,
      }).eq("id", order.id);
    }
    // 6. ROUTE CASE B: RTO (RETURN TO ORIGIN)
    else if (isRto) {
      const orderUpdate: Record<string, any> = {
        order_status: mappedStatus,
        rto_awb: awb || order.rto_awb || order.tracking_number,
        rto_reason: payload.rto_reason || payload.reason || currentStatus,
        updated_at: nowIso,
      };

      if (mappedStatus === "rto_initiated") {
        orderUpdate.rto_initiated_at = order.rto_initiated_at || nowIso;
      } else if (mappedStatus === "rto_delivered") {
        orderUpdate.rto_delivered_at = order.rto_delivered_at || nowIso;

        // Atomic Restocking guarded by is_restocked
        if (!order.is_restocked) {
          const itemsToRestock = order.items || order.product_details || [];
          if (Array.isArray(itemsToRestock)) {
            for (const item of itemsToRestock) {
              const pId = item.product_id || item.id;
              const qty = Number(item.quantity || item.units || 1);
              if (pId) {
                try {
                  await supabaseServer.rpc("atomic_restock_order_item", {
                    p_product_id: pId,
                    p_quantity: qty,
                    p_seller_id: order.seller_id || null,
                    p_order_number: String(order.order_number || order.id),
                    p_reason: "RTO_DELIVERED_RESTOCK",
                  });
                } catch (rstErr: any) {
                  console.warn(`[RTO Restock Warning] Product ${pId}:`, rstErr?.message);
                }
              }
            }
          }
          orderUpdate.is_restocked = true;
          orderUpdate.restocked_at = nowIso;
        }

        // Authoritative order state validation for automatic financial refund:
        // 1. Must be prepaid
        // 2. Must have verified payment ID
        // 3. Must not already be refunded
        // 4. Order must have actually been in shipped/transit/rto status (cannot refund pending/confirmed orders via webhook!)
        const isPrepaid = String(order.payment_method || "").toUpperCase() !== "COD";
        const isPaid = String(order.payment_status || "").toUpperCase() === "PAID";
        const validPriorStates = ["shipped", "out_for_delivery", "rto_initiated", "rto_in_transit", "rto"];
        const hasValidShippingHistory = validPriorStates.includes(String(order.status || "").toLowerCase()) ||
          validPriorStates.includes(String(order.order_status || "").toLowerCase());

        if (isPrepaid && (isPaid || order.payment_id) && !order.razorpay_refund_id && hasValidShippingHistory && Number(order.total_amount) > 0) {
          try {
            const rzpRes = await initiateRazorpayRefund({
              paymentId: order.payment_id || order.razorpay_payment_id,
              amountInRupees: order.total_amount,
              notes: {
                order_id: String(order.id),
                order_number: String(order.order_number),
                reason: "Customer RTO delivery - auto refund",
              },
              idempotencyKey: `rto_refund_${order.id}`,
            });
            if (rzpRes.success) {
              orderUpdate.refund_status = "COMPLETED";
              orderUpdate.refund_completed_at = nowIso;
              orderUpdate.razorpay_refund_id = rzpRes.refundId;
              orderUpdate.refund_transaction_id = rzpRes.refundId;
            }
          } catch (rfErr: any) {
            console.warn("[RTO Razorpay Refund Error]:", rfErr?.message);
          }
        } else if (!isPrepaid) {
          orderUpdate.refund_status = "NOT_APPLICABLE";
        }

        // Debit Seller RTO shipping charge
        if (order.seller_id) {
          try {
            await supabaseServer.rpc("record_rto_charge_event", {
              p_order_id: order.id,
              p_seller_id: order.seller_id,
              p_shipment_id: shipmentId || awb || "RTO_SHIPMENT",
              p_amount_minor: 6000,
              p_reason: "Courier Return-to-Origin (RTO) confirmed delivery fee",
            });
          } catch (ledgerErr: any) {
            console.warn("[RTO Ledger Debit Warning]:", ledgerErr?.message);
          }
        }
      }

      await supabaseServer.from("orders").update(orderUpdate).eq("id", order.id);
    }
    // 7. ROUTE CASE C: FORWARD SHIPMENT
    else {
      const orderUpdate: Record<string, any> = {
        order_status: mappedStatus,
        status: mappedStatus,
        updated_at: nowIso,
      };

      if (awb) orderUpdate.tracking_number = awb;
      if (mappedStatus === "delivered") {
        orderUpdate.delivered_at = nowIso;
        if (String(order.payment_method || "").toUpperCase() === "COD") {
          orderUpdate.payment_status = "PAID";
        }
      }

      await supabaseServer.from("orders").update(orderUpdate).eq("id", order.id);

      if (awb) {
        await supabaseServer
          .from("shipments")
          .update({
            status: mappedStatus,
            current_status: currentStatus || mappedStatus,
            updated_at: nowIso,
          })
          .eq("awb_code", awb);
      }
    }

    // 8. Persist event into webhook_events for Idempotency
    try {
      await supabaseServer.from("webhook_events").upsert([{
        provider: "SHIPROCKET",
        event_id: eventIdentifier,
        event_type: currentStatus || mappedStatus,
        entity_id: String(order.id),
        awb_code: awb || null,
        order_id: order.id,
        payload: payload,
        status: "PROCESSED",
        created_at: nowIso,
      }], { onConflict: "event_id" });
    } catch (whErr: any) {
      console.warn("[webhook_events Upsert Warning]:", whErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      status: mappedStatus,
      order_id: order.id,
    });
  } catch (err: any) {
    console.error("Shiprocket webhook error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
