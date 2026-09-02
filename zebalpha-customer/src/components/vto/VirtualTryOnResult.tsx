"use client";

import React, { useState, useRef, useCallback } from "react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { 
  Sparkles, 
  RefreshCcw, 
  Shirt, 
  ShoppingCart, 
  Sliders, 
  Check, 
  Download, 
  Maximize2 
} from "lucide-react";

interface VirtualTryOnResultProps {
  originalImage: string;
  generatedImage: string;
  product: Product;
  onTryAnotherPhoto: () => void;
  onTryAnotherProduct: () => void;
  onClose: () => void;
}

export function VirtualTryOnResult({
  originalImage,
  generatedImage,
  product,
  onTryAnotherPhoto,
  onTryAnotherProduct,
  onClose,
}: VirtualTryOnResultProps) {
  const { addToCart } = useCart();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"slider" | "generated" | "original">("slider");
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Dragging Slider
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, 1);
    setAddedToCartSuccess(true);
    setTimeout(() => {
      setAddedToCartSuccess(false);
    }, 2500);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `asaliswad-vto-${product.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">AI Synthesized Look</span>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>✨ Your Virtual Look</span>
          </h3>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-1 text-xs">
          <button
            onClick={() => setActiveTab("slider")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeTab === "slider" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            Split Compare
          </button>
          <button
            onClick={() => setActiveTab("generated")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeTab === "generated" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            Virtual Fit
          </button>
        </div>
      </div>

      {/* Main Image Showcase with Interactive Split Slider */}
      <div
        ref={containerRef}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleTouchMove}
        className="relative aspect-[3/4] w-full max-h-[62vh] rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl select-none cursor-ew-resize group"
      >
        {activeTab === "slider" ? (
          <>
            {/* Base layer: Generated Try-On Result */}
            <img
              src={generatedImage}
              alt="Virtual Try-On Result"
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            />

            {/* Top layer: Original Photo (Clipped by slider position) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={originalImage}
                alt="Original Photo"
                className="absolute inset-0 h-full w-full object-cover max-w-none"
                style={{
                  width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%",
                }}
              />
            </div>

            {/* Divider Line & Draggable Handle */}
            <div
              className="absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl border-2 border-black cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
                <Sliders size={16} />
              </div>
            </div>

            {/* Floating Tags */}
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-wider text-white">
              Original Photo
            </div>
            <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Sparkles size={10} /> Virtual Try-On
            </div>
          </>
        ) : activeTab === "generated" ? (
          <img
            src={generatedImage}
            alt="Virtual Try-On Result"
            className="h-full w-full object-cover animate-in fade-in duration-200"
          />
        ) : (
          <img
            src={originalImage}
            alt="Original Photo"
            className="h-full w-full object-cover animate-in fade-in duration-200"
          />
        )}

        {/* Download Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="absolute bottom-4 right-4 z-30 h-10 w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
          aria-label="Download Image"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Product Card Details */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center overflow-hidden">
            <img
              src={product.images?.[0] || product.image_url}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h4 className="text-sm font-black text-white line-clamp-1">{product.name}</h4>
            <p className="text-xs font-bold text-zinc-400">₹{product.price}</p>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={addedToCartSuccess}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
            addedToCartSuccess
              ? "bg-emerald-500 text-white"
              : "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10 active:scale-95"
          }`}
        >
          {addedToCartSuccess ? (
            <>
              <Check size={14} /> Added!
            </>
          ) : (
            <>
              <ShoppingCart size={14} /> Add to Cart
            </>
          )}
        </button>
      </div>

      {/* Bottom Action Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onTryAnotherPhoto}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
        >
          <RefreshCcw size={14} />
          Try Another Photo
        </button>

        <button
          onClick={onTryAnotherProduct}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
        >
          <Shirt size={14} />
          Try Another Product
        </button>
      </div>
    </div>
  );
}
