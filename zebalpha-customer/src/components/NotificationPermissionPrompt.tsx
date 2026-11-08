"use client";

import React, { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";
import { Bell, Sparkles, X, ShieldAlert, CheckCircle2 } from "lucide-react";

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [showDeniedGuide, setShowDeniedGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check Native Android App (Capacitor)
    if (isNativeApp()) {
      const cap = (window as any).Capacitor;
      const PushNotifications = cap?.Plugins?.PushNotifications;
      if (PushNotifications) {
        PushNotifications.checkPermissions().then((status: any) => {
          if (status.receive === "granted") {
            setPermissionState("granted");
          } else if (status.receive === "denied") {
            setPermissionState("denied");
          } else {
            setPermissionState("default");
            setShowPrompt(true);
          }
        }).catch(() => {
          setPermissionState("default");
          setShowPrompt(true);
        });
      } else {
        setPermissionState("default");
        setShowPrompt(true);
      }
      return;
    }

    // 2. Check Standard Web Browser
    if ("Notification" in window) {
      const current = Notification.permission;
      setPermissionState(current);

      if (current === "granted") {
        registerServiceWorker();
        return;
      }

      if (current === "default") {
        const dismissedUntil = localStorage.getItem("zebalpha_notif_prompt_dismissed_until");
        if (!dismissedUntil || Date.now() >= parseInt(dismissedUntil, 10)) {
          setShowPrompt(true);
        }
      } else if (current === "denied") {
        // User previously blocked in browser
        setPermissionState("denied");
      }
    } else {
      setPermissionState("unsupported");
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
    if (typeof window === "undefined") return;

    // 1. If Native Android App
    if (isNativeApp()) {
      const cap = (window as any).Capacitor;
      const PushNotifications = cap?.Plugins?.PushNotifications;
      if (PushNotifications) {
        try {
          const res = await PushNotifications.requestPermissions();
          if (res.receive === "granted") {
            setPermissionState("granted");
            setShowPrompt(false);
            await PushNotifications.register();
            return;
          } else {
            setPermissionState("denied");
            setShowDeniedGuide(true);
            return;
          }
        } catch (_) {}
      }
    }

    // 2. Standard Web Browser
    if ("Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissionState(permission);

        if (permission === "granted") {
          setShowPrompt(false);
          await registerServiceWorker();

          // Trigger welcome notification
          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.ready;
              (reg as any).showNotification("ZebAlpha Alerts Activated ✦", {
                body: "You're all set! Instant phone alerts for new drops, order updates, and secret discounts.",
                icon: "/official-logo-sm.png",
                badge: "/official-logo-sm.png",
                vibrate: [150, 70, 150],
              });
            } else {
              new Notification("ZebAlpha Alerts Activated ✦", {
                body: "You're all set! Instant phone alerts for new drops, order updates, and secret discounts.",
                icon: "/official-logo-sm.png",
              });
            }
          } catch (_) {}
        } else if (permission === "denied") {
          setShowDeniedGuide(true);
        }
      } catch (err) {
        console.warn("Notification permission error:", err);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowDeniedGuide(false);
    localStorage.setItem(
      "zebalpha_notif_prompt_dismissed_until",
      String(Date.now() + 24 * 60 * 60 * 1000) // 1 day
    );
  };

  if (!showPrompt && !showDeniedGuide) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-[80] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-zinc-950/95 border border-emerald-500/40 rounded-2xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl text-white">
        {showDeniedGuide ? (
          // Guide when notifications were blocked by phone/browser settings
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Notifications Blocked in Settings
                </h4>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Your phone/browser blocked alerts for this site. To turn them on:
                </p>
                <ol className="text-[11px] text-zinc-400 mt-1.5 list-decimal list-inside space-y-1">
                  <li>Tap the <b>Padlock (🔒) or tune icon</b> beside the URL bar</li>
                  <li>Tap <b>Permissions</b> ➔ <b>Notifications</b></li>
                  <li>Switch to <b>Allow</b></li>
                </ol>
              </div>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        ) : (
          // Default Flipkart/Meesho Style Allow Banner
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Flipkart / Meesho Style Alerts
                </span>
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Turn on ZebAlpha Alerts
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Get notified directly on your phone when new drops, flash discounts, and custom print proofs arrive.
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
        )}
      </div>
    </div>
  );
}
