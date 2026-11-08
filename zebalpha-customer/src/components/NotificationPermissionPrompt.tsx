"use client";

import React, { useEffect, useState } from "react";
import { Bell, Sparkles, X } from "lucide-react";

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }

    const currentPermission = Notification.permission;
    setStatus(currentPermission);

    // If permission already granted, register service worker silently
    if (currentPermission === "granted") {
      registerServiceWorker();
      return;
    }

    // If default, check if user dismissed recently
    if (currentPermission === "default") {
      const dismissedUntil = localStorage.getItem("zebalpha_notif_prompt_dismissed_until");
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return;
      }

      // Show Flipkart-style soft prompt after 3.5 seconds of user arrival
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, []);

  const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        console.warn("ServiceWorker registration notice:", err);
      }
    }
  };

  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      setStatus(permission);
      setShowPrompt(false);

      if (permission === "granted") {
        await registerServiceWorker();

        // Trigger welcome phone / device notification so user sees it in their notification bar immediately
        try {
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.ready;
            (reg as any).showNotification("ZebAlpha VIP Alerts Enabled ✦", {
              body: "You're all set! You'll receive instant alerts for exclusive drops, flash sales, and order proofs.",
              icon: "/official-logo-sm.png",
              badge: "/official-logo-sm.png",
              vibrate: [150, 80, 150],
            });
          } else {
            new Notification("ZebAlpha VIP Alerts Enabled ✦", {
              body: "You're all set! You'll receive instant alerts for exclusive drops, flash sales, and order proofs.",
              icon: "/official-logo-sm.png",
            });
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn("Notification request error:", err);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't ask again for 3 days
    localStorage.setItem(
      "zebalpha_notif_prompt_dismissed_until",
      String(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );
  };

  if (!showPrompt || status !== "default") {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-[80] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-zinc-950/95 border border-emerald-500/40 rounded-2xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl text-white">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Flash Drops & Orders
              </span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              Turn on ZebAlpha Alerts
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              Get notified like Flipkart & Meesho on your phone when new drops, flash sales, and custom design proofs arrive.
            </p>

            <div className="flex items-center gap-2.5 mt-3.5">
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
              >
                Allow Notifications
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
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
