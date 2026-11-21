"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  RotateCcw,
  Move,
  Maximize2,
  SlidersHorizontal,
  Ruler,
  FlipHorizontal2,
  Scissors,
  Image as ImageIcon,
  Shirt,
  ShoppingBag,
} from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
import type { ApparelBaseConfig } from "@/lib/customDesignPresets";
import { removeDesignBackground } from "@/lib/removeDesignBackground";

export type GarmentType = "oversized_tee" | "hoodie" | "standard_tee" | "tote_bag" | string;
export type PlacementPosition = "front_chest" | "full_front" | "pocket" | "back";

export interface GarmentColorOption {
  name: string;
  hex: string;
  isDark: boolean;
}

export const GARMENT_COLORS: GarmentColorOption[] = [
  { name: "Jet Black", hex: "#1B1D22", isDark: true },
  { name: "Off-White", hex: "#F5F2EA", isDark: false },
  { name: "Vintage Beige", hex: "#D8C7A8", isDark: false },
  { name: "Royal Navy", hex: "#16294A", isDark: true },
  { name: "Maroon Crimson", hex: "#5C1423", isDark: true },
  { name: "Forest Green", hex: "#153D29", isDark: true },
  { name: "Charcoal Ash", hex: "#383D47", isDark: true },
  { name: "Dusty Rose", hex: "#C2828B", isDark: false },
];

export const GARMENT_TYPES: {
  id: GarmentType;
  label: string;
  gsm: string;
  badge: string;
  basePrice?: number;
}[] = [
  { id: "oversized_tee", label: "Oversized Heavy Tee", gsm: "240 GSM", badge: "POPULAR", basePrice: 799 },
  { id: "hoodie", label: "Streetwear Fleece Hoodie", gsm: "380 GSM", badge: "WINTER", basePrice: 1499 },
  { id: "standard_tee", label: "Classic Combed Cotton Tee", gsm: "190 GSM", badge: "DAILY", basePrice: 499 },
  { id: "tote_bag", label: "Heavy Canvas Tote Bag", gsm: "340 GSM", badge: "ECO", basePrice: 399 },
];

export interface PrintTransform {
  scale: number; // 0.6 to 1.35
  offsetX: number; // -0.25 to 0.25
  offsetY: number; // -0.25 to 0.25
}

interface GarmentMockupPreviewProps {
  garmentType: GarmentType;
  garmentLabel?: string;
  apparelBases?: ApparelBaseConfig[];
  onSelectApparelBase?: (base: ApparelBaseConfig) => void;
  selectedColor: GarmentColorOption;
  selectedSize?: string;
  designImageSrc: string | null;
  designTitle?: string;
  placement: PlacementPosition;
  removeBackground?: boolean;
  onRemoveBackgroundChange?: (next: boolean) => void;
  onCutoutBlobReady?: (blob: Blob | null) => void;
  printTransform?: PrintTransform;
  onPrintTransformChange?: (next: PrintTransform) => void;
  isSubmitting?: boolean;
}

function getShortGarmentLabel(base: ApparelBaseConfig): string {
  const hint = `${base.id || ""} ${base.name || ""}`.toLowerCase();
  if (hint.includes("tote") || hint.includes("bag")) return "Tote Bag";
  if (hint.includes("hoodie") || hint.includes("fleece")) return "Hoodie";
  if (hint.includes("oversized")) return "Oversized Tee";
  if (hint.includes("classic") || hint.includes("standard") || hint.includes("regular")) return "Classic Tee";
  return base.name.length > 15 ? `${base.name.slice(0, 14)}…` : base.name;
}

type NormalizedGarmentKind = "oversized_tee" | "standard_tee" | "hoodie" | "tote_bag";

