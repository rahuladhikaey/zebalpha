"use client";

import React, { useEffect, useState, useRef } from "react";
import { isNativeApp } from "@/lib/platform";
import { initPushNotifications } from "@/lib/pushNotifications";
import { Bell, Sparkles, X, ShieldAlert, CheckCircle2, Truck, Zap } from "lucide-react";

const DISMISSED_KEY = "zebalpha_notif_prompt_dismissed_until";
const DISMISS_COUNT_KEY = "zebalpha_notif_prompt_dismiss_count";
const GRANTED_KEY = "zebalpha_notif_granted";

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeniedGuide, setShowDeniedGuide] = useState(false);
  const [permissionState, setPermissionState] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. If previously granted, never show the prompt again
    const isGranted = localStorage.getItem(GRANTED_KEY) === "true";
    if (isGranted) {
      setPermissionState("granted");
      return;
    }

    // 2. Check dismissal cooldown (applies to BOTH native app and web)
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return; // Still in cooldown period, do NOT show
    }

    // 3. Platform Permission Check
    const checkPermissions = async () => {
      // 3a. Native Android App (Capacitor)
      if (isNativeApp()) {
        const cap = (window as any).Capacitor;
        const PushNotifications = cap?.Plugins?.PushNotifications;

        if (PushNotifications) {
          try {
            const status = await PushNotifications.checkPermissions();
            if (status.receive === "granted") {
              setPermissionState("granted");
              localStorage.setItem(GRANTED_KEY, "true");
              return;
            } else if (status.receive === "denied") {
              setPermissionState("denied");
              return; // Do not nag if permanently denied in Android settings
            }
          } catch (_) {}
        }

        // Graceful 3.5s delay before showing so user can view products first
        timerRef.current = setTimeout(() => {
          setShowPrompt(true);
        }, 3500);
        return;
      }

      // 3b. Standard Web Browser
      if ("Notification" in window) {
        const current = Notification.permission;
        setPermissionState(current);

        if (current === "granted") {
          localStorage.setItem(GRANTED_KEY, "true");
          registerServiceWorker();
          return;
        }

        if (current === "denied") {
          return; // Browser permanently blocked notifications, don't show prompt
        }

        // If permission is 'default' (unasked), wait 3.5 seconds before showing
        timerRef.current = setTimeout(() => {
          setShowPrompt(true);
        }, 3500);
      } else {
        setPermissionState("unsupported");
      }
    };

    checkPermissions();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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

    try {
      // 1. Android Native App with JavaScript Bridge
      const win = window as any;
      if (win.ZebAlphaNative) {
        if (typeof win.ZebAlphaNative.isNotificationEnabled === "function" && !win.ZebAlphaNative.isNotificationEnabled()) {
          if (typeof win.ZebAlphaNative.openNotificationSettings === "function") {
            win.ZebAlphaNative.openNotificationSettings();
          }
        }
        if (typeof win.ZebAlphaNative.requestPermission === "function") {
          win.ZebAlphaNative.requestPermission();
        }
        markGranted();
        return;
      }

      // 2. Android Native App with Capacitor
      if (isNativeApp()) {
        const cap = win.Capacitor;
        const PushNotifications = cap?.Plugins?.PushNotifications;
        if (PushNotifications) {
          const res = await PushNotifications.requestPermissions();
          if (res.receive === "granted") {
            markGranted();
            await PushNotifications.register();
            return;
          } else {
            setPermissionState("denied");
            setShowDeniedGuide(true);
            return;
          }
        }
      }

      // 3. Standard Web Browser / PWA
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        setPermissionState(permission);

        if (permission === "granted") {
          markGranted();
          await registerServiceWorker();

          // Initialize push subscription via pushNotifications service
          try {
            await initPushNotifications();
          } catch (_) {}

          // Send immediate welcome alert
          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.ready;
              (reg as any).showNotification("ZebAlpha Alerts Activated ✦", {
                body: "You're all set! You'll receive instant updates for order tracking, flash drops, and exclusive discounts.",
                icon: "/official-logo-sm.png",
                badge: "/official-logo-sm.png",
                vibrate: [150, 70, 150],
              });
            } else {
              new Notification("ZebAlpha Alerts Activated ✦", {
                body: "You're all set! You'll receive instant updates for order tracking, flash drops, and exclusive discounts.",
                icon: "/official-logo-sm.png",
              });
            }
          } catch (_) {}
        } else if (permission === "denied") {
          setShowDeniedGuide(true);
        }
      }
    } catch (err) {
      console.warn("Notification permission error:", err);
    }
  };

  const markGranted = () => {
    setPermissionState("granted");
    localStorage.setItem(GRANTED_KEY, "true");
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setShowPrompt(false);
    }, 2000);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowDeniedGuide(false);

    // Calculate intelligent cooldown: 7 days on 1st dismiss, 30 days on repeat dismiss
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(DISMISS_COUNT_KEY, String(count));

    const cooldownDays = count >= 2 ? 30 : 7;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + cooldownMs));
  };

  if (!showPrompt && !showDeniedGuide && !showSuccess) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 left-3 sm:right-4 sm:left-4 md:left-auto md:max-w-md z-[80] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-zinc-950/95 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white">
        
        {/* Success Confirmation Toast */}
        {showSuccess ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Alerts Activated</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                You will receive real-time updates for order tracking and exclusive drops.
              </p>
            </div>
          </div>
        ) : showDeniedGuide ? (
          // Guide when notifications were previously blocked in phone settings
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Notifications Blocked in Settings
                </h4>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Your device has alerts blocked for ZebAlpha. To turn them on:
                </p>
                <ol className="text-[11px] text-zinc-400 mt-2 list-decimal list-inside space-y-1">
                  <li>Open phone <b>Settings ➔ Apps ➔ ZebAlpha</b></li>
                  <li>Tap <b>Permissions ➔ Notifications</b></li>
                  <li>Select <b>Allow</b></li>
                </ol>
              </div>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        ) : (
          // Official ZebAlpha Notification Prompt (Clean, Professional eCommerce Styling)
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {/* Official Header Badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Official App Updates
                </span>
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </div>

              {/* Title */}
              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Turn on ZebAlpha Alerts
              </h4>

              {/* Description */}
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Get real-time alerts on your phone for delivery tracking, flash discounts, and custom print releases.
              </p>

              {/* Feature Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  <Truck className="w-3 h-3 text-emerald-400" /> Order Tracking
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  <Zap className="w-3 h-3 text-emerald-400" /> Flash Deals
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  ✦ New Drops
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_2px_14px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  Allow Notifications
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-zinc-300 p-1 -mr-1 -mt-1 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
