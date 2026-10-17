import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import { getShiprocketToken, createShiprocketReturnOrder } from "@/shared/utils/shiprocket";
import { initiateRazorpayRefund } from "@/shared/utils/razorpayRefund";
import { generateReturnRefundLedgerEntries, DEFAULT_FINANCIAL_RULES } from "@/shared/services/financialLedgerService";

export const dynamic = "force-dynamic";

// GET /api/admin/returns - Fetch all return requests
export async function GET(req: Request) {
  try {
    const { data: returns, error } = await supabaseServer
      .from("order_returns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Superadmin fetch returns error:", error);
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: returns || [] });
  } catch (error: any) {
    console.error("Superadmin fetch returns exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to fetch returns", data: [] }, { status: 500 });
  }
}

// PATCH /api/admin/returns - Update return / refund status
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, orderId, status, rejection_reason, refund_status, refund_amount, refund_transaction_id, admin_notes } = body;

    const targetId = id || orderId;
    if (!targetId) {
      return NextResponse.json({ success: false, message: "Return or Order ID is required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const returnUpdates: Record<string, any> = { updated_at: nowIso };
    const orderUpdates: Record<string, any> = { updated_at: nowIso };

    // Fetch existing order record
    const { data: orderData } = await supabaseServer
      .from("orders")
      .select("*")
      .or(`id.eq.${targetId},order_number.eq.${targetId}`)
      .maybeSingle();

    if (status) {
      const upper = status.toUpperCase();
      returnUpdates.status = upper;

      if (upper === "APPROVED") {
        orderUpdates.order_status = "return_approved";
        orderUpdates.return_status = "approved";
        orderUpdates.return_approved_at = nowIso;

        // Trigger Shiprocket Reverse Pickup
        if (orderData) {
          try {
            const token = await getShiprocketToken();
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

            const returnPayload = {
              order_id: `RET-${orderData.order_number || orderData.id}`,
              order_number: `RET-${orderData.order_number || orderData.id}`,
              customer_name: orderData.customer_name || customerAddr.full_name || customerAddr.name || "Customer",
              customer_email: orderData.email || "customer@zebalpha.com",
              customer_phone: String(orderData.phone || customerAddr.phone || "9999999999").replace(/\D/g, "").slice(0, 10),
              pickup_address: customerAddr.address_line1 || customerAddr.address || orderData.address || "Customer Doorstep",
              pickup_landmark: customerAddr.landmark || customerAddr.address_line2 || "",
              pickup_city: customerAddr.city || "City",
              pickup_state: customerAddr.state || "State",
              pickup_pincode: String(customerAddr.pincode || customerAddr.postal_code || orderData.pincode || "700001").replace(/\D/g, "").slice(0, 6),
              warehouse_name: pickupLoc?.location_name || "Seller Return Hub",
              warehouse_address: pickupLoc?.address_line1 || "Merchant Warehouse",
              warehouse_city: pickupLoc?.city || "City",
              warehouse_state: pickupLoc?.state || "State",
              warehouse_pincode: String(pickupLoc?.pincode || "700001").replace(/\D/g, "").slice(0, 6),
              warehouse_phone: String(pickupLoc?.contact_phone || "9999999999").replace(/\D/g, "").slice(0, 10),
              items: orderData.return_items || orderData.items || [],
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
            console.warn("Superadmin Shiprocket return creation notice:", srErr.message);
          }
        }

      } else if (upper === "REJECTED") {
        orderUpdates.order_status = "return_rejected";
        orderUpdates.return_status = "rejected";
        orderUpdates.return_rejected_at = nowIso;
        orderUpdates.return_rejection_reason = rejection_reason || "Rejected by administrator";
        returnUpdates.rejection_reason = rejection_reason || "Rejected by administrator";
      } else if (upper === "PICKED_UP") {
        orderUpdates.order_status = "return_picked_up";
        orderUpdates.return_status = "picked_up";
        orderUpdates.return_picked_up_at = nowIso;
      } else if (upper === "RECEIVED" || upper === "COMPLETED") {
        orderUpdates.order_status = "returned";
        orderUpdates.return_status = "completed";
        orderUpdates.return_completed_at = nowIso;
        orderUpdates.refund_status = "COMPLETED";
        returnUpdates.status = "COMPLETED";
        returnUpdates.refund_status = "COMPLETED";

        // Atomic restocking & refund trigger if orderData exists
        if (orderData && !orderData.is_restocked) {
          const items = orderData.return_items || orderData.items || [];
          if (Array.isArray(items)) {
            for (const item of items) {
              const pId = item.product_id || item.id;
              const qty = Number(item.quantity) || 1;
              if (pId) {
                try {
                  await supabaseServer.rpc("atomic_restock_order_item", {
                    p_product_id: String(pId),
                    p_quantity: qty,
                    p_seller_id: orderData.seller_id,
                    p_order_number: orderData.order_number || String(orderData.id),
                    p_reason: `Admin return restock for Order #${orderData.order_number}`
                  });
                } catch (_) {}
              }
            }
            orderUpdates.is_restocked = true;
            orderUpdates.restocked_at = nowIso;
            returnUpdates.is_restocked = true;
            returnUpdates.restocked_at = nowIso;
          }
        }

        // Process Razorpay refund if prepaid
        const isPrepaid = orderData && String(orderData.payment_method || "").toUpperCase() !== "COD";
        const paymentId = orderData?.payment_id || orderData?.razorpay_payment_id;

        if (isPrepaid && paymentId && !orderData?.razorpay_refund_id) {
          try {
            const refundAmt = Number(refund_amount || orderData.refund_amount || orderData.total_amount) || 0;
            const rzpRes = await initiateRazorpayRefund({
              paymentId,
              amountInRupees: refundAmt,
              idempotencyKey: `RET_REF_${orderData.id}`,
              notes: {
                order_id: String(orderData.id),
                order_number: String(orderData.order_number),
                reason: "Admin Return Resolution & Refund"
              }
            });

            if (rzpRes?.success) {
              orderUpdates.razorpay_refund_id = rzpRes.refundId;
              orderUpdates.refund_transaction_id = rzpRes.refundId;
              returnUpdates.razorpay_refund_id = rzpRes.refundId;
              returnUpdates.refund_transaction_id = rzpRes.refundId;
            }
          } catch (rfErr: any) {
            console.warn("Admin refund processing notice:", rfErr.message);
          }
        }

        // Generate Financial Ledger adjustment entries
        if (orderData?.seller_id) {
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

            const refundAmt = Number(refund_amount || orderData.refund_amount || orderData.total_amount) || 0;
            const ledgerEntries = generateReturnRefundLedgerEntries({
              sellerId: orderData.seller_id,
              orderId: orderData.id,
              orderNumber: orderData.order_number || String(orderData.id),
              returnId: `RET-${orderData.order_number || targetId}`,
              refundAmount: refundAmt,
              isSellerFault: false,
              rules: activeRules
            });

            for (const entry of ledgerEntries) {
              await supabaseServer
                .from("seller_financial_ledger")
                .upsert(entry, { onConflict: "idempotency_key" });
            }
          } catch (_) {}
        }
      }
    }

    if (refund_status) {
      returnUpdates.refund_status = refund_status.toUpperCase();
      orderUpdates.refund_status = refund_status.toUpperCase();
      if (refund_status.toUpperCase() === "COMPLETED") {
        orderUpdates.refund_completed_at = nowIso;
      }
    }
    if (refund_amount) {
      returnUpdates.refund_amount = Number(refund_amount);
      orderUpdates.refund_amount = Number(refund_amount);
    }
    if (refund_transaction_id) {
      returnUpdates.refund_transaction_id = refund_transaction_id;
      orderUpdates.refund_transaction_id = refund_transaction_id;
    }
    if (admin_notes) {
      returnUpdates.admin_notes = admin_notes;
    }

    // Update in order_returns table
    await supabaseServer
      .from("order_returns")
      .update(returnUpdates)
      .or(`id.eq.${targetId},order_id.eq.${targetId},order_number.eq.${targetId}`);

    // Update in orders table
    await supabaseServer
      .from("orders")
      .update(orderUpdates)
      .or(`id.eq.${targetId},order_number.eq.${targetId}`);

    return NextResponse.json({
      success: true,
      message: "Return & refund record updated successfully.",
      data: { ...returnUpdates, ...orderUpdates }
    });
  } catch (error: any) {
    console.error("Superadmin update returns exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update return", data: null }, { status: 500 });
  }
}
