import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { generateReturnRefundLedgerEntries, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      id,
      action, // 'APPROVE' | 'REJECT' | 'PICKUP' | 'CONFIRM_RECEIVED' | 'SUBMIT_QC'
      rejection_reason,
      seller_notes,
      pickup_awb,
      pickup_courier,
      refund_transaction_id,
      // Enhanced QC fields
      qc_result, // 'PASS' | 'FAIL' | 'PARTIAL' | 'DISPUTED'
      packaging_condition,
      product_condition,
      accuracy,
      accessories,
      qc_notes,
      qc_evidence_urls,
    } = body;

    const targetId = orderId || id;
    if (!targetId || !action) {
      return NextResponse.json({ success: false, message: "Order ID and Action are required." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

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

    const orderUpdates: Record<string, any> = { updated_at: nowIso };
    const returnUpdates: Record<string, any> = { updated_at: nowIso };

    if (action === "APPROVE") {
      orderUpdates.order_status = "return_approved";
      orderUpdates.return_status = "approved";
      orderUpdates.return_approved_at = nowIso;
      if (pickup_awb) orderUpdates.return_tracking_number = pickup_awb;
      if (pickup_courier) orderUpdates.return_courier_name = pickup_courier;

      returnUpdates.status = "APPROVED";
      if (pickup_awb) returnUpdates.pickup_awb = pickup_awb;
      if (pickup_courier) returnUpdates.pickup_courier = pickup_courier;
      if (seller_notes) returnUpdates.seller_notes = seller_notes;

    } else if (action === "REJECT") {
      orderUpdates.order_status = "return_rejected";
      orderUpdates.return_status = "rejected";
      orderUpdates.return_rejected_at = nowIso;
      orderUpdates.return_rejection_reason = rejection_reason || "Return request rejected by seller.";

      returnUpdates.status = "REJECTED";
      returnUpdates.rejection_reason = rejection_reason || "Return request rejected by seller.";
      if (seller_notes) returnUpdates.seller_notes = seller_notes;

    } else if (action === "PICKUP") {
      orderUpdates.order_status = "return_picked_up";
      orderUpdates.return_status = "picked_up";
      orderUpdates.return_picked_up_at = nowIso;

      returnUpdates.status = "PICKED_UP";

    } else if (action === "CONFIRM_RECEIVED" || action === "SUBMIT_QC") {
      const finalQcResult = qc_result || "PASS";

      if (finalQcResult === "PASS") {
        orderUpdates.order_status = "returned";
        orderUpdates.return_status = "completed";
        orderUpdates.return_completed_at = nowIso;
        orderUpdates.refund_status = "COMPLETED";
        orderUpdates.refund_transaction_id = refund_transaction_id || `RET-REF-${Date.now()}`;

        returnUpdates.status = "COMPLETED";
        returnUpdates.refund_status = "COMPLETED";
        returnUpdates.refund_transaction_id = orderUpdates.refund_transaction_id;
        returnUpdates.qc_status = "PASSED";
        returnUpdates.qc_result = "PASS";
        returnUpdates.qc_inspection = {
          packaging: packaging_condition || "OK",
          product: product_condition || "UNUSED",
          accuracy: accuracy || "CORRECT",
          accessories: accessories || "ALL_PRESENT",
          notes: qc_notes || "",
          evidence: qc_evidence_urls || []
        };

        // Restock products to inventory
        let items = orderData.return_items || orderData.items || orderData.product_details || [];
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        if (!Array.isArray(items) && items && typeof items === "object") {
          items = [items];
        }

        if (Array.isArray(items)) {
          for (const item of items) {
            const pId = item.product_id || item.id;
            const qty = Number(item.quantity) || 1;
            if (!pId) continue;

            try {
              const { data: prod } = await supabaseServer.from("products").select("stock, seller_id").eq("id", pId).maybeSingle();
              if (prod) {
                const currentStock = Number(prod.stock) || 0;
                const newStock = currentStock + qty;
                try {
                  await supabaseServer.from("seller_stock_history").insert([{
                    seller_id: prod.seller_id || orderData.seller_id,
                    product_id: pId,
                    previous_stock: currentStock,
                    new_stock: newStock,
                    change_reason: `Restocked +${qty} units from customer return of Order #${orderData.order_number}`
                  }]);
                  await supabaseServer.from("products").update({ stock: newStock }).eq("id", pId);
                } catch (_) {}
              }
            } catch (e: any) {
              console.warn("Restock warning on return completion:", e.message);
            }
          }
        }

        // Generate Financial Ledger adjustment entries
        try {
          const sellerId = orderData.seller_id;
          const refundAmt = Number(orderData.refund_amount || orderData.total_amount) || 0;
          if (sellerId && refundAmt > 0) {
            const returnId = orderData.return_id || `RET-${orderData.order_number || targetId}`;
            const isSellerFault = (orderData.return_reason || "").toLowerCase().includes("defective") ||
                                  (orderData.return_reason || "").toLowerCase().includes("wrong");

            const ledgerEntries = generateReturnRefundLedgerEntries({
              sellerId,
              orderId: orderData.id,
              orderNumber: orderData.order_number || String(orderData.id),
              returnId,
              refundAmount: refundAmt,
              isSellerFault,
              rules: DEFAULT_FINANCIAL_RULES
            });

            for (const entry of ledgerEntries) {
              try {
                await supabaseServer
                  .from("seller_financial_ledger")
                  .upsert(entry, { onConflict: "idempotency_key" });
              } catch (ledErr: any) {
                console.warn("Ledger insert error on return completion:", ledErr.message);
              }
            }
          }
        } catch (fErr: any) {
          console.warn("Financial ledger adjustment warning on return completion:", fErr.message);
        }

      } else {
        // QC FAILED or DISPUTED: Item not in returnable state (used, damaged by customer, wrong item)
        orderUpdates.order_status = "return_qc_failed";
        orderUpdates.return_status = "disputed";
        orderUpdates.return_dispute_reason = qc_notes || "Item failed QC inspection";

        returnUpdates.status = "DISPUTED";
        returnUpdates.qc_status = "FAILED";
        returnUpdates.qc_result = finalQcResult;
        returnUpdates.qc_inspection = {
          packaging: packaging_condition || "DAMAGED",
          product: product_condition || "DAMAGED",
          accuracy: accuracy || "WRONG_ITEM",
          accessories: accessories || "MISSING",
          notes: qc_notes || "",
          evidence: qc_evidence_urls || []
        };
      }
    }

    // Update orders table
    await supabaseServer.from("orders").update(orderUpdates).eq("id", orderData.id);

    // Update order_returns table
    try {
      await supabaseServer
        .from("order_returns")
        .update(returnUpdates)
        .or(`order_id.eq.${orderData.id},order_number.eq.${orderData.order_number}`);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Return status successfully updated (${action})`,
      data: { ...orderData, ...orderUpdates }
    });
  } catch (error: any) {
    console.error("Seller return action error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update return" }, { status: 500 });
  }
}
