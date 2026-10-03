"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

let lastCheckedTimestamp = 0;
let cachedHasNew = false;

export default function NotificationBell() {
  const [hasNew, setHasNew] = useState(cachedHasNew);

  useEffect(() => {
    async function checkNewProducts() {
      const now = Date.now();
      // Throttle repeated checks to once every 60 seconds across client route transitions
      if (now - lastCheckedTimestamp < 60000) {
        setHasNew(cachedHasNew);
        return;
      }
      lastCheckedTimestamp = now;

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
            setHasNew(true);
            cachedHasNew = true;
          } else {
            setHasNew(false);
            cachedHasNew = false;
          }
        }
      } catch (err) {
        console.warn("Notice checking new products for notification bell:", err);
      }
    }
    checkNewProducts();
    
    const channel = supabase
      .channel('customer-new-products-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        () => {
          setHasNew(true);
          cachedHasNew = true;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClick = () => {
    setHasNew(false);
    cachedHasNew = false;
    try {
      localStorage.setItem("last_seen_product_created_at", new Date().toISOString());
    } catch (_) {}
  };

  return (
    <Link 
      href="/notifications" 
      onClick={handleClick}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all shrink-0 active:scale-95" 
      aria-label="Notifications"
    >
      <Bell strokeWidth={2.2} className="h-4 w-4" />
      {hasNew && (
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      )}
    </Link>
  );
}
