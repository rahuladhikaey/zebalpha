"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Star, Send, X, ArrowUpRight } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  "What is Urad Dal Bori?",
  "How do I cook Bori?",
  "Return Policy?",
  "Is it organic?",
];

export default function FloatingAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Asali Swad Assistant. Ask me anything about our premium Urad Dal Bori, recipe guides, returns, or order tracking! 🤖",
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
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.moved = true;
    }

    setPosition({
      x: dragRef.current.posX + deltaX,
      y: dragRef.current.posY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (!dragRef.current.moved) {
      // It was a quick tap/click, not a drag, so toggle the drawer!
      setIsOpen((prev) => !prev);
    }
    
    dragRef.current = null;
    setIsDragging(false);
  };

  // Scroll to bottom on messages change
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text.trim() }),
      });

      if (!response.ok) {
        throw new Error("Unable to receive reply. Please try again.");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err?.message || "Assistant is busy. Try again soon!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto mb-4 mr-2 flex flex-col overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl premium-shadow w-[360px] max-w-[calc(100vw-2rem)] h-[480px] transition-all animate-fadeIn">
          {/* Header Panel */}
          <div className="bg-gradient-to-r from-emerald-600 to-[#8cc63f] px-6 py-4 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center gap-3">
              {/* Cute SVG Avatar Icon */}
              <div className="h-10 w-10 rounded-full bg-white/20 border border-white/30 overflow-hidden shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="48" fill="#dbeafe" />
                  <path d="M50 32 C38 32, 36 44, 36 54 C36 68, 42 74, 50 74 C58 74, 64 68, 64 54 C64 44, 62 32, 50 32 Z" fill="#ffd0a3" />
                  <path d="M33 50 C28 42, 32 30, 42 26 C52 22, 68 24, 69 36 C70 44, 65 48, 62 48" fill="#1e293b" />
                  <circle cx="34" cy="55" r="5.5" fill="#ffa085" />
                  <circle cx="66" cy="55" r="5.5" fill="#ffa085" />
                  <circle cx="34" cy="55" r="4" fill="#ffd0a3" />
                  <circle cx="66" cy="55" r="4" fill="#ffd0a3" />
                  <path d="M34 45 C38 32, 45 22, 58 24 C68 25, 68 34, 66 38 C60 30, 48 30, 42 38 C39 42, 36 45, 34 45 Z" fill="#1e293b" />
                  <path d="M55 24 C65 24, 68 32, 69 40 C70 46, 67 48, 64 45 C64 36, 58 30, 52 28" fill="#0f172a" />
                  <circle cx="43" cy="52" r="9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                  <circle cx="57" cy="52" r="9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                  <path d="M48.5 52 L51.5 52" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M34 52 L31 51" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                  <path d="M66 52 L69 51" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="43" cy="52" r="2.5" fill="#1e293b" />
                  <circle cx="57" cy="52" r="2.5" fill="#1e293b" />
                  <path d="M37 42 Q43 40 48 44" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                  <path d="M63 42 Q57 40 52 44" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                  <ellipse cx="38" cy="59" rx="3.5" ry="2.5" fill="#ff8a8a" opacity="0.6" />
                  <ellipse cx="62" cy="59" rx="3.5" ry="2.5" fill="#ff8a8a" opacity="0.6" />
                  <path d="M50 56 L50 58.5" fill="none" stroke="#e07a5f" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M46 63 Q50 67 54 63" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black tracking-tight leading-none">Asali Swad AI</h4>
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-100 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Expert Assistant
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[85%] rounded-[1.5rem] p-4 text-xs shadow-sm ${
                    m.role === "user" 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  }`}
                >
                  <p className="leading-relaxed font-semibold whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-[1.5rem] rounded-tl-none p-4 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-center text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 rounded-full py-1.5 px-4">
                {error}
              </p>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Form & Quick Actions */}
          <div className="p-3 border-t border-slate-100 bg-white space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-500 hover:border-emerald-600 hover:text-emerald-600 transition hover:bg-emerald-50"
                >
                  {q}
                </button>
              ))}
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(prompt); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Asali Swad assistant..."
                className="flex-1 text-xs bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-2.5 outline-none font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-500/20"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:grayscale transition shrink-0"
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
      >
        {/* Cute Avatar Illustration SVG */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background circle */}
            <circle cx="50" cy="50" r="48" fill="#e8e8ff" />
            
            {/* Head shape */}
            <path d="M50 32 C38 32, 36 44, 36 54 C36 68, 42 74, 50 74 C58 74, 64 68, 64 54 C64 44, 62 32, 50 32 Z" fill="#ffd0a3" />
            
            {/* Hair back */}
            <path d="M33 50 C28 42, 32 30, 42 26 C52 22, 68 24, 69 36 C70 44, 65 48, 62 48" fill="#1e293b" />
            
            {/* Ears */}
            <circle cx="34" cy="55" r="5.5" fill="#ffa085" />
            <circle cx="66" cy="55" r="5.5" fill="#ffa085" />
            <circle cx="34" cy="55" r="4" fill="#ffd0a3" />
            <circle cx="66" cy="55" r="4" fill="#ffd0a3" />
            
            {/* Front Hair - Cute side-swept part */}
            <path d="M34 45 C38 32, 45 22, 58 24 C68 25, 68 34, 66 38 C60 30, 48 30, 42 38 C39 42, 36 45, 34 45 Z" fill="#1e293b" />
            <path d="M55 24 C65 24, 68 32, 69 40 C70 46, 67 48, 64 45 C64 36, 58 30, 52 28" fill="#0f172a" />
            
            {/* Glasses frame (Bold black rims) */}
            <circle cx="43" cy="52" r="9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
            <circle cx="57" cy="52" r="9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
            <path d="M48.5 52 L51.5 52" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M34 52 L31 51" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            <path d="M66 52 L69 51" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            
            {/* Eyes */}
            <circle cx="43" cy="52" r="2.5" fill="#1e293b" />
            <circle cx="57" cy="52" r="2.5" fill="#1e293b" />
            
            {/* Eyebrows */}
            <path d="M37 42 Q43 40 48 44" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            <path d="M63 42 Q57 40 52 44" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            
            {/* Blush cheeks */}
            <ellipse cx="38" cy="59" rx="3.5" ry="2.5" fill="#ff8a8a" opacity="0.6" />
            <ellipse cx="62" cy="59" rx="3.5" ry="2.5" fill="#ff8a8a" opacity="0.6" />
            
            {/* Smile nose & mouth */}
            <path d="M50 56 L50 58.5" fill="none" stroke="#e07a5f" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M46 63 Q50 67 54 63" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Pulse Glowing dot */}
        <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-[#388e3c] border-2 border-white animate-pulse" />
      </button>
    </div>
  );
}
