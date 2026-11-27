"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  IndianRupee,
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  Printer,
  Phone,
  User,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@shared/utils/supabaseClient";
import { ShippingLabelModal } from "@/components/ShippingLabelModal";

type StatusTab = "ALL" | "PLACED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

export default function SellerZebQuickDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [labelOrder, setLabelOrder] = useState<any | null>(null);
  const [showCoveredPins, setShowCoveredPins] = useState(false);

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
      const res = await fetch("/api/zeb-quick/dashboard", { headers, cache: "no-store" });
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

  const handleAcceptOrder = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/zeb-quick/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "dispatch_shadowfax", orderId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Could not accept order & sync with Shadowfax");
      }
      await loadData();
    } finally {
      setBusyOrderId(null);
    }
  };

  const openShippingLabel = (ord: any) => {
    setLabelOrder({
      id: ord.id,
      order_number: ord.order_number,
      invoice_number: `ZBQ-INV-${ord.order_number}`,
      tracking_number: ord.shadowfax_awb || ord.shadowfax_order_id || ord.order_number,
      courier_name: "Shadowfax 5–6 Hr Express",
      routing_hub: `ZBQ-${ord.delivery_pincode || "EXP"}`,
      customer_name: ord.customer_name,
      phone: ord.phone,
      address: ord.delivery_address,
      pincode: ord.delivery_pincode,
      payment_method: ord.payment_method,
      status: ord.order_status,
      cancel_reason: ord.cancel_reason,
      created_at: ord.created_at,
      total_amount: ord.total_amount,
      subtotal: ord.subtotal,
      shipping_charge: ord.delivery_fee,
      items: (ord.items || []).map((it: any) => ({
        name: it.title || it.name,
        sku: `ZBQ-${String(it.id).slice(0, 6).toUpperCase()}`,
        size: it.size || "Standard",
        color: it.color || "",
        quantity: it.quantity || 1,
        price: Number(it.unit_price || it.price || 0),
      })),
    });
  };

  const stats = data?.stats || {
    totalOrders: 0,
    activeProducts: 0,
    totalGrossRevenue: 0,
    totalCommission: 0,
    totalNetEarnings: 0,
  };

  const allOrders: any[] = Array.isArray(data?.orders) ? data.orders : [];
  const filteredOrders = allOrders.filter((o) => {
    if (statusTab === "ALL") return true;
    return String(o.order_status || "").toUpperCase() === statusTab;
  });

  const countByStatus = (st: StatusTab) =>
    st === "ALL"
      ? allOrders.length
      : allOrders.filter((o) => String(o.order_status || "").toUpperCase() === st).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-600">
            <Zap className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            ZebQuick 5–6 Hr Quick Commerce (Isolated)
          </div>
          <h1 className="mt-2 text-2xl font-black text-[#14120F]">ZebQuick Express Seller Hub</h1>
          <p className="text-xs text-[#5C4E35]">
            Full customer details, auto-generated shipping labels, Shadowfax 5–6 Hr express dispatch, and earnings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-white px-3.5 py-2 text-xs font-extrabold text-[#14120F] hover:bg-[#FFFDF8] cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Orders
        </button>
      </div>

      {/* Isolated ZebQuick KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <IndianRupee className="h-4 w-4 text-orange-600" /> ZebQuick Net Earnings
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">₹{stats.totalNetEarnings.toFixed(0)}</p>
          <p className="text-[11px] text-neutral-500">Gross: ₹{stats.totalGrossRevenue.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <Clock className="h-4 w-4 text-orange-600" /> Active Express Orders
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">{stats.totalOrders}</p>
          <p className="text-[11px] text-neutral-500">5–6 Hr Express SLA</p>
        </div>
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5C4E35]">
            <Package className="h-4 w-4 text-orange-600" /> Active ZebQuick Products
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">{stats.activeProducts}</p>
          <p className="text-[11px] text-neutral-500">Ready for instant dispatch</p>
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
        data.isZebQuickServiceable ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-xs text-emerald-900 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">
                ZebQuick 5–6 Hr Pickup is active at your registered address ({data.serviceAreaName || data.zebalphaPickupCity} • Pincode {data.zebalphaPickupPincode}) — auto-serving{" "}
                <button
                  type="button"
                  onClick={() => setShowCoveredPins((v) => !v)}
                  className="font-black underline decoration-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {data.coveredPincodeCount || 1} active pincode{(data.coveredPincodeCount || 1) === 1 ? "" : "s"} within {data.deliveryRadiusKm || 17} km
                </button>{" "}
                GPS radius.
              </p>
              {Array.isArray(data.coveredPincodes) && data.coveredPincodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCoveredPins((v) => !v)}
                  className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 hover:bg-emerald-100/70 transition cursor-pointer shrink-0"
                >
                  {showCoveredPins ? "Hide Pincodes ▲" : `View All ${data.coveredPincodes.length} Pincodes ▼`}
                </button>
              )}
            </div>

            {showCoveredPins && Array.isArray(data.coveredPincodes) && data.coveredPincodes.length > 0 && (
              <div className="border-t border-emerald-200/80 pt-3">
                <p className="mb-2 text-[11px] font-extrabold text-emerald-800">
                  Customers in these {data.coveredPincodes.length} pincodes can see &amp; order your ZebQuick products:
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.coveredPincodes.map((cp: any) => (
                    <span
                      key={cp.pincode}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] shadow-2xs"
                    >
                      <span className="font-black text-emerald-900">{cp.pincode}</span>
                      <span className="text-neutral-700 font-semibold">{cp.area_name || cp.city}</span>
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                        {cp.distance_km === 0 ? "Your Hub" : `${cp.distance_km} km`}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-xs text-amber-950 space-y-1">
            <p className="font-black text-sm">
              Pickup is not available at this address yet — ZebQuick Express is coming soon to Pincode {data.zebalphaPickupPincode || "your area"}.
            </p>
            <p className="text-amber-800">
              Your registered ZebAlpha Pickup Hub address ({data.zebalphaPickupAddress || "Default Warehouse"}, {data.zebalphaPickupPincode || "N/A"}) is currently outside active ZebQuick pickup corridors.
            </p>
          </div>
        )
      )}

      {/* Order Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            { key: "ALL", label: "All Orders" },
            { key: "PLACED", label: "New Placed" },
            { key: "PACKED", label: "Packed" },
            { key: "OUT_FOR_DELIVERY", label: "Dispatched" },
            { key: "DELIVERED", label: "Delivered" },
            { key: "CANCELLED", label: "Cancelled" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusTab(t.key)}
            style={statusTab === t.key ? { color: "#FFFFFF" } : undefined}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              statusTab === t.key
                ? "border-[#EE2B00] bg-[#EE2B00] text-white shadow-xs"
                : "border-[#EAD296] bg-white text-[#5C4E35] hover:bg-[#FFFDF8]"
            }`}
          >
            {t.label} ({countByStatus(t.key)})
          </button>
        ))}
      </div>

      {/* Full ZebAlpha-Style ZebQuick Orders Cards with Customer Details & Auto Label */}
      <div className="rounded-2xl border border-[#EAD296] bg-white overflow-hidden shadow-xs">
        <div className="border-b border-[#F0E2BE] px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#14120F]">
            ZebQuick Express Orders ({filteredOrders.length})
          </h2>
          <span className="text-[11px] font-bold text-emerald-700">
            Auto Shipping Label Ready on Every Order
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-xs text-neutral-500">Loading ZebQuick orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No ZebQuick express orders in this tab yet.
          </div>
        ) : (
          <div className="divide-y divide-[#F0E2BE]">
            {filteredOrders.map((ord) => {
              const st = String(ord.order_status || "PLACED").toUpperCase();
              const isCancelled = st === "CANCELLED";
              const isBusy = busyOrderId === ord.id;

              return (
                <div key={ord.id} className="p-4 sm:p-5 space-y-4 hover:bg-[#FFFDF8]/60 transition">
                  {/* Top Row: Order Number, Payment, Status, SLA & Print Label */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-[#14120F]">{ord.order_number}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            isCancelled
                              ? "bg-rose-100 text-rose-700"
                              : st === "DELIVERED"
                                ? "bg-emerald-100 text-emerald-700"
                                : st === "OUT_FOR_DELIVERY"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-orange-100 text-[#EE2B00]"
                          }`}
                        >
                          {st}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            ord.payment_method === "COD"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {ord.payment_method === "COD"
                            ? `COD • Collect ₹${ord.total_amount}`
                            : `PREPAID • ₹${ord.total_amount}`}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-neutral-500">
                        Placed:{" "}
                        {ord.created_at
                          ? new Date(ord.created_at).toLocaleString([], {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                        {ord.promised_delivery_at && !isCancelled && (
                          <span className="ml-2 font-bold text-emerald-700">
                            • SLA By:{" "}
                            {new Date(ord.promised_delivery_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action Controls (Accept Order + Auto Label; Shipped/Delivered auto-synced via Shadowfax QR scan) */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => openShippingLabel(ord)}
                          style={{ color: "#FFFFFF" }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-600 px-3.5 py-1.5 text-[11px] font-black text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print Shipping Label
                        </button>
                      )}

                      {st === "PLACED" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAcceptOrder(ord.id)}
                          style={{ color: "#FFFFFF" }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE2B00] px-3.5 py-1.5 text-[11px] font-black text-white shadow-xs hover:bg-[#d42600] disabled:opacity-60 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isBusy ? "Accepting..." : "Accept Order"}
                        </button>
                      )}

                      {st === "PACKED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          Accepted • Awaiting Rider QR Scan
                        </span>
                      )}

                      {st === "OUT_FOR_DELIVERY" && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700">
                          <Zap className="h-3.5 w-3.5" />
                          Shipped (Auto-Synced via Shadowfax)
                        </span>
                      )}

                      {st === "DELIVERED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Delivered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cancellation Reason Banner */}
                  {isCancelled && ord.cancel_reason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700">
                      Customer Cancelled • Reason: {ord.cancel_reason}
                    </div>
                  )}

                  {/* Middle Grid: Customer Details + Ordered Items */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Customer & Delivery Details Box */}
                    <div className="rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-3.5 space-y-2 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#8C7343]">
                        Customer &amp; Delivery Address
                      </p>
                      <div className="flex items-center gap-2 font-black text-[#14120F]">
                        <User className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <span>{ord.customer_name || "Customer"}</span>
                      </div>
                      {ord.phone && (
                        <div className="flex items-center gap-2 font-bold text-neutral-700">
                          <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <a href={`tel:${ord.phone}`} className="hover:underline">
                            +91 {ord.phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-neutral-700 leading-relaxed">
                        <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                        <span>
                          {ord.delivery_address || "Address not provided"}
                          {ord.delivery_pincode && (
                            <strong className="ml-1 text-[#14120F]">
                              (PIN: {ord.delivery_pincode})
                            </strong>
                          )}
                        </span>
                      </div>
                      {(ord.shadowfax_awb || ord.shadowfax_order_id) && (
                        <div className="pt-1.5 border-t border-[#F0E2BE] space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-600">
                              Shadowfax AWB:{" "}
                              <strong className="text-[#14120F]">
                                {ord.shadowfax_awb || ord.shadowfax_order_id}
                              </strong>
                            </span>
                            {ord.tracking_url && (
                              <a
                                href={ord.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-extrabold text-blue-600 hover:underline"
                              >
                                Track <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {ord.rider_name && (
                            <p className="text-neutral-600 font-semibold">
                              Rider: <strong className="text-[#14120F]">{ord.rider_name}</strong>
                              {ord.rider_phone ? ` • +91 ${ord.rider_phone}` : ""}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Items & Seller Payout Box */}
                    <div className="rounded-2xl border border-[#F0E2BE] bg-white p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#8C7343]">
                          Order Items ({(ord.items || []).length})
                        </p>
                        <span className="font-black text-emerald-700">
                          Net Payout: ₹{Number(ord.net_earning || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(ord.items || []).map((it: any) => (
                          <div key={it.id} className="flex items-center gap-2.5">
                            <img
                              src={it.image_url || "/placeholder.png"}
                              alt={it.title}
                              className="h-11 w-11 rounded-xl object-cover border border-neutral-100 bg-orange-50 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#14120F] truncate">{it.title}</p>
                              <p className="text-[11px] text-neutral-500">
                                Qty: {it.quantity} • Size: {it.size || "Standard"} • ₹{it.unit_price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ZebAlpha Auto-Generated Shipping Label & Tax Invoice Modal */}
      <ShippingLabelModal
        isOpen={Boolean(labelOrder)}
        onClose={() => setLabelOrder(null)}
        order={labelOrder}
        sellerInfo={data?.sellerProfile}
      />
    </div>
  );
}
