import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { computeLedgerBalances, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";
import { LedgerTransaction } from "@shared/types/ledger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/payments
 * Fetches real-time financial ledger transactions, settlements, bank account, and computed balances.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sellerIdParam = searchParams.get("sellerId");

    // Fetch authenticated user
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user && !sellerIdParam) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user?.id;

    // Resolve seller ID
    let sellerId = sellerIdParam;
    if (!sellerId && currentUserId) {
      const { data: seller } = await supabaseServer
        .from("sellers")
        .select("id")
        .eq("user_id", currentUserId)
        .maybeSingle();
      sellerId = seller?.id || currentUserId;
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
        .limit(200);

      if (!ledgerErr && ledgerRows) {
        transactions = ledgerRows as LedgerTransaction[];
      }
    } catch (_) {}

    // 2. Compute ledger balances
    let balances = computeLedgerBalances(transactions);

    // If ledger is empty (or before first batch migration), calculate from actual completed orders
    if (transactions.length === 0) {
      try {
        const { data: orders } = await supabaseServer
          .from("orders")
          .select("id, order_number, total_amount, payment_method, payment_status, order_status, created_at, items")
          .or(`seller_id.eq.${sellerId},seller_id.eq.${currentUserId}`)
          .in("order_status", ["delivered", "completed", "DELIVERED", "COMPLETED"]);

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
        .or(`seller_id.eq.${sellerId},seller_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (sRows) {
        settlements = sRows;
      }
    } catch (_) {}

    // 4. Fetch bank account details
    let bankAccount: any = null;
    try {
      const { data: bRow } = await supabaseServer
        .from("seller_bank_accounts")
        .select("id, bank_name, account_holder_name, masked_account_number, ifsc_code, upi_id, is_verified, status")
        .or(`seller_id.eq.${sellerId},seller_id.eq.${currentUserId}`)
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

    return NextResponse.json({
      success: true,
      balances,
      transactions,
      settlements,
      bankAccount,
      rules: DEFAULT_FINANCIAL_RULES
    });
  } catch (err: any) {
    console.error("[Payments API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
