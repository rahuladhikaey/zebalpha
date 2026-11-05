import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskPhone(phone?: string): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 6) return "******";
  return cleaned.slice(0, 3) + "******" + cleaned.slice(-3);
}

function parseOrderAddress(order: any) {
  if (!order) return { customerName: "Customer", phone: "", city: "India", pincode: "", formattedDestination: "India", fullAddress: "Customer Address" };

  const customerName = order.customer_name || order.shipping_address?.name || order.name || "Customer";
  const phone = order.phone || order.shipping_address?.phone || order.mobile || "";

  let rawAddr = order.address || order.shipping_address;
  let addrObj: any = null;

  if (typeof rawAddr === "string") {
    try {
      const parsed = JSON.parse(rawAddr);
      if (parsed && typeof parsed === "object") addrObj = parsed;
    } catch (_) {}
  } else if (typeof rawAddr === "object" && rawAddr !== null) {
    addrObj = rawAddr;
  }

  let city = order.city || "";
  let pincode = order.pincode || order.pin_code || order.postcode || "";
  let fullAddress = "";

  if (addrObj) {
    city = addrObj.city || addrObj.town || addrObj.district || city;
    pincode = addrObj.pincode || addrObj.pin_code || addrObj.postal_code || addrObj.zip || pincode;
    fullAddress = [
      addrObj.address_line1 || addrObj.address || addrObj.street || addrObj.house,
      addrObj.address_line2 || addrObj.area || addrObj.landmark,
      city,
      addrObj.state,
      pincode
    ].filter(Boolean).join(", ");
  }

  if (typeof rawAddr === "string" && !addrObj) {
    fullAddress = rawAddr.trim();
    if (!pincode) {
      const pinMatch = fullAddress.match(/\b(\d{6})\b/);
      if (pinMatch) pincode = pinMatch[1];
    }
  }

  city = (city || "").replace(/-\s*\d{6}|\d{6}/g, "").trim() || "India";
  pincode = pincode ? String(pincode).trim() : "";
  const formattedDestination = pincode ? `${city} (${pincode})` : city;

  return { customerName, phone, city, pincode, formattedDestination, fullAddress: fullAddress || formattedDestination };
}

