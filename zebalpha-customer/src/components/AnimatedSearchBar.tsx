"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Search, ArrowRight, Store, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSearchProducts, useStoreSearch } from "@/hooks/useCatalogQueries";
import { trackRecommendationEvent } from "@/lib/recommendationClient";

const searchItems = [
  "Premium Polos",
  "Oversized T-Shirts",
  "Streetwear Hoodies",
  "Casual Zip Collars",
  "Relaxed Fit Tees",
  "Urban Bottoms"
];

export default function AnimatedSearchBar() {
  return (
    <Suspense fallback={<div className="h-10 w-full max-w-md bg-[#FAF2DC] border border-[#E4C988] rounded-full animate-pulse" />}>
      <AnimatedSearchBarContent />
    </Suspense>
  );
}

function AnimatedSearchBarContent() {
  const router = useRouter();
  const [displayText, setDisplayText] = useState("");
  const [itemIndex, setItemIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // TanStack Query L1 + Redis L2 debounced live search hook (300ms debounce)
  const { data: searchResults = [], isLoading } = useSearchProducts(inputValue);
  const { data: storeSearchData } = useStoreSearch(inputValue, {
    includeProducts: false,
    logSearch: false,
  });
  const matchedStores = storeSearchData?.matchedStores || [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentItem = searchItems[itemIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayText(currentItem.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setItemIndex((prev) => (prev + 1) % searchItems.length);
        }
      }, 40);
    } else {
      if (displayText === currentItem) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1200);
      } else {
        timer = setTimeout(() => {
          setDisplayText(currentItem.substring(0, displayText.length + 1));
        }, 80);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, itemIndex, isDeleting]);

  const handleSearch = () => {
    const query = inputValue.trim() || searchItems[itemIndex];
    setIsOpen(false);
    if (query.trim().length >= 2) {
      trackRecommendationEvent({
        eventType: "product_searched",
        searchQuery: query.trim(),
      }).catch(() => {});
    }
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  const hasResults = Array.isArray(searchResults) && searchResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center w-full bg-[#FFFDF8] rounded-full border-[1.5px] border-[#DFBE6F] p-1.5 focus-within:border-[#B8800C] focus-within:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all duration-300 shadow-[0_4px_14px_rgba(120,20,25,0.22),inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="pl-3 pr-2 flex items-center justify-center">
          <Search strokeWidth={2.3} className="w-4 h-4 text-[#9A6503]" />
        </div>
        
        <div className="flex-1 relative h-8 flex items-center">
          {!inputValue && (
            <div className="absolute inset-0 flex items-center pointer-events-none text-[#6E624D] text-sm font-semibold tracking-wide truncate">
              Search &quot;{displayText}&quot;<span className="animate-pulse text-[#B8800C] font-bold">|</span>
            </div>
          )}
          <input 
            id="desktop-search"
            aria-label="Search clothing items"
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="w-full h-full bg-transparent border-none outline-none text-[#14120F] text-sm z-10 pr-2 font-semibold"
          />
        </div>

        <button 
          type="button"
          onClick={handleSearch}
          aria-label="Submit Search"
          className="flex items-center justify-center px-4 py-1.5 rounded-full bg-gradient-to-b from-[#FCE89C] via-[#F2C34B] to-[#DDA216] border border-[#C68A12]/70 text-[#111111] text-xs font-black uppercase tracking-wider hover:brightness-105 transition-all active:scale-95 shadow-[0_2px_10px_rgba(202,138,4,0.3)] shrink-0 cursor-pointer"
        >
          GO
        </button>
      </div>

      {/* Live Debounced Search Autocomplete & Preview (Section 11) */}
      {isOpen && inputValue.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#FFFDF8] border border-[#DFBE6F] rounded-2xl shadow-[0_18px_42px_rgba(92,65,12,0.2)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-[#EDE0BF] bg-[#FAF2DC]/60 flex items-center justify-between text-xs text-[#6E624D]">
            <span className="flex items-center gap-1.5 font-bold text-[#14120F]">
              Quick Results
            </span>
            {isLoading && <span className="text-[#9A6503] font-semibold animate-pulse">Searching...</span>}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#EDE0BF]/80">
            {matchedStores.length > 0 && (
              <div className="bg-[#FFF9E6]/85 p-2 space-y-1.5">
                <p className="px-1.5 text-[10px] font-black uppercase tracking-wider text-[#9A6503] flex items-center gap-1">
                  <Store className="w-3 h-3" /> Verified Official Stores
                </p>
                {matchedStores.map((st) => (
                  <Link
                    key={st.id}
                    href={`/store/${st.store_slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E4C988] bg-white p-2.5 hover:border-[#C68A12] hover:bg-[#FFFDF8] transition-all group"
                  >
                    <div className="h-9 w-9 rounded-lg overflow-hidden bg-[#FFF8DB] border border-[#E4C988] flex items-center justify-center shrink-0 text-[#9A6503]">
                      {st.business_logo_url ? (
                        <img
                          src={st.business_logo_url}
                          alt={st.business_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-[#14120F] truncate group-hover:text-[#9A6503]">
                          {st.business_name}
                        </p>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[10px] font-semibold text-[#6E624D] truncate">
                        {st.city ? `${st.city} • ` : ""}Visit Official Mini-Storefront
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#FAF2DC] border border-[#DFBE6F] px-2.5 py-1 text-[10px] font-black text-[#14120F]">
                      Visit Store →
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {hasResults ? (
              searchResults.slice(0, 5).map((prod: any) => (
                <Link
                  key={prod.id}
                  href={`/products/${prod.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-[#FAF2DC]/75 transition-colors group"
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#FAF2DC] border border-[#E4C988]/70 flex-shrink-0">
                    <Image
                      src={prod.image_url || prod.thumbnail_url || '/placeholder.png'}
                      alt={prod.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#14120F] truncate group-hover:text-[#9A6503] transition-colors">
                      {prod.name}
                    </p>
                    <p className="text-xs text-[#6E624D] font-semibold">
                      ₹{prod.price} {prod.brand && `• ${prod.brand}`}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9A6503] group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))
            ) : !isLoading && matchedStores.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6E624D] font-medium">
                No products found for &quot;{inputValue}&quot;
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSearch}
            className="w-full p-2.5 bg-[#FAF2DC] text-center text-xs font-black text-[#14120F] uppercase tracking-wider hover:bg-[#F3E2B3] transition-colors border-t border-[#E4C988] cursor-pointer"
          >
            View all results for &quot;{inputValue}&quot; →
          </button>
        </div>
      )}
    </div>
  );
}
