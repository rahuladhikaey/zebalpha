"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Sparkles, X, ArrowRight } from "lucide-react";

interface BroadcastPayload {
  id: string | number;
  title: string;
  message: string;
  image_url?: string;
  action_url?: string;
  target_group?: string;
}

export function InAppBroadcastToast() {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Supabase Realtime Broadcast Channel Listener
    const channel = supabase
      .channel("zebalpha-global-notifications")
      .on(
        "broadcast",
        { event: "broadcast-message" },
        (response) => {
          const payload = response.payload as BroadcastPayload;
          if (!payload?.title) return;

          // Target check
          if (payload.target_group === "sellers") return; // Customer app ignores seller-only alerts

          // Trigger in-app toast
          setActiveBroadcast(payload);

          // Trigger Haptic Vibration
          if ("vibrate" in navigator) {
            try {
              navigator.vibrate([150, 60, 150]);
            } catch (_) {}
          }

          // Trigger Phone / Native System Notification if permission is granted
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  (reg as any).showNotification(payload.title, {
                    body: payload.message,
                    icon: "/official-logo-sm.png",
                    badge: "/official-logo-sm.png",
                    image: payload.image_url || undefined,
                    data: {
                      url: payload.action_url || "/notifications",
                    },
                  });
                });
              } else {
                new Notification(payload.title, {
                  body: payload.message,
                  icon: "/official-logo-sm.png",
                });
              }
            }
          } catch (e) {
            console.warn("Native notification dispatch notice:", e);
          }

          // Dispatch window event for NotificationBell update
          window.dispatchEvent(new CustomEvent("zebalpha:new-broadcast"));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-dismiss in-app toast after 8 seconds
  useEffect(() => {
    if (!activeBroadcast) return;
    const timer = setTimeout(() => {
      setActiveBroadcast(null);
    }, 8000);
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] uppercase tracking-wider transition-all"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveBroadcast(null)}
                className="px-2.5 py-1.5 text-zinc-400 hover:text-white font-medium text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close X */}
          <button
            onClick={() => setActiveBroadcast(null)}
            className="text-zinc-500 hover:text-zinc-300 p-1 -mr-1 -mt-1 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
