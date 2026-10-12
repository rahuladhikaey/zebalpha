import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      id,
      order_number,
      return_type = "RETURN", // 'RETURN' | 'EXCHANGE'
      items = [],
      reason,
      sub_reason,
      description = "",
      images = [],
      refund_mode = "ORIGINAL_SOURCE",
      bank_details = null,
      exchange_details = null,
    } = body;

    const targetId = orderId || id || order_number;
    if (!targetId) {
      return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ success: false, message: "Please select a reason for the return / exchange." }, { status: 400 });
    }

    // 1. Fetch order
    let query = supabaseServer.from("orders").select("*");
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(targetId));
    if (isUuid) {
      query = query.eq("id", targetId);
    } else {
      query = query.eq("order_number", targetId);
    }

    const { data: orderData, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !orderData) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    // 2. Authentication & IDOR Protection
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email?.toLowerCase().trim();
    const orderUserMatch = Boolean(
      (user && orderData.user_id && String(orderData.user_id) === String(user.id)) ||
      (userEmail && (
        (orderData.email && orderData.email.toLowerCase().trim() === userEmail) ||
        (orderData.customer_email && orderData.customer_email.toLowerCase().trim() === userEmail)
      ))
    );

    if (!user || !orderUserMatch) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized: You do not have permission to request a return for this order."
      }, { status: 403 });
    }

    // 3. Delivery status verification
    const currentStatus = String(orderData.order_status || "").toLowerCase();
    if (currentStatus !== "delivered") {
      return NextResponse.json({
        success: false,
        message: `Return or exchange can only be requested after the package is delivered. Current status: ${currentStatus.toUpperCase()}`
      }, { status: 400 });
    }

    // 4. Duplicate Return Prevention
    if (orderData.return_status && ["requested", "approved", "in_transit", "picked_up", "completed"].includes(String(orderData.return_status).toLowerCase())) {
      return NextResponse.json({
        success: false,
        message: `A return or exchange request is already active for this order (Status: ${orderData.return_status.toUpperCase()}). Duplicate requests are not permitted.`
      }, { status: 400 });
    }

    const { data: existingReturn } = await supabaseServer
      .from("order_returns")
      .select("id, status")
      .or(`order_id.eq.${orderData.id},order_number.eq.${orderData.order_number}`)
      .not("status", "in", '("REJECTED","CANCELLED")')
      .maybeSingle();

    if (existingReturn) {
      return NextResponse.json({
        success: false,
        message: `A return request is already in progress for this order (Status: ${existingReturn.status}). Duplicate return requests are prohibited.`
      }, { status: 400 });
    }

    // 5. Check return window (7 days standard, generous 10 days)
    const deliveryDate = orderData.delivered_at || orderData.updated_at || orderData.created_at;
    if (deliveryDate) {
      const daysSinceDelivery = (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 10) {
        return NextResponse.json({
          success: false,
          message: "The return window for this order has expired (Standard return window is 7 days from delivery)."
        }, { status: 400 });
      }
    }

    const nowIso = new Date().toISOString();
    const isCod = String(orderData.payment_method || "").toUpperCase() === "COD";
    const finalRefundMode = isCod ? "UPI" : "ORIGINAL_SOURCE";
    const cleanedUpiId = isCod ? String(body.upi_id || bank_details?.upi_id || "").trim() : null;

    if (isCod && !cleanedUpiId && return_type.toUpperCase() !== "EXCHANGE") {
      return NextResponse.json({
        success: false,
        message: "Please enter your valid UPI ID (e.g. yourname@okaxis or 9876543210@paytm) for your COD refund."
      }, { status: 400 });
    }

    const returnItemsList = items.length > 0 ? items : (orderData.items || orderData.product_details || []);
    const calculatedRefundAmount = Array.isArray(returnItemsList)
      ? returnItemsList.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || (Number(it.price || 0) * (Number(it.quantity) || 1))), 0)
      : Number(orderData.total_amount) || 0;

    const returnRecord = {
      order_id: String(orderData.id),
      order_number: String(orderData.order_number || orderData.id),
      user_id: orderData.user_id || user.id,
      user_email: orderData.email || user.email || null,
      seller_id: orderData.seller_id || null,
      return_type: return_type.toUpperCase() === "EXCHANGE" ? "EXCHANGE" : "CUSTOMER_RETURN",
      policy_type: orderData.policy_type || "EASY_RETURN",
      status: "REQUESTED",
      items: returnItemsList,
      reason,
      sub_reason: sub_reason || reason,
      description: description || "",
      images: Array.isArray(images) ? images : [],
      customer_images: Array.isArray(images) ? images : [],
      customer_notes: description || reason,
      refund_mode: finalRefundMode,
      upi_id: cleanedUpiId,
      bank_details: cleanedUpiId ? { upi_id: cleanedUpiId } : null,
      exchange_details: exchange_details || null,
      refund_amount: calculatedRefundAmount > 0 ? calculatedRefundAmount : Number(orderData.total_amount) || 0,
      refund_status: "PENDING",
      idempotency_key: `RETURN_REQ_${orderData.id}`,
      created_at: nowIso,
      updated_at: nowIso
    };

    // Insert into order_returns table with idempotency guard
    let returnId = null;
    try {
      const { data: insertedReturn, error: returnErr } = await supabaseServer
        .from("order_returns")
        .insert([returnRecord])
        .select();

      if (!returnErr && insertedReturn?.[0]) {
        returnId = insertedReturn[0].id;
      } else if (returnErr) {
        console.warn("order_returns insertion notice:", returnErr.message);
      }
    } catch (e: any) {
      console.warn("order_returns insertion notice:", e.message);
    }

    // Update order status in orders table
    const orderUpdates = {
      order_status: "return_requested",
      return_status: "requested",
      return_type: returnRecord.return_type,
      return_reason: reason,
      return_sub_reason: sub_reason || reason,
      return_description: description || "",
      return_images: returnRecord.images,
      return_items: returnRecord.items,
      refund_mode: finalRefundMode,
      upi_id: cleanedUpiId,
      return_bank_details: cleanedUpiId ? { upi_id: cleanedUpiId } : null,
      return_exchange_details: exchange_details,
      return_requested_at: nowIso,
      refund_status: "PENDING",
      refund_amount: returnRecord.refund_amount,
      updated_at: nowIso
    };

    await supabaseServer.from("orders").update(orderUpdates).eq("id", orderData.id);

    // Notify seller
    if (orderData.seller_id) {
      try {
        await supabaseServer.from("seller_notifications").insert([{
          seller_id: orderData.seller_id,
          message: `🔄 New ${returnRecord.return_type} request submitted for Order #${orderData.order_number}! Reason: "${reason}". Review in your Returns Dashboard.`,
          read_status: false
        }]);
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `${returnRecord.return_type === "EXCHANGE" ? "Exchange" : "Return"} request submitted successfully! We will arrange reverse pickup once reviewed.`,
      data: {
        return_id: returnId,
        ...orderUpdates
      }
    });
  } catch (error: any) {
    console.error("Return order route error:", error);
    return NextResponse.json({
      success: false,
      message: error?.message || "Failed to submit return request"
    }, { status: 500 });
  }
}
