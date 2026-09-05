"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Upload, 
  X, 
  Check, 
  Layers, 
  Eye, 
  EyeOff,
  AlertCircle,
  ExternalLink
} from "lucide-react";

const TAXONOMY_OPTIONS = [
  "ALL",
  "POLOS",
  "T-SHIRTS",
  "HOODIES",
  "SHIRTS",
  "BOTTOMS",
  "LIMITED",
  "ACCESSORIES"
];

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  main_category: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export default function SellerCollectionsPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Form State
  const [form, setForm] = useState({
    name: "",
    main_category: "POLOS",
    image_url: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const [imagePreview, setImagePreview] = useState<string>("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      main_category: "POLOS",
      image_url: "",
      description: "",
      sort_order: categories.length,
      is_active: true,
    });
    setImagePreview("");
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: CategoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      main_category: item.main_category || "ALL",
      image_url: item.image_url || "",
      description: item.description || "",
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
    });
    setImagePreview(item.image_url || "");
    setError("");
    setIsModalOpen(true);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((prev) => ({ ...prev, image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Collection / Category name is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const method = editingId ? "PUT" : "POST";
      const payload = editingId ? { id: editingId, ...form } : form;

      const res = await fetch("/api/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Operation failed");
      }

      setSuccessMsg(editingId ? "Collection card updated successfully!" : "New collection card created successfully!");
      setIsModalOpen(false);
      fetchCategories();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}"?`)) return;

    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete");

      setSuccessMsg(`Collection "${name}" deleted successfully.`);
      fetchCategories();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const toggleActive = async (item: CategoryItem) => {
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Curated Collections
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
              Storefront Cards
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Upload and manage the collection cards displayed in the &quot;Curated Collections&quot; section of the Storefront.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-zinc-200 active:scale-95 shadow-lg cursor-pointer"
        >
          <Plus size={16} />
          <span>Upload Collection Card</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/70 border border-emerald-800 p-4 text-xs font-bold text-emerald-300 animate-fadeIn">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Collection Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
          <span className="text-xs text-zinc-400">Loading collection cards...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-3xl border border-zinc-800 bg-zinc-950 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
            <Sparkles size={28} />
          </div>
          <h3 className="text-base font-black text-white uppercase">No Curated Cards Uploaded Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-6">
            Upload your first collection card (e.g. Premium Polos, Oversized Tees) to have it feature live on the storefront.
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-zinc-200 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Upload First Collection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`group relative rounded-3xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                cat.is_active
                  ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  : "bg-zinc-950/50 border-zinc-900 opacity-60"
              }`}
            >
              <div>
                {/* Top Bar with Category & Active Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                    {cat.main_category || "ALL"}
                  </span>
                  <button
                    onClick={() => toggleActive(cat)}
                    title={cat.is_active ? "Card is visible on storefront" : "Card is hidden"}
                    className={`p-1.5 rounded-xl border transition-colors ${
                      cat.is_active
                        ? "border-emerald-800 bg-emerald-950/60 text-emerald-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500"
                    }`}
                  >
                    {cat.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>

                {/* Card Preview Image */}
                <div className="relative w-full h-40 rounded-2xl bg-zinc-900 border border-zinc-800/80 overflow-hidden flex items-center justify-center mb-4">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-600">
                      <Sparkles size={24} />
                      <span className="text-[10px] uppercase tracking-wider font-bold">No Image</span>
                    </div>
                  )}
                </div>

                {/* Name & Description */}
                <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Order: #{cat.sort_order}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                    title="Edit Collection"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-2 rounded-xl bg-rose-950/30 text-rose-400 border border-rose-900/40 hover:bg-rose-900/60 transition-colors cursor-pointer"
                    title="Delete Collection"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {editingId ? "Edit Collection Card" : "Upload New Collection Card"}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  This card will appear on the customer storefront under Curated Collections.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-800 p-3.5 text-xs text-rose-300">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Collection Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Collection / Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Polos, Oversized Tees"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white outline-none transition-all"
                />
              </div>

              {/* Main Taxonomy Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Filter Taxonomy Category
                </label>
                <select
                  value={form.main_category}
                  onChange={(e) => setForm({ ...form, main_category: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-white outline-none transition-all"
                >
                  {TAXONOMY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-500">
                  Matches the filter pills on the Storefront (e.g. POLOS, T-SHIRTS, HOODIES).
                </span>
              </div>

              {/* Image Upload / URL */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Card Cover Image
                </label>

                {imagePreview ? (
                  <div className="relative w-full h-44 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("");
                        setForm({ ...form, image_url: "" });
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/80 text-white border border-white/20 hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-600 transition-all cursor-pointer p-4 text-center">
                    <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Click to upload image
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      PNG, JPG or WebP (Max 2MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="pt-1">
                  <input
                    type="url"
                    placeholder="Or paste image URL (e.g. Unsplash or Cloudinary)"
                    value={form.image_url.startsWith("data:") ? "" : form.image_url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm({ ...form, image_url: url });
                      setImagePreview(url);
                    }}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-white outline-none"
                  />
                </div>
              </div>

              {/* Description / Subtitle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Description / Badge Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Supima Cotton, New Drops"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div>
                  <span className="text-xs font-bold text-white block">Active on Storefront</span>
                  <span className="text-[10px] text-zinc-400">Card will be visible to buyers immediately</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-white cursor-pointer accent-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Card" : "Publish Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
