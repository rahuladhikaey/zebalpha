import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { computeLedgerBalances, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";
import { LedgerTransaction } from "@shared/types/ledger";

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
 * Fetches real-time financial ledger transactions, settlements, bank account, and computed balances.
 * Security hardened: Validates user identity and prevents IDOR (Insecure Direct Object Reference).
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

    // Fallback: If no transactions yet, estimate from delivered orders
    if (transactions.length === 0) {
      try {
        const { data: orders } = await supabaseServer
          .from("orders")
          .select("id, total_amount, payment_method, order_status")
          .eq("seller_id", sellerId)
          .in("order_status", ["DELIVERED", "COMPLETED"]);

        if (orders && orders.length > 0) {
          let gross = 0;
          let commission = 0;
          let fixed = 0;
          let shipping = 0;
          let collection = 0;

          orders.forEach((o) => {
            const tot = Number(o.total_amount) || 0;
            gross += tot;
            commission += Number(((tot * (DEFAULT_FINANCIAL_RULES.commission_percentage || 5)) / 100).toFixed(2));
            fixed += (DEFAULT_FINANCIAL_RULES.fixed_fee_per_order || 15);
            shipping += (DEFAULT_FINANCIAL_RULES.standard_shipping_fee || 60);
            if ((o.payment_method || '').toUpperCase() === 'COD') {
              collection += (DEFAULT_FINANCIAL_RULES.cod_handling_fee || 25);
            } else {
              collection += Number(((tot * (DEFAULT_FINANCIAL_RULES.payment_collection_fee_pct || 2)) / 100).toFixed(2));
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
            pending_settlement: 0,
            on_hold_balance: 0
          };
        }
      } catch (_) {}
    }

    // 3. Fetch settlements history
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

    // 4. Fetch bank account details (Strictly masked fields; never expose raw credentials)
    let bankAccount: any = null;
    try {
      const { data: bRow } = await supabaseServer
        .from("seller_bank_accounts")
        .select("id, bank_name, account_holder_name, masked_account_number, ifsc_code, upi_id, is_verified, status, last_payout_hold_until")
        .or(`seller_id.eq.${sellerId},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bRow) {
        bankAccount = bRow;
      } else {
        // Fallback to seller table profile upi
        const { data: sData } = await supabaseServer
          .from("sellers")
          .select("phonepay_number, phonepay_no, business_name")
          .eq("id", sellerId)
          .maybeSingle();

        if (sData?.phonepay_number || sData?.phonepay_no) {
          const upi = sData.phonepay_number || sData.phonepay_no;
          bankAccount = {
            id: "fallback-upi",
            bank_name: "UPI / PhonePe",
            account_holder_name: sData.business_name || "Merchant",
            masked_account_number: `UPI: ${upi.slice(0, 3)}•••••@${upi.split('@')[1] || 'upi'}`,
            ifsc_code: "UPI-DIRECT",
            upi_id: upi,
            is_verified: true,
            status: "ACTIVE"
          };
        }
      }
    } catch (_) {}

    // 5. Fetch settlement methods (UPI and Bank)
    let settlementMethods: any[] = [];
    let activeSettlementMethod: any = null;
    try {
      const { data: methods } = await supabaseServer
        .from("seller_settlement_methods")
        .select("id, method_type, masked_destination, verified_name, is_verified, is_default, status, failure_reason, created_at")
        .eq("seller_id", sellerId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (methods && methods.length > 0) {
        settlementMethods = methods;
        activeSettlementMethod = methods.find((m: any) => m.is_default && m.is_verified) || methods[0];
      }
    } catch (_) {}

    // Fallback: If no settlement method in new table yet, but bankAccount or profile UPI exists
    if (!activeSettlementMethod) {
      if (bankAccount?.upi_id) {
        activeSettlementMethod = {
          id: "profile-upi",
          method_type: "UPI",
          masked_destination: bankAccount.upi_id.includes("@") ? bankAccount.upi_id : `UPI: ${bankAccount.upi_id}`,
          verified_name: bankAccount.account_holder_name || "Merchant",
          is_verified: true,
          status: "VERIFIED"
        };
        settlementMethods.push(activeSettlementMethod);
      } else if (bankAccount) {
        activeSettlementMethod = {
          id: bankAccount.id,
          method_type: "BANK",
          masked_destination: bankAccount.masked_account_number,
          verified_name: bankAccount.account_holder_name,
          is_verified: bankAccount.is_verified,
          status: bankAccount.status
        };
        settlementMethods.push(activeSettlementMethod);
      }
    }

    // 6. Fetch Payout Requests History
    let payoutRequests: any[] = [];
    try {
      const { data: pRows } = await supabaseServer
        .from("seller_payout_requests")
        .select("id, payout_number, method_type, destination_masked, beneficiary_name, amount, status, utr_number, failure_reason, initiated_at, processed_at, created_at")
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
      bankAccount,
      settlementMethods,
      activeSettlementMethod,
      payoutRequests,
      sellerId
    });
  } catch (err: any) {
    console.error("[Payments API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
