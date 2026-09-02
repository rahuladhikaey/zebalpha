"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

const searchItems = ["Polos", "Oversized Tees", "Hoodies", "Smart Casuals", "Streetwear", "Joggers"];

export function MobileSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % searchItems.length);
    }, 1500); 
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    if (inputValue.trim() !== "") {
      router.push(`/products?search=${encodeURIComponent(inputValue.trim())}`);
    } else {
      router.push(`/products`);
    }
  };

  return (
    <div className="mt-4 flex w-full flex-col">
      <div className="relative flex w-full items-center rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-2.5 shadow-xl transition-all focus-within:border-white focus-within:bg-black">
        <Search className="mr-2.5 h-5 w-5 text-neutral-400 flex-shrink-0" />
        
        <div className="relative flex-1 h-6 overflow-hidden flex items-center">
          {!inputValue && searchItems.map((item, i) => {
            const isActive = i === index;
            const isPrev = i === (index - 1 + searchItems.length) % searchItems.length;
            
            return (
              <div
                key={item}
                className={`absolute left-0 w-full transition-all duration-500 ease-in-out pointer-events-none ${
                  isActive 
                    ? "opacity-100 translate-y-0" 
                    : isPrev
                      ? "opacity-0 -translate-y-4"
                      : "opacity-0 translate-y-4"
                }`}
              >
                <span className="text-neutral-500 text-xs font-semibold tracking-wide">
                  Search "{item}"
                </span>
              </div>
            );
          })}
          
          <input 
            id="mobile-search"
            aria-label="Search clothing items"
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-transparent text-xs font-semibold text-white outline-none relative z-10 pr-2" 
          />
        </div>

        <button
          onClick={() => handleSearch()}
          className="ml-2 px-3 py-1 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-wider hover:bg-neutral-200 transition-all active:scale-95"
        >
          Go
        </button>
      </div>
    </div>
  );
}