function normalizeGarmentKind(rawType: string, rawLabel?: string): NormalizedGarmentKind {
  const hint = `${rawType || ""} ${rawLabel || ""}`.toLowerCase();
  if (hint.includes("tote") || hint.includes("bag")) return "tote_bag";
  if (hint.includes("hoodie") || hint.includes("fleece") || hint.includes("sweat")) return "hoodie";
  if (hint.includes("standard") || hint.includes("classic") || hint.includes("regular")) return "standard_tee";
  return "oversized_tee";
}

const GARMENT_ASSETS: Record<NormalizedGarmentKind, { front: string; back: string }> = {
  oversized_tee: {
    front: "/mockups/oversized-tee-front.webp",
    back: "/mockups/oversized-tee-back.webp",
  },
  standard_tee: {
    front: "/mockups/classic-tee-front.webp",
    back: "/mockups/classic-tee-back.webp",
  },
  hoodie: {
    front: "/mockups/hoodie-front.webp",
    back: "/mockups/hoodie-back.webp",
  },
  tote_bag: {
    front: "/mockups/tote-bag.webp",
    back: "/mockups/tote-bag.webp",
  },
};

interface PrintZoneBox {
  left: number; // % center X inside garment container
  top: number; // % center Y inside garment container
  width: number; // % max width
  height: number; // % max height
  inchLabel: string;
}

const PRINT_ZONES: Record<NormalizedGarmentKind, Record<PlacementPosition, PrintZoneBox>> = {
  oversized_tee: {
    front_chest: { left: 50, top: 43, width: 30, height: 33, inchLabel: '10" × 12"' },
    full_front: { left: 50, top: 50, width: 41, height: 48, inchLabel: '12" × 16"' },
    pocket: { left: 60.5, top: 34.5, width: 13.5, height: 13.5, inchLabel: '3.5" × 3.5"' },
    back: { left: 50, top: 47, width: 39, height: 46, inchLabel: '12" × 15"' },
  },
  standard_tee: {
    front_chest: { left: 50, top: 42, width: 30, height: 32, inchLabel: '9.5" × 11"' },
    full_front: { left: 50, top: 49, width: 39, height: 47, inchLabel: '12" × 15"' },
    pocket: { left: 59.5, top: 34, width: 13, height: 13, inchLabel: '3.5" × 3.5"' },
    back: { left: 50, top: 46, width: 37, height: 45, inchLabel: '12" × 15"' },
  },
  hoodie: {
    front_chest: { left: 50, top: 44.5, width: 25, height: 22, inchLabel: '9" × 10"' },
    full_front: { left: 50, top: 45.5, width: 32, height: 27, inchLabel: '11" × 12"' },
    pocket: { left: 59, top: 39, width: 11.5, height: 11.5, inchLabel: '3.5" × 3.5"' },
    back: { left: 50, top: 53, width: 35, height: 39, inchLabel: '12" × 14"' },
  },
  tote_bag: {
    front_chest: { left: 50, top: 65, width: 35, height: 33, inchLabel: '9" × 10"' },
    full_front: { left: 50, top: 66, width: 43, height: 41, inchLabel: '11" × 12"' },
    pocket: { left: 59, top: 53, width: 15, height: 15, inchLabel: '4" × 4"' },
    back: { left: 50, top: 65, width: 37, height: 35, inchLabel: '10" × 11"' },
  },
};

/**
 * Real size-wise measurements & proportional visual scaling so switching S → M → L → XL → XXL
 * genuinely reflects realistic chest/length proportions & relative print coverage.
 */
