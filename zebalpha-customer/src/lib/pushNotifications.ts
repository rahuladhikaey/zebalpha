"use client";

import { supabase } from "@/lib/supabaseClient";
import { isNativeApp } from "@/lib/platform";

export interface PushTokenPayload {
  token: string;
  platform: "android" | "web" | "ios";
  user_id?: string | null;
  topics?: string[];
  device_info?: string;
}

/**
 * Checks whether push notifications are supported on current platform
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Saves or updates device push token in Supabase
 */
export async function saveDeviceToken(payload: PushTokenPayload): Promise<boolean> {
  try {
    const { token, platform, user_id, topics = ["all", "new_drops"], device_info } = payload;
    if (!token) return false;

    // Check if user is logged in if user_id was not passed
    let effectiveUserId = user_id;
    if (!effectiveUserId) {
      const { data: authData } = await supabase.auth.getUser();
      effectiveUserId = authData?.user?.id || null;
    }

    // Call server register API endpoint for resilient upserting
    const res = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform,
        user_id: effectiveUserId,
        topics,
        device_info: device_info || (typeof navigator !== "undefined" ? navigator.userAgent : "Unknown"),
      }),
    });

    if (!res.ok) {
      console.warn("Notice saving push token to API:", await res.text());
    }

    // Also persist token in localStorage
    localStorage.setItem("zebalpha_fcm_token", token);
    return true;
  } catch (err) {
    console.warn("Notice in saveDeviceToken:", err);
    return false;
  }
}

/**
 * Initializes Push Notifications for Android (Capacitor) or Web Push (like Flipkart/Meesho)
 */
export async function initPushNotifications(userId?: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { success: false, error: "Window unavailable" };
  }

  // 1. NATIVE ANDROID APP (Capacitor)
  if (isNativeApp()) {
    try {
      const cap = (window as any).Capacitor;
      const PushNotifications = cap?.Plugins?.PushNotifications;

      if (!PushNotifications) {
        console.warn("Notice: Capacitor PushNotifications plugin not attached yet.");
        return { success: false, error: "Plugin not available" };
      }

      // Check / request permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        return { success: false, error: "Notification permission denied by user" };
      }

      // Register device with FCM
      await PushNotifications.register();

      // Listen for registration token
      return new Promise((resolve) => {
        PushNotifications.addListener("registration", async (token: { value: string }) => {
          if (token?.value) {
            await saveDeviceToken({
              token: token.value,
              platform: "android",
              user_id: userId,
              topics: ["all", "new_drops", "orders"],
            });
            resolve({ success: true, token: token.value });
          }
        });

        PushNotifications.addListener("registrationError", (err: any) => {
          console.error("Notice: Registration error for push notifications:", err);
          resolve({ success: false, error: err?.error || "Registration failed" });
        });

        // Handle push notification received while app is open
        PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
          console.log("Push notification received in foreground:", notification);
        });

        // Handle tap / click on notification in phone notification tray (Deep linking like Flipkart)
        PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
          const data = action?.notification?.data;
          if (data?.url) {
            window.location.href = data.url;
          } else if (data?.productId) {
            window.location.href = `/products/${data.productId}`;
          } else {
            window.location.href = "/notifications";
          }
        });

        // Fallback resolve after 4s if listener already fired
        setTimeout(() => {
          const cached = localStorage.getItem("zebalpha_fcm_token");
          if (cached) resolve({ success: true, token: cached });
        }, 4000);
      });
    } catch (err: any) {
      console.warn("Notice initializing native push notifications:", err);
      return { success: false, error: err?.message };
    }
  }

  // 2. WEB BROWSER / PWA (Web Notifications)
  if ("Notification" in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return { success: true };
      }
      return { success: false, error: "Web notification permission not granted" };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  return { success: false, error: "Push not supported on this platform" };
}

/**
 * Subscribes user to a specific New Drop Alert
 */
export async function subscribeToDropAlert(dropId: string, dropTitle: string): Promise<boolean> {
  try {
    const initRes = await initPushNotifications();
    const token = initRes.token || localStorage.getItem("zebalpha_fcm_token");

    if (token) {
      await saveDeviceToken({
        token,
        platform: isNativeApp() ? "android" : "web",
        topics: ["all", "new_drops", `drop_${dropId}`],
      });
    }

    // Record locally
    const existing = JSON.parse(localStorage.getItem("vip_drop_subscriptions") || "[]");
    if (!existing.includes(dropId)) {
      existing.push(dropId);
      localStorage.setItem("vip_drop_subscriptions", JSON.stringify(existing));
    }
    return true;
  } catch (err) {
    console.warn("Notice in subscribeToDropAlert:", err);
    return false;
  }
}
