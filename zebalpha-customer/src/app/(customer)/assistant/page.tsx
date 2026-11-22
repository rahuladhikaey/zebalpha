"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Mic,
  RotateCcw,
  Send,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AddToCartButton } from "@/components/AddToCartButton";
import { VoiceSearchSheet, useVoiceSearch } from "@/components/VoiceSearchSheet";
import { useIsNativeApp, useOfficialTheme } from "@/lib/platform";
import { Product } from "@/lib/types";

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
  { label: "College Oversized Tee", query: "College wear oversized tee under 600" },
  { label: "Top Rated Kurtis", query: "Best rated kurtis dikhao" },
  { label: "Bestseller Sarees", query: "Top ordered saree dekhao" },
  { label: "📦 Track Order", query: "Where is my order? Track order" },
  { label: "🔄 5-Day Return", query: "What is your 5-day return policy?" },
];

const INITIAL_WELCOME = `👋 Welcome to **ZEBALPHA**!

I’m **Alpha AI** — your 24/7 Smart Multilingual Shopping Assistant (**বাংলা • हिन्दी • English**).

Type or tap the **Mic** to ask anything:
• *"৫০০ টাকার মধ্যে ভালো টি-শার্ট দেখাও"*
• *"500 ke andar black hoodie dikhao"*
• *"College wear oversized tee under 600"*

I strictly match real live products ranked by **customer ratings & high orders** — never random items!`;

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome-alpha-ai",
  role: "assistant",
  content: INITIAL_WELCOME,
  voiceLang: "en-IN",
};

