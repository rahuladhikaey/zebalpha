"use client";

import { useState, useEffect, Suspense } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const searchItems = ["snack", "dal", "Grocery's", "Coffee", "Spices", "Rice"];

export default function AnimatedSearchBar() {
  return (
    <Suspense fallback={<div className="h-10 w-full max-w-md bg-white rounded-2xl animate-pulse" />}>
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
  const [isBrandMode, setIsBrandMode] = useState(false);

  useEffect(() => {
    setIsBrandMode(searchParams?.get("brand") === "asaliswad");
  }, [searchParams]);

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
      }, 50); // deletion speed
    } else {
      if (displayText === currentItem) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1000); // 1s pause as requested
      } else {
        timer = setTimeout(() => {
          setDisplayText(currentItem.substring(0, displayText.length + 1));
        }, 100); // typing speed
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, itemIndex, isDeleting]);

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

  const handleSearch = () => {
    const query = inputValue.trim() || searchItems[itemIndex];
    router.push(`/products?search=${encodeURIComponent(query)}${isBrandMode ? '&brand=asaliswad' : ''}`);
  };

  return (
    <div className="flex items-center w-full max-w-md bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-2 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:border-green-200 transition-all duration-300">
      <div className="pl-3 pr-2 flex items-center justify-center">
        <Search strokeWidth={2.5} className="w-6 h-6 text-[#22C55E]" />
      </div>
      
      <div className="flex-1 relative h-10 flex items-center">
        {!inputValue && (
          <div className="absolute inset-0 flex items-center pointer-events-none text-[#9CA3AF] text-[17px] font-medium tracking-wide">
            Search "{displayText}"<span className="animate-[pulse_1s_ease-in-out_infinite] opacity-60">|</span>
          </div>
        )}
        <input 
          id="desktop-search"
          aria-label="Search items"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="w-full h-full bg-transparent border-none outline-none text-gray-800 text-[17px] z-10 pr-2"
        />
      </div>

      {/* Brand Mode Toggle Switch */}
      <div className="flex flex-col items-center justify-center ml-2 pr-3 border-r border-gray-100">
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
            className={`flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
              isBrandMode ? "translate-x-5" : "translate-x-[2px]"
            }`}
          >
            {/* Brand Symbol (Simple checkmark when active) */}
            {isBrandMode ? (
              <span className="text-emerald-500 text-[10px] font-bold">✓</span>
            ) : (
              <span className="h-1 w-1 rounded-full bg-slate-400"></span>
            )}
          </span>
        </button>
      </div>

      <button 
        onClick={handleSearch}
        aria-label="Submit Search"
        className="flex items-center justify-center pr-1 shrink-0"
      >
        <div className="relative flex items-center w-12 h-[38px] border-[1.5px] border-gray-200 rounded-[10px] bg-white hover:bg-gray-50 transition-colors cursor-pointer">
          {/* Track */}
          <div className="absolute right-[8px] w-4 h-[4px] bg-[#E5E7EB] rounded-full"></div>
          {/* Thumb */}
          <div className="absolute left-[4px] w-[26px] h-[26px] border-[2px] border-[#22C55E] rounded-[7px] flex items-center justify-center bg-white shadow-sm">
            <div className="w-[10px] h-[10px] bg-[#22C55E] rounded-full"></div>
          </div>
        </div>
      </button>
    </div>
  );
}
