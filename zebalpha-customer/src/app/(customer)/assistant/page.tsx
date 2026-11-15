"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  HelpCircle,
  Loader2,
  RotateCcw,
  Ruler,
  Send,
  Shirt,
  ShoppingBag,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useIsNativeApp } from "@/lib/platform";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";

type AssistantQuickLink = {
  label: string;
  href: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  quickLinks?: AssistantQuickLink[];
};

const STARTER_PROMPTS = [
  "Recommend an everyday streetwear outfit",
  "Suggest oversized tees or polos under ₹999",
  "How should I layer a casual weekend look?",
  "Help me pick the right size & check returns",
  "Show me trending New Season Drops",
];

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome-alpha-ai",
  role: "assistant",
  content:
    "Welcome to **Alpha AI** — your personal ZEBALPHA fashion stylist & shopping concierge.\n\nAsk me for outfit pairings, product recommendations within your budget, fabric & sizing advice, or order support.",
  quickLinks: [
    { label: "Size Guide", href: "/size-guide" },
    { label: "Virtual Try-On", href: "/virtual-try-on" },
    { label: "New Drops", href: "/new-drops" },
    { label: "My Orders", href: "/profile/orders" },
  ],
};

function formatCurrency(value?: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
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

function renderFormattedReply(content: string, isNativeApp: boolean) {
  const boldClass = isNativeApp ? "font-extrabold text-[#111111]" : "font-bold text-[#F3DB91]";
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
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
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [featuredPicks, setFeaturedPicks] = useState<Product[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const msgSeqRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function loadStarterCatalogPicks() {
      setLoadingPicks(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${baseUrl}/api/recommendations/for-you?limit=6`);
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data?.items) && data.items.length > 0) {
            setFeaturedPicks(data.items.slice(0, 6));
            setLoadingPicks(false);
            return;
          }
        }
      } catch {
        // Fallback cleanly to active catalog query below
      }

      if (typeof supabase?.from === "function") {
        try {
          const { data } = await supabase
            .from("products")
            .select(
              "id, name, description, price, mrp, image_url, images, brand, stock, status, is_active, is_new_drop, tier, specifications, packages"
            )
            .or("is_active.is.null,is_active.eq.true")
            .order("is_new_drop", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(6);

          if (active && Array.isArray(data)) {
            setFeaturedPicks(
              data.filter(
                (item) =>
                  item &&
                  item.id &&
                  item.name &&
                  (item.image_url || (Array.isArray(item.images) && item.images[0]))
              ) as Product[]
            );
          }
        } catch {
          // Non-blocking
        }
      }
      if (active) setLoadingPicks(false);
    }

    loadStarterCatalogPicks();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages.length, isSending]);

  async function submitPrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt || isSending) return;

    msgSeqRef.current += 1;
    const userMsg: ChatMessage = {
      id: `user-${msgSeqRef.current}`,
      role: "user",
      content: prompt,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setIsSending(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const apiMessages = nextHistory
        .filter((m) => m.id !== "welcome-alpha-ai")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, messages: apiMessages }),
      });

      const data = res.ok ? await res.json() : null;
      const replyText =
        typeof data?.reply === "string" && data.reply.trim().length > 0
          ? data.reply.trim()
          : "I can help with outfit styling, product picks, sizing, or order updates. Tell me what occasion or item you are shopping for!";

      const products: Product[] = Array.isArray(data?.recommendedProducts)
        ? data.recommendedProducts
        : [];
      const quickLinks: AssistantQuickLink[] = Array.isArray(data?.quickLinks)
        ? data.quickLinks
        : [];

      msgSeqRef.current += 1;
      const assistantMsgId = `assistant-${msgSeqRef.current}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: replyText,
          products,
          quickLinks,
        },
      ]);
    } catch {
      msgSeqRef.current += 1;
      const fallbackMsgId = `assistant-fallback-${msgSeqRef.current}`;
      setMessages((prev) => [
        ...prev,
        {
          id: fallbackMsgId,
          role: "assistant",
          content:
            "Could not reach the assistant right now. Try tapping one of the shopping shortcuts below or check your connection.",
          quickLinks: INITIAL_ASSISTANT_MESSAGE.quickLinks,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    submitPrompt(input);
  }

  function handleResetChat() {
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    inputRef.current?.focus();
  }

  const pageBg = isNativeApp ? "min-h-screen bg-[#FCF9F2] text-[#111111]" : "min-h-screen bg-zinc-950 text-zinc-100";
  const heroCardClass = isNativeApp
    ? "rounded-3xl border border-[#DFBE6F] bg-gradient-to-br from-[#FFFDF8] via-[#FAF1DA] to-[#F4E3B4] p-5 shadow-sm"
    : "rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-6 shadow-xl";
  const panelClass = isNativeApp
    ? "rounded-3xl border border-[#E5CFA0] bg-[#FFFDF8] shadow-sm"
    : "rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl";
  const pillLinkClass = isNativeApp
    ? "inline-flex items-center gap-1.5 rounded-full border border-[#DFBE6F] bg-[#FFFDF8] px-3 py-1.5 text-xs font-bold text-[#111111] transition active:scale-95 hover:bg-[#FAF0D7]"
    : "inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-[#D4AF37]/60 hover:text-[#F3DB91]";
  const promptChipClass = isNativeApp
    ? "shrink-0 rounded-full border border-[#DFBE6F] bg-[#FFF8E6] px-3.5 py-2 text-xs font-semibold text-[#2A2212] transition active:scale-95 hover:bg-[#F3E2B3]"
    : "shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-[#D4AF37]/60 hover:text-[#F3DB91]";

  return (
    <main className={pageBg}>
      <Header title="Alpha AI" subtitle="Stylist & Shopping Help" />

      <div className={`mx-auto max-w-4xl px-4 pt-4 ${isNativeApp ? "pb-28" : "pb-16"} space-y-5`}>
        {/* Studio Hero Card */}
        <section className={heroCardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <span
                data-keep-dark={isNativeApp ? "true" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${isNativeApp
                  ? "bg-[#111111] text-[#F3DB91]"
                  : "border border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#F3DB91]"
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Alpha AI Studio
              </span>
              <h1
                className={`text-xl font-black tracking-tight sm:text-2xl ${isNativeApp ? "text-[#111111]" : "text-white"
                  }`}
              >
                Personal Stylist &amp; Shopping Concierge
              </h1>
              <p
                className={`max-w-xl text-xs leading-relaxed sm:text-sm ${isNativeApp ? "text-[#4A3F2B]" : "text-zinc-300"
                  }`}
              >
                Get instant outfit pairings, curated product recommendations from ZEBALPHA, sizing tips, and live shopping assistance.
              </p>
            </div>
            <div
              className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md sm:flex"
              style={{
                background: "linear-gradient(135deg, #F3DB91 0%, #D4AF37 55%, #9E7416 100%)",
              }}
            >
              <Wand2 className="h-6 w-6 text-[#111111]" />
            </div>
          </div>

          {/* Direct Shopping Help Shortcuts */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/size-guide" className={pillLinkClass}>
              <Ruler className="h-3.5 w-3.5 text-[#9E7416]" />
              Size Guide
            </Link>
            <Link href="/virtual-try-on" className={pillLinkClass}>
              <Shirt className="h-3.5 w-3.5 text-[#9E7416]" />
              Virtual Try-On
            </Link>
            <Link href="/new-drops" className={pillLinkClass}>
              <Sparkles className="h-3.5 w-3.5 text-[#9E7416]" />
              New Drops
            </Link>
            <Link href="/profile/orders" className={pillLinkClass}>
              <ShoppingBag className="h-3.5 w-3.5 text-[#9E7416]" />
              Track Orders
            </Link>
            <Link href="/help" className={pillLinkClass}>
              <HelpCircle className="h-3.5 w-3.5 text-[#9E7416]" />
              Help Desk
            </Link>
          </div>
        </section>

        {/* Suggested Styling & Recommendation Chips */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p
              className={`text-[11px] font-extrabold uppercase tracking-wider ${isNativeApp ? "text-[#6E5C38]" : "text-zinc-400"
                }`}
            >
              Try Asking Alpha AI
            </p>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={handleResetChat}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${isNativeApp
                  ? "bg-[#FAF0D7] text-[#5C4618] hover:bg-[#F3E2B3]"
                  : "bg-zinc-900 text-zinc-300 hover:text-white"
                  }`}
              >
                <RotateCcw className="h-3 w-3" />
                Reset Chat
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
            {STARTER_PROMPTS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submitPrompt(suggestion)}
                disabled={isSending}
                className={promptChipClass}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        {/* Interactive Alpha AI Chat Panel */}
        <section className={`${panelClass} overflow-hidden`}>
          <div className="max-h-[54vh] min-h-[260px] space-y-4 overflow-y-auto p-4 sm:p-5">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2.5 ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[85%] ${isUser
                      ? isNativeApp
                        ? "rounded-tr-sm text-[#111111] shadow-sm font-medium"
                        : "rounded-tr-sm bg-[#D4AF37] text-[#111111] font-medium shadow"
                      : isNativeApp
                        ? "rounded-tl-sm border border-[#E5CFA0] bg-[#FAF4E4] text-[#1C160C]"
                        : "rounded-tl-sm border border-zinc-800 bg-zinc-950 text-zinc-100"
                      }`}
                    style={
                      isUser && isNativeApp
                        ? {
                          background:
                            "linear-gradient(135deg, #F6E4AC 0%, #DFB953 60%, #C6982D 100%)",
                        }
                        : undefined
                    }
                  >
                    {!isUser && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#9E7416]">
                        <Sparkles className="h-3 w-3" />
                        <span>Alpha AI</span>
                      </div>
                    )}
                    {isUser ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      renderFormattedReply(msg.content, isNativeApp)
                    )}
                  </div>

                  {/* Inline Product Recommendations */}
                  {!isUser && msg.products && msg.products.length > 0 && (
                    <div className="w-full space-y-2 pt-1">
                      <p
                        className={`text-[11px] font-extrabold uppercase tracking-wider ${isNativeApp ? "text-[#6E5C38]" : "text-[#D4AF37]"
                          }`}
                      >
                        Curated Matches For You
                      </p>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {msg.products.map((item) => {
                          const hasDiscount =
                            typeof item.mrp === "number" && item.mrp > item.price;
                          return (
                            <div
                              key={String(item.id)}
                              className={`flex flex-col justify-between overflow-hidden rounded-2xl border p-2 ${isNativeApp
                                ? "border-[#DFBE6F] bg-[#FFFDF8]"
                                : "border-zinc-800 bg-zinc-950"
                                }`}
                            >
                              <div>
                                <Link
                                  href={`/products/${item.id}`}
                                  className={`block aspect-square overflow-hidden rounded-xl ${isNativeApp ? "bg-[#F6EFE0]" : "bg-zinc-900"
                                    }`}
                                >
                                  <img
                                    src={item.images?.[0] || item.image_url}
                                    alt={item.name}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                  />
                                </Link>
                                <div className="mt-2 space-y-0.5 px-0.5">
                                  <p
                                    className={`text-[10px] font-extrabold uppercase tracking-wider ${isNativeApp ? "text-[#8E6208]" : "text-[#D4AF37]"
                                      }`}
                                  >
                                    {item.brand || "ZEBALPHA"}
                                  </p>
                                  <Link
                                    href={`/products/${item.id}`}
                                    className={`line-clamp-2 text-xs font-bold leading-snug ${isNativeApp ? "text-[#111111]" : "text-white"
                                      }`}
                                  >
                                    {item.name}
                                  </Link>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span
                                      className={`text-xs font-black ${isNativeApp ? "text-[#111111]" : "text-white"
                                        }`}
                                    >
                                      {formatCurrency(item.price)}
                                    </span>
                                    {hasDiscount && (
                                      <span
                                        className={`text-[10px] line-through ${isNativeApp ? "text-[#7A6847]" : "text-zinc-500"
                                          }`}
                                      >
                                        {formatCurrency(item.mrp)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2.5 flex flex-col gap-1.5">
                                <AddToCartButton product={item} />
                                <Link
                                  href={`/products/${item.id}`}
                                  className={`inline-flex items-center justify-center gap-1 rounded-xl border py-1.5 text-[11px] font-bold transition ${isNativeApp
                                    ? "border-[#DFBE6F] bg-[#FAF4E4] text-[#111111] hover:bg-[#F3E2B3]"
                                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
                                    }`}
                                >
                                  View Details
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contextual Help & Action Links */}
                  {!isUser && msg.quickLinks && msg.quickLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.quickLinks.map((qLink) => (
                        <Link
                          key={`${msg.id}-${qLink.href}`}
                          href={qLink.href}
                          className={pillLinkClass}
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

            {isSending && (
              <div className="flex items-start">
                <div
                  className={`inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border px-4 py-2.5 text-xs font-semibold ${isNativeApp
                    ? "border-[#DFBE6F] bg-[#FAF4E4] text-[#5C4618]"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300"
                    }`}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9E7416]" />
                  <span>Alpha AI is curating styles &amp; answers...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Prompt Composer */}
          <form
            onSubmit={handleFormSubmit}
            className={`flex items-center gap-2 border-t p-3 ${isNativeApp
              ? "border-[#E5CFA0] bg-[#FAF2DC]"
              : "border-zinc-800 bg-zinc-950/90"
              }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for outfits, products under ₹999, sizing or help..."
              className={`min-w-0 flex-1 rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition ${isNativeApp
                ? "border-[#DFBE6F] bg-[#FFFDF8] text-[#111111] placeholder:text-[#7A6847] focus:border-[#9E7416]"
                : "border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]"
                }`}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-xs font-black uppercase tracking-wider text-[#111111] shadow-sm transition active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #F3DB91 0%, #D4AF37 55%, #9E7416 100%)",
              }}
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </section>

        {/* Styled & Trending For You Starter Shelf */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-base font-black tracking-tight sm:text-lg ${isNativeApp ? "text-[#111111]" : "text-white"
                  }`}
              >
                Styled &amp; Trending For You
              </h2>
              <p
                className={`text-xs ${isNativeApp ? "text-[#6E5C38]" : "text-zinc-400"
                  }`}
              >
                Tap any piece to explore sizing or add directly to your cart
              </p>
            </div>
            <Link
              href="/products"
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${isNativeApp
                ? "border-[#DFBE6F] bg-[#FFFDF8] text-[#111111] hover:bg-[#FAF0D7]"
                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#D4AF37]"
                }`}
            >
              Browse All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingPicks ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((skeleton) => (
                <div
                  key={skeleton}
                  className={`h-56 animate-pulse rounded-2xl border ${isNativeApp
                    ? "border-[#E5CFA0] bg-[#FAF0D7]"
                    : "border-zinc-800 bg-zinc-900"
                    }`}
                />
              ))}
            </div>
          ) : featuredPicks.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {featuredPicks.map((item) => {
                const hasDiscount = typeof item.mrp === "number" && item.mrp > item.price;
                return (
                  <article
                    key={String(item.id)}
                    className={`flex flex-col justify-between overflow-hidden rounded-2xl border p-2.5 shadow-sm ${isNativeApp
                      ? "border-[#DFBE6F] bg-[#FFFDF8]"
                      : "border-zinc-800 bg-zinc-900/70"
                      }`}
                  >
                    <div>
                      <Link
                        href={`/products/${item.id}`}
                        className={`relative block aspect-square overflow-hidden rounded-xl ${isNativeApp ? "bg-[#F6EFE0]" : "bg-zinc-950"
                          }`}
                      >
                        <img
                          src={item.images?.[0] || item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                        {item.is_new_drop && (
                          <span
                            data-photo-overlay="true"
                            className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow"
                          >
                            New Drop
                          </span>
                        )}
                      </Link>
                      <div className="mt-2.5 space-y-1 px-0.5">
                        <p
                          className={`text-[10px] font-extrabold uppercase tracking-wider ${isNativeApp ? "text-[#8E6208]" : "text-[#D4AF37]"
                            }`}
                        >
                          {item.brand || "ZEBALPHA"}
                        </p>
                        <Link
                          href={`/products/${item.id}`}
                          className={`line-clamp-2 text-xs font-bold leading-snug sm:text-sm ${isNativeApp ? "text-[#14120F]" : "text-white"
                            }`}
                        >
                          {item.name}
                        </Link>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span
                            className={`text-sm font-black ${isNativeApp ? "text-[#111111]" : "text-white"
                              }`}
                          >
                            {formatCurrency(item.price)}
                          </span>
                          {hasDiscount && (
                            <span
                              className={`text-xs line-through ${isNativeApp ? "text-[#7A6847]" : "text-zinc-500"
                                }`}
                            >
                              {formatCurrency(item.mrp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <AddToCartButton product={item} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-6 text-center text-xs ${isNativeApp
                ? "border-[#DFBE6F] bg-[#FFFDF8] text-[#5C4618]"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
            >
              Ask Alpha AI above for personalized outfit ideas, product drops, or size guidance.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
