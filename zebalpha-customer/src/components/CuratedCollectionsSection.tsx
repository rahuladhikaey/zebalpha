"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { CuratedCollection } from "@/lib/types";
import { CheckCircle2, Sparkles } from "lucide-react";

interface CuratedCollectionsSectionProps {
  initialCollections?: CuratedCollection[];
}

export function CuratedCollectionsSection({
  initialCollections = [],
}: CuratedCollectionsSectionProps) {
  const [collections, setCollections] = useState<CuratedCollection[]>(initialCollections);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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

  // Determine items to display: strictly active records with non-empty image_url (never filtered by image errors)
  const validCollections = collections.filter(
    (c) => c && c.is_active !== false && c.image_url && c.image_url.trim().length > 0
  );

  // Strictly display admin-managed curated collections ONLY
  const displayItems = validCollections.map((c) => ({
    id: c.id,
    title: c.title,
    image_url: c.image_url,
    href: c.link_url || `/products?category=${encodeURIComponent(c.slug || c.title)}`,
  }));

  // If no admin-managed curated collections are active, cleanly hide section
  if (displayItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 sm:mt-14 relative select-none" id="curated-collections-section">
      {/* 1. Header with Verified Badge */}
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span>Curated Collections</span>
            <CheckCircle2 className="w-5 h-5 text-violet-400 fill-violet-500/20" />
          </h2>
        </div>
      </div>

      {/* 2. Responsive Grid: 3 Columns on Mobile (2 rows of 3 for 6 items), 6 Columns on Desktop */}
      <div className="w-full">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-4 w-full">
          {displayItems.map((item, idx) => {
            const keyId = String(item.id || idx);

            return (
              <Link
                key={keyId}
                href={item.href}
                className="group relative flex flex-col items-center rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-violet-500/50 hover:bg-neutral-850 shadow-lg hover:shadow-[0_12px_30px_rgba(139,92,246,0.18)] transition-all duration-300 transform hover:-translate-y-1.5 active:scale-95 text-center overflow-hidden cursor-pointer p-2 sm:p-3"
              >
                {/* Clean Highlight Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-violet-500/10 to-transparent transition-opacity duration-300 pointer-events-none rounded-2xl sm:rounded-3xl" />

                {/* 1:1 Aspect Ratio Curved Cover Image Box */}
                <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-gradient-to-b from-neutral-800/80 to-neutral-950/90 border border-neutral-800/70 flex items-center justify-center overflow-hidden group-hover:border-violet-500/40 transition-all duration-300 shadow-inner p-1.5 sm:p-2">
                  {failedImages[keyId] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 rounded-lg sm:rounded-xl text-neutral-500 p-1">
                      <Sparkles className="w-5 h-5 text-violet-400 mb-1" />
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-400 text-center truncate max-w-full">
                        {item.title}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.image_url}
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
    </section>
  );
}
