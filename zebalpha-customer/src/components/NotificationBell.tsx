"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

let lastCheckedTimestamp = 0;
let cachedHasNew = false;

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
}

export default function NotificationBell({ className, iconClassName }: NotificationBellProps = {}) {
  const [hasNew, setHasNew] = useState(cachedHasNew);

  useEffect(() => {
    async function checkNewAlerts() {
      const now = Date.now();
      if (now - lastCheckedTimestamp < 30000) {
        setHasNew(cachedHasNew);
        return;
      }
      lastCheckedTimestamp = now;

      let isUnread = false;

      // 1. Check latest broadcast message via fast resilient API
      try {
        const res = await fetch("/api/notifications/latest", { cache: "no-store" });
        const json = await res.json();
        if (json.success && json.latest?.id) {
          const lastSeenId = localStorage.getItem("last_seen_broadcast_id");
          if (!lastSeenId || String(json.latest.id) !== lastSeenId) {
            isUnread = true;
          }
        }
      } catch (_) {}

      // 2. Check latest products if not already marked unread
      if (!isUnread) {
        try {
          const { data } = await supabase
            .from("products")
            .select("created_at")
            .order("created_at", { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            const latestCreatedAt = data[0].created_at;
            const lastSeenAt = localStorage.getItem("last_seen_product_created_at");
            if (!lastSeenAt || new Date(latestCreatedAt) > new Date(lastSeenAt)) {
              isUnread = true;
            }
          }
        } catch (_) {}
      }

      setHasNew(isUnread);
      cachedHasNew = isUnread;
    }

    checkNewAlerts();

    // Listen to realtime products
    const channel = supabase
      .channel("customer-new-products-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        () => {
          setHasNew(true);
          cachedHasNew = true;
        }
      )
      .subscribe();

    // Listen to local window broadcast event
    const handleBroadcastEvent = () => {
      setHasNew(true);
      cachedHasNew = true;
    };

    window.addEventListener("zebalpha:new-broadcast", handleBroadcastEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("zebalpha:new-broadcast", handleBroadcastEvent);
    };
  }, []);

  const handleClick = () => {
    setHasNew(false);
    cachedHasNew = false;
    try {
      const nowIso = new Date().toISOString();
      localStorage.setItem("last_seen_product_created_at", nowIso);
      localStorage.setItem("last_seen_broadcast_at", nowIso);
    } catch (_) {}
  };

  return (
    <Link 
      href="/notifications" 
      onClick={handleClick}
      className={className || "relative flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all shrink-0 active:scale-95"} 
      aria-label="Notifications"
    >
      <Bell strokeWidth={2.2} className={iconClassName || "h-4 w-4"} />
      {hasNew && (
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
      )}
    </Link>
  );
}
