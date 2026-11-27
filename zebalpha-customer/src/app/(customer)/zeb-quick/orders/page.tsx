"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Clock, Zap, XCircle, ChevronRight, AlertTriangle, X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useZebQuick } from "@/context/ZebQuickContext";

const CANCEL_WINDOW_MS = 20 * 60 * 1000; // 20 minutes
const CANCELLABLE_STATUSES = new Set(["PLACED", "CONFIRMED", "PACKED"]);

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Need to change size / item",
  "Wrong delivery address / pincode",
  "Delivery taking longer than expected",
  "Found a better price elsewhere",
  "Other reason",
];

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

export default function ZebQuickOrdersPage() {
  const { user } = useAuth();
  const { openProductDetail } = useZebQuick();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Cancel reason modal state
  const [cancelOrderTarget, setCancelOrderTarget] = useState<any | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Tick every second so the 20-minute cancel countdown stays live
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    fetch(`/api/zeb-quick/orders?user_id=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleOpenOrderedProduct = async (it: any, orderPincode: string) => {
    const fallbackProduct = {
      id: it.zeb_quick_product_id || it.id,
      source_product_id: it.source_product_id || it.zeb_quick_product_id || it.id,
      seller_id: it.seller_id || "",
      title: it.title,
      image_url: it.image_url || "/official-logo-sm.png",
      images: it.image_url ? [it.image_url] : [],
      sizes: it.size ? [it.size] : [],
      zeb_quick_price: Number(it.unit_price || 0),
      mrp: null,
      zeb_quick_stock: 10,
      pickup_pincode: orderPincode || "",
    };

    if (it.zeb_quick_product_id) {
      try {
        const res = await fetch(`/api/zeb-quick/products?ids=${encodeURIComponent(it.zeb_quick_product_id)}`);
        const data = await res.json();
        if (Array.isArray(data.products) && data.products[0]) {
          openProductDetail(data.products[0]);
          return;
        }
      } catch {}
    }
    openProductDetail(fallbackProduct);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderTarget || !user?.id) return;
    setCancelError(null);

    const finalReason =
      selectedReason === "Other reason" ? customReason.trim() : selectedReason;
    if (!finalReason || finalReason.length < 3) {
      setCancelError("Please enter a valid cancellation reason.");
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/zeb-quick/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: cancelOrderTarget.id,
          user_id: user.id,
          reason: finalReason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCancelError(json.error || "Unable to cancel order.");
        setCancelling(false);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelOrderTarget.id
            ? {
                ...o,
                order_status: "CANCELLED",
                cancel_reason: finalReason,
                cancelled_at: json.cancelled_at || new Date().toISOString(),
              }
            : o
        )
      );
      setCancelOrderTarget(null);
      setCustomReason("");
      setSelectedReason(CANCEL_REASONS[0]);
    } catch {
      setCancelError("Network error while cancelling order.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3.5 py-4 space-y-4">
      <div>
        <h1 className="text-lg font-black text-neutral-900">ZebQuick Orders</h1>
        <p className="text-xs text-neutral-500">
          Only 5–6 hour ZebQuick orders appear here (separate from ZebAlpha orders).
        </p>
      </div>

      {!user ? (
        <div className="rounded-3xl border border-orange-200 bg-white p-8 text-center">
          <p className="text-sm font-black text-neutral-900">Sign in to view your ZebQuick orders</p>
          <p className="mt-1 text-xs text-neutral-500">Use your existing ZebAlpha account—no extra signup needed.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-xs font-extrabold text-white"
          >
            Sign In
          </Link>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-orange-100/50" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-orange-200 bg-white p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-orange-300" />
          <p className="mt-3 text-sm font-black text-neutral-900">No ZebQuick orders yet</p>
          <Link
            href="/zeb-quick"
            className="mt-4 inline-flex rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-xs font-extrabold text-white"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusUpper = String(order.order_status || "").toUpperCase();
            const createdMs = new Date(order.created_at).getTime();
            const remainingMs = Number.isFinite(createdMs)
              ? CANCEL_WINDOW_MS - (nowMs - createdMs)
              : 0;
            const canCancel = CANCELLABLE_STATUSES.has(statusUpper) && remainingMs > 0;
            const isCancelled = statusUpper === "CANCELLED";

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-orange-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-neutral-900">{order.order_number}</p>
                    <p className="text-[11px] text-neutral-500">
                      Pincode {order.delivery_pincode} • ₹{order.total_amount} ({order.payment_method})
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                      isCancelled
                        ? "bg-rose-100 text-rose-700"
                        : statusUpper === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-[#EE2B00]"
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    {order.order_status}
                  </span>
                </div>

                {!isCancelled && order.promised_delivery_at && (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      5–6 Hr SLA Promised By:{" "}
                      {new Date(order.promised_delivery_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {order.shadowfax_tracking_url && (
                      <a
                        href={order.shadowfax_tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white"
                      >
                        Track Rider →
                      </a>
                    )}
                  </div>
                )}

                {!isCancelled && (order.shadowfax_rider_name || order.shadowfax_awb) && (
                  <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-3 py-1.5 text-[11px] font-semibold text-blue-900">
                    {order.shadowfax_rider_name && (
                      <span>
                        Delivery Partner: <strong>{order.shadowfax_rider_name}</strong>
                        {order.shadowfax_rider_phone ? ` (+91 ${order.shadowfax_rider_phone})` : ""}
                      </span>
                    )}
                    {order.shadowfax_awb && (
                      <span className="ml-2 text-blue-700">• AWB: {order.shadowfax_awb}</span>
                    )}
                  </div>
                )}

                {isCancelled && order.cancel_reason && (
                  <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                    Cancelled • Reason: {order.cancel_reason}
                  </div>
                )}

                {/* Clickable Ordered Products */}
                <div className="space-y-2 border-t border-neutral-100 pt-2">
                  {(order.items || []).map((it: any) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => handleOpenOrderedProduct(it, order.delivery_pincode)}
                      className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left text-xs transition hover:bg-neutral-50 active:scale-[0.99] cursor-pointer"
                    >
                      <img
                        src={it.image_url || "/official-logo-sm.png"}
                        alt={it.title}
                        className="h-12 w-12 rounded-xl object-cover bg-orange-50 border border-neutral-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-900 truncate">{it.title}</p>
                        <p className="text-[11px] text-neutral-500">
                          Qty: {it.quantity} {it.size ? `• ${it.size}` : ""} • ₹{it.unit_price}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-700 shrink-0">
                        View
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>

                {/* 20-Minute Cancel Action Bar */}
                {CANCELLABLE_STATUSES.has(statusUpper) && (
                  <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5">
                    {canCancel ? (
                      <>
                        <span className="text-[11px] font-semibold text-neutral-500">
                          Free cancel window:{" "}
                          <strong className="text-rose-600">{formatRemaining(remainingMs)}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCancelError(null);
                            setSelectedReason(CANCEL_REASONS[0]);
                            setCustomReason("");
                            setCancelOrderTarget(order);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 active:scale-95 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel Order
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-neutral-400">
                        20-minute cancellation window closed (preparing for express dispatch).
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ZebAlpha-style Cancellation Reason Modal */}
      {cancelOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmCancel}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-neutral-950">Cancel Express Order?</h2>
                  <p className="text-xs text-neutral-500">{cancelOrderTarget.order_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelOrderTarget(null)}
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold text-neutral-700">
                Select a reason for cancellation *
              </p>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-semibold cursor-pointer transition ${
                      selectedReason === reason
                        ? "border-rose-400 bg-rose-50/70 text-neutral-950"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-rose-600 h-4 w-4"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === "Other reason" && (
                <textarea
                  required
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Tell us why you want to cancel this order..."
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-900 focus:border-rose-500 focus:outline-none"
                />
              )}
            </div>

            {cancelError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {cancelError}
              </p>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCancelOrderTarget(null)}
                className="flex-1 rounded-2xl border border-neutral-200 py-3 text-xs font-extrabold text-neutral-700 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="submit"
                disabled={cancelling}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-3 text-xs font-black text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
