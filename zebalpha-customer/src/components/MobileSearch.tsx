"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, ArrowRight, Sparkles, Camera, Mic } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchProducts } from "@/hooks/useCatalogQueries";
import { trackRecommendationEvent } from "@/lib/recommendationClient";
import { useIsNativeApp } from "@/lib/platform";

const searchItems = ["T-Shirts, Hoodies, Shoes", "Oversized Tees", "Polos", "Streetwear", "Joggers"];

export function MobileSearch({ className }: { className?: string } = {}) {
  const router = useRouter();
  const isNativeApp = useIsNativeApp();
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % searchItems.length);
    }, 1500); 
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    setIsOpen(false);
    if (inputValue.trim() !== "") {
      if (inputValue.trim().length >= 2) {
        trackRecommendationEvent({
          eventType: "product_searched",
          searchQuery: inputValue.trim(),
        }).catch(() => {});
      }
      router.push(`/products?search=${encodeURIComponent(inputValue.trim())}`);
    } else {
      router.push(`/products`);
    }
  };

  const hasResults = Array.isArray(searchResults) && searchResults.length > 0;

  const handleVoiceSearch = () => {
    setVoiceNote(null);
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceNote("Type to search or tap camera for Try-On");
      inputRef.current?.focus();
      setTimeout(() => setVoiceNote(null), 2600);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        setIsListening(false);
        if (transcript) {
          setInputValue(transcript);
          setIsOpen(false);
          trackRecommendationEvent({
            eventType: "product_searched",
            searchQuery: transcript,
          }).catch(() => {});
          router.push(`/products?search=${encodeURIComponent(transcript)}`);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.start();
    } catch {
      setIsListening(false);
      inputRef.current?.focus();
    }
  };

  if (isNativeApp) {
    return (
      <div ref={containerRef} className={className || "relative flex w-full flex-col min-h-[50px]"}>
        <div className="relative flex w-full h-[50px] items-center rounded-full border-[1.5px] border-[#DFBE6F] bg-[#FFFDF8] pl-4 pr-2.5 shadow-[0_6px_18px_rgba(166,124,28,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all focus-within:border-[#B8800C] focus-within:shadow-[0_6px_22px_rgba(184,128,12,0.2)]">
          <Search className="mr-2.5 h-5 w-5 text-[#14120F] flex-shrink-0 stroke-[2.2]" />

          <div className="relative flex-1 h-7 overflow-hidden flex items-center">
            {!inputValue &&
              searchItems.map((item, i) => {
                const isActive = i === index;
                const isPrev = i === (index - 1 + searchItems.length) % searchItems.length;

                return (
                  <div
                    key={item}
                    className={`absolute left-0 w-full transition-all duration-500 ease-in-out pointer-events-none truncate ${
                      isActive
                        ? "opacity-100 translate-y-0"
                        : isPrev
                          ? "opacity-0 -translate-y-4"
                          : "opacity-0 translate-y-4"
                    }`}
                  >
                    <span className="text-[#6E624D] text-[13.5px] font-medium tracking-tight">
                      Search for {item}...
                    </span>
                  </div>
                );
              })}

            <input
              ref={inputRef}
              id="mobile-search"
              aria-label="Search clothing items"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleSearch}
              className="w-full bg-transparent text-[14px] font-semibold text-[#14120F] outline-none relative z-10 pr-2"
            />
          </div>

          {/* Right Quick Utilities: Virtual Try-On Camera | Voice Mic */}
          <div className="flex items-center gap-1 shrink-0 pl-1">
            {inputValue.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleSearch()}
                className="mr-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#FBE28A] to-[#D99B16] text-[11px] font-black text-[#111111] shadow-sm active:scale-95"
              >
                Go
              </button>
            )}
            <Link
              href="/virtual-try-on"
              aria-label="Virtual Try-On Camera"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#14120F] hover:bg-[#FAF0D1] transition-colors active:scale-90"
            >
              <Camera className="h-[18px] w-[18px] stroke-[2]" />
            </Link>
            <span className="h-4 w-[1px] bg-[#E5CE8E]" aria-hidden="true" />
            <button
              type="button"
              onClick={handleVoiceSearch}
              aria-label={isListening ? "Listening for voice search" : "Voice Search"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 ${
                isListening
                  ? "bg-gradient-to-br from-[#FDE047] to-[#D97706] text-[#111111] animate-pulse shadow-sm"
                  : "text-[#14120F] hover:bg-[#FAF0D1]"
              }`}
            >
              <Mic className="h-[18px] w-[18px] stroke-[2]" />
            </button>
          </div>
        </div>

        {voiceNote && (
          <p className="mt-1 px-3 text-[10px] font-semibold text-[#8E6208]">{voiceNote}</p>
        )}

        {isOpen && inputValue.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#FFFDF8] border border-[#DFBE6F] rounded-2xl shadow-[0_18px_40px_rgba(140,95,12,0.18)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2.5 border-b border-[#EFE1BE] flex items-center justify-between text-[11px] text-[#6B5D44]">
              <span className="flex items-center gap-1 font-bold">
                <Sparkles className="w-3 h-3 text-[#C68A12]" /> Suggestions
              </span>
              {isLoading && <span className="text-[#8E6208] animate-pulse">Loading...</span>}
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-[#F3E8CB]">
              {hasResults ? (
                searchResults.slice(0, 4).map((prod: { id: string; name: string; price: number; image_url?: string; thumbnail_url?: string }) => (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 hover:bg-[#FAF1D6] transition-colors group"
                  >
                    <div className="relative w-8 h-8 rounded-md overflow-hidden bg-[#F7EED7] flex-shrink-0 border border-[#E7CF94]">
                      <Image
                        src={prod.image_url || prod.thumbnail_url || "/placeholder.png"}
                        alt={prod.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#14120F] truncate">{prod.name}</p>
                      <p className="text-[10px] text-[#7A673E] font-bold">₹{prod.price}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8E6208]" />
                  </Link>
                ))
              ) : !isLoading ? (
                <div className="p-3 text-center text-xs text-[#6B5D44]">No items matching &quot;{inputValue}&quot;</div>
              ) : null}
            </div>

            <button
              onClick={() => handleSearch()}
              className="w-full p-2.5 bg-[#FAF2DC] text-center text-[11px] font-black text-[#14120F] uppercase tracking-wider hover:bg-[#F5E4B8] transition-colors border-t border-[#EFE1BE]"
            >
              See all for &quot;{inputValue}&quot; →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className || "relative flex w-full flex-col min-h-[54px]"}>
      <div className="relative flex w-full h-[56px] sm:h-[58px] items-center rounded-full border-[2px] border-amber-400/95 bg-black/95 pl-4 pr-2 shadow-[0_0_24px_rgba(251,191,36,0.5),inset_0_0_14px_rgba(245,158,11,0.18)] transition-all focus-within:border-amber-300 focus-within:shadow-[0_0_30px_rgba(251,191,36,0.7)]">
        {/* Specular golden edge highlights */}
        <div className="absolute inset-x-8 -top-[1px] h-[1.5px] bg-gradient-to-r from-transparent via-amber-200 to-transparent pointer-events-none" />
        <div className="absolute inset-x-12 -bottom-[1px] h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

        <Search className="mr-3 h-5 w-5 sm:h-6 sm:w-6 text-amber-400 flex-shrink-0 stroke-[2.4]" />
        
        <div className="relative flex-1 h-7 overflow-hidden flex items-center">
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
                <span className="text-zinc-300 text-[15px] sm:text-base font-normal tracking-wide">
                  Search &quot;{item}&quot;
                </span>
              </div>
            );
          })}
          
          <input 
            ref={inputRef}
            id="mobile-search"
            aria-label="Search clothing items"
            type="text" 
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleSearch}
            className="w-full bg-transparent text-[15px] sm:text-base font-medium text-white outline-none relative z-10 pr-2" 
          />
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          className="ml-2 px-6 sm:px-7 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#fae59a] via-[#f3bc4c] to-[#d69022] border border-amber-200/90 text-black text-sm sm:text-base font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_18px_rgba(243,188,76,0.65),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center shrink-0 cursor-pointer"
        >
          GO
        </button>
      </div>

      {/* Live Debounced Search Autocomplete & Preview (Section 11) */}
      {isOpen && inputValue.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2.5 border-b border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-yellow-400" /> Suggestions
            </span>
            {isLoading && <span className="text-neutral-500 animate-pulse">Loading...</span>}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-neutral-800/50">
            {hasResults ? (
              searchResults.slice(0, 4).map((prod: any) => (
                <Link
                  key={prod.id}
                  href={`/products/${prod.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 hover:bg-neutral-800/60 transition-colors group"
                >
                  <div className="relative w-8 h-8 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0">
                    <Image
                      src={prod.image_url || prod.thumbnail_url || '/placeholder.png'}
                      alt={prod.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-neutral-200">
                      {prod.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-medium">
                      ₹{prod.price}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
                </Link>
              ))
            ) : !isLoading ? (
              <div className="p-3 text-center text-xs text-neutral-500">
                No items matching "{inputValue}"
              </div>
            ) : null}
          </div>

          <button
            onClick={() => handleSearch()}
            className="w-full p-2 bg-neutral-950 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-neutral-800 transition-colors border-t border-neutral-800"
          >
            See all for "{inputValue}" →
          </button>
        </div>
      )}
    </div>
  );
}
