"use client";

import React, { useState, useEffect } from "react";
import { Product } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";
import { Search, X, Shirt, Loader2, Sparkles } from "lucide-react";

interface TryAnotherProductDrawerProps {
  currentProductId: string | number;
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bprkenwmheakcqryjupi.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR"
);

export function TryAnotherProductDrawer({
  currentProductId,
  onSelectProduct,
  onClose,
}: TryAnotherProductDrawerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApparelProducts() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .limit(24);

        if (!error && data) {
          setProducts(data as Product[]);
        }
      } catch (err) {
        console.error("Failed to load catalog products:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchApparelProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full space-y-4 max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Shirt className="text-white" size={18} />
          <h3 className="text-base font-black text-white">Select Product to Try On</h3>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input
          type="text"
          placeholder="Search T-shirts, hoodies, jackets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white transition"
        />
      </div>

      {/* Products Grid */}
      <div className="overflow-y-auto pr-1 space-y-2 max-h-[50vh] no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-3">
            <Loader2 className="animate-spin text-white" size={24} />
            <p className="text-xs font-bold">Loading clothing catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No products found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((p) => {
              const isCurrent = String(p.id) === String(currentProductId);
              const img = p.virtual_tryon_image || p.images?.[0] || p.image_url;

              return (
                <div
                  key={p.id}
                  onClick={() => !isCurrent && onSelectProduct(p)}
                  className={`group relative rounded-2xl p-2.5 flex flex-col border transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-zinc-900/50 border-zinc-700 opacity-60 pointer-events-none"
                      : "bg-zinc-950 border-zinc-800 hover:border-white hover:bg-zinc-900 active:scale-95"
                  }`}
                >
                  <div className="aspect-square w-full rounded-xl bg-zinc-900 p-2 flex items-center justify-center overflow-hidden mb-2">
                    <img
                      src={img}
                      alt={p.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-zinc-200">
                    {p.name}
                  </h4>
                  <p className="text-[11px] font-extrabold text-zinc-400 mt-0.5">₹{p.price}</p>

                  {isCurrent ? (
                    <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                      Currently Wearing
                    </span>
                  ) : (
                    <span className="mt-1.5 flex items-center justify-center gap-1 py-1 rounded-lg bg-zinc-900 group-hover:bg-white group-hover:text-black text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-colors">
                      <Sparkles size={10} /> Try This
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
