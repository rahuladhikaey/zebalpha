import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/reports?type=sales|orders|returns|settlements|ledger
 * Generates formatted CSV exports for merchant financial and operations reconciliation.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "sales";

    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    if (type === "orders" || type === "sales") {
      const { data: orders } = await supabaseServer
        .from("orders")
        .select("*")
        .or(`seller_id.eq.${sellerId},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const rows = (orders || []).map((o) => {
        return [
          o.order_number || o.id,
          new Date(o.created_at).toISOString().split("T")[0],
          `"${(o.customer_name || 'Customer').replace(/"/g, '""')}"`,
          `"${(o.phone || '').replace(/"/g, '""')}"`,
          o.order_status,
          o.payment_method || 'ONLINE',
          o.payment_status || 'PENDING',
          o.total_amount || 0,
          o.discount_amount || 0,
          o.shipping_charge || 0
        ].join(",");
      });

      const header = "Order_Number,Date,Customer,Phone,Order_Status,Payment_Mode,Payment_Status,Total_Amount,Discount,Shipping_Charge\n";
      const csv = header + rows.join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zebalpha_${type}_report_${Date.now()}.csv"`
        }
      });
    }

    if (type === "settlements") {
      const { data: settlements } = await supabaseServer
        .from("seller_settlements")
        .select("*")
        .or(`seller_id.eq.${sellerId},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const rows = (settlements || []).map((s) => {
        return [
          s.settlement_number || `SET-${s.week_number || s.id}`,
          new Date(s.start_date).toISOString().split("T")[0],
          new Date(s.end_date).toISOString().split("T")[0],
          s.total_orders || 0,
          s.gross_sales || 0,
          s.commission_deducted || 0,
          s.platform_fees || 0,
          s.taxes || 0,
          s.net_amount || 0,
          s.status || 'PENDING',
          s.transaction_id || s.utr_number || 'N/A'
        ].join(",");
      });

      const header = "Settlement_ID,Start_Date,End_Date,Orders_Count,Gross_Sales,Commission,Platform_Fees,Taxes,Net_Settlement,Status,UTR_Reference\n";
      const csv = header + rows.join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zebalpha_settlements_report_${Date.now()}.csv"`
        }
      });
    }

    if (type === "ledger") {
      const { data: ledger } = await supabaseServer
        .from("seller_financial_ledger")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      const rows = (ledger || []).map((l) => {
        return [
          l.id,
          new Date(l.created_at).toISOString(),
          l.transaction_type,
          l.entry_type,
          l.amount,
          l.balance_after,
          l.status,
          `"${(l.description || '').replace(/"/g, '""')}"`,
          l.reference_id || 'N/A'
        ].join(",");
      });

      const header = "Transaction_ID,Date_Time,Transaction_Type,Entry_Type,Amount,Balance_After,Status,Description,Reference_ID\n";
      const csv = header + rows.join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zebalpha_financial_ledger_${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({ success: false, error: "Invalid report type" }, { status: 400 });
  } catch (err: any) {
    console.error("[Reports API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to generate report" }, { status: 500 });
  }
}
