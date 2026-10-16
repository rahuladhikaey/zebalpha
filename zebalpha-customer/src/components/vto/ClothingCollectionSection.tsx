"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Product, ProductPackage } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { evaluateProductTryOnEligibility } from "@/shared/constants/tryOnEligibility";
import { Search, Sparkles, Check, Shirt, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ClothingCollectionSectionProps {
  currentSelectedProductId?: string | number | null;
  onSelectProduct: (product: Product, colorName?: string) => void;
  className?: string;
  isPanel?: boolean;
}

interface CategoryItem {
  id: string;
  label: string;
  slug?: string;
}

export function ClothingCollectionSection({
  currentSelectedProductId,
  onSelectProduct,
  className = "",
  isPanel = false,
}: ClothingCollectionSectionProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"latest" | "price_asc" | "price_desc">("latest");

  // Fetch real catalogue and dynamic categories from Supabase
  useEffect(() => {
    async function loadCatalogAndCategories() {
      try {
        setIsLoading(true);

        // 1. Fetch eligible catalogue items from products table
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("id, name, brand, price, mrp, image_url, images, category_id, category_name, stock, status, is_active, is_approved, approval_status, specifications, packages, virtual_tryon_image, virtual_tryon_category, is_vto_enabled, created_at")
          .or("is_active.is.null,is_active.eq.true")
          .neq("approval_status", "rejected")
          .order("created_at", { ascending: false })
          .limit(100);

        let eligibleItems: Product[] = [];
        if (!prodErr && prodData) {
          // Strict server-enforced product eligibility check:
          // Exclude restricted intimate wear (bras, panties, thongs, lingerie, etc.)
          eligibleItems = (prodData as Product[]).filter((p) => {
            const result = evaluateProductTryOnEligibility(p);
            return result.isEligible;
          });
          setAllProducts(eligibleItems);
        }

        // 2. Fetch categories from Supabase categories table
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name, slug, sort_order")
          .or("is_active.is.null,is_active.eq.true")
          .order("sort_order", { ascending: true });

        const chips: CategoryItem[] = [{ id: "all", label: "All Apparel" }];

        if (catData && catData.length > 0) {
          // Include DB categories that have eligible fashion items
          catData.forEach((c) => {
            const hasItems = eligibleItems.some(
              (p) => String(p.category_id) === String(c.id) || p.category_name?.toLowerCase() === c.name.toLowerCase()
            );
            if (hasItems) {
              chips.push({ id: String(c.id), label: c.name, slug: c.slug });
            }
          });
        }

        // 3. Fallback: derive unique categories directly from eligible products if DB categories table is empty
        if (chips.length === 1 && eligibleItems.length > 0) {
          const uniqueNames = Array.from(
            new Set(
              eligibleItems
                .map((p) => p.category_name || (p.specifications as any)?.category || (p.specifications as any)?.product_type)
                .filter(Boolean)
            )
          );
          uniqueNames.forEach((name) => {
            chips.push({ id: name.toLowerCase().replace(/\s+/g, "_"), label: name });
          });
        }

        setDynamicCategories(chips);
      } catch (err) {
        console.error("Error loading Virtual Try-On catalogue:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalogAndCategories();
  }, []);

  // Dynamic Filter & Search Logic
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // Dynamic Category Filter
    if (activeCategoryId !== "all") {
      const selectedChip = dynamicCategories.find((c) => c.id === activeCategoryId);
      const targetLabel = (selectedChip?.label || activeCategoryId).toLowerCase();

      list = list.filter((p) => {
        const matchesId = String(p.category_id) === String(activeCategoryId);
        const prodCat = (p.category_name || (p.specifications as any)?.category || "").toLowerCase();
        const prodType = (
          (p.specifications as any)?.subcategory ||
          (p.specifications as any)?.product_type ||
          p.virtual_tryon_category ||
          ""
        ).toLowerCase();
        const matchesName = prodCat.includes(targetLabel) || prodType.includes(targetLabel) || p.name.toLowerCase().includes(targetLabel);

        return matchesId || matchesName;
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    // Sort By
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [allProducts, activeCategoryId, dynamicCategories, searchQuery, sortBy]);

  return (
    <section className={`w-full space-y-4 ${className}`}>
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Interactive Fashion Catalogue
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            Select Clothing to Try On
          </h2>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
            <input
              type="text"
              placeholder="Search catalogue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white transition"
            />
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="py-2 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold focus:outline-none focus:border-white transition cursor-pointer"
          >
            <option value="latest">Latest</option>
            <option value="price_asc">Price: Low</option>
            <option value="price_desc">Price: High</option>
          </select>
        </div>
      </div>

      {/* HORIZONTAL DYNAMIC CATEGORY FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {dynamicCategories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-black shadow-md scale-[1.02]"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white"
              }`}
            >
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* PRODUCT GRID */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
          <Loader2 className="animate-spin text-white" size={24} />
          <p className="text-xs font-bold">Loading eligible collection...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-xs space-y-1.5 bg-zinc-950 rounded-2xl border border-zinc-850 p-6">
          <p className="text-sm font-bold text-white">No eligible outfits found</p>
          <p className="text-zinc-400">Try adjusting your category filter or search keywords.</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${isPanel ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
          {filteredProducts.map((p) => {
            const isSelected = String(p.id) === String(currentSelectedProductId);
            const garmentImg = 
              p.virtual_tryon_image ||
              (Array.isArray(p.images) && p.images[0]) ||
              p.image_url ||
              "/placeholder.jpg";

            const packages: ProductPackage[] = (p.packages as ProductPackage[]) || [];
            const colorOptions = Array.from(new Set(packages.map((pkg) => pkg.color).filter(Boolean)));
            const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

            return (
              <div
                key={p.id}
                className={`group relative flex flex-col rounded-2xl bg-zinc-950 border transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? "border-white ring-1 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                    : "border-zinc-850 hover:border-zinc-700 hover:shadow-xl"
                }`}
              >
                {/* Product Image Thumbnail */}
                <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                  <img
                    src={garmentImg}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Discount / Status Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {discount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white text-black text-[8px] font-black uppercase tracking-wider">
                        {discount}% OFF
                      </span>
                    )}
                    {isSelected && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                        <Check size={9} /> Active Fit
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-3 flex flex-col flex-1 justify-between space-y-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                      {p.brand || "ZEBALPHA"}
                    </span>
                    <h4 className="text-[11px] font-black text-white line-clamp-1 group-hover:text-zinc-200 transition">
                      {p.name}
                    </h4>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-xs font-black text-white">₹{p.price}</span>
                      {p.mrp && p.mrp > p.price && (
                        <span className="text-[9px] text-zinc-500 line-through">₹{p.mrp}</span>
                      )}
                    </div>

                    {/* Color Swatches preview */}
                    {colorOptions.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-[9px] text-zinc-400">
                          {colorOptions.length} {colorOptions.length === 1 ? "color" : "colors"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* "Try This Outfit" Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProduct(p, colorOptions[0]);
                      // On small mobile screens, smoothly scroll to top fitting room
                      if (window.innerWidth < 1024) {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className={`w-full py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-800 text-white border border-zinc-700 cursor-default"
                        : "bg-white text-black hover:bg-zinc-200 shadow-md active:scale-95"
                    }`}
                  >
                    <Sparkles size={11} className={isSelected ? "text-zinc-400" : "text-black"} />
                    <span>{isSelected ? "Currently In Fitting Room" : "Try This Outfit"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
