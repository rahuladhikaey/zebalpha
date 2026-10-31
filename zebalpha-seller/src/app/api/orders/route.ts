import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { generateDeliveryLedgerEntries, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) {}

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

// Valid order status transitions according to state machine
const VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ["confirmed", "processing", "cancelled"],
  new: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "packed", "cancelled"],
  processing: ["packed", "ready_for_pickup", "cancelled"],
  packed: ["ready_for_pickup", "shipped", "cancelled"],
  ready_for_pickup: ["shipped", "picked_up", "cancelled"],
  ready_to_ship: ["shipped", "picked_up", "cancelled"],
  picked_up: ["in_transit", "shipped"],
  shipped: ["in_transit", "out_for_delivery", "delivered", "rto_initiated"],
  in_transit: ["out_for_delivery", "delivered", "rto_initiated"],
  out_for_delivery: ["delivered", "rto_initiated"],
  delivered: ["return_requested"],
  rto_initiated: ["rto_in_transit"],
  rto_in_transit: ["rto_delivered"],
  rto_delivered: ["rto_received"],
};

// GET /api/orders
// Returns orders for the authenticated seller only
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access: Please log in." }, { status: 401 });
    }

    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";
    const sellerId = seller?.id || user.id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabaseServer.from("orders").select("*");

    if (!isAdmin) {
      // Strictly isolate to the seller's own orders
      query = query.or(`seller_id.eq.${sellerId},seller_id.eq.${user.id}`);
    }

    if (status && status !== "all") {
      query = query.eq("order_status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data: orders, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/orders
// Handles order status state transitions, cancellations, and delivery ledger recording
export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized access: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const {
      orderId,
      status, // target status: 'confirmed' | 'processing' | 'packed' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'cancelled'
      cancellation_reason,
      cancelled_by = "seller",
      tracking_number,
      courier_name,
    } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, message: "orderId and status are required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // 1. Fetch current order
    let query = supabaseServer.from("orders").select("*");
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(orderId));
    if (isUuid) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("order_number", orderId);
    }

    const { data: order, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // 2. Authorize caller against order ownership
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";
    const sellerId = seller?.id || user.id;

    if (!isAdmin) {
      if (order.seller_id && order.seller_id !== sellerId && order.seller_id !== user.id) {
        return NextResponse.json({
          success: false,
          message: "Forbidden: You are not authorized to modify an order belonging to another merchant."
        }, { status: 403 });
      }

      if (seller?.status && ['suspended', 'banned', 'frozen', 'blocked'].includes(seller.status.toLowerCase())) {
        return NextResponse.json({
          success: false,
          message: "Forbidden: Suspended or inactive accounts cannot modify orders."
        }, { status: 403 });
      }
    }

    const currentStatus = String(order.order_status || "placed").toLowerCase();
    const targetStatus = String(status).toLowerCase();

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!isAdmin && !allowed.includes(targetStatus) && targetStatus !== currentStatus) {
      return NextResponse.json({
        success: false,
        message: `Invalid state transition: Cannot change status from "${currentStatus}" to "${targetStatus}".`
      }, { status: 400 });
    }

    const updates: Record<string, any> = {
      order_status: targetStatus,
      updated_at: nowIso,
    };

    if (tracking_number) updates.tracking_number = tracking_number;
    if (courier_name) updates.courier_name = courier_name;

    // Handle cancellation
    if (targetStatus === "cancelled") {
      updates.cancellation_reason = cancellation_reason || "Cancelled by seller";
      updates.cancelled_by = cancelled_by;
      updates.cancelled_at = nowIso;

      // Restock items if they were packed or allocated
      let items = order.items || order.product_details || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items) && items && typeof items === "object") items = [items];

      if (Array.isArray(items)) {
        for (const item of items) {
          const pId = item.product_id || item.id;
          const qty = Number(item.quantity) || 1;
          if (pId) {
            try {
              const { data: p } = await supabaseServer.from("products").select("stock").eq("id", pId).maybeSingle();
              if (p) {
                const newStock = (Number(p.stock) || 0) + qty;
                await supabaseServer.from("products").update({ stock: newStock }).eq("id", pId);
              }
            } catch (_) {}
          }
        }
      }

      // Authoritative Cancellation RPC: void pending payable or create reversal
      try {
        await supabaseServer.rpc('record_order_cancellation_event', {
          p_order_id: order.id,
          p_cancelled_by: cancelled_by || 'seller',
          p_reason: cancellation_reason || 'Cancelled by seller'
        });
      } catch (cancelErr: any) {
        console.warn('Cancellation ledger RPC warning:', cancelErr?.message);
      }
    }

    // Handle delivery
    if (targetStatus === "delivered" && currentStatus !== "delivered") {
      updates.delivered_at = nowIso;
      updates.shipment_status = "DELIVERED";

      // Calculate settlement due date (7-day standard return window)
      const settlementDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      updates.settlement_due_date = settlementDueDate;
      updates.settlement_status = "PENDING_SETTLEMENT";

      // Parse order items
      let items = order.items || order.product_details || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items) && items && typeof items === "object") items = [items];

      if (order.seller_id && Array.isArray(items) && items.length > 0) {
        try {
          let activeRules = DEFAULT_FINANCIAL_RULES;
          try {
            const { data: storeSettingsList } = await supabaseServer
              .from("store_settings")
              .select("key, value")
              .in("key", ["marketplace_financial_rules", "marketplace_rules"]);
            if (storeSettingsList && storeSettingsList.length > 0) {
              const settingsMap: Record<string, any> = {};
              storeSettingsList.forEach((row: any) => { if (row.key) settingsMap[row.key] = row.value; });
              const finRules = settingsMap.marketplace_financial_rules || {};
              const mktRules = settingsMap.marketplace_rules || {};
              const getVal = (v1: any, v2: any, fallback: number) => {
                if (v1 !== undefined && v1 !== null && v1 !== "" && !isNaN(Number(v1))) return Number(v1);
                if (v2 !== undefined && v2 !== null && v2 !== "" && !isNaN(Number(v2))) return Number(v2);
                return fallback;
              };
              activeRules = {
                ...DEFAULT_FINANCIAL_RULES,
                ...finRules,
                commission_percentage: getVal(finRules.commission_percentage, mktRules.globalCommissionPct, 0),
                fixed_fee_per_order: getVal(finRules.fixed_fee_per_order, mktRules.fixedFee, 0),
                payment_collection_fee_pct: getVal(finRules.payment_collection_fee_pct, mktRules.collectionFeePct, 0),
                cod_handling_fee: getVal(finRules.cod_handling_fee, null, 0),
                standard_shipping_fee: getVal(finRules.standard_shipping_fee, mktRules.defaultShippingCost, 0),
                reverse_shipping_fee: getVal(finRules.reverse_shipping_fee, mktRules.reverseShippingFee, 0),
                rto_charge: getVal(finRules.rto_charge, mktRules.rtoCharge, 50),
                gst_on_platform_fees_pct: getVal(finRules.gst_on_platform_fees_pct, mktRules.gstRatePct, 3),
                settlement_delay_days: getVal(finRules.settlement_delay_days, mktRules.settlementDelayDays, 7),
                customer_return_window_days: getVal(finRules.customer_return_window_days, mktRules.returnWindowDays, 5),
              };
            }
          } catch (_) {}

          const ledgerEntries = generateDeliveryLedgerEntries({
            sellerId: order.seller_id,
            orderId: order.id,
            orderNumber: order.order_number || String(order.id),
            items: items.map((it: any) => ({
              id: it.id || it.product_id,
              product_id: it.product_id || it.id,
              name: it.name || it.title,
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
              subtotal: Number(it.subtotal) || ((Number(it.price) || 0) * (Number(it.quantity) || 1))
            })),
            paymentMethod: order.payment_method || "PREPAID",
            rules: activeRules
          });

          for (const entry of ledgerEntries) {
            try {
              await supabaseServer
                .from("seller_financial_ledger")
                .upsert(entry, { onConflict: "idempotency_key" });
            } catch (ledErr: any) {
              console.warn("Delivery ledger insert warning:", ledErr.message);
            }
          }
        } catch (fErr: any) {
          console.warn("Delivery financial ledger generation warning:", fErr.message);
        }
      }
    }

    // Update order
    const { data: updatedOrder, error: updateErr } = await supabaseServer
      .from("orders")
      .update(updates)
      .eq("id", order.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${targetStatus.replace(/_/g, " ").toUpperCase()}`,
      order: updatedOrder
    });
  } catch (err: any) {
    console.error("PATCH /api/orders error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to update order" }, { status: 500 });
  }
}

// DELETE /api/orders
// Disabled: Sellers cannot delete order records
export async function DELETE() {
  return NextResponse.json(
    { success: false, message: "Order deletion is disabled. Sellers are not permitted to delete orders." },
    { status: 403 }
  );
}
