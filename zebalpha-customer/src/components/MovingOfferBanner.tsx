"use client";

import { Crown, Flame, Truck, ShieldCheck, Tag } from "lucide-react";
import { useOfficialTheme } from "@/lib/platform";
import type { SduiMarqueeItem } from "@/lib/types";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

const DEFAULT_ITEMS: SduiMarqueeItem[] = [
  { icon: "crown", text: "ZEBALPHA • CLOTHING FOR THE CULTURE" },
  { icon: "flame", text: "NEW SEASON DROP • AUTHENTIC STREETWEAR" },
  { icon: "shield", text: "100% PREMIUM COMBED COTTON" },
  { icon: "truck", text: "FREE EXPRESS SHIPPING ON ORDERS OVER ₹499" },
  { icon: "tag", text: "FLAT ₹100 OFF ON 1ST ORDER (CODE: FIRST100)" },
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

interface MovingOfferBannerProps {
  initialItems?: SduiMarqueeItem[];
}

/**
 * Scrolling Champagne-Gold Marquee Banner
 * Hydrated directly from server-cached SDUI blueprint (zero client-side Supabase queries!).
 */
export function MovingOfferBanner({ initialItems }: MovingOfferBannerProps = {}) {
  const isNativeApp = useOfficialTheme();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const t = experience.themeTokens;

  const demsAnnouncements: SduiMarqueeItem[] = (experience.announcements || [])
    .filter((a) => a && a.status === "active" && (a.message || a.title))
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((a) => ({
      icon: (a.icon_key === "bell" ? "crown" : a.icon_key) || "crown",
      text: a.message || a.title,
    }));

  const items =
    demsAnnouncements.length > 0
      ? demsAnnouncements
      : Array.isArray(initialItems) && initialItems.length > 0
        ? initialItems
        : DEFAULT_ITEMS;

  const BannerContent = () => (
    <div className="flex items-center justify-around w-full shrink-0 gap-10 px-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5 shrink-0">
          <span
            style={
              isNativeApp && isFestivalOverride
                ? {
                    backgroundColor: t.surfaceColor,
                    borderColor: t.primaryColor,
                    color: t.primaryColor,
                  }
                : undefined
            }
            className={`p-1 rounded-full flex items-center justify-center ${
              isNativeApp
                ? "bg-[#FAF0D1] border border-[#DFBE6F]"
                : "bg-white/10"
            }`}
          >
            {getOfferIcon(item.icon, isNativeApp)}
          </span>
          <span
            style={
              isNativeApp && isFestivalOverride
                ? { color: t.primaryText }
                : undefined
            }
            className={`text-[11px] font-black uppercase tracking-[0.18em] select-none ${
              isNativeApp ? "text-[#111111]" : "text-white"
            }`}
          >
            {item.text}
          </span>
          <span
            style={isNativeApp && isFestivalOverride ? { color: t.primaryColor } : undefined}
            className={`text-xs select-none ${isNativeApp ? "text-[#B8800C]" : "text-white/30"}`}
          >
            ✦
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={
        isNativeApp && isFestivalOverride
          ? {
              background: `linear-gradient(90deg, ${t.cardBackground}, ${t.surfaceColor}, ${t.cardBackground})`,
              borderColor: t.borderColor,
              color: t.primaryText,
            }
          : undefined
      }
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
