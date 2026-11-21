"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { Send, X, ArrowUpRight, ShoppingBag, Package, RefreshCw, DollarSign, Truck, Ruler, CreditCard, Headset } from "lucide-react";
import { useIsNativeApp, useOfficialTheme } from "@/lib/platform";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_OPTIONS = [
  { label: "🛍️ Shop Now", query: "I want to shop for products" },
  { label: "📦 Track My Order", query: "Where is my order? Track order" },
  { label: "🔄 Return / Exchange", query: "What is your 5-day return policy and how to return?" },
  { label: "💰 Refund Status", query: "When will I get my refund?" },
  { label: "🚚 Delivery Info", query: "How long will delivery take?" },
  { label: "📏 Size Guide", query: "Which size should I order?" },
  { label: "💳 Payment Help", query: "What payment methods do you accept?" },
  { label: "👨‍💼 Talk to Support", query: "I want to talk to customer support" },
];

const INITIAL_WELCOME = `👋 Hi! Welcome to **ZEBALPHA**.

I’m **Alpha AI**, your virtual shopping assistant. I can help you with:

🛍️ Products & Sizes
📦 Order Tracking
🚚 Shipping & Delivery
🔄 5-Day Returns & Exchanges
💰 Refunds
💳 Payments & COD
🎁 Offers & Discounts
📋 Order Information
💬 Customer Support

How can I help you today?`;