function getSizeSpecs(kind: NormalizedGarmentKind, size: string) {
  const s = (size || "L").trim().toUpperCase();
  if (kind === "tote_bag") {
    return {
      label: '15" × 16" Heavy Canvas',
      frameScale: 1.0,
      printRatio: 1.0,
    };
  }

  const chestOffset = kind === "oversized_tee" ? 4 : kind === "hoodie" ? 4 : 0;
  const map: Record<string, { chest: number; len: number; frameScale: number; printRatio: number }> = {
    XS: { chest: 36 + chestOffset, len: 26, frameScale: 0.91, printRatio: 1.09 },
    S: { chest: 38 + chestOffset, len: 27, frameScale: 0.94, printRatio: 1.06 },
    M: { chest: 40 + chestOffset, len: 28, frameScale: 0.97, printRatio: 1.03 },
    L: { chest: 42 + chestOffset, len: 29, frameScale: 1.0, printRatio: 1.0 },
    XL: { chest: 44 + chestOffset, len: 30, frameScale: 1.03, printRatio: 0.95 },
    XXL: { chest: 46 + chestOffset, len: 31, frameScale: 1.06, printRatio: 0.91 },
    "3XL": { chest: 48 + chestOffset, len: 32, frameScale: 1.08, printRatio: 0.87 },
  };

  const entry = map[s] || map.L;
  return {
    label: `Size ${s} • Chest ${entry.chest}" • Len ${entry.len}"`,
    frameScale: entry.frameScale,
    printRatio: entry.printRatio,
  };
}

