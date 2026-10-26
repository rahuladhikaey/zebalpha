"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { CustomerSpotlightCampaign, CustomerSpotlightCard } from "@/lib/cachedQueries";

interface SpotlightSectionProps {
  campaigns?: CustomerSpotlightCampaign[];
}

export function SpotlightSection({ campaigns = [] }: SpotlightSectionProps) {
  // If no published active campaigns or empty cards, cleanly return null (Zero empty margin / blank container)
  if (!campaigns || campaigns.length === 0) {
    return null;
  }

  return (
    <div id="zebalpha-spotlight-section" className="my-10 sm:my-14 space-y-12">
      {campaigns.map((campaign) => (
        <section
          key={campaign.id}
          className="relative w-full overflow-hidden select-none"
          aria-label={campaign.name}
        >
          {/* Section Header */}
          <div className="flex items-end justify-between mb-5 sm:mb-6">
            <div className="flex items-center gap-3">
              <span className="h-6 w-1 bg-white rounded-full shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    {campaign.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black uppercase tracking-widest text-white border border-white/20">
                    SPOTLIGHT
                  </span>
                </div>
                {campaign.description && (
                  <p className="text-xs text-neutral-400 font-medium mt-0.5 max-w-xl">
                    {campaign.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cards Showcase: Horizontal Smooth Carousel on Mobile / Tablet, Adaptive Grid on Desktop */}
          <div className="w-full overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth">
            <div className="flex gap-3.5 sm:gap-4.5 w-max">
              {campaign.cards.map((card, idx) => (
                <SpotlightCardItem key={`${card.cardType}-${card.id}-${idx}`} card={card} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function SpotlightCardItem({ card }: { card: CustomerSpotlightCard }) {
  const isEditorial = card.cardType === "editorial";
  const href = card.destinationUrl || "/products";

  return (
    <Link
      href={href}
      className="group relative flex flex-col w-[160px] sm:w-[190px] md:w-[210px] shrink-0 rounded-2xl sm:rounded-3xl bg-neutral-950 border border-neutral-800/80 overflow-hidden hover:border-neutral-500 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5"
    >
      {/* 3:4 Aspect Ratio Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
        <img
          src={card.image}
          alt={card.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Card Type Tag */}
        <div className="absolute top-2.5 left-2.5">
          {isEditorial ? (
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-rose-300 border border-rose-500/30">
              EDITORIAL
            </span>
          ) : (
            card.mrp && card.price && card.mrp > card.price ? (
              <span className="px-2 py-0.5 rounded-full bg-white text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-md">
                {Math.round(((card.mrp - card.price) / card.mrp) * 100)}% OFF
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Card Metadata */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 space-y-2">
        <div className="space-y-0.5">
          {card.subtitle && (
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 truncate">
              {card.subtitle}
            </p>
          )}
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white truncate group-hover:text-neutral-200 transition-colors">
            {card.title}
          </h3>
        </div>

        {/* Pricing Badge */}
        <div className="pt-1 flex items-baseline justify-between border-t border-neutral-900">
          {isEditorial ? (
            card.fromPrice ? (
              <span className="text-xs sm:text-sm font-black text-emerald-400">
                From ₹{Number(card.fromPrice).toLocaleString("en-IN")}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Explore Edit →
              </span>
            )
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs sm:text-sm font-black text-white">
                ₹{Number(card.price || 0).toLocaleString("en-IN")}
              </span>
              {card.mrp && card.mrp > (card.price || 0) && (
                <span className="text-[10px] text-neutral-500 line-through">
                  ₹{Number(card.mrp).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}

          <span className="text-[10px] font-bold text-neutral-500 group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
