"use client";

import React, { useState, useEffect } from "react";
import { Product, ProductPackage } from "@/lib/types";
import {
  GenZAvatarModel,
  AvatarConfig,
  DEFAULT_MALE_AVATAR,
  DEFAULT_FEMALE_AVATAR,
} from "./GenZAvatarModel";
import { AvatarCustomizerTabs } from "./AvatarCustomizerTabs";
import { useCart } from "@/context/CartContext";
import {
  Sparkles,
  ShoppingBag,
  Sliders,
  Check,
  Flame,
  ArrowRight,
  ShieldCheck,
  Eye,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface GenZAvatarFittingRoomProps {
  selectedProduct: Product | null;
  selectedColor?: string;
  selectedSize?: string;
  onColorChange?: (color: string) => void;
  onSizeChange?: (size: string) => void;
  onExitFittingRoom: () => void;
  onScrollToCollection?: () => void;
}

export function GenZAvatarFittingRoom({
  selectedProduct,
  selectedColor = "",
  selectedSize = "",
  onColorChange,
  onSizeChange,
  onExitFittingRoom,
  onScrollToCollection,
}: GenZAvatarFittingRoomProps) {
  const { addToCart } = useCart();

  // Avatar Configuration loaded from localStorage or default
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("zebalpha_vto_avatar");
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (_) {}
    }
    return DEFAULT_MALE_AVATAR;
  });

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isAddedToBag, setIsAddedToBag] = useState(false);

  // Sync avatar to localStorage when changed
  const handleAvatarChange = (updated: AvatarConfig) => {
    setAvatarConfig(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("zebalpha_vto_avatar", JSON.stringify(updated));
      } catch (_) {}
    }
  };

  // Product Packages & Variant Information
  const packages: ProductPackage[] = (selectedProduct?.packages as ProductPackage[]) || [];
  const colorGroups: string[] = Array.from(
    new Set(packages.map((p) => p.color).filter((c): c is string => Boolean(c)))
  );
  const sizeOptions: string[] = Array.from(
    new Set(packages.map((p) => p.size).filter((s): s is string => Boolean(s)))
  );

  const activeColor = selectedColor || colorGroups[0] || "";
  const activeSize = selectedSize || sizeOptions[0] || "M";

  const selectedVariant = packages.find(
    (p) => (activeColor ? p.color === activeColor : true) && (activeSize ? p.size === activeSize : true)
  ) || packages[0];

  const activeGarmentImage =
    selectedVariant?.image_url ||
    selectedProduct?.virtual_tryon_image ||
    (Array.isArray(selectedProduct?.images) && selectedProduct.images[0]) ||
    selectedProduct?.image_url ||
    "";

  // Product Pricing calculations
  const effectivePrice = selectedVariant?.price
    ? parseFloat(String(selectedVariant.price))
    : selectedProduct?.price
    ? parseFloat(String(selectedProduct.price))
    : 0;

  const effectiveMrp = selectedVariant?.mrp
    ? parseFloat(String(selectedVariant.mrp))
    : selectedProduct?.mrp
    ? parseFloat(String(selectedProduct.mrp))
    : effectivePrice;

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const pkgName = selectedVariant?.name || `${activeColor || "Standard"} / ${activeSize}`;
    addToCart(selectedProduct, 1, pkgName);

    setIsAddedToBag(true);
    setTimeout(() => setIsAddedToBag(false), 2400);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* =========================================================================
          AVATAR FITTING ROOM TOP BAR
         ========================================================================= */}
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-850 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white">
                Gen-Z Drip Studio
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {avatarConfig.gender === "female" ? "Drip Girl 👧" : "Drip Guy 👦"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              100% Private Client-Side Avatar • Zero Camera Needed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Customizer Drawer */}
          <button
            type="button"
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
              showCustomizer
                ? "bg-white text-black border-white shadow-md font-black"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
            }`}
          >
            <Sliders size={13} />
            <span>{showCustomizer ? "Close Edit" : "Customize"}</span>
          </button>

          {/* Exit fitting room */}
          <button
            type="button"
            onClick={onExitFittingRoom}
            className="flex items-center gap-1 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer"
            title="Exit Fitting Room"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          AVATAR DISPLAY STAGE (CENTRAL VIEWPORT)
         ========================================================================= */}
      <div className="relative aspect-[3/4] w-full max-h-[64vh] rounded-3xl overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-[#09090d] border border-zinc-800 shadow-2xl flex items-center justify-center p-4">
        {/* Fit Check Glowing Pill Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-emerald-500/40 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.25)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            FIT CHECK PASS 🔥
          </span>
        </div>

        {/* Quick Vibe Pill (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/80 border border-zinc-800 text-[10px] font-bold text-zinc-400 backdrop-blur-md">
          <Eye size={12} className="text-zinc-500" />
          <span>Local 2.5D Draped</span>
        </div>

        {/* The Core Gen-Z Streetwear Avatar */}
        <GenZAvatarModel
          config={avatarConfig}
          garmentImageUrl={activeGarmentImage}
          garmentCategory={String(selectedProduct?.category_id || "upper_body")}
          garmentColorHex={selectedVariant?.color_hex}
          garmentName={selectedProduct?.name}
          activeSize={activeSize}
        />

        {/* Active Product Quick Overlay (Bottom Left) */}
        {selectedProduct && (
          <div className="absolute bottom-4 left-4 right-4 z-20 p-3 rounded-2xl bg-black/85 border border-zinc-800/90 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">
                Draped on Avatar
              </span>
              <h4 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">
                {selectedProduct.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-white">₹{effectivePrice}</span>
                {effectiveMrp > effectivePrice && (
                  <span className="text-[10px] text-zinc-500 line-through">₹{effectiveMrp}</span>
                )}
                <span className="text-[10px] font-bold text-zinc-400">
                  Size: {activeSize}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer shrink-0 ${
                isAddedToBag
                  ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {isAddedToBag ? (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  <span>Bag</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          AVATAR CUSTOMIZER TABS DRAWER (COLLAPSIBLE / EXPANDABLE)
         ========================================================================= */}
      {showCustomizer && (
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-850 shadow-2xl animate-in fade-in slide-in-from-top-3">
          <AvatarCustomizerTabs
            config={avatarConfig}
            onChange={handleAvatarChange}
            onSave={() => setShowCustomizer(false)}
          />
        </div>
      )}

      {/* =========================================================================
          PRODUCT SIZE & COLOR INTERACTIVE CONTROLS
         ========================================================================= */}
      {selectedProduct && (
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-850 space-y-3.5 shadow-xl">
          {/* Color Variants */}
          {colorGroups.length > 0 && onColorChange && (
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Available Colors ({colorGroups.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {colorGroups.map((col) => {
                  const isSelected = activeColor === col;
                  const matchingVariant = packages.find((p) => p.color === col);
                  const hex = matchingVariant?.color_hex;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onColorChange(col)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {hex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: hex }}
                        />
                      )}
                      <span>{col}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Variants */}
          {sizeOptions.length > 0 && onSizeChange && (
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Fit & Sizes
              </label>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((sz) => {
                  const isSelected = activeSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onSizeChange(sz)}
                      className={`min-w-[42px] py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                        isSelected
                          ? "bg-white text-black border-white shadow-md scale-105"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link to full product detail page */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-850/80">
            <Link
              href={`/products/${selectedProduct.id}`}
              className="text-xs font-bold text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              <span>View full product details</span>
              <ExternalLink size={12} />
            </Link>

            {onScrollToCollection && (
              <button
                type="button"
                onClick={onScrollToCollection}
                className="lg:hidden text-xs font-black text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Browse more clothes</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
