"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  CreditCard, 
  IndianRupee, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  RefreshCw,
  Search,
  Download,
  AlertTriangle,
  FileText
} from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

export default function SettlementDashboard() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [sellersRes, ordersRes, productsRes] = await Promise.all([
        supabase.from("sellers").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, seller_id")
      ]);

      setSellers(sellersRes.data || []);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (e) {
      console.error("Error loading settlement ledger data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("admin-settlement-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute real settlement balances per seller
  const settlementList = useMemo(() => {
    return sellers.map((seller) => {
      const sId = seller.id;
      const sUserId = seller.user_id;
      const isPrimary = seller.is_primary_brand || seller.email === "r.adhikary7777@gmail.com";

      const sellerProdIds = new Set(
        products
          .filter(p => p.seller_id === sId || (sUserId && p.seller_id === sUserId) || (isPrimary && !p.seller_id))
          .map(p => String(p.id))
      );

      let grossSales = 0;
      let orderCount = 0;
      let deliveredCount = 0;

      orders.forEach((ord) => {
        let items: any[] = [];
        if (Array.isArray(ord.items)) {
          items = ord.items;
        } else if (ord.product_details) {
          try {
            items = typeof ord.product_details === "string" ? JSON.parse(ord.product_details) : ord.product_details;
          } catch (_) {
            items = [];
          }
        }

        const matchingItems = items.filter((it: any) => {
          const itId = String(it.product_id || it.id || "");
          return sellerProdIds.has(itId) || it.seller_id === sId || (sUserId && it.seller_id === sUserId);
        });

        const isDirect = ord.seller_id === sId || (sUserId && ord.seller_id === sUserId) || (isPrimary && (!ord.seller_id || ord.seller_id === sId));

        if (matchingItems.length > 0 || isDirect) {
          const itemsToSum = matchingItems.length > 0 ? matchingItems : items;
          const orderTotal = itemsToSum.reduce((sum: number, it: any) => 
            sum + (Number(it.subtotal) || ((Number(it.price) || 0) * (Number(it.quantity) || 1))), 0) || Number(ord.total_amount) || 0;

          if (ord.order_status !== "cancelled" && ord.order_status !== "returned") {
            grossSales += orderTotal;
            orderCount++;
            if (ord.order_status === "delivered") deliveredCount++;
          }
        }
      });

      const commissionRate = isPrimary ? 0 : 0.10;
      const adminCommission = Math.round(grossSales * commissionRate);
      const netPayoutDue = grossSales - adminCommission;

      return {
        ...seller,
        is_primary_brand: isPrimary,
        grossSales,
        adminCommission,
        netPayoutDue,
        orderCount,
        deliveredCount,
        payoutUpi: seller.upi_id || seller.phonepay_no || seller.phonepay_number || "rahuladhikary@phonepe"
      };
    });
  }, [sellers, orders, products]);

  const totals = useMemo(() => {
    let totalGross = 0;
    let totalComm = 0;
    let totalPayout = 0;

    settlementList.forEach(s => {
      totalGross += s.grossSales;
      totalComm += s.adminCommission;
      totalPayout += s.netPayoutDue;
    });

    return { totalGross, totalComm, totalPayout };
  }, [settlementList]);

  const handleCopyUpi = (upi: string) => {
    navigator.clipboard.writeText(upi);
    setCopiedUpi(upi);
    setTimeout(() => setCopiedUpi(null), 2500);
  };

  const handleExportExcel = () => {
    const exportData = settlementList.map(s => ({
      "Merchant ID": s.seller_id || s.id,
      "Merchant Name": s.business_name || s.full_name,
      "Owner Name": s.owner_name || s.full_name,
      "Payout UPI ID": s.payoutUpi,
      "Gross Sales (₹)": s.grossSales,
      "Admin Commission (10%) (₹)": s.adminCommission,
      "Net Payout Payable (₹)": s.netPayoutDue,
      "Total Orders": s.orderCount,
      "Delivered Orders": s.deliveredCount,
      "Status": s.account_status || s.status || "Active"
    }));

    exportCustomDataExcel(exportData, "ZEBALPHA_Merchant_Payout_Ledger");
  };

  const filteredSettlements = settlementList.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.business_name || "").toLowerCase().includes(q) ||
      (s.owner_name || s.full_name || "").toLowerCase().includes(q) ||
      (s.payoutUpi || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">FINANCIAL SETTLEMENTS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              ● Phase 2 Live
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">Multi-Vendor Payout & Settlement Ledger</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Automated calculations of merchant earnings, 10% platform commission deductions, and direct UPI payout transfers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <Download size={14} />
            <span>Export Ledger</span>
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Total Gross Platform GMV</span>
          <p className="text-2xl sm:text-3xl font-black text-white">
            ₹{totals.totalGross.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">Realtime Order Revenue</span>
        </div>

        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Net Seller Payouts Payable</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-400">
            ₹{totals.totalPayout.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">Transferable to Verified UPI IDs</span>
        </div>

        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">Platform Commission Retained</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-400">
            ₹{totals.totalComm.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">10% Platform Cut on 3rd-Party Sales</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white">Active Merchants ({settlementList.length})</span>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search merchant, owner, UPI ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400 font-bold text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-white mx-auto" />
            <p>Loading settlement ledger...</p>
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 font-bold text-xs">
            No merchant records match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="p-4 pl-6">Merchant & Owner</th>
                  <th className="p-4">Payout UPI / PhonePe</th>
                  <th className="p-4">Gross Sales</th>
                  <th className="p-4">Commission (10%)</th>
                  <th className="p-4">Net Payout Due</th>
                  <th className="p-4 text-center">Fulfilled Orders</th>
                  <th className="p-4 text-right pr-6">Payout Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                {filteredSettlements.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden">
                          {s.is_primary_brand ? (
                            <img src="/official-logo.png" alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            (s.business_name || s.full_name || "M")[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-black text-white">{s.business_name || s.full_name}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{s.owner_name || s.full_name} • {s.is_primary_brand ? "1st-Party" : "3rd-Party"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-emerald-400">
                      <div className="flex items-center gap-2">
                        <span>{s.payoutUpi}</span>
                        <button
                          onClick={() => handleCopyUpi(s.payoutUpi)}
                          className="text-zinc-500 hover:text-white p-1"
                          title="Copy UPI"
                        >
                          {copiedUpi === s.payoutUpi ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    <td className="p-4 font-black text-white text-sm">
                      ₹{Number(s.grossSales || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="p-4 text-zinc-400">
                      {s.is_primary_brand ? (
                        <span className="text-zinc-500 italic">0% (Direct)</span>
                      ) : (
                        <span className="text-blue-400 font-bold">₹{Number(s.adminCommission || 0).toLocaleString("en-IN")}</span>
                      )}
                    </td>

                    <td className="p-4 font-black text-emerald-400 text-sm">
                      ₹{Number(s.netPayoutDue || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-black text-white">{s.deliveredCount}</span>
                      <span className="text-[10px] text-zinc-500 block">of {s.orderCount} Orders</span>
                    </td>

                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => handleCopyUpi(s.payoutUpi)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {copiedUpi === s.payoutUpi ? <Check size={12} className="text-emerald-400" /> : <CreditCard size={12} />}
                        <span>{copiedUpi === s.payoutUpi ? "UPI Copied" : "Copy UPI"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
