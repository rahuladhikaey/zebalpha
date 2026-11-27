"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  ArrowLeft,
  Menu,
  Search,
  Mic,
  ChevronDown,
  X,
  ShoppingBag,
  Sparkles,
  Shirt,
  Watch,
  HeartHandshake,
  Package,
} from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickDrawer } from "@/components/zeb-quick/ZebQuickDrawer";

function getMainCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("women")) return Sparkles;
  if (n.includes("innerwear")) return HeartHandshake;
  if (n.includes("dailywear") || n.includes("men")) return Shirt;
  if (n.includes("accessor")) return Watch;
  return Package;
}

export function ZebQuickHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    pincode,
    locationLabel,
    serviceability,
    setLocationModalOpen,
    searchQuery,
    setSearchQuery,
    selectedMainCategory,
    setSelectedMainCategory,
    mainCategories,
    subcategories,
  } = useZebQuick();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [listeningVoice, setListeningVoice] = useState(false);

  const searchHints = useMemo(() => {
    const dynamicNames = subcategories
      .map((s) => String(s.name || "").trim().toLowerCase())
      .filter(Boolean);
    const list = dynamicNames.length > 0
      ? Array.from(new Set(dynamicNames)).slice(0, 12)
      : ["bras", "vest", "track pants", "bermudas", "briefs", "socks"];
    return list;
  }, [subcategories]);

  useEffect(() => {
    if (searchQuery.trim()) return;
    const timer = window.setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % searchHints.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [searchHints.length, searchQuery]);

  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const recognition = new SR();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setListeningVoice(true);
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || "";
        if (transcript) setSearchQuery(transcript.trim());
        setListeningVoice(false);
      };
      recognition.onerror = () => setListeningVoice(false);
      recognition.onend = () => setListeningVoice(false);
      recognition.start();
    } catch {
      setListeningVoice(false);
    }
  };

  const isGoHome = pathname === "/zeb-quick";
  const isCategoriesPage = pathname === "/zeb-quick/categories";
  const activeMainObj = mainCategories.find((m) => m.name === selectedMainCategory);
  const headerThemeColor =
    isGoHome && selectedMainCategory !== "All" && activeMainObj?.theme_color
      ? activeMainObj.theme_color
      : "#F8CB46";
  const isDarkTheme = headerThemeColor.toLowerCase() === "#1e293b";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/zeb-quick");
    }
  };

  return (
    <>
      {/* Non-sticky Top Delivery ETA + Account Row (scrolls up on scroll like Blinkit) */}
      <div
        className={`w-full pt-[max(env(safe-area-inset-top),0.5rem)] transition-colors duration-300 ${
          isDarkTheme ? "text-white" : "text-neutral-950"
        }`}
        style={{
          background: `linear-gradient(to bottom, ${headerThemeColor}, ${headerThemeColor}e6)`,
        }}
      >
        <div className="mx-auto max-w-5xl px-3.5 pt-2 pb-1.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              {isGoHome ? (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open ZebQuick Menu"
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-xs transition hover:bg-white active:scale-95 shrink-0 cursor-pointer"
                >
                  <Menu className="h-4.5 w-4.5 stroke-[2.3]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go Back"
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-xs transition hover:bg-white active:scale-95 shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-4.5 w-4.5 stroke-[2.3]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setLocationModalOpen(true)}
                className="flex flex-col text-left min-w-0 cursor-pointer"
              >
                <span className={`text-[11px] font-extrabold tracking-tight leading-none ${isDarkTheme ? "text-white/90" : "text-neutral-900"}`}>
                  ZebQuick in
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`text-[22px] font-black tracking-tight leading-none ${isDarkTheme ? "text-white" : "text-neutral-950"}`}>
                    5–6 hours
                  </span>
                  <span className="rounded-full bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    Express
                  </span>
                </div>
                <div className={`mt-1 flex items-center gap-1 text-xs font-semibold truncate ${isDarkTheme ? "text-white/85" : "text-neutral-800"}`}>
                  <span className="truncate">
                    {serviceability.loading
                      ? "Detecting location..."
                      : !pincode
                        ? "Select delivery location"
                        : locationLabel
                          ? locationLabel
                          : serviceability.serviceable
                            ? `${serviceability.areaName}, ${serviceability.city || "WB"} (${pincode})`
                            : `Pincode ${pincode} • Coming Soon`}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${isDarkTheme ? "text-white" : "text-neutral-900"}`} />
                </div>
              </button>
            </div>

            {/* Top-Right Account Button (Blinkit Style) */}
            <Link
              href="/zeb-quick/account"
              aria-label="ZebQuick Account"
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm ring-1 ring-black/5 transition active:scale-95 shrink-0"
            >
              <User className="h-5 w-5 stroke-[2.2]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Search Bar + Horizontal Main Category Strip */}
      {(isGoHome || isCategoriesPage) && (
        <header
          className="sticky top-0 z-40 w-full shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-colors duration-300"
          style={{
            background: `linear-gradient(to bottom, ${headerThemeColor}e6, ${headerThemeColor}70 45%, #FFFFFF)`,
          }}
        >
          <div className="mx-auto max-w-5xl px-3.5 pt-1.5 pb-2">
            <div className="relative flex items-center rounded-2xl border border-black/10 bg-white shadow-xs focus-within:border-neutral-900">
              <Search className="ml-3.5 h-4.5 w-4.5 shrink-0 text-neutral-800 stroke-[2.2]" />
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search ZebQuick products"
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-2 text-sm font-medium text-neutral-900 focus:outline-none"
                />
                {!searchQuery && (
                  <div className="pointer-events-none absolute inset-y-0 left-2.5 right-2 flex items-center overflow-hidden text-sm font-medium text-neutral-500">
                    <span className="shrink-0">Search&nbsp;&ldquo;</span>
                    <span
                      key={placeholderIdx}
                      className="inline-block truncate animate-[zebSearchRoll_0.38s_ease-out]"
                    >
                      {searchHints[placeholderIdx % searchHints.length]}
                    </span>
                    <span className="shrink-0">&rdquo;</span>
                  </div>
                )}
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="h-5 w-px bg-neutral-200 shrink-0" />
              <button
                type="button"
                onClick={handleVoiceSearch}
                aria-label="Voice search"
                className={`flex h-9 w-10 items-center justify-center shrink-0 transition cursor-pointer ${
                  listeningVoice ? "text-rose-600 animate-pulse" : "text-neutral-800 hover:text-neutral-950"
                }`}
              >
                <Mic className="h-4.5 w-4.5 stroke-[2.1]" />
              </button>
            </div>
            <style>{`
              @keyframes zebSearchRoll {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>

        {/* Blinkit Horizontal Main Category Strip */}
        {isGoHome && (
          <div className="mx-auto max-w-5xl border-t border-black/5 bg-gradient-to-b from-[#FFFDF5]/70 to-white px-2 pt-2">
            <div className="flex items-end gap-4 overflow-x-auto no-scrollbar px-2">
              <button
                type="button"
                onClick={() => setSelectedMainCategory("All")}
                className={`flex flex-col items-center gap-1 pb-2 border-b-[2.5px] transition shrink-0 cursor-pointer ${
                  selectedMainCategory === "All"
                    ? "border-neutral-950 text-neutral-950"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    selectedMainCategory === "All" ? "bg-[#F8CB46]/35 text-neutral-950" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <ShoppingBag className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-extrabold leading-none whitespace-nowrap">All</span>
              </button>

              {mainCategories.map((mc) => {
                const active = selectedMainCategory === mc.name;
                const IconComp = getMainCategoryIcon(mc.name);
                return (
                  <button
                    key={mc.id || mc.name}
                    type="button"
                    onClick={() => setSelectedMainCategory(mc.name)}
                    className={`flex flex-col items-center gap-1 pb-2 border-b-[2.5px] transition shrink-0 cursor-pointer ${
                      active
                        ? "border-neutral-950 text-neutral-950"
                        : "border-transparent text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl transition ${
                        active ? "bg-[#F8CB46]/35 text-neutral-950" : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {mc.image_url ? (
                        <img src={mc.image_url} alt={mc.name} className="h-full w-full object-cover" />
                      ) : (
                        <IconComp className="h-4.5 w-4.5 stroke-[2]" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-none whitespace-nowrap">{mc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>
      )}

      {/* 3-Bar Mobile Drawer */}
      <ZebQuickDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
