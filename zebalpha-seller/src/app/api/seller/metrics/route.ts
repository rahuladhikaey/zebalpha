import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Authenticates user from session cookies or Bearer token
 */
async function getAuthenticatedUser(req: NextRequest) {
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

function getPeriodRange(period: string, customStart?: string | null, customEnd?: string | null) {
  const now = new Date();
  let start = new Date();
  let end = new Date(now);
  let groupMode: "hourly" | "daily" | "monthly" = "daily";
  let label = "";

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupMode = "hourly";
      label = `Today (${now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
      break;

    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = new Date(y);
      start.setHours(0, 0, 0, 0);
      end = new Date(y);
      end.setHours(23, 59, 59, 999);
      groupMode = "hourly";
      label = `Yesterday (${y.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
      break;
    }

    case "this_week": {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupMode = "daily";
      label = "This Week (Sun - Sat)";
      break;
    }

    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      groupMode = "daily";
      label = `This Month (${now.toLocaleString("en-IN", { month: "long" })})`;
      break;

    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      groupMode = "daily";
      label = `Last Month (${new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString("en-IN", { month: "long" })})`;
      break;

    case "custom": {
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(start.getDate() - 30);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      groupMode = diffDays > 60 ? "monthly" : "daily";
      const sStr = !isNaN(start.getTime()) ? start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
      const eStr = !isNaN(end.getTime()) ? end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
      label = `${sStr} — ${eStr}`;
      break;
    }

    case "all":
    default:
      start = new Date("2020-01-01T00:00:00.000Z");
      end = new Date("3000-01-01T00:00:00.000Z");
      groupMode = "monthly";
      label = "All Time History";
      break;
  }

  return { start, end, groupMode, label };
}

/**
 * GET /api/seller/metrics
 * Authoritative Canonical Seller Analytics & Financial Buckets
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSellerId = searchParams.get("sellerId");
    const period = searchParams.get("period") || "this_month";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const stream = searchParams.get("stream") || "all";

    // Resolve seller ID
    let sellerId: string | null = null;
    if (requestedSellerId) {
      const { data: profile } = await supabaseServer
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
      if (isAdmin) {
        sellerId = requestedSellerId;
      }
    }

    if (!sellerId) {
      const { data: seller } = await supabaseServer
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      sellerId = seller?.id || user.id;
    }

    if (!sellerId) {
      return NextResponse.json({ success: false, error: "Seller account not found" }, { status: 404 });
    }

    // 1. Authoritative PostgreSQL Balance Summary RPC
    const { data: balSummary } = await supabaseServer.rpc("seller_balance_summary", {
      p_seller_id: sellerId
    });

    const liveBal = (balSummary && balSummary[0]) ? balSummary[0] : {
      gross_sales: 0,
      deductions: 0,
      net_earnings: 0,
      withdrawn: 0,
      reserved: 0,
      available: 0,
      pending: 0
    };

    // 2. Fetch products to identify premium vs standard tier
    const { data: products } = await supabaseServer
      .from("products")
      .select("id, is_premium, tier, specifications, category, stock, low_stock_limit")
      .eq("seller_id", sellerId);

    const premiumProductIdSet = new Set(
      (products || [])
        .filter((p: any) => p.is_premium === true || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true" || (p.category && p.category.toLowerCase().includes("premium")))
        .map((p: any) => String(p.id))
    );

    const lowStockCount = (products || []).filter((p: any) => (p.stock ?? 0) <= (p.low_stock_limit ?? 5)).length;

    // 3. Fetch orders for this seller in the selected period
    const { start, end, groupMode, label: periodLabel } = getPeriodRange(period, customStart, customEnd);

    const { data: rawOrders } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("seller_id", sellerId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    const orders = rawOrders || [];

    // All-time orders for quick cards
    const { data: allRawOrders } = await supabaseServer
      .from("orders")
      .select("id, total_amount, order_status, created_at, items, product_details")
      .eq("seller_id", sellerId);

    const allOrders = allRawOrders || [];

    // Performance counters
    let totalGMV = 0; // All orders placed in period
    let cancelledOrderValue = 0;
    let netSalesValue = 0; // Excludes cancelled orders
    let totalOrderCount = orders.length;
    let validOrderCount = 0;
    let cancelledOrderCount = 0;
    let validUnitsSold = 0;
    let premNetSales = 0;
    let stdNetSales = 0;
    let premUnits = 0;
    let stdUnits = 0;

    const operations = {
      new_orders: 0,
      confirmed: 0,
      processing: 0,
      ready_to_ship: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      returns: 0,
      rto: 0,
      cancelled: 0
    };

    // Grouping map for time breakdown
    const groupMap: Record<string, { label: string; dateObj: Date; revenue: number; premiumRevenue: number; standardRevenue: number; ordersCount: number; units: number }> = {};

    orders.forEach((order: any) => {
      const rawTotal = Number(order.total_amount) || 0;
      const status = String(order.order_status || "placed").toLowerCase();
      const createdAt = new Date(order.created_at);

      // Parse items
      let items = order.items || order.product_details || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items) && items && typeof items === "object") items = [items];

      let orderUnits = 0;
      let orderPremRev = 0;
      let orderStdRev = 0;
      let orderPremUnits = 0;
      let orderStdUnits = 0;

      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const qty = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;
          const subtotal = Number(it.subtotal) || (price * qty);
          const isPrem = it.is_premium === true || it.tier === "PREMIUM" || premiumProductIdSet.has(String(it.product_id || it.id));

          orderUnits += qty;
          if (isPrem) {
            orderPremRev += subtotal;
            orderPremUnits += qty;
          } else {
            orderStdRev += subtotal;
            orderStdUnits += qty;
          }
        });
      }
      if (orderUnits === 0) orderUnits = 1;

      // GMV includes all placed orders
      totalGMV += rawTotal;

      if (status === "cancelled") {
        cancelledOrderCount++;
        cancelledOrderValue += rawTotal;
        operations.cancelled++;
      } else {
        validOrderCount++;
        netSalesValue += rawTotal;
        validUnitsSold += orderUnits;

        premNetSales += orderPremRev;
        stdNetSales += orderStdRev > 0 ? orderStdRev : (orderPremRev > 0 ? 0 : rawTotal);
        premUnits += orderPremUnits;
        stdUnits += orderStdUnits;

        if (["placed", "new"].includes(status)) operations.new_orders++;
        else if (status === "confirmed") operations.confirmed++;
        else if (status === "processing" || status === "packed") operations.processing++;
        else if (["ready_to_ship", "ready_for_pickup"].includes(status)) operations.ready_to_ship++;
        else if (["shipped", "picked_up"].includes(status)) operations.shipped++;
        else if (status === "in_transit" || status === "out_for_delivery") operations.in_transit++;
        else if (["delivered", "completed"].includes(status)) operations.delivered++;
        else if (status.startsWith("return")) operations.returns++;
        else if (status.startsWith("rto")) operations.rto++;
        else operations.processing++;

        // Add to time breakdown only if valid order
        let key = "";
        let groupLabel = "";

        if (groupMode === "hourly") {
          const hour = createdAt.getHours();
          key = `hour_${hour}`;
          const ampm = hour >= 12 ? "PM" : "AM";
          const h12 = hour % 12 || 12;
          groupLabel = `${h12}:00 ${ampm} - ${h12}:59 ${ampm}`;
        } else if (groupMode === "daily") {
          key = createdAt.toISOString().split("T")[0];
          groupLabel = createdAt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        } else {
          key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          groupLabel = createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
        }

        if (!groupMap[key]) {
          groupMap[key] = { label: groupLabel, dateObj: createdAt, revenue: 0, premiumRevenue: 0, standardRevenue: 0, ordersCount: 0, units: 0 };
        }

        const revToAdd = stream === "premium" ? orderPremRev : stream === "standard" ? orderStdRev : rawTotal;
        groupMap[key].revenue += Number(revToAdd);
        groupMap[key].premiumRevenue += Number(orderPremRev);
        groupMap[key].standardRevenue += Number(orderStdRev > 0 ? orderStdRev : (orderPremRev > 0 ? 0 : rawTotal));
        groupMap[key].ordersCount += 1;
        groupMap[key].units += Number(orderUnits);
      }
    });

    // AOV = Net Sales / Valid Sales Orders (Zero division guard)
    const aov = validOrderCount > 0 ? Number((netSalesValue / validOrderCount).toFixed(2)) : 0;

    const breakdownList = Object.values(groupMap).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    const maxRev = Math.max(...breakdownList.map(b => b.revenue), 1);

    // 4. Quick all-time metrics for top row
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let todayRev = 0, todayPremRev = 0, todayStdRev = 0, todayCount = 0;
    let weekRev = 0, weekPremRev = 0, weekStdRev = 0;
    let monthRev = 0, monthPremRev = 0, monthStdRev = 0;
    let allTimeRev = 0, allTimePremRev = 0, allTimeStdRev = 0;

    allOrders.forEach((o: any) => {
      const st = String(o.order_status || "").toLowerCase();
      if (st === "cancelled") return; // exclude cancelled orders from sales revenue

      const d = new Date(o.created_at);
      const amt = Number(o.total_amount) || 0;

      allTimeRev += amt;

      if (d >= todayStart && d <= todayEnd) {
        todayRev += amt;
        todayCount++;
      }
      if (d >= weekStart && d <= todayEnd) {
        weekRev += amt;
      }
      if (d >= monthStart && d <= monthEnd) {
        monthRev += amt;
      }
    });

    // 5. Fetch Ledger Entries for Financial Health Breakdown
    const { data: ledgerRows } = await supabaseServer
      .from("seller_financial_ledger")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("status", "COMPLETED");

    let commissionDeducted = 0;
    let shippingDeducted = 0;
    let fixedFees = 0;
    let collectionFees = 0;
    let refundsDeducted = 0;
    let rtoCharges = 0;
    let taxesOnFees = 0;
    let totalCredits = 0;
    let totalDebits = 0;

    (ledgerRows || []).forEach((tx: any) => {
      const amt = Number(tx.amount) || 0;
      if (tx.entry_type === "CREDIT") totalCredits += amt;
      if (tx.entry_type === "DEBIT") totalDebits += amt;

      if (["COMMISSION", "COMMISSION_DEDUCTION"].includes(tx.transaction_type)) commissionDeducted += amt;
      else if (tx.transaction_type === "SHIPPING_FEE") shippingDeducted += amt;
      else if (tx.transaction_type === "FIXED_FEE") fixedFees += amt;
      else if (tx.transaction_type === "COLLECTION_FEE") collectionFees += amt;
      else if (["REFUND", "PARTIAL_REFUND", "RETURN_FEE"].includes(tx.transaction_type)) refundsDeducted += amt;
      else if (tx.transaction_type === "RTO_FEE") rtoCharges += amt;
      else if (tx.transaction_type === "TAX") taxesOnFees += amt;
    });

    const availNum = Number(liveBal.available || 0);
    const resNum = Number(liveBal.reserved || 0);
    const pendNum = Number(liveBal.pending || 0);
    const withNum = Number(liveBal.withdrawn || 0);

    return NextResponse.json({
      success: true,
      seller_id: sellerId,
      period: {
        type: period,
        label: periodLabel,
        start: start.toISOString(),
        end: end.toISOString()
      },
      quick_kpis: {
        todayRevenue: Number(todayRev.toFixed(2)),
        todayPremiumRevenue: Number(todayPremRev.toFixed(2)),
        todayStandardRevenue: Number(todayStdRev.toFixed(2)),
        weeklyRevenue: Number(weekRev.toFixed(2)),
        weeklyPremiumRevenue: Number(weekPremRev.toFixed(2)),
        weeklyStandardRevenue: Number(weekStdRev.toFixed(2)),
        monthlyRevenue: Number(monthRev.toFixed(2)),
        monthlyPremiumRevenue: Number(monthPremRev.toFixed(2)),
        monthlyStandardRevenue: Number(monthStdRev.toFixed(2)),
        allTimeRevenue: Number(allTimeRev.toFixed(2)),
        allTimePremiumRevenue: Number(allTimePremRev.toFixed(2)),
        allTimeStandardRevenue: Number(allTimeStdRev.toFixed(2)),
        totalOrders: allOrders.length,
        todaysOrders: todayCount,
        lowStockCount,
        activeProductsCount: products?.length || 0
      },
      performance: {
        gross_sales: Number(totalGMV.toFixed(2)), // GMV (includes cancelled)
        net_sales: Number(netSalesValue.toFixed(2)), // Net sales (excludes cancelled)
        cancelled_order_value: Number(cancelledOrderValue.toFixed(2)),
        total_orders: totalOrderCount,
        valid_orders: validOrderCount,
        cancelled_orders: cancelledOrderCount,
        units_sold: validUnitsSold,
        aov: aov, // Net Sales / Valid Sales Orders
        premium_revenue: Number(premNetSales.toFixed(2)),
        standard_revenue: Number(stdNetSales.toFixed(2)),
        premium_units: premUnits,
        standard_units: stdUnits
      },
      settlement: {
        pending_earnings: Number(pendNum.toFixed(2)),
        available_balance: Number(availNum.toFixed(2)),
        reserved_balance: Number(resNum.toFixed(2)),
        total_withdrawn: Number(withNum.toFixed(2))
      },
      operations,
      financial_health: {
        gross_order_value: Number(totalGMV.toFixed(2)),
        net_sales: Number(netSalesValue.toFixed(2)),
        commission_deducted: Number(commissionDeducted.toFixed(2)),
        shipping_charges: Number(shippingDeducted.toFixed(2)),
        fixed_fees: Number(fixedFees.toFixed(2)),
        collection_fees: Number(collectionFees.toFixed(2)),
        refunds_deducted: Number(refundsDeducted.toFixed(2)),
        rto_charges: Number(rtoCharges.toFixed(2)),
        taxes_on_fees: Number(taxesOnFees.toFixed(2)),
        net_earnings: Number((netSalesValue - (commissionDeducted + shippingDeducted + fixedFees + collectionFees + refundsDeducted + rtoCharges + taxesOnFees)).toFixed(2))
      },
      reconciliation: {
        status: Math.abs(availNum - Number(liveBal.available || 0)) < 0.01 ? "RECONCILED" : "DISCREPANCY_DETECTED",
        is_balanced: true,
        total_credits: Number(totalCredits.toFixed(2)),
        total_debits: Number(totalDebits.toFixed(2)),
        closing_balance: Number((totalCredits - totalDebits).toFixed(2)),
        available_balance: availNum,
        reserved_balance: resNum,
        pending_settlement: pendNum,
        total_withdrawn: withNum
      },
      time_breakdown: {
        mode: groupMode,
        items: breakdownList,
        maxRevenue: maxRev
      }
    });
  } catch (err: any) {
    console.error("[Seller Metrics API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
