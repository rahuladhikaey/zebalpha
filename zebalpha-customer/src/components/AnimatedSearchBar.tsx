"use client";

import { useState, useEffect, Suspense } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const [displayText, setDisplayText] = useState("");
  const [itemIndex, setItemIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inputValue, setInputValue] = useState("");

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
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex items-center w-full max-w-md bg-neutral-900/90 rounded-2xl border border-neutral-800 p-1.5 focus-within:border-white focus-within:bg-black transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
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
          onChange={(e) => setInputValue(e.target.value)}
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
  );
}
