"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";

export function ZebQuickProductDetailModal() {
  const {
    activeProduct,
    openProductDetail,
    closeProductDetail,
    pincode,
    cart,
    cartCount,
    addToCart,
    updateQty,
    returnWindowDays,
  } = useZebQuick();

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [showDetails, setShowDetails] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  const images: string[] = useMemo(() => {
    if (!activeProduct) return [];
    const list = [
      ...(activeProduct.image_url ? [activeProduct.image_url] : []),
      ...(Array.isArray(activeProduct.images) ? activeProduct.images : []),
    ].filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    return list.length > 0 ? Array.from(new Set(list)) : ["/official-logo-sm.png"];
  }, [activeProduct]);

  const sizes: string[] = useMemo(() => {
    if (!activeProduct || !Array.isArray(activeProduct.sizes)) return [];
    return activeProduct.sizes.map((s: any) => String(s).trim()).filter(Boolean);
  }, [activeProduct]);

  useEffect(() => {
    if (!activeProduct) return;
    setActiveImgIdx(0);
    setShowDetails(false);
    setSelectedSize(sizes[0]);

    let active = true;
    const params = new URLSearchParams();
    params.set("pincode", pincode);
    if (activeProduct.category_group) params.set("category_group", activeProduct.category_group);

    fetch(`/api/zeb-quick/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list = (Array.isArray(data.products) ? data.products : []).filter(
          (p: any) => p.id !== activeProduct.id
        );
        setSimilarProducts(list.slice(0, 6));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [activeProduct, pincode, sizes]);

  if (!activeProduct) return null;

  const price = Number(activeProduct.zeb_quick_price || 0);
  const mrp = Number(activeProduct.mrp || 0);
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const cartItem = cart.find(
    (c) => c.id === activeProduct.id && (c.size || "") === (selectedSize || "")
  );
  const qty = cartItem?.quantity || 0;
  const latestThumb = cart[cart.length - 1]?.image_url || images[0];

  const handleAdd = () => {
    addToCart({
      id: activeProduct.id,
      source_product_id: activeProduct.source_product_id || activeProduct.id,
      seller_id: activeProduct.seller_id,
      title: activeProduct.title,
      image_url: images[0],
      price,
      mrp: mrp || null,
      size: selectedSize,
      pickup_pincode: activeProduct.pickup_pincode,
    });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: activeProduct.title,
          text: `${activeProduct.title} — ₹${price} on ZebQuick (5–6 Hr Express)`,
          url: window.location.href,
        });
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-neutral-50 overflow-hidden">
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Top Full-Bleed Image Carousel */}
        <div className="relative bg-white">
          {/* Floating Top Controls */}
          <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between pt-[env(safe-area-inset-top)]">
            <button
              type="button"
              onClick={closeProductDetail}
              aria-label="Close product details"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm ring-1 ring-black/10 backdrop-blur-xs cursor-pointer"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share product"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm ring-1 ring-black/10 backdrop-blur-xs cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Active Image */}
          <div className="mx-auto aspect-square max-h-[380px] w-full flex items-center justify-center bg-neutral-50 p-6">
            <img
              src={images[activeImgIdx] || images[0]}
              alt={activeProduct.title}
              className="h-full w-full object-contain rounded-2xl"
            />
          </div>

          {/* Dot Indicators */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImgIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeImgIdx ? "w-5 bg-neutral-900" : "w-1.5 bg-neutral-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mx-auto max-w-2xl px-3.5 py-3 space-y-3">
          {/* Highlight Attribute Chips Row (Blinkit style) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-neutral-500">Delivery</p>
              <p className="text-xs font-black text-emerald-700">5–6 Hr Express</p>
            </div>
            <div className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-neutral-500">Packaging</p>
              <p className="text-xs font-black text-neutral-900">Discreet Sealed</p>
            </div>
            {activeProduct.category_group && (
              <div className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold text-neutral-500">Category</p>
                <p className="text-xs font-black text-neutral-900">{activeProduct.category_group}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center cursor-pointer"
            >
              <p className="text-[11px] font-black text-emerald-800 leading-tight">
                {showDetails ? "Hide" : "View"}
                <br />
                details
              </p>
            </button>
          </div>

          {showDetails && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-xs text-neutral-700 leading-relaxed">
              {activeProduct.description ||
                `${activeProduct.title} — verified local store inventory packed in 100% discreet opaque hygiene packaging and delivered within 5–6 hours.`}
            </div>
          )}

          {/* Title, Size Selector & Price Card */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 space-y-2.5 shadow-xs">
            <div className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-extrabold text-neutral-700">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span>5–6 hrs</span>
            </div>
            <h1 className="text-base font-black text-neutral-950 leading-snug">
              {activeProduct.title}
            </h1>

            {sizes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-neutral-500">Size:</span>
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`rounded-xl border px-3 py-1 text-xs font-extrabold transition cursor-pointer ${
                      selectedSize === sz
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-lg font-black text-neutral-950">₹{price}</span>
              {mrp > price && (
                <>
                  <span className="text-xs text-neutral-400 line-through">MRP ₹{mrp}</span>
                  <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-black text-sky-700">
                    {discountPct}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Replacement / Return Policy synced from Admin Marketplace Settings */}
          <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-neutral-900">
                  {returnWindowDays > 0
                    ? `${returnWindowDays}-day easy return & replacement`
                    : "Hygiene sealed • Non-returnable"}
                </p>
                <p className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  100% discreet sealed hygiene pack
                </p>
              </div>
            </div>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>

          {/* Similar Products Section */}
          {similarProducts.length > 0 && (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 space-y-2.5">
              <h2 className="text-sm font-black text-neutral-950">Similar products</h2>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {similarProducts.map((sp) => {
                  const spImg = sp.image_url || (Array.isArray(sp.images) && sp.images[0]) || "/official-logo-sm.png";
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => openProductDetail(sp)}
                      className="w-28 shrink-0 rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 text-left transition hover:border-emerald-400 cursor-pointer"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-white">
                        <img src={spImg} alt={sp.title} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-bold text-neutral-900 leading-tight">
                        {sp.title}
                      </p>
                      <p className="mt-1 text-xs font-black text-neutral-950">₹{sp.zeb_quick_price}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Green View Cart Pill above Sticky Bottom Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-[76px] left-1/2 z-[95] -translate-x-1/2">
          <Link
            href="/zeb-quick/cart"
            onClick={closeProductDetail}
            className="flex items-center gap-2.5 rounded-full bg-[#0C831F] py-1.5 pl-1.5 pr-3 text-white shadow-[0_8px_24px_rgba(12,131,31,0.4)] ring-2 ring-white active:scale-95"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-white p-0.5 shrink-0">
              <img src={latestThumb} alt="Cart" className="h-full w-full object-cover rounded-full" />
            </div>
            <div className="leading-tight pr-1">
              <p className="text-xs font-black">View cart</p>
              <p className="text-[10px] font-semibold text-emerald-100">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </Link>
        </div>
      )}

      {/* Sticky Bottom Add to Cart / - 1 + Bar */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-neutral-500">{selectedSize || "1 unit"}</p>
            <p className="text-base font-black text-neutral-950 leading-tight">₹{price}</p>
            <p className="text-[10px] font-semibold text-neutral-500">Inclusive of all taxes</p>
          </div>

          {qty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl bg-[#0C831F] px-8 py-3 text-sm font-black text-white shadow-sm hover:bg-[#096b18] active:scale-95 cursor-pointer"
            >
              Add to cart
            </button>
          ) : (
            <div className="flex items-center gap-4 rounded-xl bg-[#0C831F] px-4 py-2.5 text-white shadow-sm">
              <button
                type="button"
                onClick={() => updateQty(activeProduct.id, selectedSize, undefined, qty - 1)}
                aria-label="Decrease quantity"
                className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <Minus className="h-4 w-4 stroke-[2.5]" />
              </button>
              <span className="min-w-[20px] text-center text-sm font-black">{qty}</span>
              <button
                type="button"
                onClick={() => updateQty(activeProduct.id, selectedSize, undefined, qty + 1)}
                aria-label="Increase quantity"
                className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
