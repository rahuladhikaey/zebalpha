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
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        () => {
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
