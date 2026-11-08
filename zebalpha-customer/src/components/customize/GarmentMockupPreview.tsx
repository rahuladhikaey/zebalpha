"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Sparkles, Move, Maximize2 } from "lucide-react";

export type GarmentType = "oversized_tee" | "hoodie" | "standard_tee" | "tote_bag";
export type PlacementPosition = "front_chest" | "full_front" | "pocket" | "back";

export interface GarmentColorOption {
  name: string;
  hex: string;
  isDark: boolean;
}

export const GARMENT_COLORS: GarmentColorOption[] = [
  { name: "Jet Black", hex: "#121215", isDark: true },
  { name: "Off-White", hex: "#F3F3ED", isDark: false },
  { name: "Vintage Beige", hex: "#D6C7A8", isDark: false },
  { name: "Royal Navy", hex: "#0F1A2C", isDark: true },
  { name: "Maroon Crimson", hex: "#420914", isDark: true },
  { name: "Forest Green", hex: "#0A2818", isDark: true },
];

export const GARMENT_TYPES: { id: GarmentType; label: string; gsm: string; badge: string }[] = [
  { id: "oversized_tee", label: "Oversized Heavy Tee", gsm: "240 GSM", badge: "POPULAR" },
  { id: "hoodie", label: "Streetwear Fleece Hoodie", gsm: "380 GSM", badge: "WINTER" },
  { id: "standard_tee", label: "Classic Combed Cotton Tee", gsm: "190 GSM", badge: "DAILY" },
  { id: "tote_bag", label: "Heavy Canvas Tote Bag", gsm: "340 GSM", badge: "ECO" },
];

interface GarmentMockupPreviewProps {
  garmentType: GarmentType;
  selectedColor: GarmentColorOption;
  designImageSrc: string | null;
  designTitle?: string;
  placement: PlacementPosition;
  isSubmitting?: boolean;
}

export function GarmentMockupPreview({
  garmentType,
  selectedColor,
  designImageSrc,
  designTitle = "Custom Graphic",
  placement,
  isSubmitting = false,
}: GarmentMockupPreviewProps) {
  // Compute print placement box styling
  const placementStyle = useMemo(() => {
    switch (placement) {
      case "pocket":
        return "top-[28%] left-[28%] w-[20%] h-[20%]";
      case "full_front":
        return "top-[24%] left-[25%] w-[50%] h-[54%]";
      case "back":
        return "top-[26%] left-[26%] w-[48%] h-[50%]";
      case "front_chest":
      default:
        return "top-[27%] left-[30%] w-[40%] h-[38%]";
    }
  }, [placement]);

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-square rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border border-neutral-800 p-4 sm:p-6 flex flex-col items-center justify-center overflow-hidden shadow-2xl select-none">
      {/* Background Ambience Glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500 blur-3xl"
        style={{ backgroundColor: selectedColor.hex }}
      />

      {/* Floating Status Badges */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 border border-neutral-700 text-white backdrop-blur-md">
          {GARMENT_TYPES.find((g) => g.id === garmentType)?.label || "Garment"}
        </span>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md"
          style={{
            borderColor: selectedColor.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
            color: selectedColor.isDark ? "#ffffff" : "#111111",
            backgroundColor: selectedColor.hex,
          }}
        >
          {selectedColor.name}
        </span>
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 backdrop-blur-md">
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Live Proof</span>
      </div>

      {/* Garment Base Container */}
      <div className="relative w-full h-full max-w-[420px] max-h-[460px] flex items-center justify-center">
        {/* SVG Garment Silhouette vector dyed in the selectedColor */}
        <div
          className="relative w-full h-full rounded-2xl flex items-center justify-center transition-colors duration-300 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
          style={{
            backgroundColor: selectedColor.hex,
            boxShadow: selectedColor.isDark
              ? "inset 0 0 40px rgba(255,255,255,0.06), 0 25px 50px rgba(0,0,0,0.9)"
              : "inset 0 0 50px rgba(0,0,0,0.15), 0 25px 50px rgba(0,0,0,0.6)",
          }}
        >
          {/* Subtle realistic garment wrinkle & seam shading overlays */}
          <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay bg-gradient-to-tr from-black via-transparent to-white" />
          <div className="absolute inset-x-0 top-0 h-16 pointer-events-none opacity-20 bg-gradient-to-b from-white to-transparent mix-blend-overlay" />

          {/* Garment Collar & Neckline Visual Cue */}
          {garmentType !== "tote_bag" && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-8 rounded-b-full border-b-2 border-neutral-500/30 bg-black/20" />
          )}

          {/* Garment Pocket Visual Cue */}
          {garmentType === "hoodie" && (
            <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 w-48 h-20 rounded-2xl border-2 border-neutral-500/20 bg-black/10" />
          )}

          {/* Design Print Canvas Area */}
          <div
            className={`absolute ${placementStyle} z-10 flex items-center justify-center transition-all duration-300 rounded-xl overflow-hidden`}
          >
            {designImageSrc ? (
              <div className="relative w-full h-full flex items-center justify-center p-1 group">
                <img
                  src={designImageSrc}
                  alt={designTitle}
                  className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
                />

                {/* Print area guide boundary (Subtle dashed border) */}
                <div className="absolute inset-0 border border-dashed border-emerald-400/40 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1">
                  <span className="text-[8px] font-black uppercase tracking-wider bg-black/80 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40">
                    Active Print
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-500/40 rounded-xl p-3 text-center bg-black/10">
                <Move className="w-5 h-5 text-neutral-400 mb-1 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">
                  Artwork Placement
                </span>
                <span className="text-[8px] text-neutral-500 font-medium mt-0.5">
                  Select a preset or upload custom art
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer placement info */}
      <div className="absolute bottom-3 inset-x-4 z-20 flex items-center justify-between text-[10px] font-semibold text-neutral-400">
        <span className="capitalize">
          Placement: <strong className="text-white">{placement.replace(/_/g, " ")}</strong>
        </span>
        <span className="text-neutral-500 text-[9px]">High-Density Screen / DTF Print</span>
      </div>

      {isSubmitting && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
            Streaming to Design Production...
          </span>
        </div>
      )}
    </div>
  );
}
