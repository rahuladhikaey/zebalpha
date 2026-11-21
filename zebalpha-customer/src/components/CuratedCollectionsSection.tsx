"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { CuratedCollection } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";
import { useOfficialTheme } from "@/lib/platform";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import { AndroidNewSeasonDropBanner } from "@/components/home/AndroidHomeTrustAndDrop";

interface CuratedCollectionsSectionProps {
  initialCollections?: CuratedCollection[];
}

export function CuratedCollectionsSection({
  initialCollections = [],
}: CuratedCollectionsSectionProps) {
  const isNativeApp = useOfficialTheme();
  const [collections, setCollections] = useState<CuratedCollection[]>(initialCollections);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Sync state if SSR props update
  useEffect(() => {
    setCollections(initialCollections || []);
  }, [initialCollections]);

  // Fallback fetch ONLY when SSR did not hydrate initialCollections (zero duplicate DB calls & zero Realtime sockets)
  useEffect(() => {
    if (initialCollections && initialCollections.length > 0) return;
    let isMounted = true;
    const fetchFallback = async () => {
      try {
        const { data, error } = await supabase
          .from("curated_collections")
          .select("id, title, slug, short_description, link_url, image_url, display_order")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .limit(24);

        if (isMounted && !error && Array.isArray(data)) {
          setCollections(data as CuratedCollection[]);
        }
      } catch (err) {
        console.warn("Curated collections fallback note:", err);
      }
    };
    fetchFallback();
    return () => {
      isMounted = false;
    };
  }, [initialCollections]);

  // Determine items to display: strictly active records with non-empty image_url (never filtered by image errors)
  const validCollections = collections.filter(
    (c) => c && c.is_active !== false && c.image_url && c.image_url.trim().length > 0
  );

  // Strictly display admin-managed curated collections ONLY
  const displayItems = validCollections.map((c) => {
    const rawLink = (c.link_url || "").trim();
    // Check if admin provided a dedicated product/collection link, otherwise route systematically to products catalog
    const isGenericLink =
      !rawLink ||
      rawLink === "/categories" ||
      rawLink === "/categories/" ||
      rawLink === "/" ||
      rawLink === "/products" ||
      rawLink === "/products/" ||
      rawLink === "/new-drops" ||
      rawLink === "/new-drops/" ||
      rawLink.startsWith("/new-drops") ||
      rawLink.startsWith("/new-arrivals");

    const term = (c.slug || c.title || "").trim();
    const finalHref = isGenericLink
      ? `/products?category=${encodeURIComponent(term)}`
      : rawLink;

    return {
      id: c.id,
      title: c.title,
      image_url: c.image_url,
      href: finalHref,
    };
  });

  // If no admin-managed curated collections are active, cleanly hide section
  if (displayItems.length === 0) {
    return null;
  }

  // Split items into rows of up to 6 items per row (Row 1: 1-6, Row 2: 7-12, Row 3: 13-18, etc.)
  const rowGroups: (typeof displayItems)[] = [];
  for (let i = 0; i < displayItems.length; i += 6) {
    rowGroups.push(displayItems.slice(i, i + 6));
  }

  return (
    <section className={isNativeApp ? "mt-6 relative select-none" : "mt-10 sm:mt-14 relative select-none"} id="curated-collections-section">
      {/* 1. Section Header */}
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          {isNativeApp ? (
            <h2 className="text-base sm:text-lg font-black text-[#14120F] tracking-tight uppercase">
              Curated Collections
            </h2>
          ) : (
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
              <span>Curated Collections</span>
              <CheckCircle2 className="w-5 h-5 text-violet-400 fill-violet-500/20" />
            </h2>
          )}
        </div>
      </div>

      {/* 2. 6-Item Row Structure: Row-level horizontal scroll on Phone & Tablet, standard grid on Desktop */}
      <div className="space-y-4 sm:space-y-6">
        {rowGroups.map((group, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="w-full overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth"
          >
            <div className="flex lg:grid lg:grid-cols-6 gap-2.5 sm:gap-4 w-max lg:w-full">
              {group.map((item, idx) => {
                const keyId = String(item.id || `${rowIndex}-${idx}`);

                if (isNativeApp) {
                  return (
                    <Link
                      key={keyId}
                      href={item.href}
                      aria-label={`Explore ${item.title} collection`}
                      className="group relative flex flex-col items-center rounded-2xl bg-[#FFFDF8] border border-[#E5C882]/85 transition-all duration-300 active:scale-95 text-center overflow-hidden cursor-pointer p-1.5 w-[108px] sm:w-[126px] lg:w-auto shrink-0 lg:shrink shadow-[0_6px_16px_rgba(166,124,28,0.09)] hover:border-[#C28D12]"
                    >
                      <div className="relative w-full aspect-square rounded-xl bg-gradient-to-b from-[#FAF3E1] to-[#F4E3B7] overflow-hidden flex items-center justify-center">
                        {failedImages[keyId] ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#3D3528] text-center truncate max-w-full">
                              {item.title}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={IMAGE_VARIANTS.curatedCollection(item.image_url)}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={() => {
                              setFailedImages((prev) => ({ ...prev, [keyId]: true }));
                            }}
                          />
                        )}
                        {/* Dark translucent frosted pill overlay inside image bottom */}
                        <div
                          data-photo-overlay="true"
                          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1308]/90 via-[#2B200D]/75 to-transparent px-1.5 py-1.5"
                        >
                          <span className="block text-[10.5px] font-bold tracking-tight text-white truncate drop-shadow-sm">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={keyId}
                    href={item.href}
                    aria-label={`Explore ${item.title} collection`}
                    className="group relative flex flex-col items-center rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 transition-all duration-300 transform hover:-translate-y-1.5 active:scale-95 text-center overflow-hidden cursor-pointer p-2.5 sm:p-3 w-[126px] sm:w-[136px] lg:w-auto shrink-0 lg:shrink hover:border-violet-500/50 hover:bg-neutral-850 hover:shadow-[0_12px_30px_rgba(139,92,246,0.18)] shadow-lg"
                  >
                    {/* Clean Highlight Shimmer */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-violet-500/10 to-transparent transition-opacity duration-300 pointer-events-none rounded-2xl sm:rounded-3xl" />

                    {/* 1:1 Aspect Ratio Curved Cover Image Box */}
                    <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-gradient-to-b from-neutral-800/80 to-neutral-950/90 border border-neutral-800/70 flex items-center justify-center overflow-hidden group-hover:border-violet-500/40 transition-all duration-300 shadow-inner p-1.5 sm:p-2">
                      {failedImages[keyId] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 rounded-lg sm:rounded-xl text-neutral-500 p-1">
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-400 text-center truncate max-w-full">
                            {item.title}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={IMAGE_VARIANTS.curatedCollection(item.image_url)}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 rounded-lg sm:rounded-xl"
                          onError={() => {
                            setFailedImages((prev) => ({ ...prev, [keyId]: true }));
                          }}
                        />
                      )}
                    </div>

                    {/* Collection Title */}
                    <span className="mt-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-neutral-300 group-hover:text-white transition-colors truncate max-w-full px-1">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Auto-Scrolling Promo Carousel (Slide 1: 1st Order ₹100 OFF -> Slide 2: New Season Drop) */}
      <AndroidNewSeasonDropBanner />
    </section>
  );
}
