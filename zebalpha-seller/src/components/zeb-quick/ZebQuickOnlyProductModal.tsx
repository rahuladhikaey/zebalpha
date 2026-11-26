"use client";

import { useState, useMemo } from "react";
import { X, Zap, ShieldAlert, Upload } from "lucide-react";
import { supabase } from "@shared/utils/supabaseClient";
import { compressImageTo100KB, uploadToCloudinary } from "@shared/services";
import { ZEB_QUICK_ALLOWED_SUBCATEGORIES, type ZebQuickSubcategoryDef } from "@shared/constants/zebQuick";

interface ZebQuickOnlyProductModalProps {
  open: boolean;
  onClose: () => void;
  allowedSubcategories?: ZebQuickSubcategoryDef[];
  mainCategories?: Array<{ id: string; slug: string; name: string }>;
  onCreated: (createdProduct: any) => void;
}

export function ZebQuickOnlyProductModal({
  open,
  onClose,
  allowedSubcategories,
  mainCategories,
  onCreated,
}: ZebQuickOnlyProductModalProps) {
  const subs = allowedSubcategories && allowedSubcategories.length > 0
    ? allowedSubcategories
    : ZEB_QUICK_ALLOWED_SUBCATEGORIES;

  const groups = useMemo(() => {
    const fromMain = (mainCategories || []).map((m) => m.name).filter(Boolean);
    const fromSubs = subs.map((s) => s.categoryGroup).filter(Boolean);
    return Array.from(new Set([...fromMain, ...fromSubs]));
  }, [mainCategories, subs]);

  const [categoryGroup, setCategoryGroup] = useState<string>(groups[0] || "Women's Innerwear");
  const filteredSubs = useMemo(
    () => subs.filter((s) => s.categoryGroup === categoryGroup),
    [subs, categoryGroup]
  );
  const [subcategorySlug, setSubcategorySlug] = useState<string>(filteredSubs[0]?.slug || subs[0]?.slug || "");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("20");
  const [sizesText, setSizesText] = useState("S, M, L, XL");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGroupChange = (nextGroup: string) => {
    setCategoryGroup(nextGroup);
    const nextSubs = subs.filter((s) => s.categoryGroup === nextGroup);
    setSubcategorySlug(nextSubs[0]?.slug || "");
  };

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const uploaded: string[] = [];
    for (const file of files.slice(0, 4 - imageUrls.length)) {
      try {
        const { blob } = await compressImageTo100KB(file, 150 * 1024);
        const compressedFile = new File([blob], file.name || "zebquick.jpg", { type: blob.type || "image/jpeg" });
        const url = await uploadToCloudinary(compressedFile);
        if (url) uploaded.push(url);
      } catch (err: any) {
        setError(err?.message || "Image upload failed");
      }
    }
    if (uploaded.length > 0) {
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 4));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalImages = manualImageUrl.trim()
      ? Array.from(new Set([...imageUrls, manualImageUrl.trim()]))
      : imageUrls;

    if (!title.trim() || !categoryGroup || !subcategorySlug || Number(price) <= 0) {
      setError("Please fill Title, Main Category, Subcategory, and a valid Express Price.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const sizes = sizesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/zeb-quick/products", {
        method: "POST",
        headers,
        body: JSON.stringify({
          zebquick_only: true,
          title: title.trim(),
          category_group: categoryGroup,
          subcategory_slug: subcategorySlug,
          price: Number(price),
          mrp: mrp ? Number(mrp) : null,
          stock: Number(stock || 20),
          sizes,
          description: description.trim(),
          image_url: finalImages[0] || "",
          images: finalImages,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not create ZebQuick-Only product.");
        setSubmitting(false);
        return;
      }

      onCreated(json.product);
      setTitle("");
      setPrice("");
      setMrp("");
      setDescription("");
      setImageUrls([]);
      setManualImageUrl("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
              <Zap className="h-3 w-3 fill-amber-400" />
              ZebQuick-Only Catalog
            </div>
            <h2 className="mt-1.5 text-lg font-black">Add ZebQuick Exclusive Product</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Isolated to ZebQuick:</strong> Products added here go live <strong>ONLY on ZebQuick (5–6 Hr Express)</strong> and will <strong>never</strong> appear or go live on main ZebAlpha.
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-400">Main Category</label>
              <select
                value={categoryGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-white"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-400">Subcategory</label>
              <select
                value={subcategorySlug}
                onChange={(e) => setSubcategorySlug(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-white"
              >
                {filteredSubs.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-zinc-400">Product Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cotton Everyday Comfort Bra (Pack of 2)"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-400">Express Price (₹)</label>
              <input
                required
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299"
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-400">MRP (₹)</label>
              <input
                type="number"
                min="1"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="499"
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-400">Stock</label>
              <input
                required
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-zinc-400">Sizes (comma-separated)</label>
            <input
              value={sizesText}
              onChange={(e) => setSizesText(e.target.value)}
              placeholder="S, M, L, XL"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-zinc-400">Product Images</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-amber-400 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Upload Photos
                <input type="file" accept="image/*" multiple onChange={handleImageFiles} className="hidden" />
              </label>
              <input
                value={manualImageUrl}
                onChange={(e) => setManualImageUrl(e.target.value)}
                placeholder="or paste image URL..."
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
              />
            </div>
            {imageUrls.length > 0 && (
              <div className="mt-2 flex gap-2">
                {imageUrls.map((url, idx) => (
                  <img key={idx} src={url} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-zinc-700" />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-zinc-400">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Soft breathable fabric, discreet sealed packaging..."
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-orange-400 via-orange-500 to-[#EE2B00] px-5 py-2 text-xs font-black text-white shadow-[0_3px_0_#9a3412] active:translate-y-0.5 cursor-pointer disabled:opacity-60"
            >
              <Zap className="h-3.5 w-3.5 fill-white" />
              {submitting ? "Publishing..." : "Publish to ZebQuick Only"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
