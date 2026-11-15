"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Edit2, Loader2, Star } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useIsNativeApp } from "@/lib/platform";
import {
  broadcastReviewUpdated,
  type ProductRatingBreakdown,
  type ProductRatingSummary,
  type PublicReview,
} from "@/lib/productRatings";

export interface ReviewSubmissionSummary extends ProductRatingSummary {
  average?: number;
  count?: number;
  breakdown?: ProductRatingBreakdown["breakdown"];
}

export interface ProductRatingWidgetProps {
  productId: string | number;
  productName?: string;
  user?: { id?: string; email?: string | null } | null;
  variant?: "compact" | "card";
  initialReview?: PublicReview | null;
  onSubmitted?: (review: PublicReview, summary?: ReviewSubmissionSummary) => void;
}

export function ProductRatingWidget({
  productId,
  productName,
  user,
  variant = "compact",
  initialReview,
  onSubmitted,
}: ProductRatingWidgetProps) {
  const isNativeApp = useIsNativeApp();
  const [rating, setRating] = useState<number>(initialReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(initialReview?.comment || "");
  const [savedReview, setSavedReview] = useState<PublicReview | null>(initialReview ?? null);
  const [isEditing, setIsEditing] = useState<boolean>(!initialReview);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(
    initialReview === undefined && Boolean(productId)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusNotice, setStatusNotice] = useState<string>("");

  // Self-load existing user review via authenticated API when initialReview wasn't supplied
  useEffect(() => {
    if (initialReview !== undefined || !productId) {
      return;
    }

    let cancelled = false;
    async function loadExisting() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token && !user?.id) {
          if (!cancelled) setLoadingInitial(false);
          return;
        }

        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
          `/api/reviews?productId=${encodeURIComponent(String(productId))}`,
          { headers, cache: "no-store" }
        );
        if (!res.ok) {
          if (!cancelled) setLoadingInitial(false);
          return;
        }
        const json = await res.json();
        if (!cancelled && json?.success && json.userReview) {
          setSavedReview(json.userReview);
          setRating(Number(json.userReview.rating) || 0);
          setComment(json.userReview.comment || "");
          setIsEditing(false);
        }
      } catch {
        // Leave form editable on load failure
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [productId, user?.id, initialReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatusNotice("");

    if (!productId || rating < 1 || rating > 5) {
      setErrorMsg("Please tap a star rating (1 to 5) before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setErrorMsg("Please sign in to save your product rating.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: String(productId),
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.review) {
        setErrorMsg(data?.error || "Could not save your rating right now. Please try again.");
        return;
      }

      const persisted: PublicReview = data.review;
      setSavedReview(persisted);
      setRating(persisted.rating);
      setComment(persisted.comment || "");
      setIsEditing(false);
      setStatusNotice(data.updated ? "Rating updated globally" : "Rating saved globally");

      broadcastReviewUpdated(
        productId,
        data.summary
          ? {
              rating: Number(data.summary.average ?? data.summary.rating ?? persisted.rating),
              review_count: Number(data.summary.count ?? data.summary.review_count ?? 1),
            }
          : undefined
      );

      if (onSubmitted) {
        onSubmitted(persisted, data.summary);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error while saving rating.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div
        className={`flex items-center gap-2 text-xs font-bold py-1.5 ${
          isNativeApp ? "text-[#6D604A]" : "text-zinc-400"
        }`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading rating...
      </div>
    );
  }

  const displayStarCount = hoverRating || rating;

  if (!isEditing && savedReview) {
    return (
      <div
        className={
          variant === "card"
            ? `rounded-[1.75rem] border p-5 space-y-2.5 ${
                isNativeApp
                  ? "bg-[#FFFDF7] border-[#E8D5A8] text-[#111111]"
                  : "bg-zinc-950 border-zinc-800 text-white"
              }`
            : "flex flex-col gap-1.5 pt-1"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-black ${
                isNativeApp ? "text-emerald-700" : "text-emerald-400"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {statusNotice || "Your rating:"}
            </span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className={
                    i < savedReview.rating
                      ? "fill-amber-400 text-amber-400"
                      : isNativeApp
                        ? "text-[#DFD5C0]"
                        : "text-zinc-700"
                  }
                />
              ))}
            </div>
            <span className={`text-xs font-black ${isNativeApp ? "text-[#111111]" : "text-white"}`}>
              ({savedReview.rating}/5)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setErrorMsg("");
              setStatusNotice("");
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer transition ${
              isNativeApp
                ? "border-[#E4C988] bg-[#FAF0D1] text-[#111111] hover:bg-[#F3E2B3]"
                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <Edit2 className="h-2.5 w-2.5" />
            Edit Rating
          </button>
        </div>

        {savedReview.comment && (
          <p
            className={`text-xs font-medium italic line-clamp-2 ${
              isNativeApp ? "text-[#5C503B]" : "text-zinc-400"
            }`}
          >
            &ldquo;{savedReview.comment}&rdquo;
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        variant === "card"
          ? `rounded-[1.75rem] border p-5 sm:p-6 space-y-4 ${
              isNativeApp
                ? "bg-[#FFFDF7] border-[#E8D5A8] text-[#111111] shadow-sm"
                : "bg-zinc-950 border-zinc-800 text-white shadow-xl"
            }`
          : "space-y-2.5 pt-1"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p
            className={`text-[11px] font-black uppercase tracking-wider ${
              isNativeApp ? "text-[#5C503B]" : "text-zinc-300"
            }`}
          >
            {savedReview
              ? "Update Your Rating"
              : variant === "card"
                ? "Rate & Review This Product"
                : productName
                  ? `Rate ${productName}`
                  : "Rate Product"}
          </p>
          {variant === "card" && (
            <p className={`text-[11px] font-medium ${isNativeApp ? "text-[#7A6C52]" : "text-zinc-500"}`}>
              Your rating updates immediately across all ZebAlpha product pages.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => {
                setRating(star);
                setErrorMsg("");
              }}
              aria-label={`Rate ${star} out of 5 stars`}
              className="focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer p-0.5"
            >
              <Star
                size={variant === "card" ? 22 : 17}
                className={
                  star <= displayStarCount
                    ? "fill-amber-400 text-amber-400"
                    : isNativeApp
                      ? "text-[#D4C5A6]"
                      : "text-zinc-700"
                }
              />
            </button>
          ))}
        </div>
      </div>

      {(rating > 0 || variant === "card") && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Share fit, fabric or quality feedback (optional)..."
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none ${
              isNativeApp
                ? "border-[#DFC78E] bg-white text-[#111111] placeholder:text-[#8B7D63] focus:border-[#B98718]"
                : "border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-zinc-500"
            }`}
          />
          <div className="flex items-center gap-2 shrink-0">
            {savedReview && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setRating(savedReview.rating);
                  setComment(savedReview.comment || "");
                  setErrorMsg("");
                }}
                className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wider cursor-pointer ${
                  isNativeApp
                    ? "border-[#DFC78E] text-[#5C503B] hover:bg-[#FAF0D1]"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition disabled:opacity-50 cursor-pointer ${
                isNativeApp
                  ? "bg-gradient-to-r from-[#F6CE5B] to-[#D9A128] text-[#111111] shadow-sm hover:brightness-105"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? "Saving..." : savedReview ? "Update" : "Submit Rating"}
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${
            isNativeApp
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-red-500/40 bg-red-950/60 text-red-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {errorMsg}
          </span>
          {errorMsg.toLowerCase().includes("sign in") && (
            <Link
              href="/login"
              className={`underline font-black ${isNativeApp ? "text-[#111111]" : "text-white"}`}
            >
              Sign in →
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
