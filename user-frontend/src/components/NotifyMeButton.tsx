"use client";

import { useState } from "react";
import { Product } from "@/lib/types";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function NotifyMeButton({ product, className }: { product: Product, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const { session } = useAuth();

  const handleNotifyClick = async () => {
    if (session) {
      setLoading(true);
      setStatus("idle");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            productName: product.name,
            customerName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
            phone: session.user.phone || session.user.user_metadata?.phone || "",
            email: session.user.email || ""
          })
        });
        if (res.ok) {
          alert("Notification alert set successfully! We'll notify you when it's back in stock.");
        } else {
          alert("Failed to save request. Please try again.");
        }
      } catch {
        alert("Failed to save request. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setIsOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          customerName: formData.name,
          phone: formData.phone,
          email: formData.email
        })
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleNotifyClick}
        disabled={loading}
        className={className || "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"}
      >
        <Bell size={14} />
        {loading ? "Saving..." : "Notify Me"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-2">Back in Stock Alert</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">
              Leave your details and we'll notify you when <strong>{product.name}</strong> is back in stock.
            </p>

            {status === "success" ? (
              <div className="rounded-2xl bg-emerald-50 p-6 text-center border border-emerald-100">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                  <Bell className="text-emerald-600" />
                </div>
                <h4 className="text-sm font-black text-emerald-900 mb-1">Alert Set!</h4>
                <p className="text-xs font-bold text-emerald-700 mb-6">We'll let you know as soon as it arrives.</p>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input 
                    required
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                <div>
                  <input 
                    required
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                <div>
                  <input 
                    type="email"
                    placeholder="Email Address (Optional)"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                
                {status === "error" && (
                  <p className="text-xs font-bold text-rose-500">Failed to save request. Please try again.</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Notify Me"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