export default function FloatingAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: INITIAL_WELCOME,
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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

    const handleCustom = (e: any) => {
      if (e.detail && typeof e.detail.isOpen === "boolean") {
        setIsOnboardingDomActive(e.detail.isOpen);
      }
    };
    window.addEventListener("zebalpha:onboarding-state", handleCustom);

    return () => {
      observer.disconnect();
      window.removeEventListener("zebalpha:onboarding-state", handleCustom);
    };
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

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Left click only
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

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        setIsOpen((prev) => !prev);
      }
      dragRef.current = null;
    }
    setIsDragging(false);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || prompt;
    if (!query || !query.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: query.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query.trim(),
          messages: updatedMessages.slice(-6),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect to Alpha AI.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom on messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Do NOT render on Android app (unified in center bottom nav), Auth screens, Checkout, Assistant page, or during Onboarding
  if (isNativeApp || isExcludedRoute || isOnboardingContextPending || isLanguageModalOpen || isOnboardingDomActive) {
    return null;
  }

  return (
    <div
      data-floating-assistant="true"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
        touchAction: "none",
      }}
      className={`fixed ${isNativeApp ? "bottom-24 right-3.5" : "bottom-6 right-6"} z-40 flex flex-col items-end transition-all`}
    >
      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          className={`mb-3 w-[92vw] sm:w-[400px] h-[530px] rounded-[2rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-[90] border ${
            isOfficialTheme
              ? "bg-[#FCF9F2] border-[#DFBE6F] text-[#14120F] shadow-[0_20px_50px_rgba(140,95,12,0.22)]"
              : "bg-neutral-950 border-neutral-800 text-white shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
          }`}
        >
          {/* Header */}
          <div
            className={`p-4 flex items-center justify-between border-b ${
              isOfficialTheme ? "bg-[#FAF2DC] border-[#E7CFA0]" : "bg-black border-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`relative h-10 w-10 rounded-full flex items-center justify-center font-black text-xs shadow-md overflow-hidden ${
                  isOfficialTheme
                    ? "bg-[#111111] border-2 border-[#D4AF37]"
                    : "bg-white text-black border border-neutral-700"
                }`}
              >
                <img src="/official-logo-sm.png" alt="Alpha AI" className="h-full w-full object-cover rounded-full" />
              </div>
              <div className="min-w-0">
                <h4 className={`text-sm font-black tracking-tight leading-none flex items-center gap-1.5 ${isOfficialTheme ? "text-[#14120F]" : "text-white"}`}>
                  Alpha AI
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                      isOfficialTheme
                        ? "bg-gradient-to-r from-[#FBE28A] to-[#EAB308] text-[#111111] border-[#C68A12]/40"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    Official
                  </span>
                </h4>
                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider mt-1 ${isOfficialTheme ? "text-[#6D5B3B]" : "text-neutral-400"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Stylist &amp; Quick Support
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isNativeApp && (
                <Link
                  href="/assistant"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FBE28A] to-[#EAB308] px-2.5 py-1 text-[10px] font-black text-[#111111] shadow-sm active:scale-95"
                >
                  Full AI
                </Link>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition active:scale-90 ${
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

          {/* Quick Options Bar */}
          <div
            className={`px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none border-b ${
              isOfficialTheme ? "bg-[#FFFDF8] border-[#EDE0BF]" : "bg-neutral-950 border-neutral-800/80"
            }`}
          >
            {QUICK_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSend(opt.query)}
                className={`whitespace-nowrap text-[10px] font-bold px-3 py-1.5 rounded-full border transition active:scale-95 shrink-0 ${
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
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${isOfficialTheme ? "bg-[#FCF9F2]" : "bg-neutral-900/40"}`}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[88%] rounded-[1.5rem] p-4 text-xs shadow-sm ${
                    m.role === "user" 
                      ? isOfficialTheme
                        ? "bg-gradient-to-br from-[#FBE28A] via-[#F2C34B] to-[#DCA118] text-[#111111] font-bold rounded-tr-none border border-[#CE9412]/50"
                        : "bg-white text-black font-bold rounded-tr-none"
                      : isOfficialTheme
                        ? "bg-[#FFFDF8] text-[#221D15] border border-[#E7CF94] rounded-tl-none font-medium"
                        : "bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-tl-none font-medium"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className={`rounded-[1.5rem] rounded-tl-none p-4 flex items-center gap-1.5 shadow-sm border ${
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
                  onClick={() => setError("")}
                  className={`mt-1 text-[9px] font-black uppercase underline ${isOfficialTheme ? "text-rose-600" : "text-rose-400"}`}
                >
                  Dismiss
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Menu Options Footer Chips */}
          <div className={`px-3 pt-2 pb-1 border-t flex flex-wrap gap-1.5 justify-center text-[10px] ${isOfficialTheme ? "bg-[#FFFDF8] border-[#EDE0BF]" : "bg-neutral-950 border-neutral-800/60"}`}>
            <button
              onClick={() => handleSend("Track my order with Order ID")}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-md border ${isOfficialTheme ? "bg-[#FAF2DE] text-[#3D3528] border-[#E4C988]" : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"}`}
            >
              📦 Track Order
            </button>
            <button
              onClick={() => handleSend("I want to return an item. What is your 5-day return policy?")}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-md border ${isOfficialTheme ? "bg-[#FAF2DE] text-[#3D3528] border-[#E4C988]" : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"}`}
            >
              🔄 5-Day Return
            </button>
            <button
              onClick={() => handleSend("Talk to customer support team")}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-md border ${isOfficialTheme ? "bg-[#FAF2DE] text-[#3D3528] border-[#E4C988]" : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"}`}
            >
              👨‍💼 Support Agent
            </button>
          </div>

          {/* Prompt Form */}
          <div className={`p-3 border-t ${isOfficialTheme ? "border-[#E7CFA0] bg-[#FAF2DC]" : "border-neutral-800 bg-neutral-950"}`}>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Alpha AI assistant..."
                className={`flex-1 text-xs rounded-xl px-4 py-2.5 outline-none font-medium transition border ${
                  isOfficialTheme
                    ? "bg-[#FFFDF8] border-[#DEC171] text-[#14120F] placeholder:text-[#8C7B5B] focus:border-[#B8800C]"
                    : "bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-white"
                }`}
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 disabled:grayscale transition shrink-0 ${
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
        }}
        className={`pointer-events-auto relative h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl flex items-center justify-center border-2 transition-shadow cursor-grab active:cursor-grabbing shrink-0 select-none ${
          isOfficialTheme
            ? "bg-gradient-to-br from-[#FEF08A] to-[#C68A12] border-[#FFFDF8] shadow-[0_8px_24px_rgba(180,120,16,0.35)]"
            : `bg-white border-4 border-white ${isDragging ? "shadow-emerald-400/40 shadow-3xl" : "shadow-slate-400/40 hover:scale-105"}`
        }`}
        aria-label="Open Alpha AI Quick Chat"
      >
        <div
          className={`absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-black p-1 border ${
            isOfficialTheme ? "border-[#EAB308]/80" : "border-zinc-800"
          }`}
        >
          <img src="/official-logo-sm.png" alt="Alpha AI" className="h-full w-full object-cover rounded-full" />
        </div>
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
        </span>
      </button>
    </div>
  );
}
