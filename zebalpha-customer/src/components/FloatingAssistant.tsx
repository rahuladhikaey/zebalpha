"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, ArrowUpRight, ShoppingBag, Package, RefreshCw, DollarSign, Truck, Ruler, CreditCard, Headset } from "lucide-react";

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

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
        touchAction: "none",
      }}
      className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end"
    >
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[400px] h-[550px] rounded-[2rem] bg-neutral-950 border border-neutral-800 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-white">
          {/* Header */}
          <div className="bg-black border-b border-neutral-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full bg-white flex items-center justify-center text-black font-black text-xs shadow-md border border-neutral-700 overflow-hidden">
                <img src="/official-logo.png" alt="Alpha AI" className="h-full w-full object-cover rounded-full" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black tracking-tight leading-none text-white flex items-center gap-1.5">
                  Alpha AI
                  <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">Official</span>
                </h4>
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-neutral-400 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Stylist & Customer Support
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition active:scale-90"
              aria-label="Close Assistant"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Options Bar */}
          <div className="bg-neutral-950 border-b border-neutral-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none">
            {QUICK_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSend(opt.query)}
                className="whitespace-nowrap text-[10px] font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-full border border-neutral-800 transition active:scale-95 shrink-0"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900/40 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[88%] rounded-[1.5rem] p-4 text-xs shadow-sm ${
                    m.role === "user" 
                      ? "bg-white text-black font-bold rounded-tr-none" 
                      : "bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-tl-none font-medium"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-950 border border-neutral-800 rounded-[1.5rem] rounded-tl-none p-4 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-center bg-rose-950/40 border border-rose-800 rounded-2xl p-2.5">
                <p className="text-[11px] font-bold text-rose-300">
                  {error}
                </p>
                <button
                  onClick={() => setError("")}
                  className="mt-1 text-[9px] font-black uppercase text-rose-400 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Menu Options Footer Chips */}
          <div className="px-3 pt-2 pb-1 bg-neutral-950 border-t border-neutral-800/60 flex flex-wrap gap-1.5 justify-center text-[10px]">
            <button
              onClick={() => handleSend("Track my order with Order ID")}
              className="text-[9px] font-bold bg-neutral-900 text-neutral-400 hover:text-white px-2.5 py-1 rounded-md border border-neutral-800"
            >
              📦 Track Order
            </button>
            <button
              onClick={() => handleSend("I want to return an item. What is your 5-day return policy?")}
              className="text-[9px] font-bold bg-neutral-900 text-neutral-400 hover:text-white px-2.5 py-1 rounded-md border border-neutral-800"
            >
              🔄 5-Day Return
            </button>
            <button
              onClick={() => handleSend("Talk to customer support team")}
              className="text-[9px] font-bold bg-neutral-900 text-neutral-400 hover:text-white px-2.5 py-1 rounded-md border border-neutral-800"
            >
              👨‍💼 Support Agent
            </button>
          </div>

          {/* Prompt Form */}
          <div className="p-3 border-t border-neutral-800 bg-neutral-950">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Alpha AI assistant..."
                className="flex-1 text-xs bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-medium text-white placeholder:text-neutral-500 focus:border-white transition"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="h-9 w-9 rounded-xl bg-white text-black flex items-center justify-center shadow-md hover:bg-neutral-200 active:scale-95 disabled:opacity-40 disabled:grayscale transition shrink-0"
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
        className={`pointer-events-auto relative h-16 w-16 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 border-white transition-shadow cursor-grab active:cursor-grabbing shrink-0 select-none ${
          isDragging ? "shadow-emerald-400/40 shadow-3xl" : "shadow-slate-400/40 hover:scale-105"
        }`}
        aria-label="Open Alpha AI Assistant"
      >
        <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-black p-1 border border-zinc-800">
          <img src="/official-logo.png" alt="Alpha AI" className="h-full w-full object-cover rounded-full" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
        </span>
      </button>
    </div>
  );
}
