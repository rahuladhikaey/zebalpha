"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useIsNativeApp } from "@/lib/platform";

const SESSION_STORAGE_KEY = "zebalpha_client_session_id";
const HEARTBEAT_INTERVAL_MS = 45000; // 45 seconds

export function ActiveSessionTracker() {
  const { user } = useAuth();
  const isNative = useIsNativeApp();
  const sessionIdRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Initialize or restore session ID from sessionStorage
    try {
      let storedId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!storedId) {
        storedId = `zba_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, storedId);
      }
      sessionIdRef.current = storedId;
    } catch {
      sessionIdRef.current = `zba_mem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    }

    const sessionId = sessionIdRef.current;
    const platform = isNative ? "android" : "website";

    // 2. Ping function
    const sendHeartbeat = async (action: "ping" | "end" = "ping") => {
      try {
        if (action === "end") {
          // Use sendBeacon for reliable delivery during page unload
          if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            navigator.sendBeacon(`/api/analytics/heartbeat?action=end&sessionId=${encodeURIComponent(sessionId)}`);
            return;
          }
        }

        await fetch("/api/analytics/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: action === "end",
          body: JSON.stringify({
            sessionId,
            userId: user?.id || null,
            platform,
            action,
            deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop"
          })
        });
      } catch {
        // Silently ignore ping network errors in client
      }
    };

    // 3. Immediate initial heartbeat
    sendHeartbeat("ping");

    // 4. Start recurring interval while tab is active
    const startHeartbeat = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (typeof document !== "undefined" && !document.hidden) {
          sendHeartbeat("ping");
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    startHeartbeat();

    // 5. Visibility and Page Lifecycle Listeners
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause and notify backend
        sendHeartbeat("end");
      } else {
        // User resumed / returned to tab
        sendHeartbeat("ping");
        startHeartbeat();
      }
    };

    const handlePageHide = () => {
      sendHeartbeat("end");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      sendHeartbeat("end");
    };
  }, [user?.id, isNative]);

  return null;
}