const DEFAULT_TRANSFORM: PrintTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export function GarmentMockupPreview({
  garmentType,
  garmentLabel,
  apparelBases = [],
  onSelectApparelBase,
  selectedColor,
  selectedSize = "L",
  designImageSrc,
  designTitle = "Custom Graphic",
  placement,
  removeBackground = false,
  onRemoveBackgroundChange,
  onCutoutBlobReady,
  printTransform = DEFAULT_TRANSFORM,
  onPrintTransformChange,
  isSubmitting = false,
}: GarmentMockupPreviewProps) {
  const isNativeApp = useIsNativeApp();
  const stageRef = useRef<HTMLDivElement>(null);

  const normalizedKind = useMemo(
    () => normalizeGarmentKind(garmentType, garmentLabel),
    [garmentType, garmentLabel]
  );

  const [viewSide, setViewSide] = useState<"front" | "back">(
    placement === "back" ? "back" : "front"
  );
  const [isFlipping, setIsFlipping] = useState(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showFineTune, setShowFineTune] = useState(false);
  const [dragMode, setDragMode] = useState<"tilt" | "move">("tilt");
  const isDraggingRef = useRef(false);
  const dragOriginRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Smart Background Removal state (live transparent PNG cutout)
  const [bgTolerance, setBgTolerance] = useState<number>(44);
  const [cutoutDataUrl, setCutoutDataUrl] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null);

  useEffect(() => {
    if (!removeBackground || !designImageSrc) {
      setCutoutDataUrl(null);
      setIsRemovingBg(false);
      setBgRemovalError(null);
      onCutoutBlobReady?.(null);
      return;
    }

    let cancelled = false;
    setIsRemovingBg(true);
    setBgRemovalError(null);

    removeDesignBackground(designImageSrc, bgTolerance)
      .then((res) => {
        if (cancelled) return;
        setCutoutDataUrl(res.dataUrl);
        onCutoutBlobReady?.(res.blob);
        setIsRemovingBg(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Background removal notice:", err);
        setCutoutDataUrl(null);
        onCutoutBlobReady?.(null);
        setBgRemovalError("Could not remove background on this image.");
        setIsRemovingBg(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeBackground, designImageSrc, bgTolerance]);

  const activeRenderedArtwork =
    removeBackground && cutoutDataUrl ? cutoutDataUrl : designImageSrc;

  // Preload both front & back studio garment images for instant zero-flicker 3D flip
  useEffect(() => {
    const assets = GARMENT_ASSETS[normalizedKind];
    if (typeof window === "undefined") return;
    [assets.front, assets.back].forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [normalizedKind]);

  // Smoothly 3D-flip to Back when user selects Full Back placement, or Front otherwise
  const triggerFlipTo = (nextSide: "front" | "back") => {
    if (nextSide === viewSide) return;
    setIsFlipping(true);
    setTimeout(() => {
      setViewSide(nextSide);
    }, 170);
    setTimeout(() => {
      setIsFlipping(false);
    }, 360);
  };

  useEffect(() => {
    const desired = placement === "back" ? "back" : "front";
    if (desired !== viewSide) {
      triggerFlipTo(desired);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  const garmentSrc = GARMENT_ASSETS[normalizedKind][viewSide];
  const zoneBox = PRINT_ZONES[normalizedKind][placement] || PRINT_ZONES[normalizedKind].front_chest;
  const sizeSpec = useMemo(
    () => getSizeSpecs(normalizedKind, selectedSize),
    [normalizedKind, selectedSize]
  );

  // Whether current active side should display the chosen print
  const showPrintOnCurrentSide =
    Boolean(designImageSrc) &&
    ((placement === "back" && viewSide === "back") ||
      (placement !== "back" && viewSide === "front"));

  const displayGarmentName =
    garmentLabel || GARMENT_TYPES.find((g) => g.id === garmentType)?.label || "Custom Tee";

  // Interactive Pointer Handlers: subtle 3D studio tilt OR direct artwork drag-to-reposition
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragOriginRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: printTransform.offsetX || 0,
      offsetY: printTransform.offsetY || 0,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;

    if (dragMode === "move" && onPrintTransformChange && showPrintOnCurrentSide) {
      const rect = stageRef.current?.getBoundingClientRect();
      const scaleDiv = Math.max(180, (rect?.width || 320) * 0.55);
      const nextX = Math.max(-0.25, Math.min(0.25, dragOriginRef.current.offsetX + dx / scaleDiv));
      const nextY = Math.max(-0.25, Math.min(0.25, dragOriginRef.current.offsetY - dy / scaleDiv));
      onPrintTransformChange({
        ...printTransform,
        offsetX: Math.round(nextX * 100) / 100,
        offsetY: Math.round(nextY * 100) / 100,
      });
    } else {
      const rotY = Math.max(-18, Math.min(18, dx * 0.14));
      const rotX = Math.max(-10, Math.min(10, -dy * 0.08));
      setTilt({ x: rotX, y: rotY });
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setTilt({ x: 0, y: 0 });
  };

  const updateTransform = (patch: Partial<PrintTransform>) => {
    if (!onPrintTransformChange) return;
    onPrintTransformChange({ ...printTransform, ...patch });
  };

  const effectivePrintWidth = Math.min(
    54,
    zoneBox.width * sizeSpec.printRatio * (printTransform.scale || 1)
  );
  const effectivePrintHeight = Math.min(
    58,
    zoneBox.height * sizeSpec.printRatio * (printTransform.scale || 1)
  );
  const effectiveLeft = zoneBox.left + (printTransform.offsetX || 0) * 32;
  const effectiveTop = zoneBox.top - (printTransform.offsetY || 0) * 32;

  return (
    <div className="space-y-3">
      {/* Photorealistic Interactive Studio Try-View Stage */}
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-keep-dark={!isNativeApp ? "true" : undefined}
        className={`relative w-full aspect-[4/4.4] sm:aspect-square rounded-3xl overflow-hidden select-none touch-pan-y ${
          dragMode === "move" ? "cursor-move" : "cursor-grab active:cursor-grabbing"
        } ${
          isNativeApp
            ? "bg-[radial-gradient(circle_at_50%_42%,#FFFFFF_0%,#F8F2E2_62%,#ECE0C4_100%)] border border-[#DFC070] shadow-[0_14px_38px_rgba(160,115,20,0.14)]"
            : "bg-[radial-gradient(circle_at_50%_40%,#2B303D_0%,#151720_58%,#0A0B0F_100%)] border border-zinc-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
        }`}
      >
        {/* Subtle Colored Ambient Studio Halo behind garment */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-colors duration-500 blur-3xl"
          style={{
            backgroundColor: selectedColor.hex,
            opacity: isNativeApp ? (selectedColor.isDark ? 0.08 : 0.14) : 0.16,
          }}
        />

        {/* Top Quick Apparel Selector (Tee / Hoodie / Tote + GSM) right on the preview stage */}
        <div
          className="absolute top-2.5 inset-x-2.5 z-30 flex items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {apparelBases.length > 0 && onSelectApparelBase ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
              {apparelBases.map((base) => {
                const active = garmentType === base.id;
                const isTote =
                  base.id.toLowerCase().includes("tote") ||
                  base.name.toLowerCase().includes("tote") ||
                  base.name.toLowerCase().includes("bag");
                return (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => onSelectApparelBase(base)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-md transition-all cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                      active
                        ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] border-[#B87D0B] font-black"
                        : isNativeApp
                        ? "bg-white/92 border-[#DFC070]/85 text-[#3F3626] hover:border-[#C68A12] font-bold"
                        : "bg-black/75 border-white/15 text-zinc-200 hover:border-amber-400/50 font-bold"
                    }`}
                  >
                    {isTote ? (
                      <ShoppingBag className="w-3 h-3 shrink-0" />
                    ) : (
                      <Shirt className="w-3 h-3 shrink-0" />
                    )}
                    <span className="text-[10px] leading-none whitespace-nowrap">
                      {getShortGarmentLabel(base)}
                    </span>
                    {base.gsm && (
                      <span
                        className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap ${
                          active
                            ? "bg-black/15 text-[#14120F] font-black"
                            : isNativeApp
                            ? "bg-[#FAF0D1] text-[#8A5800] font-bold"
                            : "bg-white/10 text-amber-300 font-bold"
                        }`}
                      >
                        {base.gsm}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className={`inline-flex items-center gap-1.5 min-w-0 max-w-[66%] px-2.5 py-1 rounded-full backdrop-blur-md border shadow-sm ${
                isNativeApp
                  ? "bg-white/95 border-[#DFC070]/90 text-[#14120F]"
                  : "bg-black/75 border-white/15 text-white"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/25"
                style={{ backgroundColor: selectedColor.hex }}
              />
              <span className="text-[10px] font-extrabold truncate">
                {displayGarmentName}
              </span>
            </div>
          )}
        </div>

        {/* Real Studio Garment 3D Perspective Container */}
        <div
          className="relative z-10 w-full h-full flex items-center justify-center pt-12 pb-14 px-5"
          style={{ perspective: "1100px" }}
        >
          <div
            className="relative w-full h-full max-w-[365px] max-h-[375px] aspect-[800/820] flex items-center justify-center"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${isFlipping ? 90 : tilt.y}deg) scale(${sizeSpec.frameScale})`,
              transition: isDraggingRef.current
                ? "transform 60ms linear"
                : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              transformStyle: "preserve-3d",
              filter: isNativeApp
                ? "drop-shadow(0 18px 26px rgba(30,24,12,0.22))"
                : "drop-shadow(0 24px 36px rgba(0,0,0,0.75))",
            }}
          >
            {/* Isolated Photorealistic Fabric Dye + Cotton Fold + Live Print Stack */}
            <div
              className="relative w-full h-full"
              style={{
                isolation: "isolate",
                WebkitMaskImage: `url(${garmentSrc})`,
                maskImage: `url(${garmentSrc})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            >
              {/* Layer 1: Dyed Real Cotton Base Color */}
              <div
                className="absolute inset-0 transition-colors duration-300"
                style={{ backgroundColor: selectedColor.hex }}
              />

              {/* Layer 2: Real Studio Garment Folds, Ribbed Collar & Seam Shading (Multiply) */}
              <img
                src={garmentSrc}
                alt={`${displayGarmentName} ${viewSide} view`}
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  mixBlendMode: "multiply",
                  filter: selectedColor.isDark
                    ? "contrast(1.18) brightness(1.06)"
                    : "contrast(1.06) brightness(1.02)",
                }}
              />

              {/* Layer 3: Real Cotton Specular Studio Highlights (keeps Jet Black & Navy folds crisp!) */}
              <img
                src={garmentSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  mixBlendMode: "screen",
                  opacity: selectedColor.isDark ? 0.25 : 0.06,
                  filter: selectedColor.isDark
                    ? "contrast(1.75) brightness(0.82)"
                    : "contrast(1.15) brightness(1.0)",
                }}
              />

              {/* Layer 4: User's Live Custom Artwork (With Original BG OR Transparent Cutout BG Removed) */}
              {showPrintOnCurrentSide && activeRenderedArtwork && (
                <div
                  className="absolute z-10 flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${effectiveLeft}%`,
                    top: `${effectiveTop}%`,
                    width: `${effectivePrintWidth}%`,
                    height: `${effectivePrintHeight}%`,
                    transform: "translate(-50%, -50%)",
                    transition: isDraggingRef.current
                      ? "none"
                      : "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <img
                    src={activeRenderedArtwork}
                    alt={designTitle}
                    draggable={false}
                    className="max-w-full max-h-full object-contain select-none"
                    style={{
                      opacity: isRemovingBg ? 0.45 : 0.96,
                      filter: selectedColor.isDark
                        ? "contrast(1.03) saturate(1.04)"
                        : "contrast(1.02)",
                    }}
                  />
                  {dragMode === "move" && (
                    <div className="absolute -inset-1 border border-dashed border-amber-400 rounded-lg bg-amber-400/5" />
                  )}
                </div>
              )}

              {/* Layer 5: Subtle Cotton Fabric Texture & Fold Shadow Pass OVER Artwork */}
              {showPrintOnCurrentSide && activeRenderedArtwork && (
                <img
                  src={garmentSrc}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute inset-0 z-20 w-full h-full object-contain pointer-events-none select-none"
                  style={{
                    mixBlendMode: "multiply",
                    opacity: selectedColor.isDark ? 0.28 : 0.16,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Live Background Removal Processing Indicator */}
        {isRemovingBg && (
          <div className="absolute inset-0 z-25 pointer-events-none flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md text-[10px] font-black uppercase tracking-wider shadow-lg ${
                isNativeApp
                  ? "bg-white/95 border-[#D6A124] text-[#8A5800]"
                  : "bg-black/80 border-amber-400/40 text-amber-300"
              }`}
            >
              <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span>Removing Background...</span>
            </div>
          </div>
        )}

        {/* Helpful Cue When Looking at Blank Side */}
        {designImageSrc && !showPrintOnCurrentSide && (
          <div className="absolute bottom-14 inset-x-4 z-20 pointer-events-none flex justify-center">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                isNativeApp
                  ? "bg-white/90 border-[#DFC070] text-[#5C4A2B]"
                  : "bg-black/75 border-zinc-700 text-zinc-300"
              }`}
            >
              Artwork is on the {placement === "back" ? "Back" : "Front"} — tap{" "}
              {placement === "back" ? "Back" : "Front"} to view print
            </span>
          </div>
        )}

        {/* Bottom Floating Control Bar */}
        <div
          className="absolute bottom-3 inset-x-3 z-30 flex items-center justify-between gap-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Front / Back 3D Flip Toggle */}
          <div
            className={`inline-flex items-center gap-1 p-1 rounded-full border backdrop-blur-md shadow-sm ${
              isNativeApp
                ? "bg-white/95 border-[#DFC070]"
                : "bg-black/80 border-white/15"
            }`}
          >
            <button
              type="button"
              onClick={() => triggerFlipTo("front")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                viewSide === "front"
                  ? "bg-gradient-to-r from-[#FCE48C] via-[#F0BA34] to-[#D49212] text-[#14120F] shadow-sm"
                  : isNativeApp
                  ? "text-[#5C4A2B] hover:text-[#14120F]"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => triggerFlipTo("back")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                viewSide === "back"
                  ? "bg-gradient-to-r from-[#FCE48C] via-[#F0BA34] to-[#D49212] text-[#14120F] shadow-sm"
                  : isNativeApp
                  ? "text-[#5C4A2B] hover:text-[#14120F]"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <FlipHorizontal2 className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          {/* Interactive Move / Adjust Controls */}
          <div className="flex items-center gap-1.5">
            {onPrintTransformChange && showPrintOnCurrentSide && (
              <button
                type="button"
                onClick={() => setDragMode((m) => (m === "move" ? "tilt" : "move"))}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md transition cursor-pointer shadow-sm ${
                  dragMode === "move"
                    ? "bg-[#14120F] text-[#FCE48C] border-[#D49212]"
                    : isNativeApp
                    ? "bg-white/95 text-[#14120F] border-[#DFC070]"
                    : "bg-black/80 text-zinc-200 border-white/15 hover:border-amber-400/50"
                }`}
              >
                <Move className="w-3 h-3" />
                <span>{dragMode === "move" ? "Moving" : "Move"}</span>
              </button>
            )}

            {onPrintTransformChange && (
              <button
                type="button"
                onClick={() => setShowFineTune((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md transition cursor-pointer shadow-sm ${
                  showFineTune
                    ? "bg-gradient-to-r from-[#FCE48C] via-[#F0BA34] to-[#D49212] text-[#14120F] border-[#C68A12]"
                    : isNativeApp
                    ? "bg-white/95 text-[#8A5800] border-[#D6A124]"
                    : "bg-black/80 text-amber-300 border-amber-400/40 hover:border-amber-300"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Adjust Print</span>
              </button>
            )}
          </div>
        </div>

        {/* Submission Loader */}
        {isSubmitting && (
          <div
            data-keep-dark="true"
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in"
          >
            <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">
              Submitting Your Custom Order...
            </span>
          </div>
        )}
      </div>

      {/* Design Background Mode Switcher: With Background vs Remove Background (Transparent Cutout) */}
      {onRemoveBackgroundChange && (
        <div
          className={`flex items-center justify-between gap-2 p-2 rounded-2xl border ${
            isNativeApp
              ? "bg-white border-[#E4C87A] shadow-sm"
              : "bg-zinc-900/90 border-zinc-800"
          }`}
        >
          <div className="flex items-center gap-1.5 pl-1 min-w-0">
            <Scissors
              className={`w-3.5 h-3.5 shrink-0 ${
                removeBackground
                  ? isNativeApp
                    ? "text-[#0F766E]"
                    : "text-emerald-400"
                  : isNativeApp
                  ? "text-[#9A6503]"
                  : "text-amber-400"
              }`}
            />
            <div className="min-w-0">
              <span
                className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider block leading-none truncate ${
                  isNativeApp ? "text-[#14120F]" : "text-white"
                }`}
              >
                Design Background
              </span>
              <span
                className={`text-[9px] font-medium block mt-0.5 truncate ${
                  isNativeApp ? "text-[#5C4E35]" : "text-zinc-400"
                }`}
              >
                {bgRemovalError
                  ? bgRemovalError
                  : removeBackground
                  ? "Clean cutout (BG removed)"
                  : "Original design with BG"}
              </span>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1 p-1 rounded-full border shrink-0 ${
              isNativeApp
                ? "bg-[#FFFBF0] border-[#E6CA82]"
                : "bg-black/80 border-zinc-800"
            }`}
          >
            <button
              type="button"
              onClick={() => onRemoveBackgroundChange(false)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                !removeBackground
                  ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] shadow-sm"
                  : isNativeApp
                  ? "text-[#5C4E35] hover:text-[#14120F]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ImageIcon className="w-3 h-3 shrink-0" />
              <span>With BG</span>
            </button>
            <button
              type="button"
              disabled={!designImageSrc || isRemovingBg}
              onClick={() => onRemoveBackgroundChange(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                removeBackground
                  ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] shadow-sm"
                  : isNativeApp
                  ? "text-[#5C4E35] hover:text-[#14120F]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Scissors className="w-3 h-3 shrink-0" />
              <span>{isRemovingBg ? "Cutting..." : "Remove BG"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Size-Wise Spec & Print Area Readout */}
      <div
        className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-semibold border ${
          isNativeApp
            ? "bg-[#FFFBF0] border-[#E8D08F]/80 text-[#4A3C22]"
            : "bg-zinc-900/70 border-zinc-800 text-zinc-300"
        }`}
      >
        <span className="inline-flex items-center gap-1.5 truncate">
          <Ruler className={`w-3.5 h-3.5 shrink-0 ${isNativeApp ? "text-[#9A6503]" : "text-amber-400"}`} />
          <span className="truncate">{sizeSpec.label}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap">
          Print:{" "}
          <strong className={isNativeApp ? "text-[#8A5800]" : "text-amber-300"}>
            {zoneBox.inchLabel}
          </strong>
        </span>
      </div>

      {/* Collapsible Live Artwork Size & Position Sliders */}
      {showFineTune && onPrintTransformChange && (
        <div
          className={`p-3.5 rounded-2xl border space-y-3 animate-in fade-in ${
            isNativeApp
              ? "bg-white border-[#E4C87A] shadow-sm"
              : "bg-zinc-900/90 border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                isNativeApp ? "text-[#8A5800]" : "text-amber-300"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Live Artwork Size &amp; Position</span>
            </span>
            <button
              type="button"
              onClick={() => onPrintTransformChange(DEFAULT_TRANSFORM)}
              className={`inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                isNativeApp ? "text-[#5C4A2B] hover:text-[#14120F]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div
                className={`flex justify-between text-[10px] font-bold mb-1 ${
                  isNativeApp ? "text-[#4A3C22]" : "text-zinc-400"
                }`}
              >
                <span>Print Size</span>
                <span className={`font-mono font-black ${isNativeApp ? "text-[#8A5800]" : "text-amber-300"}`}>
                  {Math.round((printTransform.scale || 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.35}
                step={0.05}
                value={printTransform.scale}
                onChange={(e) => updateTransform({ scale: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div
                className={`flex justify-between text-[10px] font-bold mb-1 ${
                  isNativeApp ? "text-[#4A3C22]" : "text-zinc-400"
                }`}
              >
                <span>Left / Right</span>
                <span className={`font-mono font-black ${isNativeApp ? "text-[#8A5800]" : "text-amber-300"}`}>
                  {Math.round((printTransform.offsetX || 0) * 100)}
                </span>
              </div>
              <input
                type="range"
                min={-0.25}
                max={0.25}
                step={0.02}
                value={printTransform.offsetX}
                onChange={(e) => updateTransform({ offsetX: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div
                className={`flex justify-between text-[10px] font-bold mb-1 ${
                  isNativeApp ? "text-[#4A3C22]" : "text-zinc-400"
                }`}
              >
                <span>Up / Down</span>
                <span className={`font-mono font-black ${isNativeApp ? "text-[#8A5800]" : "text-amber-300"}`}>
                  {Math.round((printTransform.offsetY || 0) * 100)}
                </span>
              </div>
              <input
                type="range"
                min={-0.25}
                max={0.25}
                step={0.02}
                value={printTransform.offsetY}
                onChange={(e) => updateTransform({ offsetY: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {removeBackground && (
            <div
              className={`pt-2.5 border-t ${
                isNativeApp ? "border-[#EFE1BE]" : "border-zinc-800"
              }`}
            >
              <div
                className={`flex justify-between text-[10px] font-bold mb-1 ${
                  isNativeApp ? "text-[#4A3C22]" : "text-zinc-400"
                }`}
              >
                <span>BG Cutout Edge Cleanliness</span>
                <span className={`font-mono font-black ${isNativeApp ? "text-[#0F766E]" : "text-emerald-400"}`}>
                  {bgTolerance}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={78}
                step={4}
                value={bgTolerance}
                onChange={(e) => setBgTolerance(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
