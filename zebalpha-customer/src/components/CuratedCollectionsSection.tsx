"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { CuratedCollection, Category } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";

interface CuratedCollectionsSectionProps {
  initialCollections?: CuratedCollection[];
  initialCategories?: Category[];
}

export function CuratedCollectionsSection({
  initialCollections = [],
  initialCategories = [],
}: CuratedCollectionsSectionProps) {
  const [collections, setCollections] = useState<CuratedCollection[]>(initialCollections);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync state if SSR props update
  useEffect(() => {
    if (initialCollections && initialCollections.length > 0) {
      setCollections(initialCollections);
    }
  }, [initialCollections]);

  // Real-time listener for Superadmin updates to curated_collections
  useEffect(() => {
    const channel = supabase
      .channel("customer-curated-collections-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curated_collections" },
        async () => {
          // Re-fetch active curated collections using slim query
          const { data, error } = await supabase
            .from("curated_collections")
            .select("id, title, slug, short_description, link_url, image_url, display_order")
            .eq("is_active", true)
            .order("display_order", { ascending: true })
            .limit(24);

          if (!error && data) {
            setCollections(data as CuratedCollection[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Determine items to display: strictly active records with non-empty image_url
  const validCollections = collections.filter(
    (c) => c && c.is_active !== false && c.image_url && c.image_url.trim().length > 0 && !imgErrors[String(c.id)]
  );

  // Fallback to active categories with real uploaded images if curated_collections table is empty during transition
  const displayItems =
    validCollections.length > 0
      ? validCollections.map((c) => ({
          id: c.id,
          title: c.title,
          image_url: c.image_url,
          href: c.link_url || `/products?category=${encodeURIComponent(c.slug || c.title)}`,
        }))
      : initialCategories
          .filter((cat) => cat && cat.is_active !== false && cat.image_url && cat.image_url.trim().length > 10 && !imgErrors[String(cat.id)])
          .map((cat) => ({
            id: cat.id,
            title: cat.name,
            image_url: cat.image_url!,
            href: `/products?category=${encodeURIComponent(cat.name)}`,
          }));

  // If no real admin-managed content is available, cleanly hide section (NEVER show fake fallback images)
  if (displayItems.length === 0) {
    return null;
  }

  // Split items into rows of maximum 6 items per row
  const rowGroups: typeof displayItems[] = [];
  for (let i = 0; i < displayItems.length; i += 6) {
    rowGroups.push(displayItems.slice(i, i + 6));
  }

  return (
    <section className="mt-10 sm:mt-14 relative select-none" id="curated-collections-section">
      {/* 1. Header with Verified Badge */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span>Curated Collections</span>
            <CheckCircle2 className="w-5 h-5 text-violet-400 fill-violet-500/20" />
          </h2>
        </div>
      </div>

      {/* 2. 6-Column Responsive Horizontal-Scroll Rows with 1:1 Aspect Ratio */}
      <div className="space-y-4 sm:space-y-6" ref={scrollContainerRef}>
        {rowGroups.map((group, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="w-full overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth"
          >
            <div className="grid grid-cols-6 gap-3 sm:gap-4 min-w-[840px] lg:min-w-full">
              {group.map((item, idx) => {
                const keyId = String(item.id || `${rowIndex}-${idx}`);

                return (
                  <Link
                    key={keyId}
                    href={item.href}
                    className="group relative flex flex-col items-center rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-violet-500/50 hover:bg-neutral-850 shadow-lg hover:shadow-[0_12px_30px_rgba(139,92,246,0.18)] transition-all duration-300 transform hover:-translate-y-1.5 active:scale-95 text-center overflow-hidden cursor-pointer p-3"
                  >
                    {/* Clean Highlight Shimmer */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-violet-500/10 to-transparent transition-opacity duration-300 pointer-events-none rounded-3xl" />

                    {/* 1:1 Aspect Ratio Curved Cover Image Box */}
                    <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-b from-neutral-800/80 to-neutral-950/90 border border-neutral-800/70 flex items-center justify-center overflow-hidden group-hover:border-violet-500/40 transition-all duration-300 shadow-inner p-2">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 140px, (max-width: 1024px) 200px, 16vw"
                        className="object-cover group-hover:scale-108 transition-transform duration-500 rounded-xl"
                        onError={() => {
                          setImgErrors((prev) => ({ ...prev, [keyId]: true }));
                        }}
                        unoptimized
                      />
                    </div>

                    {/* Collection Title */}
                    <span className="mt-2.5 text-[11px] font-black uppercase tracking-wider text-neutral-300 group-hover:text-white transition-colors truncate max-w-full px-1">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
