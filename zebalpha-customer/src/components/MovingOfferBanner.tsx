"use client";

import { Crown, Flame, Truck, ShieldCheck, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useIsNativeApp } from "@/lib/platform";

const DEFAULT_ITEMS = [
  { icon: "crown", text: "ZEBALPHA • CLOTHING FOR THE CULTURE" },
  { icon: "flame", text: "NEW SEASON DROP • AUTHENTIC STREETWEAR" },
  { icon: "sparkles", text: "100% PREMIUM COMBED COTTON" },
  { icon: "truck", text: "FREE EXPRESS SHIPPING ON ORDERS OVER ₹999" },
  { icon: "shield", text: "QUALITY EMBROIDERY & RELAXED FIT" },
];

function getOfferIcon(icon: string, isNativeApp: boolean) {
  const cls = isNativeApp ? "w-3.5 h-3.5 text-[#9A6503]" : "w-4 h-4 text-white";
  switch (icon) {
    case "sparkles":
      return <ShieldCheck className={cls} strokeWidth={2.4} />;
    case "flame":
      return <Flame className={cls} strokeWidth={2.4} />;
    case "truck":
      return <Truck className={cls} strokeWidth={2.4} />;
    case "shield":
      return <ShieldCheck className={cls} strokeWidth={2.4} />;
    case "tag":
      return <Tag className={cls} strokeWidth={2.4} />;
    default:
      return <Crown className={cls} strokeWidth={2.4} />;
  }
}

export function MovingOfferBanner() {
  const isNativeApp = useIsNativeApp();
  const [items, setItems] = useState(DEFAULT_ITEMS);

  useEffect(() => {
    const fetchMarquee = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "marquee_banner")
          .maybeSingle();

        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          setItems(data.value);
        }
      } catch {
        // Fallback silently
      }
    };
    fetchMarquee();
  }, []);

  const BannerContent = () => (
    <div className="flex items-center justify-around w-full shrink-0 gap-10 px-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5 shrink-0">
          <span
            className={`p-1 rounded-full flex items-center justify-center ${
              isNativeApp
                ? "bg-[#FAF0D1] border border-[#DFBE6F]"
                : "bg-white/10"
            }`}
          >
            {getOfferIcon(item.icon, isNativeApp)}
          </span>
          <span
            className={`text-[11px] font-black uppercase tracking-[0.18em] select-none ${
              isNativeApp ? "text-[#111111]" : "text-white"
            }`}
          >
            {item.text}
          </span>
          <span className={`text-xs select-none ${isNativeApp ? "text-[#B8800C]" : "text-white/30"}`}>✦</span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`w-full h-10 min-h-[40px] overflow-hidden flex items-center border-y relative z-10 ${
        isNativeApp
          ? "bg-gradient-to-r from-[#FFFFFF] via-[#FBF1CE] to-[#FFFFFF] text-[#111111] border-[#E5C97B]/85 shadow-[0_4px_14px_rgba(180,130,20,0.08)]"
          : "bg-black text-white border-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
      }`}
    >
      <div className="flex animate-[marquee_28s_linear_infinite] whitespace-nowrap items-center w-[200%]">
        <BannerContent />
        <BannerContent />
      </div>
    </div>
  );
}
