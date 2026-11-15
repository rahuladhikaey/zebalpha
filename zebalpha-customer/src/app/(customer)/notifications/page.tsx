"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";
import {
  getNativeNotificationStatus,
  getZebAlphaNative,
  initPushNotifications,
  type NativeNotificationStatus,
} from "@/lib/pushNotifications";
import Link from "next/link";
import { Bell, ArrowRight, PackageOpen, X, CheckCircle2, ShieldAlert, Settings, LockOpen } from "lucide-react";

interface BroadcastMessage {
  id?: string | number;
  title?: string;
  message?: string;
  created_at?: string;
  target_group?: string;
}

export default function NotificationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [adminMessages, setAdminMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedIds, setDeletedIds] = useState<(string | number)[]>([]);
  const [notifEnabled, setNotifEnabled] = useState<boolean | null>(null);
  const [hasNativeBridge, setHasNativeBridge] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<NativeNotificationStatus | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  const refreshNotificationStatus = useCallback(() => {
    if (typeof window === "undefined") return;
    const native = getZebAlphaNative();
    if (native) {
      setHasNativeBridge(true);
      const status = getNativeNotificationStatus();
      setNativeStatus(status);
      setNotifEnabled(Boolean(status?.enabled));
      return;
    }

    setHasNativeBridge(false);
    if ("Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    } else {
      setNotifEnabled(false);
    }
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      refreshNotificationStatus();
    });

    const onStatusUpdate = () => {
      refreshNotificationStatus();
      setIsEnabling(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshNotificationStatus();
      }
    };

    window.addEventListener("zebalpha:notification-status", onStatusUpdate);
    window.addEventListener("zebalpha:notification-permission", onStatusUpdate);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("zebalpha:notification-status", onStatusUpdate);
      window.removeEventListener("zebalpha:notification-permission", onStatusUpdate);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [refreshNotificationStatus]);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      await initPushNotifications();
    } finally {
      setIsEnabling(false);
      refreshNotificationStatus();
    }
  };

  useEffect(() => {
    async function fetchData() {
      // Load dismissed notifications from localStorage after mount
      const savedDeleted = localStorage.getItem("deleted_notifications");
      if (savedDeleted) {
        try {
          setDeletedIds(JSON.parse(savedDeleted) as (string | number)[]);
        } catch (e) {
          console.error("Error parsing deleted notifications", e);
        }
      }

      // Fetch latest products (new arrivals)
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (productsData) {
        setProducts(productsData as Product[]);
        if (productsData.length > 0) {
          localStorage.setItem("last_seen_product_id", productsData[0].id.toString());
        }
      }

      // Fetch admin broadcast messages from store_settings
      try {
        const { data: msgData } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "broadcast_messages")
          .maybeSingle();

        if (msgData?.value && Array.isArray(msgData.value)) {
          // Filter to only customer/all target messages
          const filtered = (msgData.value as BroadcastMessage[]).filter(
            (m) => m.target_group === "customers" || m.target_group === "all"
          );
          setAdminMessages(filtered);

          if (filtered.length > 0) {
            localStorage.setItem("last_seen_broadcast_id", String(filtered[0].id));
          }
        }
      } catch {
        // Ignore if no broadcast messages exist yet
      }

      setLoading(false);
    }

    void fetchData();
  }, []);

  const handleDelete = (e: React.MouseEvent, productId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    const newDeletedIds = [...deletedIds, productId];
    setDeletedIds(newDeletedIds);
    localStorage.setItem("deleted_notifications", JSON.stringify(newDeletedIds));
  };

  const visibleProducts = products.filter((p) => !deletedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="Notifications" subtitle="Stay Updated" />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
            <p className="text-sm font-semibold text-zinc-400">Latest updates from ZEBALPHA</p>
          </div>
        </div>

        {/* Live Push Notification Status & Unlock Card */}
        {notifEnabled === true ? (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Push Alerts Active
                </p>
                <p className="text-xs text-zinc-300">
                  Order updates, new drops &amp; flash deals will alert your device.
                </p>
              </div>
            </div>
            {hasNativeBridge && (
              <button
                type="button"
                onClick={() => getZebAlphaNative()?.openNotificationSettings?.()}
                className="shrink-0 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-[11px] font-bold text-zinc-200 transition-colors cursor-pointer"
              >
                Settings
              </button>
            )}
          </div>
        ) : notifEnabled === false ? (
          <div className="mb-6 rounded-2xl bg-zinc-950 border border-amber-500/35 p-4 shadow-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold text-white tracking-tight">
                  Phone Notifications Are Off
                </h2>
                {hasNativeBridge ? (
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    Tap <b className="text-white">Allow Notifications</b> first. If Android greys out{" "}
                    <b className="text-white">Show notifications</b>, tap{" "}
                    <b className="text-amber-300">Unlock in App Info</b> ➔ tap{" "}
                    <b className="text-white">⋮ (top-right)</b> or scroll down to tap{" "}
                    <b className="text-amber-300">Allow restricted settings</b> ➔ enter PIN ➔ turn notifications{" "}
                    <b className="text-emerald-400">ON</b>.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Turn on notifications to receive instant alerts for order tracking, drops, and flash offers.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(!hasNativeBridge || !nativeStatus?.blockedBySystem || nativeStatus?.shouldShowRationale) && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={isEnabling}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 active:scale-95 text-xs font-black uppercase tracking-wider text-black transition-all cursor-pointer"
                >
                  {isEnabling ? "Checking..." : "Allow Notifications"}
                </button>
              )}
              {hasNativeBridge && (
                <>
                  <button
                    type="button"
                    onClick={() => getZebAlphaNative()?.openAppInfoSettings?.()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-xs font-black uppercase tracking-wider text-black transition-all cursor-pointer"
                  >
                    <LockOpen className="h-3.5 w-3.5" />
                    Unlock in App Info
                  </button>
                  <button
                    type="button"
                    onClick={() => getZebAlphaNative()?.openNotificationSettings?.()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Notification Settings
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-zinc-900 border border-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Admin Broadcast Messages */}
            {adminMessages.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  📢 Messages from ZEBALPHA
                </h2>
                {adminMessages.slice(0, 5).map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 shadow-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white shrink-0">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm">{msg.title}</p>
                        <p className="mt-0.5 text-xs font-semibold text-zinc-300">{msg.message}</p>
                        {msg.created_at && (
                          <p className="mt-1 text-[10px] text-zinc-500 font-medium">
                            {new Date(msg.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Arrivals */}
            {visibleProducts.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  🛍️ New Arrivals
                </h2>
                {visibleProducts.map((product) => (
                  <div key={product.id} className="relative group">
                    <Link
                      href={`/products?search=${encodeURIComponent(product.name)}`}
                      className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-zinc-950 p-4 shadow-xl border border-zinc-800 hover:border-zinc-700 transition-all pr-14"
                    >
                      <div className="flex flex-1 flex-col justify-center">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-zinc-900 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white border border-zinc-700">
                            New Arrival
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-lg font-bold text-white group-hover:text-zinc-300 transition-colors leading-tight">
                          {product.name}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-xs font-medium text-zinc-400">
                          {product.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-end sm:justify-center mt-2 sm:mt-0">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white transition-colors border border-zinc-800">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                    {/* Dismiss button */}
                    <button
                      onClick={(e) => handleDelete(e, product.id)}
                      className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors z-10 cursor-pointer"
                      aria-label="Dismiss Notification"
                    >
                      <X className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                ))}

                <div className="mt-8 flex items-center justify-center">
                  <div className="h-1 w-12 rounded-full bg-zinc-800" />
                </div>
              </div>
            ) : adminMessages.length === 0 ? (
              <div className="rounded-3xl bg-zinc-950 p-12 text-center border border-zinc-800 shadow-2xl">
                <PackageOpen className="mx-auto h-16 w-16 text-zinc-700 mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-black text-white tracking-tight">No Updates Yet</h3>
                <p className="mt-2 text-sm font-medium text-zinc-400 max-w-sm mx-auto">
                  We&apos;ll notify you right here as soon as our admin adds fresh organic products to the store!
                </p>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
