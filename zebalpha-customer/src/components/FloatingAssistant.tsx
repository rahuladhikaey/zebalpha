"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowRight,
  Flame,
  Mic,
  Send,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useIsNativeApp, useOfficialTheme } from "@/lib/platform";
import { VoiceSearchSheet, useVoiceSearch } from "@/components/VoiceSearchSheet";
import { Product } from "@/lib/types";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

type AssistantQuickLink = {
  label: string;
  href: string;
};

type RecommendedItem = Product & {
  rating?: number;
  review_count?: number;
  order_count?: number;
  match_reason?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: RecommendedItem[];
  quickLinks?: AssistantQuickLink[];
  voiceLang?: "bn-IN" | "hi-IN" | "en-IN";
};

const QUICK_OPTIONS = [
  { label: "৫০০ টাকার টি-শার্ট", query: "৫০০ টাকার মধ্যে ভালো টি-শার্ট দেখাও" },
  { label: "Hoodie Under ₹500", query: "500 ke andar black hoodie dikhao" },
  { label: "Oversized Tee ₹600", query: "College wear oversized tee under 600" },
  { label: "Top Rated Kurtis", query: "Best rated kurtis dikhao" },
  { label: "📦 Track Order", query: "Where is my order? Track order" },
  { label: "🔄 5-Day Return", query: "What is your 5-day return policy?" },
];

const INITIAL_WELCOME = `👋 Welcome to **ZEBALPHA**!

I’m **Alpha AI** — your 24/7 Shopping Assistant (**বাংলা • हिन्दी • English**).

Type or tap the **Mic** to ask:
• *"৫০০ টাকার মধ্যে ভালো টি-শার্ট দেখাও"*
• *"500 ke andar black hoodie dikhao"*
• *"College wear oversized tee under 600"*

I show real matching products ranked by **ratings & high orders** — never random items!`;

