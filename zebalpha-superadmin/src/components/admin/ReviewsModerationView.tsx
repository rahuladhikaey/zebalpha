"use client";

import { useState, useEffect } from "react";
import { Star, Trash2, ShieldAlert, CheckCircle2, Search, MessageSquare } from "lucide-react";

export default function ReviewsModerationView() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("asali_swad_reviews");
      if (stored) {
        try {
          setReviews(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleRemoveReview = (id: number | string) => {
    if (!confirm("Are you sure you want to remove this customer review?")) return;
    const updated = reviews.filter(r => r.id !== id);
    setReviews(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("asali_swad_reviews", JSON.stringify(updated));
    }
  };

  const filteredReviews = reviews.filter(r => 
    (r.product_name || r.product || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.comment || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Quality Moderation</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Customer Reviews & Ratings Control</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Monitor customer feedback, remove spam or abusive reviews, and safeguard marketplace trust.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search review content or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredReviews.length > 0 ? (
          filteredReviews.map(rev => (
            <div key={rev.id} className="p-5 rounded-3xl border border-zinc-800 bg-zinc-950 shadow-xl flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-xs">{rev.product_name || rev.product || "Organic Product"}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "text-white fill-current" : "text-zinc-700"}`} />
                  ))}
                  <span className="text-[11px] text-zinc-400 ml-2 font-bold">— {rev.user_name || rev.reviewer || "Customer"}</span>
                </div>
                <p className="text-xs text-zinc-300 font-medium">{rev.comment}</p>
              </div>

              <button
                onClick={() => handleRemoveReview(rev.id)}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-rose-950/60 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                title="Remove Review"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-3xl bg-zinc-950 p-12 text-center border border-zinc-800 shadow-xl">
            <MessageSquare className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
            <h3 className="text-lg font-black text-white">No Customer Reviews Found</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto font-medium">
              Submitted customer feedback and ratings will appear here for moderation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
