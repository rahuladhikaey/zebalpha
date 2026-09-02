"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  "What is Urad Dal Bori?",
  "How do I cook Bori?",
  "Return Policy?",
  "Bulk order info",
  "Is it organic?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Asali Swad Assistant. I'm an expert on our premium Urad Dal Bori, and can also help with returns, refunds, bulk orders, or delivery questions. How can I help you today? 🤖",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

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
        const body = await response.json();
        throw new Error(body.error || "Something went wrong.");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err?.message ?? "Unable to get response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header title="AI Assistant" subtitle="Your Shopping Spark" />
      <main className="px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Main Container */}
          <div className="flex flex-col overflow-hidden rounded-[2.5rem] bg-zinc-950 shadow-2xl border border-zinc-800 h-[80vh]">
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-zinc-950">
              {/* Header inside chat */}
              <div className="text-center py-8 mb-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 text-3xl shadow-xl mb-4">
                  🤖
                </div>
                <h1 className="text-2xl font-black text-white font-outfit">Asali Swad Assistant</h1>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Always Active • Powered by AI</p>
              </div>

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[2rem] p-5 shadow-xl transition-all ${
                      message.role === "assistant"
                        ? "bg-zinc-900 text-white border border-zinc-800 rounded-tl-none"
                        : "bg-white text-black font-medium shadow-white/10 rounded-tr-none"
                    }`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${message.role === "assistant" ? "text-zinc-400" : "text-zinc-600"}`}>
                      {message.role === "assistant" ? "ASSISTANT" : "YOU"}
                    </p>
                    <p className="text-sm leading-7 font-medium whitespace-pre-line">{message.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] rounded-tl-none p-5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-white animate-bounce" />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="bg-rose-950/60 text-rose-400 text-xs font-bold px-4 py-2 rounded-full border border-rose-800/80">
                    ⚠️ {error}
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input & Quick Actions Area */}
            <div className="border-t border-zinc-800 p-4 bg-zinc-950">
              {/* Quick Actions */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-white hover:text-white transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Message Input */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(prompt); }}
                className="relative flex items-center gap-2"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 rounded-[1.5rem] bg-zinc-900 border border-zinc-800 px-6 py-4 text-sm font-medium text-white outline-none placeholder:text-zinc-500 focus:border-white transition"
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-white text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="h-5 w-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Context Footer */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "🍃", title: "100% natural", detail: "Pure urad dal bori" },
              { icon: "👵", title: "handmade", detail: "Traditional process" },
              { icon: "🚚", title: "fast delivery", detail: "At your doorstep" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-center gap-3 rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
                <span className="text-xl">{feature.icon}</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{feature.title}</p>
                  <p className="text-xs font-bold text-white">{feature.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

