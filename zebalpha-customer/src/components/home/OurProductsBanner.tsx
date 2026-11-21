"use client";

import Link from "next/link";
import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { useOfficialTheme } from "@/lib/platform";

/**
 * Luxury Metallic Gold & Obsidian "OUR PRODUCTS" section banner (Web)
 * and Warm Ivory Cream & Champagne Gold banner (Android App).
 */
export function OurProductsBanner() {
  const isNativeApp = useOfficialTheme();
  const uid = useId().replace(/:/g, "");
  const ribbonGoldId = `opRibbonGold-${uid}`;
  const ribbonDeepId = `opRibbonDeep-${uid}`;
  const sparkleId = `opSparkle-${uid}`;
  const bagGoldId = `opBagGold-${uid}`;
  const teeBodyId = `opTeeBody-${uid}`;
  const teeShadowId = `opTeeShadow-${uid}`;
  const orbitGradId = `opOrbit-${uid}`;
  const orbitGlowId = `opOrbitGlow-${uid}`;

  if (isNativeApp) {
    return (
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFFDF8] via-[#FAF0D1] to-[#FFFDF8] border border-[#E2BE66]/85 shadow-[0_8px_22px_rgba(166,124,28,0.10)] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white p-0.5 border-2 border-[#E2BE66] shadow-[0_4px_12px_rgba(166,124,28,0.22)] overflow-hidden">
              <img
                src="/official-logo-sm.png"
                alt="ZebAlpha"
                className="h-full w-full rounded-full object-contain"
              />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black uppercase tracking-tight leading-none text-[#14120F]">
                Our <span className="text-[#9A6503]">Products</span>
              </h2>
              <p className="mt-1 text-[11px] font-medium text-[#5C4E35] truncate">
                Streetwear, polos, hoodies &amp; curated culture drops
              </p>
            </div>
          </div>

          <Link
            href="/customize"
            aria-label="Create Custom Apparel Design"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#FCE89C] via-[#EAB308] to-[#C68A12] border border-[#FFF5C8] px-3.5 py-2 text-[11px] font-black text-[#111111] shadow-sm active:scale-95 transition-transform"
          >
            <span>Create</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl sm:rounded-3xl bg-[#050402] border border-amber-500/40 shadow-[0_14px_45px_rgba(0,0,0,0.9),0_0_28px_rgba(234,179,8,0.14)] px-4 py-4 sm:px-7 sm:py-5">
      {/* Warm Radial Corner Glows + Top/Bottom Gold Hairline Gleams */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 40% 100% at 6% 50%, rgba(234,179,8,0.20), transparent 72%), radial-gradient(ellipse 38% 100% at 94% 50%, rgba(217,119,6,0.22), transparent 72%), radial-gradient(ellipse 30% 80% at 68% 55%, rgba(250,204,21,0.10), transparent 75%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-600/20 via-[#fef08a]/85 to-amber-600/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-amber-700/25 via-[#eab308]/80 to-amber-700/25"
      />

      {/* Sweeping 3D Metallic Gold Ribbons & Corner Halftone Sparkles */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 180"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={ribbonGoldId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#eab308" stopOpacity="0.88" />
            <stop offset="68%" stopColor="#b45309" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={ribbonDeepId} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.92" />
            <stop offset="38%" stopColor="#d97706" stopOpacity="0.72" />
            <stop offset="78%" stopColor="#78350f" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#050402" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={sparkleId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="1" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Top-left flowing gold silk wave */}
        <path
          d="M -20,18 C 110,-6 245,44 375,18 C 460,2 530,-8 620,6 L 520,26 C 415,12 290,62 155,34 C 75,18 15,38 -20,64 Z"
          fill={`url(#${ribbonGoldId})`}
          opacity="0.78"
        />
        <path
          d="M -20,34 C 95,4 235,54 395,22 C 475,6 565,2 650,16"
          fill="none"
          stroke="#fef08a"
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />

        {/* Bottom-left sweeping wave */}
        <path
          d="M -10,168 C 85,126 190,148 305,176 L 175,182 C 95,166 35,160 -10,182 Z"
          fill={`url(#${ribbonGoldId})`}
          opacity="0.65"
        />

        {/* Right sweeping 3D gold ribbon arches */}
        <path
          d="M 1220,12 C 1075,-12 945,42 795,28 C 680,18 595,4 505,18 L 610,36 C 720,16 835,62 985,46 C 1095,34 1165,42 1220,76 Z"
          fill={`url(#${ribbonDeepId})`}
          opacity="0.82"
        />
        <path
          d="M 1220,152 C 1090,104 975,134 835,172 L 965,182 C 1065,152 1145,154 1220,178 Z"
          fill={`url(#${ribbonDeepId})`}
          opacity="0.75"
        />
        <path
          d="M 815,172 C 975,122 1095,112 1220,144"
          fill="none"
          stroke="#fde68a"
          strokeOpacity="0.52"
          strokeWidth="1.5"
        />

        {/* Corner stardust / halftone glints */}
        {[
          [22, 122, 2.1],
          [38, 134, 1.6],
          [52, 146, 1.9],
          [66, 128, 1.4],
          [82, 140, 1.5],
          [28, 152, 1.7],
          [44, 160, 1.3],
          [1140, 44, 1.8],
          [1160, 58, 1.4],
          [1120, 62, 1.5],
          [1175, 118, 2.0],
          [1152, 132, 1.6],
          [1132, 144, 1.4],
          [696, 86, 2.2],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#${sparkleId})`} opacity="0.85" />
        ))}

        {/* 4-point gold star spark near center-right tee */}
        <path
          d="M 696 72 L 699 83 L 710 86 L 699 89 L 696 100 L 693 89 L 682 86 L 693 83 Z"
          fill="#fef08a"
          opacity="0.9"
        />
        <path
          d="M 946 38 L 948 45 L 955 47 L 948 49 L 946 56 L 944 49 L 937 47 L 944 45 Z"
          fill="#fde047"
          opacity="0.8"
        />
      </svg>

      {/* Main Content Row */}
      <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-5">
        {/* Left: Gold Shopping Bag Z Icon + Divider + Heading + Subtitle */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Glowing Golden Shopping Bag "Z" Emblem */}
          <div className="flex shrink-0 items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="h-8 w-8 sm:h-11 sm:w-11 drop-shadow-[0_0_12px_rgba(234,179,8,0.55)]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={bagGoldId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
              {/* Handle */}
              <path
                d="M17.5 16V13.2C17.5 9.8 20.4 7 24 7C27.6 7 30.5 9.8 30.5 13.2V16"
                fill="none"
                stroke={`url(#${bagGoldId})`}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Bag Body */}
              <path
                d="M11.5 16.5H36.5L39 37.8C39.2 39.7 37.7 41.3 35.8 41.3H12.2C10.3 41.3 8.8 39.7 9 37.8L11.5 16.5Z"
                fill="rgba(18, 12, 4, 0.72)"
                stroke={`url(#${bagGoldId})`}
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              {/* Bold Z inside bag */}
              <path
                d="M19 23.5H29L19.4 34.5H29.2"
                fill="none"
                stroke={`url(#${bagGoldId})`}
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Vertical Metallic Gold Divider */}
          <span
            aria-hidden="true"
            className="block h-8 sm:h-11 w-[2px] sm:w-[2.5px] shrink-0 rounded-full bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#92400e] shadow-[0_0_10px_rgba(234,179,8,0.5)]"
          />

          <div className="min-w-0">
            <h2 className="flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2 text-lg sm:text-2xl lg:text-[28px] font-black uppercase tracking-tight leading-none">
              <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.18)]">
                Our
              </span>
              <span className="bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#b45309] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(234,179,8,0.42)]">
                Products
              </span>
            </h2>
            <p className="mt-1 sm:mt-1.5 text-[11px] sm:text-[13px] font-medium text-zinc-200/90 line-clamp-1">
              Explore our complete streetwear, polos, hoodies &amp; apparel collection
            </p>
          </div>
        </div>

        {/* Right Cluster: Floating ZebAlpha White Tee + Golden Orbit + "Create →" Metallic Pill */}
        <div className="flex items-center gap-3 sm:gap-5 lg:gap-7 shrink-0">
          {/* Tilted Studio White ZebAlpha Tee + Glowing Orbit Swoosh */}
          <div
            aria-hidden="true"
            className="relative hidden sm:flex items-center justify-center w-24 md:w-28 lg:w-36 h-14 md:h-16 lg:h-20 select-none pointer-events-none"
          >
            <svg viewBox="0 0 220 150" className="h-[115%] w-[115%] overflow-visible">
              <defs>
                <linearGradient id={teeBodyId} x1="15%" y1="0%" x2="88%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="52%" stopColor="#f4f4f5" />
                  <stop offset="85%" stopColor="#e4e4e7" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
                <linearGradient id={teeShadowId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.32" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.28" />
                </linearGradient>
                <linearGradient id={orbitGradId} x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="35%" stopColor="#fef08a" stopOpacity="1" />
                  <stop offset="70%" stopColor="#facc15" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.2" />
                </linearGradient>
                <filter id={orbitGlowId} x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="2.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Back half of golden orbital ring behind tee */}
              <path
                d="M 18 82 C 32 42, 188 32, 204 66"
                fill="none"
                stroke={`url(#${orbitGradId})`}
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.62"
                filter={`url(#${orbitGlowId})`}
              />

              {/* Tilted White Streetwear Tee */}
              <g transform="translate(110 76) rotate(-11) translate(-60 -62)">
                {/* Ambient drop shadow */}
                <ellipse cx="62" cy="119" rx="34" ry="6" fill="#000000" opacity="0.55" />

                {/* T-shirt base silhouette */}
                <path
                  d="M36 16 L14 31 L2 52 L19 63 L27 50 L27 112 Q60 118 93 112 L93 50 L101 63 L118 52 L106 31 L84 16 Q72 25 60 25 Q48 25 36 16 Z"
                  fill={`url(#${teeBodyId})`}
                  stroke="#e4e4e7"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                {/* Soft garment contour shading */}
                <path
                  d="M36 16 L14 31 L2 52 L19 63 L27 50 L27 112 Q60 118 93 112 L93 50 L101 63 L118 52 L106 31 L84 16 Q72 25 60 25 Q48 25 36 16 Z"
                  fill={`url(#${teeShadowId})`}
                />
                {/* Inner back collar depth + ribbed neck trim */}
                <path
                  d="M42 15 Q60 31 78 15 Q60 22 42 15 Z"
                  fill="#d4d4d8"
                />
                <path
                  d="M37 16 Q60 32 83 16"
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* Subtle shoulder & hem fold lines */}
                <path d="M27 50 Q31 40 34 33" fill="none" stroke="#d4d4d8" strokeWidth="1" opacity="0.7" />
                <path d="M93 50 Q89 40 86 33" fill="none" stroke="#d4d4d8" strokeWidth="1" opacity="0.7" />
                <path d="M28 106 Q60 112 92 106" fill="none" stroke="#d4d4d8" strokeWidth="0.9" opacity="0.65" />

                {/* Crisp ZebAlpha chest logo mark */}
                <text
                  x="60"
                  y="54"
                  textAnchor="middle"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontSize="11.5"
                  fontWeight="900"
                  letterSpacing="-0.4"
                >
                  <tspan fill="#eab308">Z</tspan>
                  <tspan fill="#18181b">ebAlpha</tspan>
                </text>
              </g>

              {/* Front glowing half of golden orbital ring across tee */}
              <path
                d="M 204 66 C 216 98, 46 122, 18 82"
                fill="none"
                stroke={`url(#${orbitGradId})`}
                strokeWidth="3.4"
                strokeLinecap="round"
                filter={`url(#${orbitGlowId})`}
              />
              <path
                d="M 192 77 C 166 102, 52 110, 26 86"
                fill="none"
                stroke="#fef9c3"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>
          </div>

          {/* Right CTA: 3D Metallic Gold Pill "Create →" */}
          <div className="relative shrink-0">
            {/* Three small gold celebration accent rays top-right */}
            <svg
              aria-hidden="true"
              viewBox="0 0 28 24"
              className="pointer-events-none hidden sm:block absolute -top-2.5 -right-2.5 h-5 w-6 text-[#fde047] drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"
            >
              <line x1="6" y1="8" x2="10" y2="2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="14" y1="12" x2="22" y2="8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="17" y1="19" x2="25" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>

            <Link
              href="/customize"
              aria-label="Create Custom Apparel Design"
              className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#b45309] border border-amber-200/80 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-black tracking-wide text-zinc-950 shadow-[0_6px_22px_rgba(234,179,8,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.68)] hover:brightness-110 hover:shadow-[0_8px_28px_rgba(250,204,21,0.65),inset_0_1.5px_1px_rgba(255,255,255,0.85)] active:scale-95 transition-all duration-200"
            >
              {/* Artist Palette Icon matching reference */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-zinc-950 shrink-0"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.03 2 11c0 3.03 2.46 5.5 5.5 5.5h1.95c.83 0 1.5.67 1.5 1.5 0 .38-.14.74-.4 1.02-.38.42-.58.95-.55 1.52.04.83.74 1.46 1.57 1.46C17.34 22 22 17.08 22 11c0-4.97-4.48-9-10-9zm-5.5 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
              </svg>
              <span>Create</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
