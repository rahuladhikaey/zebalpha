"use client";

import { useState, useEffect, useMemo } from "react";
import { Product, ProductPackage } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BuyNowButton } from "@/components/BuyNowButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShieldCheck, Truck, RefreshCcw, Tag, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import { PackageSelection } from "@/components/PackageSelection";

export default function ProductDetailTemplate({
  product,
  relatedProducts = []
}: {
  product: Product,
  relatedProducts?: Product[]
}) {
  const images = product.images || [product.image_url];

  const normalizedPackages = useMemo(() => {
    if (!product.packages || product.packages.length === 0) return [];
    return product.packages.map((pkg, idx) => {
      if (idx === 0) {
        return {
          ...pkg,
          price: product.price,
          mrp: product.mrp != null ? product.mrp : pkg.mrp
        };
      }
      return pkg;
    });
  }, [product.packages, product.price, product.mrp]);

  const [selectedPackage, setSelectedPackage] = useState<ProductPackage | null>(
    normalizedPackages.length > 0
      ? normalizedPackages.find(p => p.isBestSeller) || normalizedPackages[0]
      : null
  );

  const displayPrice = selectedPackage ? selectedPackage.price : product.price;
  const displayMrp = selectedPackage && selectedPackage.mrp ? selectedPackage.mrp : product.mrp;

  const hasDiscount = displayMrp && displayMrp > displayPrice;
  const discountPercent = hasDiscount ? Math.round(((displayMrp! - displayPrice) / displayMrp!) * 100) : 0;

  const computedProduct = {
    ...product,
    price: displayPrice,
    mrp: displayMrp,
    name: selectedPackage ? `${product.name} - ${selectedPackage.name}` : product.name,
  };

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("asali_swad_reviews");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const productReviews = parsed.filter((r: any) => Number(r.product_id) === Number(product.id));
          // Sort by newest first
          productReviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setReviews(productReviews);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [product.id]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 4.8;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const starCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length === 0) {
      return { 5: 85, 4: 10, 3: 3, 2: 1, 1: 1 };
    }
    reviews.forEach((r) => {
      const rVal = Math.min(5, Math.max(1, Math.round(r.rating))) as 5 | 4 | 3 | 2 | 1;
      counts[rVal] = (counts[rVal] || 0) + 1;
    });
    const total = reviews.length;
    return {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };
  }, [reviews]);


  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">

          {/* LEFT COLUMN: Interactive Image Carousel (Like Flipkart/Amazon) */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="flex flex-col gap-6">
              {/* Image Carousel with Slide Controls */}
              <ProductImageCarousel images={images} productName={product.name} />

              {/* Wishlist Button */}
              <div className="flex justify-end">
                <WishlistButton product={product} />
              </div>

              {/* Action Buttons - Desktop (Flipkart Colors) */}
              <div className="hidden lg:grid grid-cols-2 gap-4 mt-2">
                {product.stock && product.stock > 0 ? (
                  <>
                    <AddToCartButton
                      product={computedProduct}
                      className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#b8e636] to-[#8cc63f] text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-lime-400/30 transition-all hover:from-[#a5d32a] hover:to-[#7ab535] active:scale-95"
                    />
                    <div className="w-full">
                      <BuyNowButton
                        product={computedProduct}
                        className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#15803d] text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-green-600/30 transition-all hover:from-[#138a3f] hover:to-[#116d34] active:scale-95"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <button disabled className="flex h-16 w-full items-center justify-center rounded-2xl bg-rose-50 text-sm font-black uppercase tracking-widest text-rose-400 border border-rose-200 cursor-not-allowed">
                      Out of Stock
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info */}
          <div className="lg:col-span-5 space-y-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>Home</span> <ChevronRight size={12} aria-hidden="true" />
              <span>{product.category_name || "Products"}</span> <ChevronRight size={12} aria-hidden="true" />
              <span className="text-slate-900 truncate text-[10px] sm:text-xs">{product.name}</span>
            </nav>

            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl leading-tight">
                {product.name}
              </h1>
            </div>


            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-slate-900">₹{displayPrice}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg font-bold text-slate-500 line-through">₹{displayMrp}</span>
                    <span className="text-lg font-black text-[#2e7d32]">{discountPercent}% off</span>
                  </>
                )}
              </div>
              <p className="text-xs font-bold text-[#388e3c]">Special Price including all taxes</p>
            </div>

            {normalizedPackages.length > 0 && (
              <PackageSelection 
                packages={normalizedPackages} 
                selectedPackage={selectedPackage} 
                onSelect={setSelectedPackage} 
              />
            )}


            {/* Available Offers */}
            {product.offers && product.offers.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-base font-black text-slate-900">Available Offers</h3>
                <div className="space-y-3">
                  {product.offers.map((offer, i) => (
                    <div key={i} className="flex gap-3 text-sm font-medium text-slate-600">
                      <Tag className="shrink-0 text-[#388e3c] mt-0.5" size={16} />
                      <span>{offer} <span className="text-[#2874f0] font-black cursor-pointer ml-1 text-xs">T&C</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Description & Highlights */}
            <div className="grid gap-8 md:grid-cols-2 pt-4 border-t border-slate-100">

              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">Product Description</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600">{product.description}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">Highlights</h3>
                <ul className="space-y-2 list-disc list-inside text-sm font-medium text-slate-600">
                  <li>Original & Pure Quality</li>
                  <li>Directly from Sources</li>
                  <li>Premium Packaging</li>
                  <li>Best for Daily Use</li>
                </ul>
              </div>
            </div>

            {/* Seller Info */}
            <div className="p-6 rounded-2xl bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-slate-200" aria-hidden="true">
                  <ShieldCheck className="text-[#1a73e8]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Asali Swad Store</h4>
                  <p className="text-xs font-bold text-slate-500">24Hr. Return Policy</p>
                </div>
              </div>
              <button className="text-[#1a73e8] text-sm font-black hover:underline" aria-label="View Retailer details">View Retailer</button>
            </div>




            {/* Features (Bottom Icons) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-12">
              <div className="flex flex-col items-center text-center p-4">
                <Truck className="mb-4 text-[#1a73e8]" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-slate-900 uppercase">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <ShieldCheck className="mb-4 text-[#1a73e8]" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-slate-900 uppercase">Secure Pay</span>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <RefreshCcw className="mb-4 text-[#1a73e8]" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-slate-900 uppercase">Easy Returns</span>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <Tag className="mb-4 text-[#1a73e8]" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-slate-900 uppercase">Original Item</span>
              </div>
            </div>

            {/* Premium Ratings & Reviews Section (Green circled area) */}
            <div className="mt-8 border-t border-slate-100 pt-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2e7d32]">Feedback</span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Ratings & Reviews</h3>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-white bg-[#2e7d32] px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-md shadow-green-200">
                  ★ {averageRating} / 5
                </span>
              </div>

              {/* Rating Card & Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-[2rem] bg-slate-50 border border-slate-100/50">
                <div className="md:col-span-4 text-center md:border-r border-slate-200/60 md:pr-6 space-y-2">
                  <p className="text-5xl font-black text-slate-900 leading-none">{averageRating}</p>
                  <div className="flex items-center justify-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={18} className="fill-current" fill={i < Math.round(averageRating) ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Based on {reviews.length || 148} ratings</p>
                </div>
 
                <div className="md:col-span-8 space-y-2 text-xs">
                  {([5, 4, 3, 2, 1] as const).map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-3 font-extrabold text-slate-600 text-right">{star}</span>
                      <Star size={10} className="text-amber-400 shrink-0 fill-current" aria-hidden="true" />
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div 
                          className="h-full bg-[#2e7d32] rounded-full transition-all duration-500" 
                          style={{ width: `${starCounts[star]}%` }}
                        />
                      </div>
                      <span className="w-8 text-slate-500 text-right font-extrabold">{starCounts[star]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {reviews.length > 0 ? (
                  reviews.map((r, i) => (
                    <div key={r.id || i} className="p-5 rounded-[1.75rem] bg-white border border-slate-100/80 shadow-sm space-y-2.5 transition hover:shadow-md">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-50 text-[#2e7d32] flex items-center justify-center font-black text-sm border border-emerald-100">
                            {r.user_name?.[0]?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800">{r.user_name}</h4>
                              <span className="text-[9px] font-extrabold text-[#2e7d32] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50 flex items-center gap-0.5">
                                Verified Buyer ✓
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                              {Array.from({ length: 5 }).map((_, si) => (
                                <Star key={si} size={11} className="fill-current" fill={si < r.rating ? "currentColor" : "none"} aria-hidden="true" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed pl-12">
                        {r.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50 space-y-2">
                    <p className="text-sm font-black text-slate-500">No custom reviews yet</p>
                    <p className="text-xs font-bold text-slate-500">Rate this product inside your Purchase History to be the first!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        {/* RELATED PRODUCTS SECTION */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-slate-100 pt-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#388e3c]">Suggestions</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">You Might Also Like</h2>
              </div>
              <Link href="/products" className="text-sm font-black text-[#2874f0] hover:underline">View All Products</Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group flex flex-col rounded-3xl bg-white p-3 transition-all hover:shadow-xl border border-transparent hover:border-slate-100"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 p-3 mb-4">
                    <img
                      src={p.images?.[0] || p.image_url}
                      alt={p.name}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[#1a73e8] transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 items-center gap-0.5 rounded-md bg-[#2e7d32] px-1.5 text-[10px] font-bold text-white">
                        <span>4.4</span>
                        <Star size={8} fill="currentColor" aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">(234)</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 line-through">
                          ₹{p.mrp || Math.round(p.price * 1.2)}
                        </span>
                        <span className="text-[9px] font-extrabold text-[#2e7d32] bg-green-50 px-1 py-0.5 rounded">
                          {Math.round((((p.mrp || Math.round(p.price * 1.2)) - p.price) / (p.mrp || Math.round(p.price * 1.2))) * 100)}% OFF
                        </span>
                      </div>
                      <span className="text-sm font-black text-slate-900">₹{p.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM BAR FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex h-16 w-full items-center bg-white border-t border-slate-100 lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        {product.stock && product.stock > 0 ? (
          <div className="grid grid-cols-2 h-full w-full">
            <AddToCartButton
              product={computedProduct}
              className="flex items-center justify-center bg-gradient-to-r from-[#b8e636] to-[#8cc63f] text-white text-[10px] font-black uppercase tracking-widest hover:from-[#a5d32a] hover:to-[#7ab535] transition-colors border-r border-white/10"
            />
            <BuyNowButton
              product={computedProduct}
              className="flex items-center justify-center bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white text-[10px] font-black uppercase tracking-widest hover:from-[#138a3f] hover:to-[#116d34] transition-colors"
            />
          </div>
        ) : (
          <div className="w-full h-full px-4 py-2">
            <button disabled className="flex h-full w-full items-center justify-center rounded-xl bg-rose-50 text-[10px] font-black uppercase tracking-widest text-rose-400 border border-rose-200 cursor-not-allowed">
              Out of Stock
            </button>
          </div>
        )}
      </div>

      {/* Padding for bottom bar on mobile */}
      <div className="h-20 lg:hidden" />
    </div>

  );
}
