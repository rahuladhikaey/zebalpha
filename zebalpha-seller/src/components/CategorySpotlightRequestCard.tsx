"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Send, CheckCircle2, Clock, XCircle, Layers } from "lucide-react";
import { supabase } from "@shared/utils/supabaseClient";

interface MainCategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface SpotlightRequestItem {
  id: string;
  category_name: string;
  target_widget: string;
  brand_name: string;
  headline: string;
  offer_badge: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason?: string | null;
  created_at: string;
}

export function CategorySpotlightRequestCard({
  defaultBrandName = "",
  sellerProducts = [],
}: {
  defaultBrandName?: string;
  sellerProducts?: Array<{ id: string; name: string; image_url?: string | null }>;
}) {
  const [categories, setCategories] = useState<MainCategoryOption[]>([]);
  const [requests, setRequests] = useState<SpotlightRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [targetWidget, setTargetWidget] = useState("BRAND_SPOTLIGHT_GRID");
  const [brandName, setBrandName] = useState(defaultBrandName);
  const [headline, setHeadline] = useState("");
  const [offerBadge, setOfferBadge] = useState("Up to 50% Off");
  const [bannerUrl, setBannerUrl] = useState("");
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);

  useEffect(() => {
    if (defaultBrandName && !brandName) setBrandName(defaultBrandName);
  }, [defaultBrandName, brandName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch("/api/seller/marketing/category-spotlight", { headers, cache: "no-store" });
      const json = await res.json();
      if (json?.success && json.data) {
        const cats: MainCategoryOption[] = json.data.mainCategories || [];
        setCategories(cats);
        if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
        setRequests(json.data.requests || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleProduct = (id: string) => {
    setSelectedProdIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !brandName.trim() || !headline.trim()) {
      setMessage({ type: "err", text: "Please fill Category, Brand Name, and Campaign Headline." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/seller/marketing/category-spotlight", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category_id: categoryId,
          target_widget: targetWidget,
          brand_name: brandName,
          headline,
          offer_badge: offerBadge,
          banner_image_url: bannerUrl,
          product_ids: selectedProdIds,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: "err", text: json.error || "Failed to submit spotlight request." });
        return;
      }
      setMessage({
        type: "ok",
        text: "Submitted! Once Superadmin approves, your brand goes live on the Category Storefront.",
      });
      setHeadline("");
      setBannerUrl("");
      setSelectedProdIds([]);
      loadData();
    } catch (err: any) {
      setMessage({ type: "err", text: err?.message || "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8 rounded-[2rem] border border-[#EAD296] bg-white p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF6D6] border border-[#E6C775] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#9A6503]">
            <Layers className="h-3 w-3" /> Flipkart-Style Category Storefronts
          </span>
          <h2 className="mt-1.5 text-lg font-black text-[#14120F]">
            Feature Your Brand in Category Storefront
          </h2>
          <p className="text-xs font-medium text-[#6E5C3D] mt-0.5">
            Request placement in Men&apos;s Fashion, Women&apos;s Fashion, Beauty &amp; Care Hero Sliders, Spotlight Brands, or Fresh Finds.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-bold border ${
            message.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1">Target Main Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-[#E6D4A5] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#14120F]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1">Storefront Placement Slot</label>
          <select
            value={targetWidget}
            onChange={(e) => setTargetWidget(e.target.value)}
            className="w-full rounded-xl border border-[#E6D4A5] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#14120F]"
          >
            <option value="BRAND_SPOTLIGHT_GRID">Spotlight / Biggest Brands Grid</option>
            <option value="HERO_CAROUSEL">Top Hero Banner Slider</option>
            <option value="CURATED_SHELF">Fresh Finds / Expert Picks Shelf</option>
            <option value="COMBO_KITS_MARQUEE">Combo &amp; Kit Deals</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1">Brand / Store Name</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g. ZEBALPHA STUDIO"
            className="w-full rounded-xl border border-[#E6D4A5] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#14120F]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1">Offer Badge</label>
          <input
            type="text"
            value={offerBadge}
            onChange={(e) => setOfferBadge(e.target.value)}
            placeholder="e.g. Up to 50% Off / Under ₹399"
            className="w-full rounded-xl border border-[#E6D4A5] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#14120F]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1">Campaign Headline</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Heavyweight 240 GSM Streetwear Drop"
            className="w-full rounded-xl border border-[#E6D4A5] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#14120F]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1">
            Banner / Hero Image URL (optional — auto-uses product photo if empty)
          </label>
          <input
            type="text"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-[#E6D4A5] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#14120F]"
          />
        </div>

        {sellerProducts.length > 0 && (
          <div className="md:col-span-2">
            <label className="block text-[11px] font-extrabold text-[#5C4E35] mb-1.5">
              Highlight up to 4 Products ({selectedProdIds.length}/4 selected)
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sellerProducts.slice(0, 12).map((p) => {
                const picked = selectedProdIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={`shrink-0 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold cursor-pointer transition ${
                      picked
                        ? "border-[#14120F] bg-[#FFF6D6] text-[#14120F]"
                        : "border-[#E6D4A5] bg-white text-[#5C4E35]"
                    }`}
                  >
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="h-6 w-6 rounded object-cover" />
                    )}
                    <span className="max-w-[120px] truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#14120F] hover:bg-zinc-800 text-[#FFE68B] px-5 py-2.5 text-xs font-black cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting..." : "Submit for Admin Approval"}
          </button>
        </div>
      </form>

      {/* Submitted Requests Status List */}
      {requests.length > 0 && (
        <div className="pt-4 border-t border-[#F0E2BE] space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#6E5C3D]">
            Your Category Spotlight Requests ({requests.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[#F0E2BE] bg-[#FFFDF8] p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#14120F] truncate">
                    {r.brand_name} • {r.offer_badge}
                  </p>
                  <p className="text-[11px] text-[#6E5C3D] truncate">
                    {r.category_name} → {r.headline}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black shrink-0 ${
                    r.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-700"
                      : r.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {r.status === "APPROVED" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : r.status === "REJECTED" ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
