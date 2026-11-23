import Link from "next/link";
import Image from "next/image";
import type { PromotionalCampaign, PromotionalSlot } from "@/lib/types";

// --- INTRICATE FESTIVE VECTOR ASSETS (High-Definition Scalable Silver Linework) ---

// 1. Silver Corner Mandala Fan (Quarter-circle intricate Indian rangoli / mandala art)
function SilverCornerMandala({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 pointer-events-none select-none opacity-85 ${className}`}
      aria-hidden="true"
    >
      <circle cx="0" cy="0" r="95" stroke="url(#silverGrad)" strokeWidth="0.75" strokeDasharray="3 3" />
      <circle cx="0" cy="0" r="80" stroke="url(#silverGrad)" strokeWidth="1" />
      <circle cx="0" cy="0" r="68" stroke="url(#silverGrad)" strokeWidth="0.75" />
      <circle cx="0" cy="0" r="54" stroke="url(#silverGrad)" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="0" cy="0" r="40" stroke="url(#silverGrad)" strokeWidth="1.25" />
      <circle cx="0" cy="0" r="25" stroke="url(#silverGrad)" strokeWidth="0.75" />
      <circle cx="0" cy="0" r="12" stroke="url(#silverGrad)" strokeWidth="1" />
      {/* Intricate Rays & Petals */}
      <path d="M0 0 L90 0 M0 0 L83 34 M0 0 L64 64 M0 0 L34 83 M0 0 L0 90" stroke="url(#silverGrad)" strokeWidth="0.75" />
      <path d="M0 0 L88 15 M0 0 L75 50 M0 0 L50 75 M0 0 L15 88" stroke="url(#silverGrad)" strokeWidth="0.5" strokeDasharray="1 2" />
      <path
        d="M25 0 Q32 12 35 25 Q25 32 0 25 M54 0 Q62 20 65 35 Q50 48 0 54 M80 0 Q85 30 75 55 Q55 75 0 80"
        stroke="url(#silverGrad)"
        strokeWidth="0.75"
      />
      <defs>
        <linearGradient id="silverGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#D4D4D8" />
          <stop offset="0.75" stopColor="#A1A1AA" />
          <stop offset="1" stopColor="#71717A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 2. Hanging Indian Festive Lantern (Kandil / Akashdeep with hanging tassels)
function HangingLantern({ className = "", cordLength = 40 }: { className?: string; cordLength?: number }) {
  return (
    <svg
      viewBox="0 0 40 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-6 sm:w-8 md:w-10 h-auto pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Hanging Cord */}
      <line x1="20" y1="0" x2="20" y2={cordLength} stroke="#A1A1AA" strokeWidth="1" strokeDasharray="2 1" />
      {/* Top Cap */}
      <circle cx="20" cy={cordLength} r="2.5" fill="#E4E4E7" />
      <path
        d={`M13 ${cordLength + 3} L27 ${cordLength + 3} L24 ${cordLength + 7} L16 ${cordLength + 7} Z`}
        fill="#D4D4D8"
        stroke="#FFFFFF"
        strokeWidth="0.5"
      />
      {/* Lantern Body (Diamond Facets) */}
      <polygon
        points={`20,${cordLength + 7} 30,${cordLength + 19} 20,${cordLength + 32} 10,${cordLength + 19}`}
        fill="rgba(255, 255, 255, 0.08)"
        stroke="#E4E4E7"
        strokeWidth="1"
      />
      {/* Inner Lattice */}
      <line x1="20" y1={cordLength + 7} x2="20" y2={cordLength + 32} stroke="#FFFFFF" strokeWidth="0.75" />
      <line x1="10" y1={cordLength + 19} x2="30" y2={cordLength + 19} stroke="#FFFFFF" strokeWidth="0.75" />
      <polygon
        points={`20,${cordLength + 12} 26,${cordLength + 19} 20,${cordLength + 27} 14,${cordLength + 19}`}
        stroke="#A1A1AA"
        strokeWidth="0.5"
      />
      {/* Bottom Fringe / Tassels */}
      <path
        d={`M14 ${cordLength + 32} L11 ${cordLength + 48} M17 ${cordLength + 32} L16 ${cordLength + 52} M20 ${cordLength + 32} L20 ${cordLength + 55} M23 ${cordLength + 32} L24 ${cordLength + 52} M26 ${cordLength + 32} L29 ${cordLength + 48}`}
        stroke="#E4E4E7"
        strokeWidth="0.75"
      />
    </svg>
  );
}

// 3. Glowing Traditional Indian Earthen Diya (Oil Lamp) on Ornate Silver Base
function GlowingDiya({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-8 sm:w-11 md:w-14 h-auto pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Soft Golden Radiant Aura */}
        <radialGradient id="diyaGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        {/* Flame Gradient */}
        <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>

      {/* Flame Glow Ambient Sphere */}
      <circle cx="35" cy="16" r="14" fill="url(#diyaGlow)" />

      {/* Flame Shape */}
      <path
        d="M35 5 C37 10, 41 14, 39 19 C37 23, 33 23, 31 19 C29 14, 33 10, 35 5 Z"
        fill="url(#flameGrad)"
      />
      {/* Inner White Wick Core */}
      <path d="M35 12 C35.8 14.5, 36.5 17, 35.5 19 C34.5 19, 34.2 17, 35 12 Z" fill="#FFFFFF" />

      {/* Earthen Lamp Base (Diya Bowl) */}
      <path
        d="M12 24 C14 34, 56 34, 58 24 C59 21, 52 22, 35 22 C18 22, 11 21, 12 24 Z"
        fill="#A1A1AA"
        stroke="#E4E4E7"
        strokeWidth="1"
      />
      {/* Silver Pedestal Stand */}
      <path d="M26 31 L24 38 L46 38 L44 31 Z" fill="#71717A" stroke="#D4D4D8" strokeWidth="0.75" />
      <ellipse cx="35" cy="38" rx="16" ry="3" fill="#D4D4D8" stroke="#FFFFFF" strokeWidth="0.75" />
    </svg>
  );
}

// 4. Double-Line Ornate Silver Frame with Scalloped / Convex Corner Cutouts
function OrnateCardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative group p-2.5 sm:p-3 bg-black transition-all duration-300 hover:shadow-2xl hover:shadow-zinc-500/10">
      {/* Outer Silver Hairline Frame */}
      <div className="absolute inset-0 border border-zinc-600/80 pointer-events-none rounded-lg" />
      
      {/* Inner Recessed Silver Frame */}
      <div className="absolute inset-1 border border-zinc-500/40 pointer-events-none rounded-md" />

      {/* Corner Ornate Accents (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white pointer-events-none" />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// --- MAIN PROMOTIONAL SHOWCASE SECTION (Flipkart/Meesho 16-Slot Merchandising Grid) ---
export function PromotionalGridSection({
  campaign,
  overrideTitle,
  overrideSubtitle,
}: {
  campaign: PromotionalCampaign;
  overrideTitle?: string;
  overrideSubtitle?: string;
}) {
  if (!campaign || !campaign.slots || campaign.slots.length === 0) {
    return null;
  }

  // Filter to slots with valid title & image
  const displaySlots = campaign.slots
    .filter((s) => s && s.title && s.image_url)
    .slice(0, 16);

  if (displaySlots.length === 0) {
    return null;
  }

  const isGoldTheme =
    campaign.theme_preset === "champagne_gold_luxury" ||
    campaign.theme_preset === "brand_spotlight" ||
    campaign.theme_preset === "default_clean";

  if (isGoldTheme) {
    return (
      <section className="relative w-full my-8 sm:my-12 overflow-hidden rounded-3xl bg-gradient-to-b from-[#FFFDF8] via-[#FFF8E6] to-[#FFFDF8] border border-[#E4C988] shadow-[0_14px_38px_-12px_rgba(166,124,28,0.18)] p-4 sm:p-7">
        <div className="text-center max-w-3xl mx-auto pb-5 sm:pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3C4] border border-[#DFBE6F] px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] text-[#9A6503]">
            ZEBALPHA FESTIVE SHOWCASE
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#14120F]">
            {overrideTitle || campaign.title || "TOP DEALS"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#5C4E35]">
            {overrideSubtitle ||
              campaign.subtitle ||
              "Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger"}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {displaySlots.map((slot: PromotionalSlot) => (
            <Link
              key={slot.slot_number}
              href={slot.destination_url || "/products"}
              prefetch={false}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-[#E4C988] p-2 sm:p-2.5 shadow-[0_6px_18px_-8px_rgba(166,124,28,0.18)] hover:-translate-y-0.5 hover:border-[#B4780C] transition-all"
            >
              <div className="relative w-full aspect-[4/3] sm:aspect-square overflow-hidden rounded-xl bg-[#FAF3E1]">
                <img
                  src={slot.image_url}
                  alt={slot.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-2 text-center px-1">
                <div className="text-xs sm:text-sm font-bold text-[#14120F] truncate">
                  {slot.title}
                </div>
                <div className="mt-0.5 inline-block rounded-full bg-[#FFF4D4] border border-[#E5C675] px-2.5 py-0.5 text-[11px] sm:text-xs font-black text-[#9A6503]">
                  {slot.price_label}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full my-10 sm:my-14 overflow-hidden rounded-3xl bg-black border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(161,161,170,0.15),rgba(0,0,0,0))] pointer-events-none" />

      {/* Top-Left Silver Mandala Fan */}
      <div className="absolute -top-2 -left-2 z-10 pointer-events-none">
        <SilverCornerMandala />
      </div>

      {/* Top-Right Silver Mandala Fan */}
      <div className="absolute -top-2 -right-2 z-10 pointer-events-none rotate-90">
        <SilverCornerMandala />
      </div>

      {/* Hanging Lanterns Bar (Left & Right Flanks) */}
      <div className="absolute top-0 left-20 sm:left-32 md:left-40 hidden sm:flex items-start gap-4 pointer-events-none z-10">
        <HangingLantern cordLength={18} />
        <HangingLantern cordLength={32} />
      </div>
      <div className="absolute top-0 right-20 sm:right-32 md:right-40 hidden sm:flex items-start gap-4 pointer-events-none z-10">
        <HangingLantern cordLength={32} />
        <HangingLantern cordLength={18} />
      </div>

      {/* FESTIVE CAMPAIGN HEADER */}
      <div className="relative z-20 pt-8 sm:pt-10 pb-6 sm:pb-8 px-4 text-center max-w-4xl mx-auto">
        {/* Brand Kicker with Glow */}
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <span className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-zinc-400" />
          <span className="text-[10px] sm:text-xs font-black tracking-[0.35em] uppercase text-zinc-300">
            ZeBALPHA
          </span>
          <span className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-zinc-400" />
        </div>

        {/* Central Title Flanked by Glowing Diyas */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 my-1">
          <GlowingDiya className="-scale-x-100" />
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-serif drop-shadow-[0_2px_15px_rgba(255,255,255,0.25)]">
            {campaign.title || "TOP DEALS"}
          </h2>
          <GlowingDiya />
        </div>

        {/* Subtitle / Festive Pick Hook */}
        <p className="mt-2 text-xs sm:text-sm font-semibold text-zinc-300 tracking-wide max-w-xl mx-auto">
          {campaign.subtitle || "Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger"}
        </p>

        {/* Decorative Divider */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent via-zinc-500 to-transparent" />
          <span className="text-zinc-500 text-xs">✦</span>
          <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent via-zinc-500 to-transparent" />
        </div>
      </div>

      {/* THE 16-SLOT MERCHANDISING GRID (Strictly 4 Columns on Desktop, 2 Columns on Mobile, ZERO Horizontal Scroll) */}
      <div className="relative z-20 px-3 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {displaySlots.map((slot: PromotionalSlot) => (
            <Link
              key={slot.slot_number}
              href={slot.destination_url || "/categories"}
              prefetch={false}
              className="block group focus:outline-none focus:ring-1 focus:ring-white rounded-lg"
              title={`${slot.title} - ${slot.price_label}`}
            >
              <OrnateCardFrame>
                {/* Product/Category Image */}
                <div className="relative w-full aspect-[4/3] sm:aspect-square overflow-hidden rounded bg-zinc-950">
                  <Image
                    src={slot.image_url}
                    alt={slot.title}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 300px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  {/* Subtle Top-Down Sheen Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40 pointer-events-none" />
                </div>

                {/* 2-Line Promotional Metadata (Clean, Crisp, Conversion-Optimized) */}
                <div className="mt-2 sm:mt-2.5 text-center px-1 space-y-0.5">
                  {/* Line 1: Curated Category / Drop Name */}
                  <div className="text-[11px] sm:text-xs md:text-sm font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
                    {slot.title}
                  </div>

                  {/* Line 2: Price Floor / Deal Text */}
                  <div className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight drop-shadow-sm">
                    {slot.price_label}
                  </div>
                </div>
              </OrnateCardFrame>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
