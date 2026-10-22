import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import { computeLedgerBalances, DEFAULT_FINANCIAL_RULES } from "@/shared/services/financialLedgerService";
import { LedgerTransaction } from "@/shared/types/ledger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Authenticates the user from session cookies or Bearer token header
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

/**
 * GET /api/payments
 * ZebAlpha UPI-Only Seller Settlement & Financial Ledger API.
 * Fetches real-time financial ledger transactions, verified UPI settlement methods,
 * on-demand UPI payout history, and dynamic computed balances.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSellerId = searchParams.get("sellerId");

    // Check if the caller is an administrator if attempting to view another seller's financial data
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

    // Default to the authenticated user's own seller record
    let sellerRecord: any = null;
    if (!sellerId) {
      const { data: seller } = await supabaseServer
        .from("sellers")
        .select("id, business_name, phonepay_number, phonepay_no, upi_id, razorpay_account_id, route_onboarding_status, route_verification_status, route_settlement_method, route_upi_id, route_bank_account, settlement_hold_days, auto_settlement_enabled, is_suspended, status")
        .eq("user_id", user.id)
        .maybeSingle();

      sellerRecord = seller;
      sellerId = seller?.id || user.id;
    } else {
      const { data: seller } = await supabaseServer
        .from("sellers")
        .select("id, business_name, phonepay_number, phonepay_no, upi_id, razorpay_account_id, route_onboarding_status, route_verification_status, route_settlement_method, route_upi_id, route_bank_account, settlement_hold_days, auto_settlement_enabled, is_suspended, status")
        .eq("id", sellerId)
        .maybeSingle();
      sellerRecord = seller;
    }

    if (!sellerId) {
      return NextResponse.json({ success: false, error: "Seller account not found" }, { status: 404 });
    }

    // 1. Fetch live ledger transactions
    let transactions: LedgerTransaction[] = [];
    try {
      const { data: ledgerRows, error: ledgerErr } = await supabaseServer
        .from("seller_financial_ledger")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (ledgerRows && !ledgerErr) {
        transactions = ledgerRows as LedgerTransaction[];
      }
    } catch (_) {}

    // 2. Compute dynamic financial balances from ledger
    let balances = computeLedgerBalances(transactions);

    // Fetch Route authoritative overview view (double-entry minor units)
    let routeOverview: any = null;
    try {
      const { data: roData } = await supabaseServer
        .from("seller_route_financial_overview")
        .select("*")
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (roData) {
        routeOverview = roData;
        balances.gross_sales = Math.max(balances.gross_sales, Number((Number(roData.gross_sales_minor || 0) / 100).toFixed(2)));
        balances.commission = Number((Number(roData.platform_commission_minor || 0) / 100).toFixed(2));
        balances.fixed_fees = Number((Number(roData.fixed_fees_minor || 0) / 100).toFixed(2));
        balances.returns_and_refunds = Number((Number(roData.refund_adjustments_minor || 0) / 100).toFixed(2));
        balances.pending_settlement = Number((Number(roData.pending_settlement_minor || 0) / 100).toFixed(2));
        balances.total_settled = Number((Number(roData.settled_amount_minor || 0) / 100).toFixed(2));
        balances.reserved_balance = Number((Number(roData.reserved_balance_minor || 0) / 100).toFixed(2));
        balances.net_seller_earnings = Math.max(balances.net_seller_earnings, Number((Number(roData.net_earnings_minor || 0) / 100).toFixed(2)));
        const roAvailable = Number((Number(roData.available_balance_minor || roData.available_to_settle || 0) / 100).toFixed(2));
        balances.available_balance = Math.max(balances.available_balance, roAvailable);
      }
    } catch (_) {}

    // Fetch in-flight payouts to ensure reserved balance is 100% accurate
    try {
      const { data: inFlightPayouts } = await supabaseServer
        .from("seller_payout_requests")
        .select("amount")
        .eq("seller_id", sellerId)
        .in("status", ["PENDING", "PROCESSING"]);

      if (inFlightPayouts && inFlightPayouts.length > 0) {
        const totalInFlight = inFlightPayouts.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        balances.reserved_balance = Number(totalInFlight.toFixed(2));
        balances.available_balance = Number(Math.max(0, balances.net_seller_earnings - balances.total_settled - balances.reserved_balance).toFixed(2));
      }
    } catch (_) {}

    // Fallback: If no transactions yet, estimate from delivered orders
    if (transactions.length === 0) {
      try {
        const { data: orders } = await supabaseServer
          .from("orders")
          .select("id, total_amount, payment_method, order_status")
          .eq("seller_id", sellerId)
          .in("order_status", ["DELIVERED", "COMPLETED"]);

        if (orders && orders.length > 0) {
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
                rto_charge: getVal(finRules.rto_charge, mktRules.rtoCharge, 0),
                gst_on_platform_fees_pct: getVal(finRules.gst_on_platform_fees_pct, mktRules.gstRatePct, 0),
                settlement_delay_days: getVal(finRules.settlement_delay_days, mktRules.settlementDelayDays, 0),
                customer_return_window_days: getVal(finRules.customer_return_window_days, mktRules.returnWindowDays, 0),
              };
            }
          } catch (_) {}

          let gross = 0;
          let commission = 0;
          let fixed = 0;
          let shipping = 0;
          let collection = 0;

          orders.forEach((o: any) => {
            const tot = Number(o.total_amount) || 0;
            gross += tot;
            commission += Number(((tot * (activeRules.commission_percentage ?? 0)) / 100).toFixed(2));
            fixed += Number(activeRules.fixed_fee_per_order ?? 0);
            shipping += Number(activeRules.standard_shipping_fee ?? 0);
            if ((o.payment_method || '').toUpperCase() === 'COD') {
              collection += Number(activeRules.cod_handling_fee ?? 0);
            } else {
              collection += Number(((tot * (activeRules.payment_collection_fee_pct ?? 0)) / 100).toFixed(2));
            }
          });

          const totalPlatformFees = Number((commission + fixed + collection).toFixed(2));
          const netEarnings = Number(Math.max(0, gross - (totalPlatformFees + shipping)).toFixed(2));

          balances = {
            gross_sales: Number(gross.toFixed(2)),
            commission: Number(commission.toFixed(2)),
            shipping_fees: Number(shipping.toFixed(2)),
            fixed_fees: Number(fixed.toFixed(2)),
            collection_fees: Number(collection.toFixed(2)),
            returns_and_refunds: 0,
            total_platform_fees: totalPlatformFees,
            net_seller_earnings: netEarnings,
            total_settled: 0,
            available_balance: netEarnings,
            reserved_balance: 0,
            pending_settlement: 0,
            on_hold_balance: 0
          };
        }
      } catch (_) {}
    }

    // 3. Fetch settlements history (legacy and current)
    let settlements: any[] = [];
    try {
      const { data: sRows } = await supabaseServer
        .from("seller_settlements")
        .select("*")
        .or(`seller_id.eq.${sellerId},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (sRows) {
        settlements = sRows;
      }
    } catch (_) {}

    // 4. Fetch Authoritative Verified UPI Payout Account (seller_payout_accounts)
    let payoutAccount: any = null;
    try {
      const { data: pAccount } = await supabaseServer
        .from("seller_payout_accounts")
        .select("id, account_type, masked_upi_id, beneficiary_name, verification_status, verification_reason, verified_at, created_at, updated_at")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .maybeSingle();

      if (pAccount) {
        payoutAccount = pAccount;
      }
    } catch (_) {}

    // 4b. Fetch Verified UPI Settlement Methods (UPI ONLY)
    let settlementMethods: any[] = [];
    let activeSettlementMethod: any = null;
    try {
      const { data: methods } = await supabaseServer
        .from("seller_settlement_methods")
        .select("id, method_type, upi_id, masked_destination, verified_name, is_verified, is_default, status, failure_reason, provider_reference, created_at, updated_at")
        .eq("seller_id", sellerId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (methods && methods.length > 0) {
        const upiMethods = methods.filter((m: any) => (m.method_type || "UPI").toUpperCase() === "UPI");
        settlementMethods = upiMethods.length > 0 ? upiMethods : methods;
        activeSettlementMethod = settlementMethods.find((m: any) => m.is_default && m.is_verified) || settlementMethods[0];
      }
    } catch (_) {}

    // 5. Fetch On-Demand UPI Payout Requests History
    let payoutRequests: any[] = [];
    try {
      const { data: pRows } = await supabaseServer
        .from("seller_payout_requests")
        .select("id, payout_number, method_type, destination_masked, destination_upi, beneficiary_name, amount, status, utr_number, failure_reason, initiated_at, processed_at, created_at")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (pRows) {
        payoutRequests = pRows;
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      balances,
      transactions,
      settlements,
      settlementMethods,
      activeSettlementMethod,
      payoutAccount,
      payoutRequests,
      routeOverview,
      sellerConfig: sellerRecord,
      sellerId
    });
  } catch (err: any) {
    console.error("[Payments API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
