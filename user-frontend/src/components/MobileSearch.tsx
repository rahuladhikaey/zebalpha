"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

const searchItems = ["Coffee", "Smaks", "Dal's", "Tea", "Grocery.."];

export function MobileSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isBrandMode, setIsBrandMode] = useState(false);

  useEffect(() => {
    setIsBrandMode(searchParams.get("brand") === "asaliswad");
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % searchItems.length);
    }, 1000); 
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    if (inputValue.trim() !== "") {
      router.push(`/products?search=${inputValue.trim()}${isBrandMode ? '&brand=asaliswad' : ''}`);
    } else if (isBrandMode) {
      router.push(`/products?brand=asaliswad`);
    } else {
      router.push(`/products`);
    }
  };

  const toggleBrandMode = () => {
    const newMode = !isBrandMode;
    setIsBrandMode(newMode);
    
    const params = new URLSearchParams(window.location.search);
    if (newMode) {
      params.set("brand", "asaliswad");
    } else {
      params.delete("brand");
    }
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className="mt-6 flex w-full flex-col gap-4">
      {/* Modern Premium Search Bar */}
      <div className="relative flex w-full items-center rounded-3xl border border-slate-100 bg-white px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all focus-within:shadow-[0_8px_30px_rgb(34,197,94,0.15)] focus-within:border-emerald-200">
        <Search className="mr-3 h-6 w-6 text-emerald-500 flex-shrink-0" />
        
        <div className="relative flex-1 h-6 overflow-hidden flex items-center">
          {/* Animated Placeholders */}
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
                <span className="text-slate-400 text-sm font-semibold tracking-wide">
                  Search "{item}"
                </span>
              </div>
            );
          })}
          
          <input 
            id="mobile-search"
            aria-label="Search items"
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none relative z-10 pr-2" 
          />
        </div>

        {/* Brand Mode Toggle Switch */}
        <div className="flex flex-col items-center justify-center border-l border-slate-100 pl-3">
          <span className="text-[8px] font-black uppercase text-emerald-800 mb-0.5 tracking-wider">
            {isBrandMode ? "Asaliswad" : "All Brands"}
          </span>
          <button
            onClick={toggleBrandMode}
            className={`relative flex h-[24px] w-[44px] items-center rounded-full transition-colors ${
              isBrandMode ? "bg-emerald-500" : "bg-slate-200"
            }`}
            aria-label="Toggle Brand Mode"
          >
            <span
              className={`flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                isBrandMode ? "translate-x-5" : "translate-x-[2px]"
              }`}
            >
              {/* Brand Symbol (Simple checkmark when active) */}
              {isBrandMode ? (
                <span className="text-emerald-500 text-[12px] font-bold">✓</span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
