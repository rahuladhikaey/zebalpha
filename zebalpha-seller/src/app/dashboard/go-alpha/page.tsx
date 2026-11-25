"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, IndianRupee, Package, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { supabase } from "@shared/utils/supabaseClient";

export default function SellerGoAlphaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    } catch {}
    return headers;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/go-alpha/dashboard", { headers, cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusChange = async (orderId: string, status: string) => {
    const headers = await getAuthHeaders();
    await fetch("/api/go-alpha/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "update_order_status", orderId, status }),
    });
    await loadData();
  };

  const handleBookShadowfax = async (orderId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/go-alpha/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "dispatch_shadowfax", orderId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "Shadowfax rider booking failed");
    }
    await loadData();
  };

  const stats = data?.stats || {
    totalOrders: 0,
    activeProducts: 0,
    totalGrossRevenue: 0,
    totalCommission: 0,
    totalNetEarnings: 0,
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-600">
            <Zap className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            GOα 5–6 Hr Quick Commerce (Isolated)
          </div>
          <h1 className="mt-2 text-2xl font-black text-[#14120F]">GOα Express Seller Hub</h1>
          <p className="text-xs text-[#5C4E35]">
            Your GOα orders, 5–6 hr SLA deliveries, and earnings are tracked 100% separately from ZebAlpha.
          </p>
        </div>
      </div>

      {/* Isolated GOα KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <IndianRupee className="h-4 w-4 text-orange-600" /> GOα Net Earnings
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">₹{stats.totalNetEarnings.toFixed(0)}</p>
          <p className="text-[11px] text-neutral-500">Gross: ₹{stats.totalGrossRevenue.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <Clock className="h-4 w-4 text-orange-600" /> GOα Orders
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">{stats.totalOrders}</p>
          <p className="text-[11px] text-neutral-500">5–6 Hr Express SLA</p>
        </div>
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <Package className="h-4 w-4 text-orange-600" /> Active GOα Products
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">{stats.activeProducts}</p>
          <p className="text-[11px] text-neutral-500">Shared ZebAlpha images</p>
        </div>
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <MapPin className="h-4 w-4 text-orange-600" /> Store Pickup Pincode
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            {data?.zebalphaPickupPincode || "—"}
          </p>
          <p className="text-[11px] text-neutral-500">
            {data?.zebalphaPickupCity ? `${data.zebalphaPickupCity} • ` : ""}Synced with ZebAlpha Pickup Hub
          </p>
        </div>
      </div>

      {/* Pickup Serviceability Banner */}
      {!loading && data && (
        data.isGoAlphaServiceable ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-xs font-bold text-emerald-900 flex items-center justify-between gap-3">
            <span>
              GOα 5–6 Hr Pickup is active at your registered address ({data.serviceAreaName || data.zebalphaPickupCity} • Pincode {data.zebalphaPickupPincode}).
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-xs text-amber-950 space-y-1">
            <p className="font-black text-sm">
              Pickup is not available at this address yet — GOα Express is coming soon to Pincode {data.zebalphaPickupPincode || "your area"}.
            </p>
            <p className="text-amber-800">
              Your registered ZebAlpha Pickup Hub address ({data.zebalphaPickupAddress || "Default Warehouse"}, {data.zebalphaPickupPincode || "N/A"}) is currently outside active GOα pickup corridors.
            </p>
          </div>
        )
      )}

      {/* Isolated GOα Orders Table */}
      <div className="rounded-2xl border border-[#EAD296] bg-white overflow-hidden shadow-xs">
        <div className="border-b border-[#F0E2BE] px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#14120F]">GOα Express Orders (5–6 Hr SLA)</h2>
        </div>

        {loading ? (
          <div className="p-6 text-xs text-neutral-500">Loading GOα orders...</div>
        ) : (data?.orderItems || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No GOα express orders yet. Activate eligible products from your <strong>Products</strong> page!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFDF8] border-b border-[#F0E2BE] text-[#5C4E35]">
                <tr>
                  <th className="px-4 py-3 font-black">Order</th>
                  <th className="px-4 py-3 font-black">Product</th>
                  <th className="px-4 py-3 font-black">Delivery Pincode</th>
                  <th className="px-4 py-3 font-black">Net Earning</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E2BE]/60">
                {(data.orderItems || []).map((item: any) => {
                  const ord = item.orders || {};
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-black text-[#14120F]">{ord.order_number || item.order_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#14120F]">{item.title}</div>
                        <div className="text-[11px] text-neutral-500">
                          Qty {item.quantity} {item.size ? `• ${item.size}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">{ord.delivery_pincode || "-"}</td>
                      <td className="px-4 py-3 font-black text-emerald-700">₹{item.seller_earning}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black text-[#EE2B00]">
                          {item.item_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {item.item_status === "PLACED" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleBookShadowfax(item.order_id)}
                                className="rounded-lg bg-[#EE2B00] px-2.5 py-1 text-[10px] font-black text-white cursor-pointer"
                              >
                                ⚡ Book Shadowfax Rider
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(item.order_id, "PACKED")}
                                className="rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white cursor-pointer"
                              >
                                Mark Packed
                              </button>
                            </>
                          )}
                          {item.item_status === "PACKED" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(item.order_id, "OUT_FOR_DELIVERY")}
                              className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white cursor-pointer"
                            >
                              Dispatch
                            </button>
                          )}
                          {item.item_status === "OUT_FOR_DELIVERY" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(item.order_id, "DELIVERED")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Delivered
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
