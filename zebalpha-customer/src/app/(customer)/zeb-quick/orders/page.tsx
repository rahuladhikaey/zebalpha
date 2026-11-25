"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Clock, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ZebQuickOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="mx-auto max-w-3xl px-3.5 py-4 space-y-4">
      <div>
        <h1 className="text-lg font-black text-neutral-900">ZebQuick Express Orders</h1>
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
          <p className="mt-3 text-sm font-black text-neutral-900">No ZebQuick Express orders yet</p>
          <Link
            href="/zeb-quick"
            className="mt-4 inline-flex rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-xs font-extrabold text-white"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-orange-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-neutral-900">{order.order_number}</p>
                  <p className="text-[11px] text-neutral-500">
                    Pincode {order.delivery_pincode} • ₹{order.total_amount} ({order.payment_method})
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-extrabold text-[#EE2B00]">
                  <Zap className="h-3 w-3 fill-[#EE2B00]" />
                  {order.order_status}
                </span>
              </div>

              {order.promised_delivery_at && (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    5–6 Hr SLA Promised By:{" "}
                    {new Date(order.promised_delivery_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              <div className="space-y-2 border-t border-neutral-100 pt-2">
                {(order.items || []).map((it: any) => (
                  <div key={it.id} className="flex items-center gap-2.5 text-xs">
                    <img
                      src={it.image_url || "/official-logo-sm.png"}
                      alt={it.title}
                      className="h-10 w-10 rounded-lg object-cover bg-orange-50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 truncate">{it.title}</p>
                      <p className="text-[11px] text-neutral-500">
                        Qty: {it.quantity} {it.size ? `• ${it.size}` : ""} • ₹{it.unit_price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
