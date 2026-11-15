"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Star, Trash2, Search, MessageSquare } from "lucide-react";

interface AdminReviewItem {
  id: number | string;
  product_id: string | number;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  rating: number;
  comment?: string | null;
  is_approved?: boolean | null;
  created_at: string;
  updated_at?: string;
  resolved_product_name: string;
}

interface RawReviewRow {
  id: number | string;
  product_id: string | number;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  rating: number;
  comment?: string | null;
  is_approved?: boolean | null;
  created_at: string;
  updated_at?: string;
}

export default function ReviewsModerationView() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchReviews() {
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("id, product_id, user_id, user_name, user_email, rating, comment, is_approved, created_at, updated_at")
          .order("created_at", { ascending: false });
        if (error || !Array.isArray(data)) {
          setReviews([]);
          return;
        }

        const typedRows = data as RawReviewRow[];
        const productIds = Array.from(
          new Set(typedRows.map((r) => r.product_id).filter(Boolean).map(String))
        );
        const productNameMap = new Map<string, string>();
        if (productIds.length > 0) {
          const { data: prodRows } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);
          if (Array.isArray(prodRows)) {
            (prodRows as Array<{ id?: string | number; name?: string }>).forEach((p) => {
              if (p?.id && p?.name) productNameMap.set(String(p.id), p.name);
            });
          }
        }

        setReviews(
          typedRows.map((r) => ({
            ...r,
            resolved_product_name:
              (r.product_id && productNameMap.get(String(r.product_id))) ||
              `Product #${String(r.product_id || "").slice(0, 8)}`,
          }))
        );
      } catch {
        setReviews([]);
      }
    }
    fetchReviews();
  }, []);

  const handleToggleApproval = async (id: number | string, currentApproved: boolean) => {
    try {
      const nextApproved = !currentApproved;
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: nextApproved, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_approved: nextApproved } : r))
        );
      }
    } catch (e) {
      console.error("Error updating review visibility:", e);
    }
  };

  const handleRemoveReview = async (id: number | string) => {
    if (!confirm("Are you sure you want to remove this customer review?")) return;
    try {
      await supabase.from("reviews").delete().eq("id", id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Error removing review:", e);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.resolved_product_name || "").toLowerCase().includes(q) ||
      (r.user_name || "").toLowerCase().includes(q) ||
      (r.comment || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Quality Moderation</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Customer Reviews &amp; Ratings Control</h1>
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
          filteredReviews.map((rev) => (
            <div key={rev.id} className="p-5 rounded-3xl border border-zinc-800 bg-zinc-950 shadow-xl flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-white text-xs">{rev.resolved_product_name || "Product"}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      rev.is_approved !== false
                        ? "bg-emerald-950/60 border-emerald-700/50 text-emerald-300"
                        : "bg-amber-950/60 border-amber-700/50 text-amber-300"
                    }`}
                  >
                    {rev.is_approved !== false ? "Published Globally" : "Hidden"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "text-amber-400 fill-amber-400" : "text-zinc-700"}`} />
                  ))}
                  <span className="text-[11px] text-zinc-400 ml-2 font-bold">— {rev.user_name || "Customer"}</span>
                </div>
                {rev.comment && <p className="text-xs text-zinc-300 font-medium">{rev.comment}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleApproval(rev.id, rev.is_approved !== false)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                  title={rev.is_approved !== false ? "Hide Review" : "Publish Review"}
                >
                  {rev.is_approved !== false ? "Hide" : "Publish"}
                </button>
                <button
                  onClick={() => handleRemoveReview(rev.id)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-rose-950/60 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Remove Review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