function cleanSpeechText(raw: string): string {
  return raw
    .replace(/\*\*/g, "")
    .replace(/[*_`#•👇👋📦🔄💳👨‍💼🔥★]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInlineBold(line: string, boldClass: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className={boldClass}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export default function FloatingAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "floating-welcome",
      role: "assistant",
      content: INITIAL_WELCOME,
      voiceLang: "en-IN",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const isNativeApp = useIsNativeApp();
  const isOfficialTheme = useOfficialTheme();
  const pathname = usePathname();
  const {
    onboardingLanguageCompleted,
    onboardingCompleted,
    isGuestMode,
    isLanguageModalOpen,
  } = useLanguage();

  const [isOnboardingDomActive, setIsOnboardingDomActive] = useState(() => {
    if (typeof document !== "undefined") {
      return (
        document.documentElement.classList.contains("zebalpha-onboarding-pending") ||
        document.body.classList.contains("zebalpha-onboarding-active")
      );
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkDom = () => {
      const isPending =
        document.documentElement.classList.contains("zebalpha-onboarding-pending") ||
        document.body.classList.contains("zebalpha-onboarding-active");
      setIsOnboardingDomActive(isPending);
    };

    checkDom();

    const observer = new MutationObserver(checkDom);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const handleCustom = (e: CustomEvent<{ isOpen?: boolean }>) => {
      if (e.detail && typeof e.detail.isOpen === "boolean") {
        setIsOnboardingDomActive(e.detail.isOpen);
      }
    };
    window.addEventListener("zebalpha:onboarding-state", handleCustom as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("zebalpha:onboarding-state", handleCustom as EventListener);
    };
  }, []);

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore TTS cancel errors
      }
    }
    setSpeakingId(null);
  };

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  // Excluded routes: do NOT show chatbot on Auth screens, Checkout, or dedicated Assistant page
  const isExcludedRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/checkout" ||
    pathname === "/auth/callback" ||
    pathname === "/assistant";

  // Native app onboarding pending check from LanguageContext
  const isOnboardingContextPending =
    isNativeApp &&
    (!onboardingLanguageCompleted || (!onboardingCompleted && !isGuestMode));

  // Position state (translation offsets from initial bottom-right position)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number; moved: boolean } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const msgSeqRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      moved: false,
    };
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
      setIsDragging(true);
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy,
      });
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        setIsOpen((prev) => !prev);
      }
      dragRef.current = null;
    }
    setIsDragging(false);
  };

  const handleSend = async (textToSend?: string, voiceHint?: string) => {
    const query = (textToSend ?? prompt).trim();
    if (!query || loading) return;

    stopSpeech();
    msgSeqRef.current += 1;
    const userMessage: ChatMessage = {
      id: `fl-u-${msgSeqRef.current}`,
      role: "user",
      content: query,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const apiMessages = updatedMessages
        .filter((m) => m.id !== "floating-welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          voiceHint: voiceHint || undefined,
          messages: apiMessages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect to Alpha AI.");
      }

      const voiceLang =
        data?.voiceLang === "bn-IN" || data?.voiceLang === "hi-IN" || data?.voiceLang === "en-IN"
          ? data.voiceLang
          : "en-IN";

      msgSeqRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `fl-a-${msgSeqRef.current}`,
          role: "assistant",
          content: data.reply,
          products: Array.isArray(data.recommendedProducts) ? data.recommendedProducts : [],
          quickLinks: Array.isArray(data.quickLinks) ? data.quickLinks : [],
          voiceLang,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const voiceSearch = useVoiceSearch({
    onResult: (spokenQuery, translatedHint) => {
      if (spokenQuery.trim()) {
        setIsOpen(true);
        void handleSend(spokenQuery.trim(), translatedHint);
      }
    },
    onUnsupportedFallback: (msg) => {
      setError(msg);
    },
  });

  const handleToggleSpeak = (msg: ChatMessage) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingId === msg.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    try {
      const clean = cleanSpeechText(msg.content);
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = msg.voiceLang || "en-IN";
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      setSpeakingId(msg.id);
      window.speechSynthesis.speak(utter);
    } catch {
      setSpeakingId(null);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (isNativeApp || isExcludedRoute || isOnboardingContextPending || isLanguageModalOpen || isOnboardingDomActive) {
    return null;
  }

  const { experience, isFestivalOverride } = useExperienceTheme();
  const t = experience.themeTokens;
  const isLightBtnText =
    (t.primaryButtonText || "").toUpperCase() === "#FFFFFF" ||
    (t.primaryButtonText || "").toUpperCase() === "#FFFDF8";
  const isVoiceActive =
    voiceSearch.status === "listening" || voiceSearch.status === "starting";

  return (
    <>
      <div
        data-floating-assistant="true"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
          touchAction: "none",
        }}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end transition-all"
      >
        {/* Expanded Chat Box */}
        {isOpen && (
          <div
            className={`mb-3 w-[92vw] sm:w-[410px] h-[560px] max-h-[80vh] rounded-[2rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-[90] border ${
              isOfficialTheme
                ? "bg-[#FCF9F2] border-[#DFBE6F] text-[#14120F] shadow-[0_20px_50px_rgba(140,95,12,0.22)]"
                : "bg-neutral-950 border-neutral-800 text-white shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
            }`}
          >
            {/* Header */}
            <div
              className={`px-4 py-3 flex items-center justify-between border-b ${
                isOfficialTheme ? "bg-[#FAF2DC] border-[#E7CFA0]" : "bg-black border-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`relative h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-black text-xs shadow-md overflow-hidden ${
                    isOfficialTheme
                      ? "bg-[#111111] border-2 border-[#D4AF37]"
                      : "bg-white text-black border border-neutral-700"
                  }`}
                >
                  <img src="/official-logo-sm.png" alt="Alpha AI" className="h-full w-full object-cover rounded-full" />
                </div>
                <div className="min-w-0">
                  <h4
                    className={`text-sm font-black tracking-tight leading-none flex items-center gap-1.5 ${
                      isOfficialTheme ? "text-[#14120F]" : "text-white"
                    }`}
                  >
                    Alpha AI
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                        isOfficialTheme
                          ? "bg-gradient-to-r from-[#FBE28A] to-[#EAB308] text-[#111111] border-[#C68A12]/40"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      24/7 Smart
                    </span>
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold tracking-wide mt-1 ${
                      isOfficialTheme ? "text-[#6D5B3B]" : "text-neutral-400"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    বাংলা • हिन्दी • English • Voice
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/assistant"
                  onClick={() => setIsOpen(false)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black border transition ${
                    isOfficialTheme
                      ? "bg-[#FFFDF8] border-[#DFBE6F] text-[#14120F] hover:bg-[#FAF0D1]"
                      : "bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Full View
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setIsOpen(false);
                  }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                    isOfficialTheme
                      ? "bg-[#FFFDF8] border border-[#E0C16E] text-[#4B402D] hover:text-[#14120F]"
                      : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                  aria-label="Close Assistant"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Multilingual Quick Options Bar */}
            <div
              className={`px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none border-b ${
                isOfficialTheme ? "bg-[#FFFDF8] border-[#EDE0BF]" : "bg-neutral-950 border-neutral-800/80"
              }`}
            >
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => void handleSend(opt.query)}
                  disabled={loading}
                  className={`whitespace-nowrap text-[10px] font-bold px-3 py-1.5 rounded-full border transition active:scale-95 shrink-0 cursor-pointer disabled:opacity-50 ${
                    isOfficialTheme
                      ? "bg-[#FAF2DE] hover:bg-[#F5E4B8] text-[#292319] border-[#E4C988]"
                      : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Messages Feed Area */}
            <div className={`flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-hide ${isOfficialTheme ? "bg-[#FCF9F2]" : "bg-neutral-900/40"}`}>
              {messages.map((m) => {
                const isUser = m.role === "user";
                const isSpeaking = speakingId === m.id;
                const boldClass = isOfficialTheme ? "font-extrabold text-[#111111]" : "font-bold text-white";

                return (
                  <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-2`}>
                    <div
                      className={`max-w-[90%] rounded-[1.35rem] px-3.5 py-2.5 text-xs shadow-sm ${
                        isUser
                          ? isOfficialTheme
                            ? "bg-gradient-to-br from-[#FBE28A] via-[#F2C34B] to-[#DCA118] text-[#111111] font-bold rounded-tr-none border border-[#CE9412]/50"
                            : "bg-white text-black font-bold rounded-tr-none"
                          : isOfficialTheme
                            ? "bg-[#FFFDF8] text-[#221D15] border border-[#E7CF94] rounded-tl-none font-medium"
                            : "bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-tl-none font-medium"
                      }`}
                    >
                      <div className="space-y-1 leading-relaxed whitespace-pre-line">
                        {m.content.split("\n").map((line, idx) => (
                          <p key={idx}>{renderInlineBold(line, boldClass)}</p>
                        ))}
                      </div>
                      {!isUser && (
                        <div className="mt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(m)}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold transition cursor-pointer ${
                              isSpeaking
                                ? "bg-[#FF5E57] text-white"
                                : isOfficialTheme
                                  ? "text-[#7A6847] hover:text-[#111111]"
                                  : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            {isSpeaking ? <VolumeX size={11} /> : <Volume2 size={11} />}
                            <span>{isSpeaking ? "Stop" : "Listen"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Clickable Product Cards Inside Floating Widget */}
                    {!isUser && m.products && m.products.length > 0 && (
                      <div className="w-full grid grid-cols-2 gap-2">
                        {m.products.slice(0, 4).map((item) => {
                          const hasDiscount = typeof item.mrp === "number" && item.mrp > item.price;
                          const hasRating = typeof item.rating === "number" && item.rating > 0;
                          const hasOrders = typeof item.order_count === "number" && item.order_count > 0;
                          return (
                            <Link
                              key={String(item.id)}
                              href={`/products/${item.id}`}
                              onClick={() => setIsOpen(false)}
                              className={`group flex flex-col overflow-hidden rounded-xl border p-1.5 transition hover:-translate-y-0.5 ${
                                isOfficialTheme
                                  ? "border-[#DFBE6F] bg-[#FFFDF8] hover:border-[#F03A46]"
                                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                              }`}
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-900/10">
                                <img
                                  src={item.images?.[0] || item.image_url}
                                  alt={item.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                {item.match_reason && (
                                  <span
                                    data-photo-overlay="true"
                                    className="absolute top-1 left-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[8.5px] font-black text-amber-300"
                                  >
                                    {item.match_reason}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 space-y-0.5 px-0.5">
                                <p
                                  className={`line-clamp-2 text-[10.5px] font-bold leading-snug ${
                                    isOfficialTheme ? "text-[#14120F]" : "text-white"
                                  }`}
                                >
                                  {item.name}
                                </p>
                                {(hasRating || hasOrders) && (
                                  <div className="flex items-center gap-1 flex-wrap text-[9px] font-extrabold">
                                    {hasRating && (
                                      <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                        {item.rating!.toFixed(1)}
                                      </span>
                                    )}
                                    {hasOrders && (
                                      <span className="inline-flex items-center gap-0.5 text-[#F03A46]">
                                        <Flame className="h-2.5 w-2.5" />
                                        {item.order_count}+
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                  <div className="flex items-baseline gap-1">
                                    <span
                                      className={`text-[11px] font-black ${
                                        isOfficialTheme ? "text-[#111111]" : "text-white"
                                      }`}
                                    >
                                      ₹{Number(item.price || 0).toLocaleString("en-IN")}
                                    </span>
                                    {hasDiscount && (
                                      <span className="text-[9px] line-through opacity-60">
                                        ₹{Number(item.mrp || 0).toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </div>
                                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div
                    className={`rounded-[1.35rem] rounded-tl-none p-3.5 flex items-center gap-1.5 shadow-sm border ${
                      isOfficialTheme ? "bg-[#FFFDF8] border-[#E7CF94]" : "bg-neutral-950 border-neutral-800"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isOfficialTheme ? "bg-[#C68A12]" : "bg-white"}`} />
                    <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isOfficialTheme ? "bg-[#C68A12]" : "bg-white"}`} />
                    <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${isOfficialTheme ? "bg-[#C68A12]" : "bg-white"}`} />
                  </div>
                </div>
              )}

              {error && (
                <div className={`text-center rounded-2xl p-2.5 border ${isOfficialTheme ? "bg-rose-50 border-rose-200" : "bg-rose-950/40 border-rose-800"}`}>
                  <p className={`text-[11px] font-bold ${isOfficialTheme ? "text-rose-700" : "text-rose-300"}`}>
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className={`mt-1 text-[9px] font-black uppercase underline cursor-pointer ${isOfficialTheme ? "text-rose-600" : "text-rose-400"}`}
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Prompt Form with Voice Mic Button */}
            <div className={`p-3 border-t ${isOfficialTheme ? "border-[#E7CFA0] bg-[#FAF2DC]" : "border-neutral-800 bg-neutral-950"}`}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={voiceSearch.openVoiceSearch}
                  disabled={loading}
                  aria-label="Speak in Bengali, Hindi, or English"
                  title="Speak in বাংলা / हिन्दी / English"
                  data-photo-overlay="true"
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm active:scale-95 disabled:opacity-40 transition shrink-0 cursor-pointer ${
                    isVoiceActive
                      ? "bg-[#FF4252] text-white animate-pulse"
                      : "bg-gradient-to-br from-[#FF7E6B] to-[#FF4252] text-white hover:brightness-105"
                  }`}
                >
                  <Mic size={14} />
                </button>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="বাংলা / हिन्दी / English-এ জিজ্ঞেস করুন..."
                  className={`min-w-0 flex-1 text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium transition border ${
                    isOfficialTheme
                      ? "bg-[#FFFDF8] border-[#DEC171] text-[#14120F] placeholder:text-[#8C7B5B] focus:border-[#B8800C]"
                      : "bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-white"
                  }`}
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 disabled:grayscale transition shrink-0 cursor-pointer ${
                    isOfficialTheme
                      ? "bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#C68A12] text-[#111111]"
                      : "bg-white text-black hover:bg-neutral-200"
                  }`}
                  aria-label="Send Message"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Draggable Floating Button Trigger */}
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            touchAction: "none",
            ...(isOfficialTheme && isFestivalOverride
              ? {
                  background: `linear-gradient(135deg, ${t.accentColor || t.primaryButtonBg}, ${t.primaryColor})`,
                  borderColor: t.cardBackground || "#FFFDF8",
                }
              : {}),
          }}
          className={`pointer-events-auto relative h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl flex items-center justify-center border-2 transition-shadow cursor-grab active:cursor-grabbing shrink-0 select-none ${
            isOfficialTheme
              ? "bg-gradient-to-br from-[#FEF08A] to-[#C68A12] border-[#FFFDF8] shadow-[0_8px_24px_rgba(180,120,16,0.35)]"
              : `bg-white border-4 border-white ${isDragging ? "shadow-emerald-400/40 shadow-3xl" : "shadow-slate-400/40 hover:scale-105"}`
          }`}
          aria-label="Open Alpha AI Shopping Assistant"
        >
          <div
            style={
              isOfficialTheme && isFestivalOverride
                ? { borderColor: t.borderColor }
                : undefined
            }
            className={`absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-black p-1 border ${
              isOfficialTheme ? "border-[#EAB308]/80" : "border-zinc-800"
            }`}
          >
            <img src={experience.assets?.festivalLogoUrl || "/official-logo-sm.png"} alt="Alpha AI" className="h-full w-full object-cover rounded-full" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: isFestivalOverride ? t.successColor : "#34D399" }}
            ></span>
            <span
              className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white"
              style={{ backgroundColor: isFestivalOverride ? t.successColor : "#10B981" }}
            ></span>
          </span>
        </button>
      </div>

      {/* Multilingual Voice Recognition Sheet */}
      <VoiceSearchSheet controller={voiceSearch} isNativeApp={isNativeApp} />
    </>
  );
}
