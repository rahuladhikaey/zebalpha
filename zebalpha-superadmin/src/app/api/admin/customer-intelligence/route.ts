import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "anonymous";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return "Not Provided";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 6) return "******";
  return cleaned.slice(0, 3) + "******" + cleaned.slice(-3);
}

export async function GET(req: Request) {
  try {
    // 1. Authorize Super Admin
    const adminSession = await requireSuperAdmin(req);
    const url = new URL(req.url);

    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const segmentFilter = url.searchParams.get("segment") || "all";
    const platformFilter = url.searchParams.get("platform") || "all";
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const customerIdDetail = url.searchParams.get("customerId");

    // 2. Fetch Segmentation Config
    const { data: configData } = await supabaseServer
      .from("customer_segment_configs")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const config = {
      new_max_delivered: configData?.new_max_delivered ?? 1,
      repeat_min_delivered: configData?.repeat_min_delivered ?? 2,
      repeat_max_delivered: configData?.repeat_max_delivered ?? 4,
      loyal_min_delivered: configData?.loyal_min_delivered ?? 5,
      inactivity_timeout_seconds: configData?.inactivity_timeout_seconds ?? 120,
    };

    // 3. Parallel Database Queries using service role
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - config.inactivity_timeout_seconds * 1000);
    const cutoffIso = cutoffDate.toISOString();

    const [profilesRes, ordersRes, sessionsRes, loginsRes, cartRes] = await Promise.all([
      supabaseServer.from("profiles").select("id, full_name, email, phone_no, created_at, updated_at, status"),
      supabaseServer.from("orders").select("id, order_number, user_id, customer_name, phone, items, product_details, total_amount, discount_amount, order_status, payment_status, created_at").order("created_at", { ascending: false }),
      supabaseServer.from("customer_sessions").select("session_id, user_id, platform, device_type, is_active, created_at, last_heartbeat").order("last_heartbeat", { ascending: false }),
      supabaseServer.from("customer_login_logs").select("user_id, login_method, platform, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabaseServer.from("cart_items").select("id, user_id, product_id, quantity, updated_at, created_at"),
    ]);

    const rawProfiles: any[] = profilesRes.data || [];
    const rawOrders: any[] = ordersRes.data || [];
    const rawSessions: any[] = sessionsRes.data || [];
    const rawLogins: any[] = loginsRes.data || [];
    const rawCartItems: any[] = cartRes.data || [];
    const cartAvailable = !cartRes.error && Array.isArray(cartRes.data);

    // 4. Live Session & Online Computation
    const onlineSessions = rawSessions.filter(
      (s) => s.is_active && s.last_heartbeat && new Date(s.last_heartbeat) >= cutoffDate
    );

    const onlineUserIds = new Set(onlineSessions.filter((s) => s.user_id).map((s) => s.user_id));
    const onlineGuestSessionIds = new Set(onlineSessions.filter((s) => !s.user_id).map((s) => s.session_id));
    const onlineAndroidCount = new Set(onlineSessions.filter((s) => s.platform === "android").map((s) => s.user_id || s.session_id)).size;
    const onlineWebsiteCount = new Set(onlineSessions.filter((s) => s.platform === "website").map((s) => s.user_id || s.session_id)).size;
    const onlineGuestCount = onlineGuestSessionIds.size;
    // Deduplicated unique online customer count (1 user with multiple tabs = 1 online customer)
    const currentlyOnlineTotal = onlineUserIds.size + onlineGuestCount;

    // 5. Aggregate Customer 360° Profiles
    // Group orders by user_id or guest phone/name
    const ordersByCustomerKey: Record<string, any[]> = {};
    const guestProfilesMap: Record<string, any> = {};

    rawOrders.forEach((ord) => {
      let key = ord.user_id;
      if (!key) {
        // Guest customer key based on phone or customer_name
        const guestId = (ord.phone || ord.customer_name || "guest").replace(/\s+/g, "").toLowerCase();
        key = `guest_${guestId}`;
        if (!guestProfilesMap[key]) {
          guestProfilesMap[key] = {
            id: key,
            full_name: ord.customer_name || "Guest Customer",
            email: "",
            phone_no: ord.phone || "",
            created_at: ord.created_at,
            status: "guest",
            is_guest: true,
          };
        }
      }

      if (!ordersByCustomerKey[key]) {
        ordersByCustomerKey[key] = [];
      }
      ordersByCustomerKey[key].push(ord);
    });

    // Combine registered profiles and guest purchaser profiles
    const allCustomerEntities: any[] = [
      ...rawProfiles.map((p) => ({ ...p, is_guest: false })),
      ...Object.values(guestProfilesMap),
    ];

    // Compute Customer-level metrics
    let totalRepeatRevenue = 0;
    let totalFirstTimeRevenue = 0;
    let totalValidDeliveredRevenue = 0;

    const customer360List = allCustomerEntities.map((cust) => {
      const custOrders = ordersByCustomerKey[cust.id] || [];
      const totalOrdersCount = custOrders.length;

      // 1. Eligible delivered or partially returned orders (strictly excluding failed payments & full returns)
      const validDeliveredOrders = custOrders.filter((o) => {
        const os = String(o.order_status || "").toLowerCase();
        const ps = String(o.payment_status || "").toUpperCase();
        if (ps === "FAILED") return false;
        return os === "delivered" || os === "partially_returned";
      });
      const deliveredCount = validDeliveredOrders.length;

      const cancelledCount = custOrders.filter(
        (o) => ["cancelled", "failed", "rejected"].includes(String(o.order_status || "").toLowerCase())
      );
      const returnedCount = custOrders.filter(
        (o) => ["returned", "partially_returned", "refunded", "rto"].includes(String(o.order_status || "").toLowerCase())
      );

      // Net order revenue deducting any refund or returned item amounts
      const getOrderNetRevenue = (o: any) => {
        const total = Number(o.total_amount) || 0;
        const refund = Number(o.refund_amount || o.returned_amount || 0);
        return Math.max(0, total - refund);
      };

      const totalPurchaseValue = validDeliveredOrders.reduce(
        (sum, o) => sum + getOrderNetRevenue(o),
        0
      );

      // First time vs Repeat revenue calculation with net financial rules
      const sortedDelivered = [...validDeliveredOrders].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      if (sortedDelivered.length > 0) {
        totalFirstTimeRevenue += getOrderNetRevenue(sortedDelivered[0]);
        for (let i = 1; i < sortedDelivered.length; i++) {
          totalRepeatRevenue += getOrderNetRevenue(sortedDelivered[i]);
        }
      }
      totalValidDeliveredRevenue += totalPurchaseValue;

      // Determine segment based on delivered orders
      let segment: "New" | "Repeat" | "Loyal" = "New";
      if (deliveredCount >= config.loyal_min_delivered) {
        segment = "Loyal";
      } else if (deliveredCount >= config.repeat_min_delivered) {
        segment = "Repeat";
      }

      // Check online status and last active
      const userSessions = rawSessions.filter((s) => s.user_id === cust.id);
      const isOnline = cust.id ? onlineUserIds.has(cust.id) : false;
      const latestSession = userSessions[0];

      // Last Login
      const userLogins = rawLogins.filter((l) => l.user_id === cust.id && l.status === "SUCCESS");
      const lastLogin = userLogins[0]?.created_at || cust.created_at;

      // Multi-source latest reliable activity timestamp:
      // Includes session heartbeat, order placement, successful login, profile update, and account creation
      const candidateTimestamps: number[] = [
        latestSession?.last_heartbeat ? new Date(latestSession.last_heartbeat).getTime() : 0,
        custOrders[0]?.created_at ? new Date(custOrders[0].created_at).getTime() : 0,
        userLogins[0]?.created_at ? new Date(userLogins[0].created_at).getTime() : 0,
        cust.updated_at ? new Date(cust.updated_at).getTime() : 0,
        cust.created_at ? new Date(cust.created_at).getTime() : 0,
      ].filter((t) => !isNaN(t) && t > 0);

      const latestActivityMs = candidateTimestamps.length > 0 ? Math.max(...candidateTimestamps) : new Date(cust.created_at).getTime();
      const lastActive = new Date(latestActivityMs).toISOString();

      // Customer platform preference
      const androidSessions = userSessions.filter((s) => s.platform === "android").length;
      const webSessions = userSessions.filter((s) => s.platform === "website").length;
      const platformPreference = androidSessions >= webSessions && androidSessions > 0 ? "android" : "website";

      return {
        id: cust.id,
        name: cust.full_name || "Customer",
        email_masked: maskEmail(cust.email),
        phone_masked: maskPhone(cust.phone_no),
        phone_raw: cust.phone_no || "",
        registration_date: cust.created_at,
        last_login: lastLogin,
        last_active: lastActive,
        is_online: isOnline,
        platform_preference: platformPreference,
        is_guest: !!cust.is_guest,
        total_orders: totalOrdersCount,
        delivered_orders: deliveredCount,
        cancelled_orders: cancelledCount.length,
        returned_orders: returnedCount.length,
        total_purchase_value: Math.round(totalPurchaseValue),
        segment,
        orders: custOrders,
      };
    });

    // 6. If customerIdDetail requested, return that single customer's full 360 data + audit log
    if (customerIdDetail) {
      const targetCustomer = customer360List.find((c) => c.id === customerIdDetail);
      if (targetCustomer) {
        // Audit log this profile inspection
        await supabaseServer.from("customer_audit_logs").insert({
          admin_id: (adminSession as any)?.user || "super_admin",
          customer_id: customerIdDetail,
          action: "VIEW_CUSTOMER_360",
          ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
          details: { customer_name: targetCustomer.name, segment: targetCustomer.segment },
        }).then(() => { }).catch(() => { });

        return NextResponse.json({
          success: true,
          customer: targetCustomer,
        });
      }
    }

    // 7. Aggregate KPI Metrics
    const totalCustomersCount = customer360List.length;
    const purchasedCustomers = customer360List.filter((c) => c.delivered_orders > 0);
    const purchasedCount = purchasedCustomers.length;

    const newSegmentCount = customer360List.filter((c) => c.segment === "New").length;
    const repeatSegmentCount = customer360List.filter((c) => c.segment === "Repeat").length;
    const loyalSegmentCount = customer360List.filter((c) => c.segment === "Loyal").length;

    const repeatCustomersTotal = repeatSegmentCount + loyalSegmentCount;
    const repeatPurchaseRate = purchasedCount > 0
      ? Math.round((repeatCustomersTotal / purchasedCount) * 100)
      : 0;

    // Comprehensive Daily Active Users (DAU): Unites logins, active customer sessions, and orders placed
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const activeUserIdsToday = new Set<string>();
    const activeUserIdsLast7D = new Set<string>();
    const activeUserIdsLast30D = new Set<string>();

    // 1. From customer login logs
    rawLogins.forEach((l) => {
      if (l.user_id) {
        const t = new Date(l.created_at).getTime();
        if (t >= startOfToday.getTime()) activeUserIdsToday.add(l.user_id);
        if (t >= sevenDaysAgo.getTime()) activeUserIdsLast7D.add(l.user_id);
        if (t >= thirtyDaysAgo.getTime()) activeUserIdsLast30D.add(l.user_id);
      }
    });

    // 2. From active sessions
    rawSessions.forEach((s) => {
      if (s.user_id && s.last_heartbeat) {
        const t = new Date(s.last_heartbeat).getTime();
        if (t >= startOfToday.getTime()) activeUserIdsToday.add(s.user_id);
        if (t >= sevenDaysAgo.getTime()) activeUserIdsLast7D.add(s.user_id);
        if (t >= thirtyDaysAgo.getTime()) activeUserIdsLast30D.add(s.user_id);
      }
    });

    // 3. From customer orders placed
    rawOrders.forEach((o) => {
      if (o.user_id && o.created_at) {
        const t = new Date(o.created_at).getTime();
        if (t >= startOfToday.getTime()) activeUserIdsToday.add(o.user_id);
        if (t >= sevenDaysAgo.getTime()) activeUserIdsLast7D.add(o.user_id);
        if (t >= thirtyDaysAgo.getTime()) activeUserIdsLast30D.add(o.user_id);
      }
    });

    const uniqueLoginsToday = activeUserIdsToday.size;
    const uniqueLoginsLast7D = activeUserIdsLast7D.size;
    const uniqueLoginsLast30D = activeUserIdsLast30D.size;

    const totalSuccessfulLogins = rawLogins.filter((l) => l.status === "SUCCESS").length;
    const totalFailedLogins = rawLogins.filter((l) => l.status === "FAILED").length;

    // Login methods breakdown
    const loginMethodsBreakdown: Record<string, number> = {};
    rawLogins.forEach((l) => {
      const m = l.login_method || "email_password";
      loginMethodsBreakdown[m] = (loginMethodsBreakdown[m] || 0) + 1;
    });

    // 7. Retention Metrics: Cohort Analysis (Distinct Visit vs Purchase Retention)
    const registeredCustomers = customer360List.filter((c) => !c.is_guest);
    const guestCustomers = customer360List.filter((c) => c.is_guest);

    // A. Purchase Retention Cohorts (Repeat Purchase within 7d, 30d, 90d from 1st delivered order)
    const customersWithDeliveredOrders = registeredCustomers.filter((c) => c.delivered_orders > 0);
    let purchaseRetained7DCount = 0;
    let purchaseCohort7DBase = 0;
    let purchaseRetained30DCount = 0;
    let purchaseCohort30DBase = 0;
    let purchaseRetained90DCount = 0;
    let purchaseCohort90DBase = 0;

    customersWithDeliveredOrders.forEach((c) => {
      const deliveredOrds = c.orders.filter((o: any) => {
        const os = String(o.order_status || "").toLowerCase();
        const ps = String(o.payment_status || "").toUpperCase();
        return ps !== "FAILED" && (os === "delivered" || os === "partially_returned");
      }).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (deliveredOrds.length > 0) {
        const firstDeliveredTime = new Date(deliveredOrds[0].created_at).getTime();
        const daysSinceFirst = (now.getTime() - firstDeliveredTime) / 86400000;

        if (daysSinceFirst >= 7) {
          purchaseCohort7DBase++;
          const hasSecondWithin7D = deliveredOrds.some((o: any, idx: number) => {
            if (idx === 0) return false;
            const t = new Date(o.created_at).getTime();
            return (t - firstDeliveredTime) <= 7 * 86400000;
          });
          if (hasSecondWithin7D) purchaseRetained7DCount++;
        }

        if (daysSinceFirst >= 30) {
          purchaseCohort30DBase++;
          const hasSecondWithin30D = deliveredOrds.some((o: any, idx: number) => {
            if (idx === 0) return false;
            const t = new Date(o.created_at).getTime();
            return (t - firstDeliveredTime) <= 30 * 86400000;
          });
          if (hasSecondWithin30D) purchaseRetained30DCount++;
        }

        if (daysSinceFirst >= 90) {
          purchaseCohort90DBase++;
          const hasSecondWithin90D = deliveredOrds.some((o: any, idx: number) => {
            if (idx === 0) return false;
            const t = new Date(o.created_at).getTime();
            return (t - firstDeliveredTime) <= 90 * 86400000;
          });
          if (hasSecondWithin90D) purchaseRetained90DCount++;
        }
      }
    });

    const purchaseRetention7D = purchaseCohort7DBase > 0 ? Math.round((purchaseRetained7DCount / purchaseCohort7DBase) * 100) : 0;
    const purchaseRetention30D = purchaseCohort30DBase > 0 ? Math.round((purchaseRetained30DCount / purchaseCohort30DBase) * 100) : 0;
    const purchaseRetention90D = purchaseCohort90DBase > 0 ? Math.round((purchaseRetained90DCount / purchaseCohort90DBase) * 100) : 0;

    // B. Visit / Platform Activity Retention (Session/Login activity between Day 1 and Day N after registration)
    let visitCohort7DBase = 0;
    let visitRetained7DCount = 0;
    let visitCohort30DBase = 0;
    let visitRetained30DCount = 0;
    let visitCohort90DBase = 0;
    let visitRetained90DCount = 0;

    registeredCustomers.forEach((c) => {
      const regTime = new Date(c.registration_date).getTime();
      const daysSinceReg = (now.getTime() - regTime) / 86400000;
      const lastActiveTime = new Date(c.last_active).getTime();
      const returnedAfterDay1 = (lastActiveTime - regTime) >= 86400000;

      if (daysSinceReg >= 7) {
        visitCohort7DBase++;
        if (returnedAfterDay1 && (lastActiveTime - regTime) <= 7 * 86400000) {
          visitRetained7DCount++;
        }
      }
      if (daysSinceReg >= 30) {
        visitCohort30DBase++;
        if (returnedAfterDay1 && (lastActiveTime - regTime) <= 30 * 86400000) {
          visitRetained30DCount++;
        }
      }
      if (daysSinceReg >= 90) {
        visitCohort90DBase++;
        if (returnedAfterDay1 && (lastActiveTime - regTime) <= 90 * 86400000) {
          visitRetained90DCount++;
        }
      }
    });

    const visitRetention7D = visitCohort7DBase > 0 ? Math.round((visitRetained7DCount / visitCohort7DBase) * 100) : 0;
    const visitRetention30D = visitCohort30DBase > 0 ? Math.round((visitRetained30DCount / visitCohort30DBase) * 100) : 0;
    const visitRetention90D = visitCohort90DBase > 0 ? Math.round((visitRetained90DCount / visitCohort90DBase) * 100) : 0;

    // Inactive registered customers (no activity across any source in 30 days)
    const inactiveCount = registeredCustomers.filter((c) => new Date(c.last_active) < thirtyDaysAgo).length;

    // Real Cart Abandoners Calculation
    // Rules: Valid user_id, age >= 24h, not expired (> 30d), qty > 0, no subsequent completed order, no purchased cart item match
    let cartAbandonersCount = 0;
    if (cartAvailable && rawCartItems.length > 0) {
      const twentyFourHoursAgoMs = now.getTime() - 24 * 3600000;
      const thirtyDaysAgoMs = now.getTime() - 30 * 86400000;
      const cartItemsByUser: Record<string, any[]> = {};

      rawCartItems.forEach((item: any) => {
        const uid = item.user_id;
        const qty = Number(item.quantity) || 0;
        if (!uid || qty <= 0) return; // Ignore unowned, zero-quantity, or corrupt rows

        const itemTime = new Date(item.updated_at || item.created_at).getTime();
        // Item age must be >= 24 hours, and within 30 days window (not expired garbage)
        if (itemTime <= twentyFourHoursAgoMs && itemTime >= thirtyDaysAgoMs) {
          if (!cartItemsByUser[uid]) cartItemsByUser[uid] = [];
          cartItemsByUser[uid].push({ ...item, itemTime });
        }
      });

      Object.entries(cartItemsByUser).forEach(([uid, items]) => {
        const userOrds = ordersByCustomerKey[uid] || [];
        const newestItemTime = Math.max(...items.map((i) => i.itemTime));
        const cartProductIds = new Set(items.map((i) => String(i.product_id)));

        // Check if user placed a subsequent successful/confirmed/delivered order
        const hasSubsequentOrder = userOrds.some((o: any) => {
          const ordTime = new Date(o.created_at).getTime();
          const os = String(o.order_status || "").toLowerCase();
          const ps = String(o.payment_status || "").toUpperCase();
          const isValidOrder = ps !== "FAILED" && !["cancelled", "rejected"].includes(os);
          return isValidOrder && ordTime >= newestItemTime;
        });

        // Check if any subsequent order purchased any of the cart products
        const hasPurchasedCartProducts = userOrds.some((o: any) => {
          const ordTime = new Date(o.created_at).getTime();
          if (ordTime < newestItemTime) return false;
          const orderItems = o.items || o.product_details || [];
          if (Array.isArray(orderItems)) {
            return orderItems.some((oi: any) => cartProductIds.has(String(oi.product_id || oi.id)));
          }
          return false;
        });

        if (!hasSubsequentOrder && !hasPurchasedCartProducts) {
          cartAbandonersCount++;
        }
      });
    }

    // Retention Card Scope (Filtered by selected Date Range - Customer Acquisition Cohort)
    const dateFilterType = url.searchParams.get("dateFilter") || "all";
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (dateFilterType === "today") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      rangeEnd = now;
    } else if (dateFilterType === "last7days") {
      rangeStart = new Date(now.getTime() - 7 * 86400000);
      rangeEnd = now;
    } else if (dateFilterType === "last30days") {
      rangeStart = new Date(now.getTime() - 30 * 86400000);
      rangeEnd = now;
    } else if (dateFilterType === "last90days") {
      rangeStart = new Date(now.getTime() - 90 * 86400000);
      rangeEnd = now;
    } else if (startDateParam && endDateParam) {
      rangeStart = new Date(startDateParam + "T00:00:00.000Z");
      rangeEnd = new Date(endDateParam + "T23:59:59.999Z");
    }

    // Registered customer acquisition cohort within date filter
    const scopedRegistered = (rangeStart && rangeEnd)
      ? registeredCustomers.filter((c) => {
        const reg = new Date(c.registration_date);
        return reg >= rangeStart! && reg <= rangeEnd!;
      })
      : registeredCustomers;

    const scopeRegisteredTotal = scopedRegistered.length;

    // 3 Mutually Exclusive Purchase Segments: New, Repeat, Loyal
    // Every registered customer belongs to exactly one segment: New (0-1), Repeat (2-4), Loyal (5+)
    const scopeNew = scopedRegistered.filter((c) => c.delivered_orders <= config.new_max_delivered).length;
    const scopeRepeat = scopedRegistered.filter(
      (c) => c.delivered_orders >= config.repeat_min_delivered && c.delivered_orders <= config.repeat_max_delivered
    ).length;
    const scopeLoyal = scopedRegistered.filter((c) => c.delivered_orders >= config.loyal_min_delivered).length;

    // Percentages calculated strictly over scopeRegisteredTotal
    let pNew = scopeRegisteredTotal > 0 ? Number(((scopeNew / scopeRegisteredTotal) * 100).toFixed(1)) : 0;
    let pRepeat = scopeRegisteredTotal > 0 ? Number(((scopeRepeat / scopeRegisteredTotal) * 100).toFixed(1)) : 0;
    let pLoyal = scopeRegisteredTotal > 0 ? Number(((scopeLoyal / scopeRegisteredTotal) * 100).toFixed(1)) : 0;

    // Mathematical reconciliation to ensure exact 100.0% sum
    if (scopeRegisteredTotal > 0) {
      const sum = Number((pNew + pRepeat + pLoyal).toFixed(1));
      const diff = Number((100.0 - sum).toFixed(1));
      if (Math.abs(diff) > 0.001) {
        if (pNew >= pRepeat && pNew >= pLoyal) pNew = Number((pNew + diff).toFixed(1));
        else if (pRepeat >= pLoyal) pRepeat = Number((pRepeat + diff).toFixed(1));
        else pLoyal = Number((pLoyal + diff).toFixed(1));
      }
    }

    const retentionSegments = [
      { id: "new", name: "New Customers", count: scopeNew, color: "#38BDF8", description: "0–1 Delivered Orders", percentage: pNew },
      { id: "repeat", name: "Frequent / Repeat", count: scopeRepeat, color: "#FBBF24", description: "2–4 Delivered Orders", percentage: pRepeat },
      { id: "loyal", name: "Loyal Customers", count: scopeLoyal, color: "#A855F7", description: "5+ Delivered Orders", percentage: pLoyal },
    ];

    // Repeat Purchase Rate: Denominator is customers with at least 1 delivered order
    const scopePurchasedCount = scopedRegistered.filter((c) => c.delivered_orders >= 1).length;
    const scopeRepeatCount = scopeRepeat + scopeLoyal;
    const scopeRepeatPurchaseRate = scopePurchasedCount > 0
      ? Number(((scopeRepeatCount / scopePurchasedCount) * 100).toFixed(1))
      : 0;
    const scopeRepeatShareOfTotal = scopeRegisteredTotal > 0
      ? Number(((scopeRepeatCount / scopeRegisteredTotal) * 100).toFixed(1))
      : 0;

    // Activity counts for the scoped registered customers
    const scopeInactive = scopedRegistered.filter((c) => new Date(c.last_active) < thirtyDaysAgo).length;
    const scopeActive = Math.max(0, scopeRegisteredTotal - scopeInactive);

    // 8. Filter Customer Table
    let filteredList = customer360List;

    if (search) {
      filteredList = filteredList.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.id.toLowerCase().includes(search) ||
          c.phone_raw.includes(search) ||
          c.phone_masked.includes(search) ||
          c.email_masked.toLowerCase().includes(search)
      );
    }

    if (segmentFilter !== "all") {
      if (segmentFilter === "online") {
        filteredList = filteredList.filter((c) => c.is_online);
      } else {
        filteredList = filteredList.filter((c) => c.segment.toLowerCase() === segmentFilter.toLowerCase());
      }
    }

    if (platformFilter !== "all") {
      filteredList = filteredList.filter((c) => c.platform_preference === platformFilter);
    }

    if (startDateParam && endDateParam) {
      const s = new Date(startDateParam);
      const e = new Date(endDateParam);
      filteredList = filteredList.filter((c) => {
        const reg = new Date(c.registration_date);
        return reg >= s && reg <= e;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        liveMonitor: {
          currentlyOnlineTotal,
          onlineAndroidCount,
          onlineWebsiteCount,
          onlineGuestCount,
          inactivityTimeoutSeconds: config.inactivity_timeout_seconds,
          lastUpdated: now.toISOString(),
        },
        kpis: {
          totalCustomers: totalCustomersCount,
          registeredCount: rawProfiles.length,
          guestShoppersCount: Object.keys(guestProfilesMap).length,
          purchasedCustomersCount: purchasedCount,
          repeatCustomerRate: repeatPurchaseRate,
          repeatCustomersCount: repeatCustomersTotal,
          newCustomersCount: newSegmentCount,
          repeatSegmentCount,
          loyalSegmentCount,
          firstTimeRevenue: Math.round(totalFirstTimeRevenue),
          repeatRevenue: Math.round(totalRepeatRevenue),
          totalDeliveredRevenue: Math.round(totalValidDeliveredRevenue),
          averageClv: purchasedCount > 0 ? Math.round(totalValidDeliveredRevenue / purchasedCount) : 0,
          ordersPerCustomer: totalCustomersCount > 0 ? (rawOrders.length / totalCustomersCount).toFixed(1) : "0",
        },
        loginAnalytics: {
          uniqueLoginsToday,
          uniqueLoginsLast7D,
          uniqueLoginsLast30D,
          totalSuccessfulLogins,
          totalFailedLogins,
          loginMethodsBreakdown,
        },
        retention: {
          retention7D: purchaseRetention7D,
          retention30D: purchaseRetention30D,
          retention90D: purchaseRetention90D,
          visitRetention7D,
          visitRetention30D,
          visitRetention90D,
          inactiveCount,
        },
        retentionCard: {
          totalCustomers: scopeRegisteredTotal,
          registeredCount: rawProfiles.length,
          guestCount: Object.keys(guestProfilesMap).length,
          purchasedCount: scopePurchasedCount,
          activeCount: scopeActive,
          inactiveCount: scopeInactive,
          repeatPurchaseRate: scopeRepeatPurchaseRate,
          repeatShareOfRegistered: scopeRepeatShareOfTotal,
          retentionRate7D: purchaseRetention7D,
          retentionRate30D: purchaseRetention30D,
          retentionRate90D: purchaseRetention90D,
          dateFilterApplied: dateFilterType,
          dateFilterScopeDoc: "Customer Acquisition Cohort: Scoped to registered customers whose account was created within the selected date range, tracking their lifetime purchase segment (New, Repeat, Loyal) and activity status.",
          segments: retentionSegments,
          activityMetrics: {
            activeCustomersCount: scopeActive,
            inactiveCustomersCount: scopeInactive,
            cartAbandonersCount: cartAbandonersCount,
            isCartUnavailable: !cartAvailable,
            guestVisitorsCount: Object.keys(guestProfilesMap).length,
            registeredCustomersCount: rawProfiles.length,
            visitRetentionRate7D: visitRetention7D,
            visitRetentionRate30D: visitRetention30D,
            visitRetentionRate90D: visitRetention90D,
            purchaseRetentionRate7D: purchaseRetention7D,
            purchaseRetentionRate30D: purchaseRetention30D,
            purchaseRetentionRate90D: purchaseRetention90D,
          },
        },
        config,
        customers: filteredList.slice(0, 100), // Paginated preview
        totalFiltered: filteredList.length,
      },
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Customer intelligence API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

