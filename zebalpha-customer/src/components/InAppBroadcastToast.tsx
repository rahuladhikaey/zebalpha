"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, Sparkles, X, ArrowRight } from "lucide-react";

interface BroadcastPayload {
  id: string | number;
  title: string;
  message: string;
  image_url?: string;
  action_url?: string;
  target_group?: string;
  created_at?: string;
}

export function InAppBroadcastToast() {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastPayload | null>(null);
  const lastProcessedIdRef = useRef<string | null>(null);

  const displayNotification = useCallback((payload: BroadcastPayload) => {
    // Target check
    if (payload.target_group === "sellers") return;

    setActiveBroadcast(payload);

    // 1. Phone / Native Vibration
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([150, 70, 150]);
      } catch (_) {}
    }

    // 2. Dispatch to Phone's Native Notification Shade (Android Native App or Web Notification)
    if (typeof window !== "undefined") {
      const win = window as any;
      if (win.ZebAlphaNative?.showNotification) {
        try {
          win.ZebAlphaNative.showNotification(payload.title, payload.message, payload.action_url || "/notifications");
        } catch (nativeErr) {
          console.warn("[Native Android Notification Error]:", nativeErr);
        }
      } else if ("Notification" in window && Notification.permission === "granted") {
        try {
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              (reg as any).showNotification(payload.title, {
                body: payload.message,
                icon: "/official-logo-sm.png",
                badge: "/official-logo-sm.png",
                image: payload.image_url || undefined,
                tag: `broadcast-${payload.id}`,
                renotify: true,
                data: {
                  url: payload.action_url || "/notifications",
                },
              });
            }).catch(() => {
              new Notification(payload.title, {
                body: payload.message,
                icon: "/official-logo-sm.png",
              });
            });
          } else {
            new Notification(payload.title, {
              body: payload.message,
              icon: "/official-logo-sm.png",
            });
          }
        } catch (err) {
          console.warn("[System Notification Notice]:", err);
        }
      }
    }

    // 3. Notify header NotificationBell to blink
    window.dispatchEvent(new CustomEvent("zebalpha:new-broadcast"));
  }, []);

  const checkLatestBroadcast = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/latest", {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success && data.latest?.id) {
        const latestId = String(data.latest.id);
        const storedLastSeenId = localStorage.getItem("last_seen_broadcast_id");

        // First visit initialization: mark current latest as seen so we don't spam old notifications
        if (!storedLastSeenId && !lastProcessedIdRef.current) {
          localStorage.setItem("last_seen_broadcast_id", latestId);
          lastProcessedIdRef.current = latestId;
          return;
        }

        // New broadcast detected!
        if (latestId !== storedLastSeenId && latestId !== lastProcessedIdRef.current) {
          lastProcessedIdRef.current = latestId;
          localStorage.setItem("last_seen_broadcast_id", latestId);
          displayNotification(data.latest);
        }
      }
    } catch (_) {}
  }, [displayNotification]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial check
    checkLatestBroadcast();

    // Check on tab focus / visibility change (e.g. user unlocks phone or switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkLatestBroadcast();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Active polling interval (checks every 7 seconds for instant alert delivery)
    const interval = setInterval(checkLatestBroadcast, 7000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkLatestBroadcast]);

  // Auto-dismiss in-app toast after 8 seconds
  useEffect(() => {
    if (!activeBroadcast) return;
    const timer = setTimeout(() => {
      setActiveBroadcast(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activeBroadcast]);

  if (!activeBroadcast) return null;

  return (
    <div className="fixed top-4 inset-x-4 md:inset-x-auto md:right-6 md:max-w-md z-[95] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-zinc-950/95 border border-emerald-500/50 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl text-white">
        <div className="flex items-start gap-3.5">
          {/* Avatar / Icon */}
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            {activeBroadcast.image_url ? (
              <img
                src={activeBroadcast.image_url}
                alt="Alert"
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Bell className="w-5 h-5 text-emerald-400 animate-pulse" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Live Broadcast
              </span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>

            <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
              {activeBroadcast.title}
            </h4>
            <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
              {activeBroadcast.message}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Link
                href={activeBroadcast.action_url || "/notifications"}
                onClick={() => setActiveBroadcast(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveBroadcast(null)}
                className="px-2.5 py-1.5 text-zinc-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close X */}
          <button
            onClick={() => setActiveBroadcast(null)}
            className="text-zinc-500 hover:text-zinc-300 p-1 -mr-1 -mt-1 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
