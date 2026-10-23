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

    // 2. Authoritative PostgreSQL Ledger Balances (Canonical Single Source of Truth)
    let balances: any = {
      gross_sales: 0,
      commission: 0,
      shipping_fees: 0,
      fixed_fees: 0,
      collection_fees: 0,
      returns_and_refunds: 0,
      total_platform_fees: 0,
      net_seller_earnings: 0,
      total_settled: 0,
      available_balance: 0,
      reserved_balance: 0,
      pending_settlement: 0,
      on_hold_balance: 0
    };

    try {
      const { data: balSummary, error: balErr } = await supabaseServer.rpc("seller_balance_summary", {
        p_seller_id: sellerId
      });

      if (balSummary && balSummary[0]) {
        const live = balSummary[0];
        const gross = Number(live.gross_sales || 0);
        const ded = Number(live.deductions || 0);
        const net = Number(live.net_earnings || 0);
        const withdr = Number(live.withdrawn || 0);
        const res = Number(live.reserved || 0);
        const avail = Number(live.available || 0);
        const pend = Number(live.pending || 0);

        balances = {
          gross_sales: Number(gross.toFixed(2)),
          commission: Number(ded.toFixed(2)),
          shipping_fees: 0,
          fixed_fees: 0,
          collection_fees: 0,
          returns_and_refunds: 0,
          total_platform_fees: Number(ded.toFixed(2)),
          net_seller_earnings: Number(net.toFixed(2)),
          total_settled: Number(withdr.toFixed(2)),
          available_balance: Number(avail.toFixed(2)),
          reserved_balance: Number(res.toFixed(2)),
          pending_settlement: Number(pend.toFixed(2)),
          on_hold_balance: 0
        };
      }
    } catch (rpcErr) {
      console.error("[seller_balance_summary RPC Error]:", rpcErr);
    }

    // Fetch Route authoritative overview view (double-entry minor units) for backward compatibility
    let routeOverview: any = null;
    try {
      const { data: roData } = await supabaseServer
        .from("seller_route_financial_overview")
        .select("*")
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (roData) {
        routeOverview = roData;
      }
    } catch (_) {}

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
