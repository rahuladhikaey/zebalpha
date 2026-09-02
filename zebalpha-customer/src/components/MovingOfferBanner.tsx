"use client";

import { Crown, Sparkles, Flame, Truck, ShieldCheck, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_ITEMS = [
  { icon: "crown", text: "ZEBALPHA • CLOTHING FOR THE CULTURE" },
  { icon: "flame", text: "LIMITED TIME DROP • 50% OFF" },
  { icon: "sparkles", text: "100% PREMIUM COMBED COTTON" },
  { icon: "truck", text: "FREE EXPRESS SHIPPING ON ORDERS OVER ₹999" },
  { icon: "shield", text: "QUALITY EMBROIDERY & RELAXED FIT" },
];

const iconMap: Record<string, React.ReactNode> = {
  crown: <Crown className="w-4 h-4 text-white" strokeWidth={2.5} />,
  sparkles: <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />,
  flame: <Flame className="w-4 h-4 text-white" strokeWidth={2.5} />,
  truck: <Truck className="w-4 h-4 text-white" strokeWidth={2.5} />,
  shield: <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />,
  tag: <Tag className="w-4 h-4 text-white" strokeWidth={2.5} />,
};

export function MovingOfferBanner() {
  const [items, setItems] = useState(DEFAULT_ITEMS);

  useEffect(() => {
    const fetchMarquee = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "marquee_banner")
          .single();

        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          setItems(data.value);
        }
      } catch (err) {
        // Fallback silently
      }
    };
    fetchMarquee();

    const channel = supabase
      .channel("marquee-banner-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings", filter: "key=eq.marquee_banner" }, (payload) => {
        const value = (payload.new as any)?.value;
        if (value && Array.isArray(value) && value.length > 0) {
          setItems(value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const BannerContent = () => (
    <div className="flex items-center justify-around w-full shrink-0 gap-10 px-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5 shrink-0">
          <span className="p-1 rounded-full bg-white/10 flex items-center justify-center">
            {iconMap[item.icon] || <Crown className="w-3.5 h-3.5 text-white" />}
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white select-none">
            {item.text}
          </span>
          <span className="text-white/30 text-xs select-none">✦</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full overflow-hidden bg-black text-white py-2.5 flex items-center border-y border-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.8)] relative z-10">
      <div className="flex animate-[marquee_28s_linear_infinite] whitespace-nowrap items-center w-[200%]">
        <BannerContent />
        <BannerContent />
      </div>
    </div>
  );
}