// GET /api/admin/orders
export async function GET(req: Request) {
  try {
    const adminSession = await requireSuperAdmin(req);
    const url = new URL(req.url);

    const orderId = url.searchParams.get("orderId");
    const view = url.searchParams.get("view") || "orders";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get("limit") || "15", 10)));
    const tab = (url.searchParams.get("tab") || "all").toLowerCase();
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const dateRange = url.searchParams.get("dateRange") || "all";
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const paymentStatus = (url.searchParams.get("paymentStatus") || "all").toUpperCase();
    const orderStatus = (url.searchParams.get("orderStatus") || "all").toLowerCase();
    const deliveryStatus = (url.searchParams.get("deliveryStatus") || "all").toLowerCase();
    const sellerIdFilter = url.searchParams.get("sellerId");
    const includeKPIs = url.searchParams.get("includeKPIs") !== "false";

    // -------------------------------------------------------------
    // CASE 1: SINGLE ORDER DEEP DETAIL (Drawer / Modal Inspection)
    // -------------------------------------------------------------
    if (orderId) {
      const { data: order, error: orderErr } = await supabaseServer
        .from("orders")
        .select("*")
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle();

      if (orderErr || !order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      const targetId = order.id;

      // Parallel fetch linked sub-orders, items, shipments, returns, and events
      const [sellerOrdersRes, orderItemsRes, shipmentsRes, returnsRes] = await Promise.all([
        supabaseServer.from("seller_orders").select("*").eq("parent_order_id", targetId),
        supabaseServer.from("order_items").select("*").eq("parent_order_id", targetId),
        supabaseServer.from("shipments").select("*").or(`order_id.eq.${targetId},parent_order_id.eq.${targetId}`),
        supabaseServer.from("order_returns").select("*").eq("order_id", targetId)
      ]);

      const sellerOrders = sellerOrdersRes.data || [];
      const orderItems = orderItemsRes.data || [];
      const shipments = shipmentsRes.data || [];
      const returns = returnsRes.data || [];

      // Collect all seller IDs to fetch seller details
      const sellerIdsSet = new Set<string>();
      if (order.seller_id) sellerIdsSet.add(order.seller_id);
      sellerOrders.forEach((so: any) => { if (so.seller_id) sellerIdsSet.add(so.seller_id); });
      orderItems.forEach((oi: any) => { if (oi.seller_id) sellerIdsSet.add(oi.seller_id); });

      const sellerIdsList = Array.from(sellerIdsSet);
      let sellersMap: Record<string, any> = {};
      if (sellerIdsList.length > 0) {
        const { data: sellersList } = await supabaseServer
          .from("sellers")
          .select("id, user_id, business_name, store_name, owner_name, email, phone, mobile_number, city, state, pincode")
          .in("id", sellerIdsList);
        (sellersList || []).forEach((s: any) => {
          sellersMap[s.id] = s;
          if (s.user_id) sellersMap[s.user_id] = s;
        });
      }

      // Fetch tracking events if shipments exist
      let shippingEvents: any[] = [];
      const shipmentIds = shipments.map((s: any) => s.id).filter(Boolean);
      if (shipmentIds.length > 0) {
        const { data: evts } = await supabaseServer
          .from("shipping_events")
          .select("*")
          .in("shipment_id", shipmentIds)
          .order("event_timestamp", { ascending: true });
        shippingEvents = evts || [];
      }

      // Build Chronological Timeline (Show ONLY events that actually occurred)
      const timeline: Array<{ title: string; timestamp: string; description: string; status: string }> = [];

      if (order.created_at) {
        timeline.push({
          title: "Order Placed",
          timestamp: order.created_at,
          description: `Customer placed order #${order.order_number || order.id}`,
          status: "completed"
        });
      }

      if (order.payment_status === "PAID" || order.payment_status === "COMPLETE") {
        timeline.push({
          title: "Payment Confirmed",
          timestamp: order.updated_at || order.created_at,
          description: `Payment via ${order.payment_method || "Online"} confirmed (Ref: ${order.razorpay_payment_id || "Direct"})`,
          status: "completed"
        });
      }

      // Seller fulfillment progression
      sellerOrders.forEach((so: any) => {
        const sInfo = sellersMap[so.seller_id] || {};
        const sName = sInfo.business_name || sInfo.store_name || "Merchant";
        const st = String(so.seller_status || "").toUpperCase();
        if (["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"].includes(st)) {
          timeline.push({
            title: `Seller Accepted (${sName})`,
            timestamp: so.updated_at || so.created_at,
            description: `${sName} accepted sub-order #${so.seller_order_number || so.id}`,
            status: "completed"
          });
        }
        if (["PACKED", "SHIPPED", "DELIVERED"].includes(st)) {
          timeline.push({
            title: `Packed (${sName})`,
            timestamp: so.updated_at || so.created_at,
            description: `Items packaged and ready for carrier dispatch`,
            status: "completed"
          });
        }
      });

      // Shipment events
      shipments.forEach((sh: any) => {
        const st = String(sh.status || "").toLowerCase();
        if (["shipped", "in_transit", "out_for_delivery", "delivered"].includes(st) || sh.picked_up_at) {
          timeline.push({
            title: "Shipped / In Transit",
            timestamp: sh.picked_up_at || sh.updated_at || order.updated_at,
            description: `Dispatched via ${sh.courier_name || "Logistics"} (AWB: ${sh.awb_code || sh.tracking_number || "Assigned"})`,
            status: "completed"
          });
        }
        if (["out_for_delivery", "delivered"].includes(st)) {
          timeline.push({
            title: "Out for Delivery",
            timestamp: sh.updated_at,
            description: `Package out for final mile delivery to customer`,
            status: "completed"
          });
        }
        if (st === "delivered" || sh.delivered_at || order.order_status === "delivered") {
          timeline.push({
            title: "Delivered",
            timestamp: sh.delivered_at || order.delivered_at || sh.updated_at,
            description: `Shipment successfully delivered to recipient`,
            status: "completed"
          });
        }
      });

      // Cancellation or Returns
      if (order.order_status === "cancelled" || order.cancelled_at) {
        timeline.push({
          title: "Order Cancelled",
          timestamp: order.cancelled_at || order.updated_at,
          description: `Cancelled by ${order.cancelled_by || "Admin"}: ${order.cancellation_reason || "Customer request"}`,
          status: "cancelled"
        });
      }

      returns.forEach((ret: any) => {
        timeline.push({
          title: `Return ${ret.status || "Requested"}`,
          timestamp: ret.created_at,
          description: `Return for ${ret.product_name || "product"}: ${ret.reason || "General"}`,
          status: String(ret.status).toLowerCase() === "rejected" ? "cancelled" : "completed"
        });
      });

      // Sort timeline chronologically
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Parse item details if stored as JSONB in order
      let parsedOrderItems = orderItems;
      if (parsedOrderItems.length === 0) {
        const rawItems = order.items || order.product_details || [];
        parsedOrderItems = Array.isArray(rawItems) ? rawItems : [];
      }

      return NextResponse.json({
        success: true,
        order: {
          ...order,
          customer_phone_masked: maskPhone(order.phone || order.shipping_address?.phone),
          seller_orders: sellerOrders,
          order_items: parsedOrderItems,
          shipments,
          shipping_events: shippingEvents,
          returns,
          sellers: sellersMap,
          timeline
        }
      });
    }

    // -------------------------------------------------------------
    // CASE 2: SELLER-WISE ORDER VIEW (Matrix by Merchant)
    // -------------------------------------------------------------
    if (view === "seller-summary") {
      const [sellersRes, ordersRes, sellerOrdersRes] = await Promise.all([
        supabaseServer.from("sellers").select("id, business_name, store_name, owner_name, email, phone, city, state, status"),
        supabaseServer.from("orders").select("id, seller_id, total_amount, order_status, created_at"),
        supabaseServer.from("seller_orders").select("id, seller_id, parent_order_id, total_amount, seller_status, shipping_status, created_at")
      ]);

      const sellers = sellersRes.data || [];
      const orders = ordersRes.data || [];
      const sellerOrders = sellerOrdersRes.data || [];

      const summaryList = sellers.map((seller: any) => {
        const sOrders = orders.filter((o: any) => o.seller_id === seller.id);
        const sSubOrders = sellerOrders.filter((so: any) => so.seller_id === seller.id);

        let totalOrders = sOrders.length;
        let pending = 0;
        let processing = 0;
        let shipped = 0;
        let delivered = 0;
        let cancelled = 0;
        let totalValue = 0;

        // Tally from parent orders where this seller is primary
        sOrders.forEach((o: any) => {
          const st = String(o.order_status || "placed").toLowerCase();
          if (["placed", "new"].includes(st)) pending++;
          else if (["confirmed", "processing", "packed", "ready_for_pickup", "ready_to_ship"].includes(st)) processing++;
          else if (["shipped", "in_transit", "out_for_delivery", "dispatched"].includes(st)) shipped++;
          else if (["delivered", "completed"].includes(st)) {
            delivered++;
            totalValue += Number(o.total_amount || 0);
          } else if (st === "cancelled") cancelled++;
          else totalValue += Number(o.total_amount || 0);
        });

        // Add suborders if multi-vendor splits exist
        sSubOrders.forEach((so: any) => {
          if (!sOrders.some((o: any) => o.id === so.parent_order_id)) {
            totalOrders++;
            const st = String(so.seller_status || "PENDING").toLowerCase();
            if (st === "pending") pending++;
            else if (["confirmed", "processing", "packed"].includes(st)) processing++;
            else if (st === "shipped") shipped++;
            else if (st === "delivered") {
              delivered++;
              totalValue += Number(so.total_amount || 0);
            } else if (st === "cancelled") cancelled++;
          }
        });

        return {
          seller_id: seller.id,
          seller_name: seller.business_name || seller.store_name || seller.owner_name || "Merchant",
          email: seller.email || "—",
          phone: maskPhone(seller.phone),
          city: seller.city || "—",
          status: seller.status || "ACTIVE",
          total_orders: totalOrders,
          pending_orders: pending,
          processing_orders: processing,
          shipped_orders: shipped,
          delivered_orders: delivered,
          cancelled_orders: cancelled,
          seller_order_value: Math.round(totalValue)
        };
      });

      // Filter seller search if query provided
      let filteredSummaries = summaryList;
      if (search) {
        filteredSummaries = summaryList.filter((s: any) =>
          s.seller_name.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.city.toLowerCase().includes(search) ||
          s.seller_id.toLowerCase().includes(search)
        );
      }

      return NextResponse.json({
        success: true,
        view: "seller-summary",
        data: filteredSummaries
      });
    }

    // -------------------------------------------------------------
    // CASE 3: ALL ORDERS CENTRALIZED DASHBOARD TABLE
    // -------------------------------------------------------------
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateRange === "today") {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    } else if (dateRange === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "custom" && startDateParam) {
      startDate = new Date(startDateParam);
      endDate = endDateParam ? new Date(endDateParam) : new Date();
    }

    // Build base query
    let query = supabaseServer.from("orders").select("*", { count: "exact" });

    // Apply date boundaries
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    // Apply Tab filter
    if (tab === "new") {
      query = query.in("order_status", ["placed", "new"]);
    } else if (tab === "processing") {
      query = query.in("order_status", ["confirmed", "processing", "packed", "ready_for_pickup", "ready_to_ship"]);
    } else if (tab === "shipped") {
      query = query.in("order_status", ["shipped", "in_transit", "out_for_delivery", "dispatched"]);
    } else if (tab === "delivered") {
      query = query.in("order_status", ["delivered", "completed"]);
    } else if (tab === "cancelled") {
      query = query.eq("order_status", "cancelled");
    } else if (tab === "returns") {
      query = query.or("return_status.not.is.null,order_status.like.%return%,order_status.like.%rto%");
    }

    // Payment Status filter
    if (paymentStatus === "PAID") {
      query = query.in("payment_status", ["PAID", "COMPLETE"]);
    } else if (paymentStatus === "PENDING") {
      query = query.eq("payment_status", "PENDING");
    } else if (paymentStatus === "FAILED") {
      query = query.eq("payment_status", "FAILED");
    }

    // Order Status dropdown filter
    if (orderStatus !== "all") {
      query = query.eq("order_status", orderStatus);
    }

    // Seller ID filter
    if (sellerIdFilter) {
      query = query.eq("seller_id", sellerIdFilter);
    }

    // Search query
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%,tracking_number.ilike.%${search}%,courier_name.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: rawOrders, error, count } = await query;

    if (error) {
      console.error("Superadmin fetch orders error:", error);
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const ordersList = rawOrders || [];

    // Parallel fetch real-time KPI metrics if requested
    let kpis = {
      totalOrders: total,
      newOrders: 0,
      pendingProcessing: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnRequests: 0,
      totalOrderValue: 0
    };

    if (includeKPIs) {
      const [
        { count: cTotal },
        { count: cNew },
        { count: cProcessing },
        { count: cShipped },
        { count: cDelivered },
        { count: cCancelled },
        { count: cReturns },
        { data: valData }
      ] = await Promise.all([
        supabaseServer.from("orders").select("id", { count: "exact", head: true }),
        supabaseServer.from("orders").select("id", { count: "exact", head: true }).in("order_status", ["placed", "new"]),
        supabaseServer.from("orders").select("id", { count: "exact", head: true }).in("order_status", ["confirmed", "processing", "packed", "ready_for_pickup", "ready_to_ship"]),
        supabaseServer.from("orders").select("id", { count: "exact", head: true }).in("order_status", ["shipped", "in_transit", "out_for_delivery", "dispatched"]),
        supabaseServer.from("orders").select("id", { count: "exact", head: true }).in("order_status", ["delivered", "completed"]),
        supabaseServer.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "cancelled"),
        supabaseServer.from("orders").select("id", { count: "exact", head: true }).or("return_status.not.is.null,order_status.like.%return%,order_status.like.%rto%"),
        supabaseServer.from("orders").select("total_amount").neq("order_status", "cancelled")
      ]);

      const sumTotalValue = (valData || []).reduce((acc: number, row: any) => acc + (Number(row.total_amount) || 0), 0);

      kpis = {
        totalOrders: cTotal || total,
        newOrders: cNew || 0,
        pendingProcessing: cProcessing || 0,
        shippedOrders: cShipped || 0,
        deliveredOrders: cDelivered || 0,
        cancelledOrders: cCancelled || 0,
        returnRequests: cReturns || 0,
        totalOrderValue: Math.round(sumTotalValue)
      };
    }

    // Collect seller IDs and parent order IDs to resolve multi-vendor details
    const sellerIds = new Set<string>();
    const orderIds = ordersList.map((o: any) => o.id);

    ordersList.forEach((o: any) => {
      if (o.seller_id) sellerIds.add(o.seller_id);
    });

    // Fetch related seller_orders for these orders to check multi-vendor status
    let linkedSellerOrders: any[] = [];
    if (orderIds.length > 0) {
      const { data: soData } = await supabaseServer
        .from("seller_orders")
        .select("id, parent_order_id, seller_id, seller_status, shipping_status, total_amount")
        .in("parent_order_id", orderIds);
      linkedSellerOrders = soData || [];
      linkedSellerOrders.forEach((so: any) => { if (so.seller_id) sellerIds.add(so.seller_id); });
    }

    // Resolve seller names in single batch
    let sellersMap: Record<string, string> = {};
    if (sellerIds.size > 0) {
      const { data: sList } = await supabaseServer
        .from("sellers")
        .select("id, business_name, store_name, owner_name")
        .in("id", Array.from(sellerIds));
      (sList || []).forEach((s: any) => {
        sellersMap[s.id] = s.business_name || s.store_name || s.owner_name || "Merchant";
      });
    }

    // Enrich order rows with multi-vendor tags and masked PII
    const enrichedOrders = ordersList.map((ord: any) => {
      const itemsList = Array.isArray(ord.items) ? ord.items : (Array.isArray(ord.product_details) ? ord.product_details : []);
      const primaryItem = itemsList[0] || {};
      const moreItemsCount = Math.max(0, itemsList.length - 1);

      // Check sub-orders for this order
      const relatedSubOrders = linkedSellerOrders.filter((so: any) => so.parent_order_id === ord.id);
      const isMultiVendor = relatedSubOrders.length > 1;

      let sellerDisplay = sellersMap[ord.seller_id] || "Primary Hub";
      if (isMultiVendor) {
        const uniqueSellerNames = Array.from(new Set(relatedSubOrders.map((so: any) => sellersMap[so.seller_id]).filter(Boolean)));
        sellerDisplay = `${uniqueSellerNames.length} Sellers: ${uniqueSellerNames.slice(0, 2).join(", ")}${uniqueSellerNames.length > 2 ? "..." : ""}`;
      }

      return {
        ...ord,
        customer_phone_masked: maskPhone(ord.phone || ord.shipping_address?.phone),
        primary_product_thumbnail: primaryItem.image_url || primaryItem.image || null,
        primary_product_name: primaryItem.name || primaryItem.title || "Apparel / Footwear",
        total_items_count: itemsList.length,
        more_items_count: moreItemsCount,
        seller_display_name: sellerDisplay,
        is_multi_vendor: isMultiVendor,
        sub_orders_count: relatedSubOrders.length,
        fulfillment_status: ord.order_status || "placed",
        delivery_status: ord.shipment_status || (ord.order_status === "delivered" ? "DELIVERED" : (ord.order_status === "shipped" ? "IN_TRANSIT" : "PENDING"))
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      kpis
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Superadmin fetch orders exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to fetch orders", data: [] }, { status: 500 });
  }
}

// PATCH /api/admin/orders (Admin Actions with Immutable Audit Logging)
export async function PATCH(req: Request) {
  try {
    const adminSession = await requireSuperAdmin(req);
    const body = await req.json();
    const {
      id,
      action = "update_status",
      order_status,
      return_status,
      refund_amount,
      refund_transaction_id,
      reason,
      verification_proof,
      ...otherUpdates
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    const { data: existingOrder } = await supabaseServer
      .from("orders")
      .select("*")
      .or(`id.eq.${id},order_number.eq.${id}`)
      .maybeSingle();

    if (!existingOrder) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = { ...otherUpdates, updated_at: nowIso };

    // -----------------------------------------------------------------
    // STRICT VERIFICATION CHECK: Admin Manual Delivery Override Protection
    // "Do not allow Admin to mark an order delivered manually without a
    // verified, auditable business process."
    // -----------------------------------------------------------------
    if (order_status && order_status.toLowerCase() === "delivered") {
      const currentSt = String(existingOrder.order_status || "").toLowerCase();
      if (currentSt !== "delivered") {
        const hasTracking = Boolean(existingOrder.tracking_number || existingOrder.awb_code);
        const hasProof = Boolean(verification_proof && String(verification_proof).trim().length >= 5);
        if (!hasTracking && !hasProof) {
          return NextResponse.json({
            success: false,
            message: "Action Blocked: Manual delivery marking requires verified courier tracking (AWB) or an auditable delivery verification proof (e.g. POD reference / customer confirmation)."
          }, { status: 422 });
        }
        updates.delivered_at = nowIso;
        updates.shipment_status = "DELIVERED";
      }
    }

    if (order_status) updates.order_status = order_status;
    if (return_status) updates.return_status = return_status;

    // Handle return approvals & rejections
    if (action === "approve_return") {
      updates.order_status = "return_approved";
      updates.return_status = "approved";
      updates.return_approved_at = nowIso;
    } else if (action === "reject_return") {
      updates.return_status = "rejected";
      updates.rejection_reason = reason || "Return request did not meet return policy criteria";
    } else if (action === "process_refund") {
      // Idempotency: avoid double refunds
      if (existingOrder.refund_status === "COMPLETED") {
        return NextResponse.json({ success: false, message: "Refund has already been completed for this order" }, { status: 400 });
      }
      updates.refund_status = "COMPLETED";
      updates.refund_amount = refund_amount || existingOrder.total_amount;
      updates.refund_transaction_id = refund_transaction_id || `RFD_${Date.now()}`;
      updates.refund_completed_at = nowIso;
    } else if (action === "escalate") {
      updates.is_escalated = true;
      updates.escalated_at = nowIso;
      updates.escalation_reason = reason || "Escalated by Super Admin for priority resolution";
    }

    const { data: updatedOrder, error: updateErr } = await supabaseServer
      .from("orders")
      .update(updates)
      .eq("id", existingOrder.id)
      .select()
      .single();

    if (updateErr) {
      console.error("Superadmin update order error:", updateErr);
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    // IMMUTABLE AUDIT LOG: Record privileged administrative action
    try {
      await supabaseServer.from("admin_audit_logs").insert({
        username: (adminSession as any)?.user || "super_admin",
        action: `ORDER_${action.toUpperCase()}`,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
        user_agent: req.headers.get("user-agent") || null,
        details: {
          order_id: existingOrder.id,
          order_number: existingOrder.order_number,
          previous_status: existingOrder.order_status,
          new_status: updates.order_status || existingOrder.order_status,
          action_type: action,
          reason: reason || updates.rejection_reason || updates.escalation_reason || "Admin order update",
          performed_at: nowIso
        }
      });
    } catch (auditErr) {
      console.warn("Audit log creation notice:", auditErr);
    }

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Superadmin update order exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update order" }, { status: 500 });
  }
}

// DELETE /api/admin/orders
export async function DELETE(req: Request) {
  try {
    const adminSession = await requireSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    const { data: targetOrder } = await supabaseServer
      .from("orders")
      .select("id, order_number")
      .or(`id.eq.${id},order_number.eq.${id}`)
      .maybeSingle();

    const targetId = targetOrder?.id || id;
    const targetOrderNum = targetOrder?.order_number || id;

    // Cascade delete child records
    try {
      await supabaseServer.from("seller_orders").delete().or(`parent_order_id.eq.${targetId},order_id.eq.${targetId},order_number.eq.${targetOrderNum}`);
    } catch (_) {}

    try {
      await supabaseServer.from("shipments").delete().or(`order_id.eq.${targetId},order_number.eq.${targetOrderNum}`);
    } catch (_) {}

    try {
      await supabaseServer.from("order_items").delete().eq("order_id", targetId);
    } catch (_) {}

    try {
      await supabaseServer.from("order_returns").delete().or(`order_id.eq.${targetId},suborder_id.eq.${targetId}`);
    } catch (_) {}

    try {
      await supabaseServer.from("seller_claims").delete().or(`suborder_id.eq.${targetId},claim_id.eq.${targetId}`);
    } catch (_) {}

    const { error: deleteErr } = await supabaseServer
      .from("orders")
      .delete()
      .or(`id.eq.${targetId},order_number.eq.${targetOrderNum},order_number.like.${targetOrderNum}-S%`);

    if (deleteErr) {
      console.error("Superadmin delete order error:", deleteErr);
      return NextResponse.json({ success: false, message: deleteErr.message }, { status: 500 });
    }

    // Log deletion action
    try {
      await supabaseServer.from("admin_audit_logs").insert({
        username: (adminSession as any)?.user || "super_admin",
        action: "ORDER_DELETE",
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
        user_agent: req.headers.get("user-agent") || null,
        details: { target_order_id: targetId, target_order_number: targetOrderNum, deleted_at: new Date().toISOString() }
      });
    } catch (_) {}

    return NextResponse.json({ success: true, message: "Order and linked sub-orders deleted successfully" });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Superadmin delete order exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to delete order" }, { status: 500 });
  }
}
