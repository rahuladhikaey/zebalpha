"use client";

import React, { useState } from "react";
import { X, Smartphone, Monitor, Sparkles } from "lucide-react";
import type { SpotlightSelectedItem } from "@/types/spotlight";

interface SpotlightPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  theme?: string;
  selectedCards: SpotlightSelectedItem[];
}

export function SpotlightPreviewModal({
  isOpen,
  onClose,
  campaignName,
  theme = "default",
  selectedCards,
}: SpotlightPreviewModalProps) {
  const [mode, setMode] = useState<"website" | "android">("website");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-wider text-white">
              PREVIEW MODE
            </span>
            <h2 className="text-sm font-black uppercase text-white truncate max-w-sm">
              {campaignName || "Top Deals"} ({selectedCards.length} Cards)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode("website")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === "website" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Website</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("android")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === "android" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android App</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-black flex justify-center">
          {mode === "website" ? (
            /* WEBSITE PREVIEW */
            <div className="w-full max-w-4xl space-y-8 text-white select-none">
              {/* Context indicator */}
              <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center text-xs text-zinc-400">
                Placement Simulation: <strong className="text-white">Immediately after Woven to Be Remembered & before Our Products</strong>
              </div>

              {/* 1. MOCK PRECEDING SECTION: WOVEN TO BE REMEMBERED */}
              <div className="border border-zinc-800/80 rounded-2xl p-4 bg-zinc-950/60 space-y-2 opacity-50">
                <span className="text-[10px] font-black uppercase text-zinc-400">THE ZEBALPHA EDIT</span>
                <h3 className="text-lg font-black uppercase text-white">Woven to Be Remembered</h3>
                <p className="text-xs text-zinc-400">Pieces made for the moments that stay with you.</p>
                <div className="h-24 rounded-xl bg-zinc-900/60 flex items-center justify-center text-xs text-zinc-400 font-mono">
                  [ 3:4 Curved Editorial Carousel ]
                </div>
              </div>

              {/* 2. THE SPOTLIGHT SECTION (EXACT RENDERING) */}
              <div className="border-2 border-white/20 rounded-3xl p-6 bg-zinc-950 shadow-2xl space-y-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-1 bg-white rounded-full" />
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white">
                        {campaignName || "Top Deals"}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Handpicked spotlight drops & verified deals
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest">
                    SPOTLIGHT
                  </span>
                </div>

                {/* Grid */}
                {selectedCards.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                    No cards selected yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {selectedCards.map((card, idx) => (
                      <div
                        key={card.uniqueKey || idx}
                        className="group relative rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden p-2.5 space-y-2"
                      >
                        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
                          <img
                            src={card.image || "/official-logo.png"}
                            alt={card.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[8px] font-black uppercase text-zinc-300">
                            {card.cardType === "seller_product" ? "SELLER" : "EDITORIAL"}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-white truncate">{card.title}</h4>
                          <p className="text-[10px] text-zinc-400 truncate">{card.subtitle}</p>
                          <div className="mt-1 flex items-center justify-between text-xs font-black">
                            {card.price !== undefined ? (
                              <span className="text-white">₹{card.price}</span>
                            ) : card.fromPrice !== undefined ? (
                              <span className="text-emerald-400">From ₹{card.fromPrice}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. MOCK SUCCEEDING SECTION: OUR PRODUCTS */}
              <div className="border border-zinc-800/80 rounded-2xl p-4 bg-zinc-950/60 space-y-2 opacity-50">
                <span className="text-[10px] font-black uppercase text-zinc-400">MARKETPLACE FEED</span>
                <h3 className="text-lg font-black uppercase text-white">Our Products</h3>
                <p className="text-xs text-zinc-400">Explore complete catalog</p>
                <div className="h-24 rounded-xl bg-zinc-900/60 flex items-center justify-center text-xs text-zinc-400 font-mono">
                  [ Infinite Products Grid ]
                </div>
              </div>
            </div>
          ) : (
            /* ANDROID APP PREVIEW */
            <div className="w-[360px] rounded-[40px] border-4 border-zinc-700 bg-black overflow-hidden shadow-2xl flex flex-col text-white select-none">
              {/* Android Status Bar */}
              <div className="h-7 bg-black flex items-center justify-between px-6 text-[10px] font-bold text-zinc-400 border-b border-zinc-900">
                <span>12:00</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Android Sticky Unit */}
              <div className="p-3 bg-zinc-950 border-b border-zinc-800 space-y-2">
                <div className="h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center px-3 text-[11px] text-zinc-400">
                  Search ZebAlpha...
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar max-h-[640px]">
                {/* Woven to be remembered banner preview */}
                <div className="p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400">
                  Woven to Be Remembered (Editorial Carousel)
                </div>

                {/* SPOTLIGHT SECTION ON ANDROID */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-white rounded-full" />
                      <span>{campaignName || "Top Deals"}</span>
                    </h4>
                    <span className="text-[9px] font-mono text-zinc-400">16 Cards</span>
                  </div>

                  {/* Android Horizontal Scroll / 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCards.map((card, idx) => (
                      <div
                        key={card.uniqueKey || idx}
                        className="rounded-xl bg-zinc-900 border border-zinc-800 p-2 space-y-1.5"
                      >
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black">
                          <img
                            src={card.image || "/official-logo.png"}
                            alt={card.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white truncate uppercase">{card.title}</p>
                          <p className="text-[9px] font-bold text-zinc-300">
                            {card.price !== undefined ? `₹${card.price}` : `From ₹${card.fromPrice}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Our Products preview */}
                <div className="p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400">
                  Our Products (Marketplace Grid)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
