import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import { generateReturnRefundLedgerEntries, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";
import { getShiprocketToken, createShiprocketReturnOrder } from "@/shared/utils/shiprocket";
import { initiateRazorpayRefund } from "@/shared/utils/razorpayRefund";

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

    // 1. Authenticate caller (Seller or Admin)
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch order using service role
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

    // 3. Authorization check
    if (user) {
      const { data: seller } = await supabaseServer
        .from("sellers")
        .select("id, user_id, status")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      const isOwner = seller && (
        String(orderData.seller_id) === String(seller.id) || 
        String(orderData.seller_id) === String(user.id)
      );
      const isAdmin = (user.user_metadata?.role || "").toLowerCase() === "super_admin" || 
        user.email === "superadmin@zebalpha.shop" || 
        user.email === "admin@zebalpha.shop";

      if (!isOwner && !isAdmin) {
        return NextResponse.json({
          success: false,
          message: "Forbidden: You cannot modify returns for another merchant's order."
        }, { status: 403 });
      }
    }

    const orderUpdates: Record<string, any> = { updated_at: nowIso };
    const returnUpdates: Record<string, any> = { updated_at: nowIso };

    if (action === "APPROVE") {
      orderUpdates.order_status = "return_approved";
      orderUpdates.return_status = "approved";
      orderUpdates.return_approved_at = nowIso;
      returnUpdates.status = "APPROVED";
      if (seller_notes) returnUpdates.seller_notes = seller_notes;

      // 4. Trigger Live Reverse Pickup in Shiprocket
      try {
        const token = await getShiprocketToken();
        
        // Resolve seller's pickup location address
        const { data: pickupLoc } = await supabaseServer
          .from("seller_pickup_locations")
          .select("*")
          .eq("seller_id", orderData.seller_id)
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        const customerAddr = typeof orderData.shipping_address === "object" && orderData.shipping_address !== null
          ? orderData.shipping_address
          : {};

        const returnItems = Array.isArray(orderData.return_items) && orderData.return_items.length > 0
          ? orderData.return_items
          : (Array.isArray(orderData.items) ? orderData.items : []);

        const custPin = String(customerAddr.pincode || customerAddr.postal_code || orderData.pincode || "").replace(/\D/g, "").slice(0, 6);
        const whPin = String(pickupLoc?.pincode || "").replace(/\D/g, "").slice(0, 6);
        const custPhone = String(orderData.phone || customerAddr.phone || "").replace(/\D/g, "").slice(0, 10);
        const whPhone = String(pickupLoc?.contact_phone || pickupLoc?.phone || custPhone).replace(/\D/g, "").slice(0, 10);

        if (!custPin || custPin.length !== 6) {
          return NextResponse.json({ success: false, error: "Customer address lacks a valid 6-digit pickup PIN code." }, { status: 400 });
        }
        if (!whPin || whPin.length !== 6) {
          return NextResponse.json({ success: false, error: "Seller return warehouse lacks a valid 6-digit PIN code." }, { status: 400 });
        }
        if (!custPhone || custPhone.length !== 10) {
          return NextResponse.json({ success: false, error: "Customer record lacks a valid 10-digit contact phone number." }, { status: 400 });
        }

        const returnPayload = {
          order_id: `RET-${orderData.order_number || orderData.id}`,
          order_number: `RET-${orderData.order_number || orderData.id}`,
          customer_name: orderData.customer_name || customerAddr.full_name || customerAddr.name || "Customer",
          customer_email: orderData.email || "",
          customer_phone: custPhone,
          pickup_address: customerAddr.address_line1 || customerAddr.address || orderData.address || "Customer Doorstep",
          pickup_landmark: customerAddr.landmark || customerAddr.address_line2 || "",
          pickup_city: customerAddr.city || "",
          pickup_state: customerAddr.state || "",
          pickup_pincode: custPin,
          warehouse_name: pickupLoc?.location_name || "Seller Return Hub",
          warehouse_address: pickupLoc?.address_line1 || "Merchant Warehouse",
          warehouse_city: pickupLoc?.city || "",
          warehouse_state: pickupLoc?.state || "",
          warehouse_pincode: whPin,
          warehouse_phone: whPhone,
          items: returnItems,
          refund_amount: Number(orderData.refund_amount || orderData.total_amount) || 0,
          weight: 0.5,
          length: 15,
          breadth: 15,
          height: 10
        };

        const srReturnRes = await createShiprocketReturnOrder(token, returnPayload);

        if (srReturnRes && srReturnRes.success) {
          if (srReturnRes.awb_code) {
            orderUpdates.return_tracking_number = srReturnRes.awb_code;
            returnUpdates.pickup_awb = srReturnRes.awb_code;
            returnUpdates.awb_number = srReturnRes.awb_code;
            returnUpdates.status = "IN_TRANSIT";
          }
          if (srReturnRes.courier_name) {
            orderUpdates.return_courier_name = srReturnRes.courier_name;
            returnUpdates.pickup_courier = srReturnRes.courier_name;
            returnUpdates.courier_partner = srReturnRes.courier_name;
          }
          if (srReturnRes.shipment_id) {
            returnUpdates.shiprocket_return_shipment_id = String(srReturnRes.shipment_id);
          }
          if (srReturnRes.order_id) {
            returnUpdates.shiprocket_return_order_id = String(srReturnRes.order_id);
          }
        }
      } catch (srErr: any) {
        console.warn("Shiprocket reverse pickup creation notice:", srErr.message);
        if (pickup_awb) {
          orderUpdates.return_tracking_number = pickup_awb;
          returnUpdates.pickup_awb = pickup_awb;
          returnUpdates.awb_number = pickup_awb;
        }
        if (pickup_courier) {
          orderUpdates.return_courier_name = pickup_courier;
          returnUpdates.pickup_courier = pickup_courier;
        }
      }

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

        returnUpdates.status = "COMPLETED";
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

        // 5. Atomic Stock Reconciliation (Guarded against double-restocking)
        const alreadyRestocked = Boolean(orderData.is_restocked);
        if (!alreadyRestocked) {
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
                await supabaseServer.rpc("atomic_restock_order_item", {
                  p_product_id: String(pId),
                  p_quantity: qty,
                  p_seller_id: orderData.seller_id,
                  p_order_number: orderData.order_number || String(orderData.id),
                  p_reason: `Customer return restock for Order #${orderData.order_number}`
                });
              } catch (restockErr: any) {
                console.warn("Restock RPC warning on return completion:", restockErr.message);
              }
            }
            orderUpdates.is_restocked = true;
            orderUpdates.restocked_at = nowIso;
            returnUpdates.is_restocked = true;
            returnUpdates.restocked_at = nowIso;
          }
        }

        // 6. Automated Refund Processing (Prepaid via Razorpay, COD verified payout)
        const isPrepaid = String(orderData.payment_method || "").toUpperCase() !== "COD";
        const paymentId = orderData.payment_id || orderData.razorpay_payment_id;

        if (isPrepaid && paymentId && !orderData.razorpay_refund_id) {
          try {
            const refundAmt = Number(orderData.refund_amount || orderData.total_amount) || 0;
            const rzpRes = await initiateRazorpayRefund({
              paymentId,
              amountInRupees: refundAmt,
              idempotencyKey: `RET_REF_${orderData.id}`,
              notes: {
                order_id: String(orderData.id),
                order_number: String(orderData.order_number),
                reason: orderData.return_reason || "Customer Return Approved & QC Passed"
              }
            });

            if (rzpRes && rzpRes.success) {
              orderUpdates.razorpay_refund_id = rzpRes.refundId;
              orderUpdates.refund_status = "COMPLETED";
              orderUpdates.refund_completed_at = nowIso;
              orderUpdates.refund_transaction_id = rzpRes.refundId;
              orderUpdates.refund_notes = `Refund of ₹${refundAmt} processed via Razorpay (ID: ${rzpRes.refundId})`;
              returnUpdates.razorpay_refund_id = rzpRes.refundId;
              returnUpdates.refund_status = "COMPLETED";
              returnUpdates.refund_transaction_id = rzpRes.refundId;
            } else {
              orderUpdates.refund_status = "FAILED";
              orderUpdates.refund_notes = `Automated Razorpay refund failed: ${rzpRes?.error}`;
              returnUpdates.refund_status = "FAILED";
            }
          } catch (rfErr: any) {
            console.warn("Razorpay refund exception:", rfErr.message);
            orderUpdates.refund_status = "FAILED";
            returnUpdates.refund_status = "FAILED";
          }
        } else {
          // COD or manual refund
          orderUpdates.refund_status = "COMPLETED";
          orderUpdates.refund_completed_at = nowIso;
          orderUpdates.refund_transaction_id = refund_transaction_id || `COD-REF-${Date.now()}`;
          returnUpdates.refund_status = "COMPLETED";
          returnUpdates.refund_transaction_id = orderUpdates.refund_transaction_id;
        }

        // 7. Financial Ledger Adjustments (Debit seller for refund & return shipping)
        try {
          const sellerId = orderData.seller_id;
          const refundAmt = Number(orderData.refund_amount || orderData.total_amount) || 0;
          if (sellerId && refundAmt > 0) {
            const returnId = orderData.return_id || `RET-${orderData.order_number || targetId}`;
            const isSellerFault = (orderData.return_reason || "").toLowerCase().includes("defective") ||
                                  (orderData.return_reason || "").toLowerCase().includes("wrong");

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

            const ledgerEntries = generateReturnRefundLedgerEntries({
              sellerId,
              orderId: orderData.id,
              orderNumber: orderData.order_number || String(orderData.id),
              returnId,
              refundAmount: refundAmt,
              isSellerFault,
              rules: activeRules
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
      data: { ...orderData, ...orderUpdates, ...returnUpdates }
    });
  } catch (error: any) {
    console.error("Seller return action error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update return" }, { status: 500 });
  }
}
