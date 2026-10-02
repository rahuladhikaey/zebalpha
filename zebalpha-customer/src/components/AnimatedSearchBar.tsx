"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSearchProducts } from "@/hooks/useCatalogQueries";

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
    <Suspense fallback={<div className="h-10 w-full max-w-md bg-neutral-900 rounded-2xl animate-pulse" />}>
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
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  const hasResults = Array.isArray(searchResults) && searchResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-1.5 focus-within:border-white focus-within:bg-black transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="pl-3 pr-2 flex items-center justify-center">
          <Search strokeWidth={2.2} className="w-5 h-5 text-neutral-400" />
        </div>
        
        <div className="flex-1 relative h-9 flex items-center">
          {!inputValue && (
            <div className="absolute inset-0 flex items-center pointer-events-none text-neutral-500 text-sm font-medium tracking-wide">
              Search "{displayText}"<span className="animate-pulse text-white font-bold">|</span>
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
            className="w-full h-full bg-transparent border-none outline-none text-white text-sm z-10 pr-2 font-medium"
          />
        </div>

        <button 
          onClick={handleSearch}
          aria-label="Submit Search"
          className="flex items-center justify-center px-3 py-1.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all active:scale-95 shrink-0"
        >
          Find
        </button>
      </div>

      {/* Live Debounced Search Autocomplete & Preview (Section 11) */}
      {isOpen && inputValue.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Quick Results
            </span>
            {isLoading && <span className="text-neutral-500 animate-pulse">Searching...</span>}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-800/50">
            {hasResults ? (
              searchResults.slice(0, 5).map((prod: any) => (
                <Link
                  key={prod.id}
                  href={`/products/${prod.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-neutral-800/60 transition-colors group"
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                    <Image
                      src={prod.image_url || prod.thumbnail_url || '/placeholder.png'}
                      alt={prod.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-neutral-200">
                      {prod.name}
                    </p>
                    <p className="text-xs text-neutral-400 font-medium">
                      ₹{prod.price} {prod.brand && `• ${prod.brand}`}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))
            ) : !isLoading ? (
              <div className="p-4 text-center text-xs text-neutral-500">
                No products found for "{inputValue}"
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSearch}
            className="w-full p-2.5 bg-neutral-950 text-center text-xs font-bold text-white uppercase tracking-wider hover:bg-neutral-800 transition-colors border-t border-neutral-800"
          >
            View all results for "{inputValue}" →
          </button>
        </div>
      )}
    </div>
  );
}
