"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationBell() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    async function checkNewProducts() {
      const { data } = await supabase
        .from("products")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const latestId = data[0].id;
        const lastSeenId = localStorage.getItem("last_seen_product_id");
        if (!lastSeenId || parseInt(lastSeenId) < latestId) {
          setHasNew(true);
        }
      }
    }
    checkNewProducts();
    
    // Set up real-time subscription for products table to automatically show red dot
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        (payload) => {
          setHasNew(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Link 
      href="/notifications" 
      onClick={() => setHasNew(false)}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all shrink-0" 
      aria-label="Notifications"
    >
      <Bell strokeWidth={2.5} className="h-[22px] w-[22px]" />
      {hasNew && (
        <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-emerald-50"></span>
        </span>
      )}
    </Link>
  );
}