function formatCurrency(value?: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function cleanSpeechText(raw: string): string {
  return raw
    .replace(/\*\*/g, "")
    .replace(/[*_`#•👇👋📦🔄💳👨‍💼🔥★]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInlineBold(line: string, boldClassName: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className={boldClassName}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function renderFormattedReply(content: string, isOfficialTheme: boolean) {
  const boldClass = isOfficialTheme ? "font-extrabold text-[#111111]" : "font-bold text-white";
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {renderInlineBold(trimmed, boldClass)}
          </p>
        );
      })}
    </div>
  );
}

export default function AlphaAssistantPage() {
  const isNativeApp = useIsNativeApp();
  const isOfficialTheme = useOfficialTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const msgSeqRef = useRef<number>(0);

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore TTS cancel errors
      }
    }
    setSpeakingMessageId(null);
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 1 || loading) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, loading]);

  async function handleSend(textToSend?: string, voiceHint?: string) {
    const query = (textToSend ?? prompt).trim();
    if (!query || loading) return;

    stopSpeech();
    msgSeqRef.current += 1;
    const userMessage: ChatMessage = {
      id: `user-${msgSeqRef.current}`,
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
        .filter((m) => m.id !== "welcome-alpha-ai")
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

      const rawText = await res.text();
      let data: Record<string, unknown> | null = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const errMsg =
          typeof data?.error === "string" && data.error.trim().length > 0
            ? data.error
            : "Alpha AI could not respond right now. Please try again.";
        throw new Error(errMsg);
      }

      const replyText =
        typeof data?.reply === "string" && data.reply.trim().length > 0
          ? data.reply.trim()
          : "I can help with products, sizes, orders, returns, and customer support. Tell me what you need!";

      const products: RecommendedItem[] = Array.isArray(data?.recommendedProducts)
        ? (data.recommendedProducts as RecommendedItem[])
        : [];
      const quickLinks: AssistantQuickLink[] = Array.isArray(data?.quickLinks)
        ? (data.quickLinks as AssistantQuickLink[])
        : [];
      const voiceLang =
        data?.voiceLang === "bn-IN" || data?.voiceLang === "hi-IN" || data?.voiceLang === "en-IN"
          ? data.voiceLang
          : "en-IN";

      msgSeqRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${msgSeqRef.current}`,
          role: "assistant",
          content: replyText,
          products,
          quickLinks,
          voiceLang,
        },
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message && !err.message.includes("<!DOCTYPE")
          ? err.message
          : "Alpha AI is momentarily unreachable. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const voiceSearch = useVoiceSearch({
    onResult: (spokenQuery, translatedHint) => {
      if (spokenQuery.trim()) {
        void handleSend(spokenQuery.trim(), translatedHint);
      }
    },
    onUnsupportedFallback: (msg) => {
      setError(msg);
    },
  });

  const handleToggleSpeak = (msg: ChatMessage) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingMessageId === msg.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    try {
      const clean = cleanSpeechText(msg.content);
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = msg.voiceLang || "en-IN";
      utter.rate = 1.0;
      utter.onend = () => setSpeakingMessageId(null);
      utter.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(msg.id);
      window.speechSynthesis.speak(utter);
    } catch {
      setSpeakingMessageId(null);
    }
  };

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  function handleResetChat() {
    stopSpeech();
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setError("");
    inputRef.current?.focus();
  }

  const isVoiceActive =
    voiceSearch.status === "listening" || voiceSearch.status === "starting";

  return (
    <main
      className={`flex flex-col overflow-hidden ${
        isNativeApp
          ? "fixed inset-0 z-30 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]"
          : "min-h-screen"
      } ${
        isOfficialTheme
          ? "bg-gradient-to-b from-[#FFFFFF] via-[#FFFDF4] to-[#FAF0D1] text-[#111111]"
          : "bg-black text-white"
      }`}
    >
      <div className="shrink-0">
        <Header title="Alpha AI" subtitle="24/7 Multilingual Shopping Assistant" />
      </div>

      {/* Pure Full-View Alpha AI Chatbot Container */}
      <div
        className={`flex flex-1 min-h-0 flex-col w-full ${
          isNativeApp
            ? "mx-auto max-w-3xl"
            : isOfficialTheme
              ? "mx-auto max-w-2xl my-4 sm:my-6 h-[calc(100dvh-7.5rem)] rounded-[2rem] border border-[#DFBE6F] bg-[#FFFDF8] shadow-[0_18px_48px_rgba(166,124,28,0.14)] overflow-hidden"
              : "mx-auto max-w-2xl my-4 sm:my-6 h-[calc(100dvh-7.5rem)] rounded-[2rem] border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden"
        }`}
      >
        {/* Chat Bot Header Bar */}
        <div
          className={`shrink-0 px-4 py-3 flex items-center justify-between border-b ${
            isOfficialTheme
              ? "bg-gradient-to-r from-[#FFFFFF] via-[#FAF0D1] to-[#FFFFFF] border-[#E7CFA0]"
              : "bg-black border-neutral-800"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center shadow-sm overflow-hidden ${
                isOfficialTheme
                  ? "bg-white border-2 border-[#EAB308]"
                  : "bg-white border border-neutral-700"
              }`}
            >
              <img
                src="/official-logo-sm.png"
                alt="Alpha AI"
                className="h-full w-full object-cover rounded-full"
              />
            </div>

            <div className="min-w-0">
              <h1
                className={`text-sm font-black tracking-tight leading-none flex items-center gap-1.5 ${
                  isOfficialTheme ? "text-[#111111]" : "text-white"
                }`}
              >
                <span>Alpha AI</span>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                    isOfficialTheme
                      ? "bg-gradient-to-r from-[#FBE28A] to-[#EAB308] text-[#111111] border-[#C68A12]/40"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  24/7 Smart
                </span>
              </h1>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wide mt-1 ${
                  isOfficialTheme ? "text-[#4A3F2B]" : "text-neutral-400"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                বাংলা • हिन्दी • English • Voice Enabled
              </span>
            </div>
          </div>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleResetChat}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold border transition active:scale-95 cursor-pointer ${
                isOfficialTheme
                  ? "bg-[#FFFDF8] border-[#DFBE6F] text-[#111111] hover:bg-[#FAF0D1]"
                  : "bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              }`}
              aria-label="Reset Chat"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Multilingual Quick Options Horizontal Bar */}
        <div
          className={`shrink-0 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none border-b ${
            isOfficialTheme
              ? "bg-[#FFFDF8] border-[#EDE0BF]"
              : "bg-neutral-950 border-neutral-800/80"
          }`}
        >
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => void handleSend(opt.query)}
              disabled={loading}
              className={`whitespace-nowrap text-[11px] font-bold px-3 py-1.5 rounded-full border transition active:scale-95 shrink-0 disabled:opacity-50 cursor-pointer ${
                isOfficialTheme
                  ? "bg-[#FAF2DE] hover:bg-[#F5E4B8] text-[#111111] border-[#E4C988]"
                  : "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border-neutral-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Scrollable Chat Messages Area */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 no-scrollbar ${
            isOfficialTheme ? "bg-transparent" : "bg-neutral-900/40"
          }`}
        >
          {messages.map((m) => {
            const isUser = m.role === "user";
            const isSpeaking = speakingMessageId === m.id;
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-2`}>
                <div
                  className={`max-w-[90%] rounded-[1.4rem] px-4 py-3 text-xs sm:text-sm shadow-sm ${
                    isUser
                      ? isOfficialTheme
                        ? "bg-gradient-to-br from-[#FBE28A] via-[#F2C34B] to-[#DCA118] text-[#111111] font-bold rounded-tr-sm border border-[#CE9412]/50"
                        : "bg-white text-black font-bold rounded-tr-sm"
                      : isOfficialTheme
                        ? "bg-[#FFFDF8] text-[#111111] border border-[#E7CF94] rounded-tl-sm font-medium"
                        : "bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-tl-sm font-medium"
                  }`}
                >
                  {isUser ? (
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                  ) : (
                    <>
                      {renderFormattedReply(m.content, isOfficialTheme)}
                      <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(m)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                            isSpeaking
                              ? "bg-[#FF5E57] text-white"
                              : isOfficialTheme
                                ? "text-[#7A6847] hover:text-[#111111] hover:bg-[#FAF0D1]"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                          }`}
                          aria-label={isSpeaking ? "Stop reading reply" : "Listen to reply"}
                        >
                          {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                          <span>{isSpeaking ? "Stop" : "Listen"}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Inline Rating & Order-Ranked Product Cards */}
                {!isUser && m.products && m.products.length > 0 && (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-2 gap-2.5 pt-0.5">
                    {m.products.slice(0, 4).map((item) => {
                      const hasDiscount = typeof item.mrp === "number" && item.mrp > item.price;
                      const discountPct = hasDiscount
                        ? Math.round(((item.mrp! - item.price) / item.mrp!) * 100)
                        : 0;
                      const hasRating = typeof item.rating === "number" && item.rating > 0;
                      const hasOrders = typeof item.order_count === "number" && item.order_count > 0;

                      return (
                        <div
                          key={String(item.id)}
                          className={`flex flex-col justify-between overflow-hidden rounded-2xl border p-2 shadow-sm ${
                            isOfficialTheme
                              ? "border-[#DFBE6F] bg-[#FFFDF8]"
                              : "border-zinc-800 bg-zinc-950"
                          }`}
                        >
                          <div>
                            <Link
                              href={`/products/${item.id}`}
                              className={`relative block aspect-square overflow-hidden rounded-xl ${
                                isOfficialTheme ? "bg-[#F6EFE0]" : "bg-zinc-900"
                              }`}
                            >
                              <img
                                src={item.images?.[0] || item.image_url}
                                alt={item.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                              {item.match_reason && (
                                <span
                                  data-photo-overlay="true"
                                  className="absolute top-1.5 left-1.5 rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-black text-amber-300 backdrop-blur-sm"
                                >
                                  {item.match_reason}
                                </span>
                              )}
                            </Link>

                            <div className="mt-2 space-y-1 px-0.5">
                              <Link
                                href={`/products/${item.id}`}
                                className={`line-clamp-2 text-[11px] font-bold leading-snug ${
                                  isOfficialTheme ? "text-[#111111]" : "text-white"
                                }`}
                              >
                                {item.name}
                              </Link>

                              {/* Live Rating & Order Trust Signals */}
                              {(hasRating || hasOrders) && (
                                <div className="flex items-center flex-wrap gap-1.5 text-[10px] font-extrabold">
                                  {hasRating && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">
                                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                      <span>{item.rating!.toFixed(1)}</span>
                                      {item.review_count ? (
                                        <span className="opacity-75">({item.review_count})</span>
                                      ) : null}
                                    </span>
                                  )}
                                  {hasOrders && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[#F03A46]">
                                      <Flame className="h-2.5 w-2.5" />
                                      <span>{item.order_count}+ orders</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                <span
                                  className={`text-xs font-black ${
                                    isOfficialTheme ? "text-[#111111]" : "text-white"
                                  }`}
                                >
                                  {formatCurrency(item.price)}
                                </span>
                                {hasDiscount && (
                                  <>
                                    <span
                                      className={`text-[10px] line-through ${
                                        isOfficialTheme ? "text-[#7A6847]" : "text-zinc-500"
                                      }`}
                                    >
                                      {formatCurrency(item.mrp)}
                                    </span>
                                    {discountPct > 0 && (
                                      <span className="text-[9.5px] font-black text-emerald-600">
                                        {discountPct}% OFF
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-col gap-1">
                            <AddToCartButton product={item} />
                            <Link
                              href={`/products/${item.id}`}
                              className={`inline-flex items-center justify-center gap-1 rounded-xl border py-1 text-[10px] font-bold ${
                                isOfficialTheme
                                  ? "border-[#DFBE6F] bg-[#FAF4E4] text-[#111111]"
                                  : "border-zinc-700 bg-zinc-900 text-zinc-200"
                              }`}
                            >
                              View Details <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isUser && m.quickLinks && m.quickLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.quickLinks.map((qLink) => (
                      <Link
                        key={`${m.id}-${qLink.href}`}
                        href={qLink.href}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold ${
                          isOfficialTheme
                            ? "border-[#DFBE6F] bg-[#FFFDF8] text-[#111111]"
                            : "border-zinc-700 bg-zinc-900 text-zinc-200"
                        }`}
                      >
                        <span>{qLink.label}</span>
                        <ArrowRight className="h-3 w-3 opacity-70" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div
                className={`rounded-[1.4rem] rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm border ${
                  isOfficialTheme
                    ? "bg-[#FFFDF8] border-[#E7CF94]"
                    : "bg-neutral-950 border-neutral-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${
                    isOfficialTheme ? "bg-[#C68A12]" : "bg-white"
                  }`}
                />
                <span
                  className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${
                    isOfficialTheme ? "bg-[#C68A12]" : "bg-white"
                  }`}
                />
                <span
                  className={`h-1.5 w-1.5 rounded-full animate-bounce ${
                    isOfficialTheme ? "bg-[#C68A12]" : "bg-white"
                  }`}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              className={`text-center rounded-2xl p-2.5 border ${
                isOfficialTheme
                  ? "bg-rose-50 border-rose-200"
                  : "bg-rose-950/40 border-rose-800"
              }`}
            >
              <p
                className={`text-[11px] font-bold ${
                  isOfficialTheme ? "text-rose-700" : "text-rose-300"
                }`}
              >
                {error}
              </p>
              <button
                type="button"
                onClick={() => setError("")}
                className={`mt-1 text-[10px] font-black uppercase underline cursor-pointer ${
                  isOfficialTheme ? "text-rose-600" : "text-rose-400"
                }`}
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Prompt Input Form with Voice Mic (বাংলা / हिन्दी / English) */}
        <div
          className={`shrink-0 p-3 border-t ${
            isOfficialTheme
              ? "border-[#E7CFA0] bg-[#FAF2DC]"
              : "border-neutral-800 bg-neutral-950"
          }`}
        >
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={voiceSearch.openVoiceSearch}
              disabled={loading}
              aria-label="Speak to Alpha AI in Bengali, Hindi, or English"
              title="Speak in বাংলা / हिन्दी / English"
              data-photo-overlay="true"
              className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm active:scale-95 disabled:opacity-40 transition shrink-0 cursor-pointer ${
                isVoiceActive
                  ? "bg-[#FF4252] text-white animate-pulse"
                  : "bg-gradient-to-br from-[#FF7E6B] to-[#FF4252] text-white hover:brightness-105"
              }`}
            >
              <Mic size={16} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="বাংলা / हिन्दी / English-এ খুঁজুন (e.g. ৫০০ টাকার টি-শার্ট)..."
              className={`min-w-0 flex-1 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none font-medium transition border ${
                isOfficialTheme
                  ? "bg-[#FFFDF8] border-[#DEC171] text-[#111111] placeholder:text-[#7A6847] focus:border-[#B8800C]"
                  : "bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-white"
              }`}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              aria-label="Send Message"
              className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 transition shrink-0 cursor-pointer ${
                isOfficialTheme
                  ? "bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#C68A12] text-[#111111]"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Native Android + Web Multilingual Voice Recognition Sheet */}
      <VoiceSearchSheet controller={voiceSearch} isNativeApp={isNativeApp} />
    </main>
  );
}
