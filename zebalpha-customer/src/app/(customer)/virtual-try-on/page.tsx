"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";
import { LiveCameraFittingRoom } from "@/components/vto/LiveCameraFittingRoom";
import { ClothingCollectionSection } from "@/components/vto/ClothingCollectionSection";
import {
  ChevronLeft,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Info
} from "lucide-react";

function VirtualTryOnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");
  const colorParam = searchParams.get("color");
  const sizeParam = searchParams.get("size");

  // State: Active Selected Product & Variant
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(colorParam || "");
  const [selectedSize, setSelectedSize] = useState<string>(sizeParam || "");
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // Load originating product from productId query param
  useEffect(() => {
    async function loadOriginatingProduct() {
      if (!productIdParam) return;

      try {
        setIsLoadingProduct(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, brand, price, mrp, image_url, images, category_id, stock, status, is_active, is_approved, approval_status, specifications, packages, virtual_tryon_image, virtual_tryon_category, is_vto_enabled")
          .eq("id", productIdParam)
          .maybeSingle();

        if (!error && data) {
          const prod = data as Product;
          setSelectedProduct(prod);

          if (colorParam) {
            setSelectedColor(colorParam);
          } else if (prod.packages && Array.isArray(prod.packages) && prod.packages.length > 0) {
            const firstColor = prod.packages.find((p: any) => p.color)?.color;
            if (firstColor) setSelectedColor(firstColor);
          }

          if (sizeParam) {
            setSelectedSize(sizeParam);
          } else if (prod.packages && Array.isArray(prod.packages) && prod.packages.length > 0) {
            const firstSize = prod.packages.find((p: any) => p.size)?.size;
            if (firstSize) setSelectedSize(firstSize);
          }
        }
      } catch (err) {
        console.error("Error fetching originating product for virtual try-on:", err);
      } finally {
        setIsLoadingProduct(false);
      }
    }

    loadOriginatingProduct();
  }, [productIdParam, colorParam, sizeParam]);

  // Product Selection handler from Interactive Catalogue
  // Updates the live garment without stopping or reloading the camera stream!
  const handleSelectProduct = useCallback((product: Product, colorName?: string) => {
    setSelectedProduct(product);
    if (colorName) {
      setSelectedColor(colorName);
    } else if (product.packages && Array.isArray(product.packages) && product.packages.length > 0) {
      const firstColor = product.packages.find((p: any) => p.color)?.color;
      setSelectedColor(firstColor || "");
    } else {
      setSelectedColor("");
    }
  }, []);

  // Back / Exit navigation logic
  const handleExitFittingRoom = useCallback(() => {
    if (productIdParam) {
      router.push(`/products/${productIdParam}`);
    } else {
      router.push("/");
    }
  }, [productIdParam, router]);

  // Smooth scroll to catalogue on mobile
  const scrollToCollection = useCallback(() => {
    const el = document.getElementById("clothing-catalogue-anchor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* =========================================================================
          TOP NAVIGATION HEADER
         ========================================================================= */}
      <header className="sticky top-0 z-50 border-b border-zinc-850 bg-black/90 px-4 py-3 backdrop-blur-xl md:px-8 shadow-2xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between">
          {/* Left: Exit/Back Navigation & Brand Identity */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={handleExitFittingRoom}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all active:scale-95 cursor-pointer shadow-md"
              aria-label="Exit Fitting Room"
              title="Return to Product"
            >
              <ChevronLeft size={20} />
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-black flex items-center justify-center border border-zinc-800 shadow-md">
                <Image
                  src="/official-logo.png"
                  alt="ZEBALPHA Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-black tracking-[0.2em] uppercase text-white">
                    ZEBALPHA
                  </span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-zinc-300 border border-white/10">
                    Live AR
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  Virtual Fitting Room
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Strict Privacy Trust Indicator & Cart */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 shadow-sm">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="font-bold text-[11px]">Strict View-Only • No Camera Recording</span>
            </div>

            <Link
              href="/cart"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:border-zinc-700 transition cursor-pointer"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN FITTING ROOM STAGE (2-PANEL LAYOUT)
         ========================================================================= */}
      <main className="mx-auto max-w-[1500px] px-3 sm:px-6 md:px-8 py-5 sm:py-6">
        {/* DESKTOP: 2-PANEL GRID (Left: Camera Fitting Room | Right: Interactive Catalogue)
            MOBILE: Camera Fitting Room Takes Priority at Top, Catalogue Below */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =====================================================================
              LEFT PANEL (DESKTOP: 6/12 or 7/12 COLS - LIVE CAMERA FITTING ROOM)
             ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-20 space-y-4">
            <LiveCameraFittingRoom
              selectedProduct={selectedProduct}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              onColorChange={setSelectedColor}
              onSizeChange={setSelectedSize}
              onExitFittingRoom={handleExitFittingRoom}
              onScrollToCollection={scrollToCollection}
            />
          </div>

          {/* ANCHOR FOR MOBILE SMOOTH SCROLL */}
          <div id="clothing-catalogue-anchor" className="lg:hidden" />

          {/* =====================================================================
              RIGHT PANEL (DESKTOP: 6/12 COLS - SEARCHABLE CLOTHING CATALOGUE)
             ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 rounded-3xl bg-zinc-950 border border-zinc-850 p-4 sm:p-5 shadow-2xl">
            <ClothingCollectionSection
              currentSelectedProductId={selectedProduct?.id}
              onSelectProduct={handleSelectProduct}
              isPanel={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VirtualTryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white text-xs font-bold">
          Loading Zebalpha Live Fitting Room...
        </div>
      }
    >
      <VirtualTryOnContent />
    </Suspense>
  );
}
