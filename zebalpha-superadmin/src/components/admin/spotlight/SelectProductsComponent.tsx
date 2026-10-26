"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkles,
  Package,
  Layers,
  AlertCircle
} from "lucide-react";
import { CreateEditorialCardModal } from "./CreateEditorialCardModal";
import type { SpotlightSelectedItem, SpotlightEditorialCard } from "@/types/spotlight";

interface SelectProductsComponentProps {
  maxCards?: number;
  selectedCards: SpotlightSelectedItem[];
  onChangeSelected: (cards: SpotlightSelectedItem[]) => void;
  sellerProducts: any[];
  editorialCards: SpotlightEditorialCard[];
  categories: any[];
  onRefreshEditorialCards: () => Promise<void>;
}

export function SelectProductsComponent({
  maxCards = 16,
  selectedCards,
  onChangeSelected,
  sellerProducts,
  editorialCards,
  categories,
  onRefreshEditorialCards,
}: SelectProductsComponentProps) {
  // Tabs: 'all' | 'editorial' | 'seller'
  const [activeTab, setActiveTab] = useState<"all" | "editorial" | "seller">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc" | "newest">("popular");

  // Selection keys set for fast lookup
  const selectedKeySet = useMemo(() => {
    return new Set(selectedCards.map((c) => c.uniqueKey));
  }, [selectedCards]);

  const progressPercent = Math.min(100, Math.round((selectedCards.length / maxCards) * 100));

  // Toggle selection of a card
  const handleToggleCard = (item: SpotlightSelectedItem) => {
    if (selectedKeySet.has(item.uniqueKey)) {
      // Remove
      onChangeSelected(selectedCards.filter((c) => c.uniqueKey !== item.uniqueKey));
    } else {
      // Add
      if (selectedCards.length >= maxCards) {
        alert(`Selection limit reached! Maximum ${maxCards} cards allowed. Please remove a card first.`);
        return;
      }
      onChangeSelected([...selectedCards, item]);
    }
  };

  // Reordering helpers
  const moveCard = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedCards.length) return;
    const reordered = [...selectedCards];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    onChangeSelected(reordered);
  };

  const removeCard = (index: number) => {
    const updated = [...selectedCards];
    updated.splice(index, 1);
    onChangeSelected(updated);
  };

  // Callback when a new editorial card is created
  const handleEditorialCreated = async (newCard: SpotlightEditorialCard) => {
    await onRefreshEditorialCards();
    // Auto-select if room remains
    if (selectedCards.length < maxCards) {
      const newItem: SpotlightSelectedItem = {
        uniqueKey: `editorial:${newCard.id}`,
        cardType: "editorial",
        editorialCardId: newCard.id,
        title: newCard.title,
        subtitle: newCard.subtitle || undefined,
        image: newCard.image_url,
        fromPrice: (newCard.price_mode === "manual" ? newCard.manual_from_price : newCard.calculated_from_price) || undefined,
        destinationUrl: newCard.destination_url,
        badge: "EDITORIAL DROP",
      };
      if (!selectedKeySet.has(newItem.uniqueKey)) {
        onChangeSelected([...selectedCards, newItem]);
      }
    }
  };

  // Filtered Seller Products
  const filteredSellerCards = useMemo(() => {
    return sellerProducts
      .filter((p) => {
        // Only active and approved products
        if (p.is_active === false || p.is_approved === false || p.approval_status === "rejected") {
          return false;
        }
        if (categoryFilter !== "all" && String(p.category_id) !== String(categoryFilter)) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (p.name || "").toLowerCase().includes(q);
          const matchBrand = (p.brand || "").toLowerCase().includes(q);
          const matchSeller = (p.seller_name || "").toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchSeller) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
        if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
        if (sortBy === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        // Popular: stock/sales weight
        return (b.stock || 0) - (a.stock || 0);
      })
      .map((p) => ({
        uniqueKey: `seller_product:${p.id}`,
        cardType: "seller_product" as const,
        productId: String(p.id),
        title: p.name,
        subtitle: p.seller_name || p.brand || "Official Seller",
        image: p.image || p.thumbnail_url || p.image_url || "",
        price: Number(p.price),
        destinationUrl: `/products/${p.id}`,
        badge: "SELLER PRODUCT",
      }));
  }, [sellerProducts, categoryFilter, searchQuery, sortBy]);

  // Filtered Editorial Cards
  const filteredEditorialCards = useMemo(() => {
    return editorialCards
      .filter((e) => {
        if (e.is_active === false) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (e.title || "").toLowerCase().includes(q);
          const matchSub = (e.subtitle || "").toLowerCase().includes(q);
          if (!matchTitle && !matchSub) return false;
        }
        return true;
      })
      .map((e) => ({
        uniqueKey: `editorial:${e.id}`,
        cardType: "editorial" as const,
        editorialCardId: String(e.id),
        title: e.title,
        subtitle: e.subtitle || undefined,
        image: e.image_url,
        fromPrice: (e.price_mode === "manual" ? e.manual_from_price : e.calculated_from_price) || undefined,
        destinationUrl: e.destination_url,
        badge: "ADMIN EDITORIAL",
      }));
  }, [editorialCards, searchQuery]);

  // Unified Card Grid depending on active tab
  const displayedCards = useMemo(() => {
    if (activeTab === "seller") return filteredSellerCards;
    if (activeTab === "editorial") return filteredEditorialCards;
    // 'all': Interleave or combine both
    return [...filteredEditorialCards, ...filteredSellerCards];
  }, [activeTab, filteredSellerCards, filteredEditorialCards]);

  return (
    <div className="space-y-6">
      {/* 1. SELECTION PROGRESS BAR & COUNTER */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                SELECT PRODUCTS & EDITORIAL CARDS
              </span>
              <span className="text-[10px] font-mono text-zinc-500">UNIFIED SELECTION</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                Selected: {selectedCards.length} / {maxCards}
              </span>
              {selectedCards.length === maxCards ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                  ✓ READY TO PUBLISH
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-bold">
                  ({maxCards - selectedCards.length} more required for Top Deals)
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-zinc-400">
              {progressPercent}% Complete
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
          <div
            className={`h-full transition-all duration-300 ${
              selectedCards.length === maxCards
                ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-white"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. ORDERED SELECTED CARDS TRAY */}
      {selectedCards.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-white" />
              <span>Selected Cards Sequence ({selectedCards.length}) — Drag / Reorder</span>
            </h3>
            <button
              type="button"
              onClick={() => onChangeSelected([])}
              className="text-[11px] font-bold text-zinc-500 hover:text-rose-400 transition"
            >
              Clear All Selected
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 no-scrollbar">
            {selectedCards.map((card, idx) => (
              <div
                key={card.uniqueKey}
                className="relative w-44 shrink-0 rounded-2xl bg-zinc-900 border border-zinc-800 p-2.5 space-y-2 group shadow-md"
              >
                {/* Badge & Order Number */}
                <div className="flex items-center justify-between text-[10px] font-black">
                  <span className="text-white font-mono bg-zinc-800 px-2 py-0.5 rounded-md">
                    #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                      card.cardType === "seller_product"
                        ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    }`}
                  >
                    {card.cardType === "seller_product" ? "SELLER" : "EDITORIAL"}
                  </span>
                </div>

                {/* Card Thumbnail */}
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
                  <img
                    src={card.image || "/official-logo.png"}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeCard(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-white hover:bg-rose-600 transition"
                    title="Remove from selection"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Title & Price */}
                <div>
                  <h4 className="text-xs font-black uppercase text-white truncate">{card.title}</h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                    {card.price !== undefined ? (
                      <span className="font-bold text-white">₹{card.price}</span>
                    ) : card.fromPrice !== undefined ? (
                      <span className="font-bold text-emerald-400">From ₹{card.fromPrice}</span>
                    ) : null}
                    <span className="text-[9px] text-zinc-500 truncate max-w-[80px]">
                      {card.subtitle}
                    </span>
                  </div>
                </div>

                {/* Reorder Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => moveCard(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition"
                    title="Move Left"
                  >
                    <ArrowUp className="w-3 h-3 -rotate-90" />
                  </button>
                  <span className="text-[9px] font-mono text-zinc-500">Order</span>
                  <button
                    type="button"
                    onClick={() => moveCard(idx, "down")}
                    disabled={idx === selectedCards.length - 1}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition"
                    title="Move Right"
                  >
                    <ArrowDown className="w-3 h-3 -rotate-90" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. NEW UNIFIED PICKER LAYOUT (Tabs ABOVE Card Grid) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6">
        {/* Three Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "all"
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              [ All Cards ]
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("editorial")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "editorial"
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              [ Editorial Card ]
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("seller")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "seller"
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              [ Seller Products ]
            </button>
          </div>

          {/* Tab 2 Special Action: + Create Editorial Card */}
          {activeTab === "editorial" && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Editorial Card</span>
            </button>
          )}
        </div>

        {/* Filters & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or editorial cards..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="popular">Popular Discovery</option>
              <option value="newest">Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* 4. UNIFIED SELECTABLE CARD GRID */}
        {displayedCards.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
            <p className="text-xs font-bold text-zinc-400">No cards found matching your search or filter.</p>
            {activeTab === "editorial" && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Editorial Card</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayedCards.map((card) => {
              const isSelected = selectedKeySet.has(card.uniqueKey);
              const cardIndex = selectedCards.findIndex((c) => c.uniqueKey === card.uniqueKey);

              return (
                <div
                  key={card.uniqueKey}
                  onClick={() => handleToggleCard(card)}
                  className={`group relative rounded-2xl bg-zinc-900 border p-2.5 space-y-2 cursor-pointer transition-all select-none ${
                    isSelected
                      ? "border-white ring-2 ring-white/50 bg-white/5 shadow-xl shadow-white/5"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  {/* Card Type Badge & Checkbox */}
                  <div className="flex items-center justify-between text-[9px] font-black">
                    <span
                      className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        card.cardType === "seller_product"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {card.cardType === "seller_product" ? "SELLER" : "EDITORIAL"}
                    </span>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-white text-black font-black text-xs shadow-md"
                          : "border border-zinc-700 bg-zinc-950 text-transparent group-hover:border-white"
                      }`}
                    >
                      {isSelected ? `#${cardIndex + 1}` : <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Image (3:4 aspect ratio) */}
                  <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
                    <img
                      src={card.image || "/official-logo.png"}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Metadata */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-white truncate" title={card.title}>
                      {card.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 truncate">{card.subtitle}</p>
                    <div className="mt-1 flex items-center justify-between text-xs font-black">
                      {card.cardType === "seller_product" ? (
                        <span className="text-white">₹{card.price}</span>
                      ) : card.fromPrice ? (
                        <span className="text-emerald-400">From ₹{card.fromPrice}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editorial Card Creation Modal */}
      <CreateEditorialCardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleEditorialCreated}
        categories={categories}
      />
    </div>
  );
}
