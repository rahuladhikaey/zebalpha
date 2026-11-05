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

    const [profilesRes, ordersRes, sessionsRes, loginsRes] = await Promise.all([
      supabaseServer.from("profiles").select("id, full_name, email, phone_no, created_at, updated_at, status"),
      supabaseServer.from("orders").select("id, order_number, user_id, customer_name, phone, items, product_details, total_amount, order_status, payment_status, created_at").order("created_at", { ascending: false }),
      supabaseServer.from("customer_sessions").select("session_id, user_id, platform, device_type, is_active, created_at, last_heartbeat").order("last_heartbeat", { ascending: false }),
      supabaseServer.from("customer_login_logs").select("user_id, login_method, platform, status, created_at").order("created_at", { ascending: false }).limit(200),
    ]);

    const rawProfiles: any[] = profilesRes.data || [];
    const rawOrders: any[] = ordersRes.data || [];
    const rawSessions: any[] = sessionsRes.data || [];
    const rawLogins: any[] = loginsRes.data || [];

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

      const deliveredOrders = custOrders.filter(
        (o) => String(o.order_status || "").toLowerCase() === "delivered"
      );
      const deliveredCount = deliveredOrders.length;

      const cancelledCount = custOrders.filter(
        (o) => ["cancelled", "failed", "rejected"].includes(String(o.order_status || "").toLowerCase())
      );
      const returnedCount = custOrders.filter(
        (o) => ["returned", "partially_returned", "refunded", "rto"].includes(String(o.order_status || "").toLowerCase())
      );

      const totalPurchaseValue = deliveredOrders.reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0),
        0
      );

      // First time vs Repeat revenue calculation
      const sortedDelivered = [...deliveredOrders].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      if (sortedDelivered.length > 0) {
        totalFirstTimeRevenue += Number(sortedDelivered[0].total_amount) || 0;
        for (let i = 1; i < sortedDelivered.length; i++) {
          totalRepeatRevenue += Number(sortedDelivered[i].total_amount) || 0;
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
      const lastActive = latestSession?.last_heartbeat || cust.updated_at || cust.created_at;

      // Customer platform preference
      const androidSessions = userSessions.filter((s) => s.platform === "android").length;
      const webSessions = userSessions.filter((s) => s.platform === "website").length;
      const platformPreference = androidSessions >= webSessions && androidSessions > 0 ? "android" : "website";

      // Last Login
      const userLogins = rawLogins.filter((l) => l.user_id === cust.id && l.status === "SUCCESS");
      const lastLogin = userLogins[0]?.created_at || cust.created_at;

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
        }).then(() => {}).catch(() => {});

        return NextResponse.json({
          success: true,
          customer: targetCustomer,
        });
      }
    }

    // 7. Aggregate KPI Metrics
    const totalCustomersCount = customer360List.length;
    const purchasedCustomers = customer360List.filter((c) => c.total_orders > 0);
    const purchasedCount = purchasedCustomers.length;

    const newSegmentCount = customer360List.filter((c) => c.segment === "New").length;
    const repeatSegmentCount = customer360List.filter((c) => c.segment === "Repeat").length;
    const loyalSegmentCount = customer360List.filter((c) => c.segment === "Loyal").length;

    const repeatCustomersTotal = repeatSegmentCount + loyalSegmentCount;
    const repeatPurchaseRate = purchasedCount > 0
      ? Math.round((repeatCustomersTotal / purchasedCount) * 100)
      : 0;

    // Login analytics
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const loginsToday = rawLogins.filter((l) => new Date(l.created_at) >= startOfToday);
    const uniqueLoginsToday = new Set(loginsToday.map((l) => l.user_id).filter(Boolean)).size;

    const loginsLast7D = rawLogins.filter((l) => new Date(l.created_at) >= sevenDaysAgo);
    const uniqueLoginsLast7D = new Set(loginsLast7D.map((l) => l.user_id).filter(Boolean)).size;

    const loginsLast30D = rawLogins.filter((l) => new Date(l.created_at) >= thirtyDaysAgo);
    const uniqueLoginsLast30D = new Set(loginsLast30D.map((l) => l.user_id).filter(Boolean)).size;

    const totalSuccessfulLogins = rawLogins.filter((l) => l.status === "SUCCESS").length;
    const totalFailedLogins = rawLogins.filter((l) => l.status === "FAILED").length;

    // Login methods breakdown
    const loginMethodsBreakdown: Record<string, number> = {};
    rawLogins.forEach((l) => {
      const m = l.login_method || "email_password";
      loginMethodsBreakdown[m] = (loginMethodsBreakdown[m] || 0) + 1;
    });

    // Retention Metrics (Cohort simulation from actual order dates)
    const customersWithOrders = customer360List.filter((c) => c.orders.length > 0);
    let retained7DCount = 0;
    let retained30DCount = 0;
    let retained90DCount = 0;

    customersWithOrders.forEach((c) => {
      const dates = c.orders.map((o: any) => new Date(o.created_at).getTime()).sort((a: number, b: number) => a - b);
      if (dates.length > 1) {
        const first = dates[0];
        const spanDays = (dates[dates.length - 1] - first) / 86400000;
        if (spanDays <= 7) retained7DCount++;
        if (spanDays <= 30) retained30DCount++;
        if (spanDays <= 90) retained90DCount++;
      }
    });

    const retention7D = customersWithOrders.length > 0 ? Math.round((retained7DCount / customersWithOrders.length) * 100) : 0;
    const retention30D = customersWithOrders.length > 0 ? Math.round((retained30DCount / customersWithOrders.length) * 100) : 0;
    const retention90D = customersWithOrders.length > 0 ? Math.round((retained90DCount / customersWithOrders.length) * 100) : 0;

    // Inactive customers (no activity in 30 days)
    const inactiveCount = customer360List.filter((c) => new Date(c.last_active) < thirtyDaysAgo).length;

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
          retention7D,
          retention30D,
          retention90D,
          inactiveCount,
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

