"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  Search,
  RefreshCw,
  Layers,
  Sparkles,
  GitMerge,
  ChevronDown,
  ChevronRight,
  Clock,
  Send,
} from "lucide-react";
import {
  CategoryIconRenderer,
  CATEGORY_ICON_REGISTRY,
  CategoryIconKey,
  resolveCategoryIcon,
} from "@/lib/categoryIcons";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  created_by?: string | null;
  icon_key?: string | null;
  icon_url?: string | null;
  icon_source?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  show_in_navigation: boolean;
  product_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryRequestItem {
  id: string;
  category_id?: string;
  seller_id: string;
  seller_name?: string;
  seller_email?: string;
  parent_category_id: string;
  name: string;
  slug: string;
  proposed_name?: string;
  proposed_slug?: string;
  description?: string | null;
  product_count?: number;
  is_active: boolean;
  status?: string;
  show_in_navigation?: boolean;
  icon_key?: string | null;
  icon_source?: string | null;
  created_at: string;
  parent_category?: { id: string; name: string; slug: string };
  source?: string;
}

export default function CategoryManagementView({
  onRefresh,
}: {
  onRefresh?: (isInitial?: boolean) => void | Promise<void>;
} = {}) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [requests, setRequests] = useState<CategoryRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"categories" | "requests">("categories");
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Expanded main categories to view child subcategories
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Selected for edit/merge
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parent_id: "" as string | null,
    icon_key: "shirt" as CategoryIconKey,
    icon_source: "AUTO" as "AUTO" | "ADMIN",
    icon_url: "",
    image_url: "",
    display_order: 0,
    show_in_navigation: true,
    is_active: true,
  });

  // Live Auto-Icon Preview calculation
  const liveIconResolution = useMemo(() => {
    return resolveCategoryIcon(formData.name, formData.icon_key, formData.icon_source);
  }, [formData.name, formData.icon_key, formData.icon_source]);

  // Load Categories & Proposals
  const fetchData = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const [catResult, reqResult] = await Promise.allSettled([
        fetch("/api/admin/categories?include_inactive=true", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/category-requests", { cache: "no-store" }).then(r => r.json()),
      ]);

      let categoriesLoaded = false;
      if (catResult.status === "fulfilled" && catResult.value?.success && Array.isArray(catResult.value.data) && catResult.value.data.length > 0) {
        setCategories(catResult.value.data);
        categoriesLoaded = true;
      }

      if (reqResult.status === "fulfilled" && reqResult.value?.success && Array.isArray(reqResult.value.data)) {
        setRequests(reqResult.value.data);
      }

      // Resilient fallback: directly fetch from Supabase if API endpoint returned error or empty
      if (!categoriesLoaded) {
        try {
          const { supabase } = await import("@shared/utils/supabaseClient");
          const { data: dbCats, error: dbErr } = await supabase
            .from("categories")
            .select("id, name, slug, description, icon_key, icon_url, icon_source, image_url, display_order, is_active, show_in_navigation, parent_id, created_by, created_at, updated_at")
            .order("display_order", { ascending: true })
            .order("name", { ascending: true });

          if (!dbErr && dbCats && dbCats.length > 0) {
            const mapped = dbCats.map((cat: any) => {
              const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
              return {
                ...cat,
                icon_key: cat.icon_key && cat.icon_source === "ADMIN" ? cat.icon_key : resolved.icon_key,
                icon_source: cat.icon_source || resolved.icon_source,
                product_count: 0,
              };
            });
            setCategories(mapped);
            categoriesLoaded = true;
          }
        } catch (clientErr) {
          console.warn("Client fallback query notice:", clientErr);
        }
      }

      if (!categoriesLoaded) {
        setStatusMessage({ text: "Failed to load category data from server.", type: "error" });
      }
    } catch (err: any) {
      console.error("Fetch categories error:", err);
      // Emergency client fallback
      try {
        const { supabase } = await import("@shared/utils/supabaseClient");
        const { data: dbCats } = await supabase
          .from("categories")
          .select("id, name, slug, description, icon_key, icon_url, icon_source, image_url, display_order, is_active, show_in_navigation, parent_id, created_by, created_at, updated_at")
          .order("display_order", { ascending: true });
        if (dbCats && dbCats.length > 0) {
          setCategories(dbCats as any);
        } else {
          setStatusMessage({ text: "Failed to load category data from server.", type: "error" });
        }
      } catch (_) {
        setStatusMessage({ text: "Failed to load category data from server.", type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Split into Main Categories and Subcategories
  const mainCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.display_order - b.display_order);
  }, [categories]);

  const subcategoriesMap = useMemo(() => {
    const map: Record<string, CategoryItem[]> = {};
    for (const c of categories) {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = [];
        map[c.parent_id].push(c);
      }
    }
    return map;
  }, [categories]);

  // Filtered Main Categories by search
  const filteredMainCategories = useMemo(() => {
    if (!search.trim()) return mainCategories;
    const q = search.toLowerCase();
    return mainCategories.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (subcategoriesMap[m.id] || []).some((s) => s.name.toLowerCase().includes(q))
    );
  }, [mainCategories, subcategoriesMap, search]);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Create Modal
  const openCreateModal = (parentId: string | null = null) => {
    const nextOrder = parentId ? 10 : mainCategories.length + 1;
    setFormData({
      name: "",
      slug: "",
      description: "",
      parent_id: parentId,
      icon_key: "shirt",
      icon_source: "AUTO",
      icon_url: "",
      image_url: "",
      display_order: nextOrder,
      show_in_navigation: true,
      is_active: true,
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id || null,
      icon_key: (cat.icon_key as CategoryIconKey) || "package",
      icon_source: (cat.icon_source as any) || "AUTO",
      icon_url: cat.icon_url || "",
      image_url: cat.image_url || "",
      display_order: cat.display_order || 0,
      show_in_navigation: cat.show_in_navigation !== false,
      is_active: cat.is_active !== false,
    });
    setIsEditModalOpen(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to create category");

      setStatusMessage({ text: `Category "${formData.name}" created successfully.`, type: "success" });
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCategory.id, updates: formData }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update category");

      setStatusMessage({ text: `Category updated successfully.`, type: "success" });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    }
  };

  // Quick Toggle Active/Navigation
  const handleToggle = async (cat: CategoryItem, field: "is_active" | "show_in_navigation") => {
    try {
      const newVal = !cat[field];
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, updates: { [field]: newVal } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, [field]: newVal } : c))
      );
    } catch (err: any) {
      setStatusMessage({ text: `Failed to toggle: ${err.message}`, type: "error" });
    }
  };

  // Quick Display Order Change
  const handleOrderChange = async (cat: CategoryItem, delta: number) => {
    const newOrder = Math.max(0, cat.display_order + delta);
    try {
      await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, updates: { display_order: newOrder } }),
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, display_order: newOrder } : c))
      );
    } catch (_) { }
  };

  // Delete or Safe Archive Category
  const handleDeleteCategory = async (cat: CategoryItem) => {
    const confirmMsg = cat.product_count && cat.product_count > 0
      ? `This category has ${cat.product_count} active product(s). It will be safely archived (hidden from navigation) to protect product history. Proceed?`
      : `Are you sure you want to delete category "${cat.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setStatusMessage({ text: json.message || "Category removed.", type: "success" });
      fetchData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    }
  };

  // Merge Category Submit
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !mergeTargetId || selectedCategory.id === mergeTargetId) {
      alert("Please select a valid destination category to merge into.");
      return;
    }

    if (!window.confirm(`Merge all products from "${selectedCategory.name}" into target category and archive "${selectedCategory.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${selectedCategory.id}&merge_into_id=${mergeTargetId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setStatusMessage({ text: "Categories merged successfully.", type: "success" });
      setIsMergeModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    }
  };

  // Quick Toggle Active Status for Seller Subcategory
  const handleToggleSellerSubcategory = async (sub: CategoryRequestItem) => {
    const targetId = sub.category_id || sub.id;
    const newVal = !sub.is_active;
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId, updates: { is_active: newVal } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setRequests((prev) =>
        prev.map((r) => (r.id === sub.id ? { ...r, is_active: newVal } : r))
      );
      setCategories((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, is_active: newVal } : c))
      );
      setStatusMessage({
        text: `Subcategory "${sub.name}" is now ${newVal ? "Active" : "Inactive"}.`,
        type: "success",
      });
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-950 border border-zinc-850 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white text-black font-black">
              <FolderTree size={20} />
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              Category Navigation & Hierarchy
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Manage Main Categories, customer navigation bar, and view subcategories added by sellers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => openCreateModal(null)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-lg shadow-white/10 active:scale-95"
          >
            <Plus size={15} /> Add Main Category
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${statusMessage.type === "success"
            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
            : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("categories")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${activeSubTab === "categories"
            ? "bg-white text-black shadow-md"
            : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
        >
          <Layers size={14} /> Main Categories ({mainCategories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("requests")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 relative ${activeSubTab === "requests"
            ? "bg-white text-black shadow-md"
            : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
        >
          <FolderTree size={14} /> Seller Added Subcategories ({requests.length})
        </button>
      </div>

      {/* SUBTAB 1: Main Categories & Subcategories Hierarchy */}
      {activeSubTab === "categories" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search category by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-850 text-xs font-semibold text-white focus:outline-none focus:border-white transition"
            />
          </div>

          {/* Categories Table / Card Grid */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-850 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-900/60 text-zinc-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3.5 px-4 w-12 text-center">Order</th>
                    <th className="py-3.5 px-4">Icon & Category</th>
                    <th className="py-3.5 px-4">Slug</th>
                    <th className="py-3.5 px-4 text-center">Nav Bar</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Products</th>
                    <th className="py-3.5 px-4 text-center">Subcategories</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredMainCategories.map((mainCat) => {
                    const subcats = subcategoriesMap[mainCat.id] || [];
                    const isExpanded = !!expandedParents[mainCat.id];

                    return (
                      <React.Fragment key={mainCat.id}>
                        {/* Main Category Row */}
                        <tr className="hover:bg-zinc-900/40 transition">
                          {/* Order with quick buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-mono font-black text-white">{mainCat.display_order}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  onClick={() => handleOrderChange(mainCat, -1)}
                                  className="text-[9px] text-zinc-500 hover:text-white"
                                  title="Move up"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => handleOrderChange(mainCat, 1)}
                                  className="text-[9px] text-zinc-500 hover:text-white"
                                  title="Move down"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Icon & Category Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                                <CategoryIconRenderer
                                  iconKey={mainCat.icon_key}
                                  iconUrl={mainCat.icon_url}
                                  size={18}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-white text-sm tracking-tight truncate">
                                    {mainCat.name}
                                  </p>
                                  {mainCat.icon_source === "AUTO" && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                      AUTO ICON
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-400 truncate max-w-xs">
                                  {mainCat.description || "No description"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Slug */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                            /{mainCat.slug}
                          </td>

                          {/* Show in Navigation Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(mainCat, "show_in_navigation")}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${mainCat.show_in_navigation
                                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                }`}
                              title={mainCat.show_in_navigation ? "Visible in category bar" : "Hidden from category bar"}
                            >
                              {mainCat.show_in_navigation ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </td>

                          {/* Status Active Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(mainCat, "is_active")}
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition cursor-pointer ${mainCat.is_active
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                }`}
                            >
                              {mainCat.is_active ? "Active" : "Archived"}
                            </button>
                          </td>

                          {/* Product Count (Zero Fake Data) */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-white bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                              {mainCat.product_count || 0}
                            </span>
                          </td>

                          {/* Subcategories count & expand */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(mainCat.id)}
                              className="inline-flex items-center gap-1.5 font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 cursor-pointer"
                            >
                              <span>{subcats.length} subcats</span>
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCreateModal(mainCat.id)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
                                title="Add Subcategory under this"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(mainCat)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(mainCat);
                                  setMergeTargetId("");
                                  setIsMergeModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
                                title="Merge Duplicate Category"
                              >
                                <GitMerge size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(mainCat)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-rose-400 border border-transparent hover:border-rose-500/40 transition cursor-pointer"
                                title="Archive / Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Subcategories Expanded Rows */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/90">
                            <td colSpan={8} className="p-4 border-l-2 border-zinc-700 bg-zinc-950/80">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                                    Subcategories of {mainCat.name} ({subcats.length})
                                  </h4>
                                  <button
                                    onClick={() => openCreateModal(mainCat.id)}
                                    className="text-[11px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus size={12} /> Add Subcategory
                                  </button>
                                </div>

                                {subcats.length === 0 ? (
                                  <p className="text-xs text-zinc-500 italic py-2">
                                    No subcategories configured yet under {mainCat.name}. Click "Add Subcategory" to add one or approve seller proposals.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {subcats.map((sub) => (
                                      <div
                                        key={sub.id}
                                        className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <CategoryIconRenderer iconKey={sub.icon_key} size={15} />
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <p className="font-bold text-white text-xs truncate">{sub.name}</p>
                                              {sub.created_by && (
                                                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                                  Seller
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 font-mono">/{sub.slug}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                            {sub.product_count || 0} prods
                                          </span>
                                          <button
                                            onClick={() => openEditModal(sub)}
                                            className="p-1 text-zinc-400 hover:text-white"
                                            title="Edit Subcategory"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteCategory(sub)}
                                            className="p-1 text-zinc-400 hover:text-rose-400"
                                            title="Delete Subcategory"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredMainCategories.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FolderTree size={32} className="text-zinc-600 mb-1" />
                          <p className="text-sm font-bold text-white uppercase tracking-wider">No Main Categories In Database</p>
                          <p className="text-xs text-zinc-500 max-w-sm">
                            Click &quot;+ ADD MAIN CATEGORY&quot; above to create your first official marketplace category.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Seller Added Subcategories */}
      {activeSubTab === "requests" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-white">Seller Added Subcategories</h3>
              <p className="text-xs text-zinc-400 font-medium">
                Subcategories created directly by sellers in the catalog. Admin can view, edit, toggle visibility, or delete them.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
              {requests.length} Subcategories Added
            </span>
          </div>

          <div className="rounded-3xl bg-zinc-950 border border-zinc-850 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-900/60 text-zinc-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3.5 px-4">Subcategory</th>
                    <th className="py-3.5 px-4">Parent Main Category</th>
                    <th className="py-3.5 px-4">Created By Seller</th>
                    <th className="py-3.5 px-4 text-center">Products</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Created At</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-500">
                        No seller subcategories added yet. When sellers add subcategories during product listing, they will appear here.
                      </td>
                    </tr>
                  ) : (
                    requests.map((reqItem) => {
                      const categoryEquivalent: CategoryItem = {
                        id: reqItem.category_id || reqItem.id,
                        name: reqItem.name || reqItem.proposed_name || "Subcategory",
                        slug: reqItem.slug || reqItem.proposed_slug || "",
                        description: reqItem.description,
                        parent_id: reqItem.parent_category_id,
                        icon_key: reqItem.icon_key,
                        icon_source: reqItem.icon_source,
                        display_order: 10,
                        is_active: reqItem.is_active,
                        show_in_navigation: reqItem.show_in_navigation !== false,
                        product_count: reqItem.product_count,
                        created_by: reqItem.seller_id,
                        created_at: reqItem.created_at,
                      };

                      return (
                        <tr key={reqItem.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                                <CategoryIconRenderer iconKey={reqItem.icon_key} size={14} />
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">
                                  {reqItem.name || reqItem.proposed_name}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500">
                                  /{reqItem.slug || reqItem.proposed_slug}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
                              {reqItem.parent_category?.name || "Main Category"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-white text-xs">
                                {reqItem.seller_name || `Seller #${reqItem.seller_id?.slice(0, 8)}`}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-500">
                                {reqItem.seller_id?.slice(0, 8)}...
                              </p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono text-xs font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              {reqItem.product_count || 0}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSellerSubcategory(reqItem)}
                              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition cursor-pointer ${reqItem.is_active
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                                }`}
                              title={reqItem.is_active ? "Click to Deactivate" : "Click to Activate"}
                            >
                              {reqItem.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center text-zinc-400 text-[11px]">
                            {new Date(reqItem.created_at).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(categoryEquivalent)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
                                title="Edit Subcategory"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(categoryEquivalent);
                                  setMergeTargetId("");
                                  setIsMergeModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
                                title="Merge Subcategory"
                              >
                                <GitMerge size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(categoryEquivalent)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-rose-400 border border-transparent hover:border-rose-500/40 transition cursor-pointer"
                                title="Archive / Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h3 className="text-base font-black uppercase text-white">
                {formData.parent_id ? "Add New Subcategory" : "Create Main Category"}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Men's Fashion, Tops, Mobile Accessories"
                  value={formData.name}
                  onChange={(e) => {
                    const n = e.target.value;
                    const autoSlug = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    setFormData((prev) => ({ ...prev, name: n, slug: autoSlug }));
                  }}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-semibold focus:outline-none focus:border-white transition"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Slug URL</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-300 focus:outline-none focus:border-white transition"
                />
              </div>

              {/* Automatic Icon Assignment Box */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300 text-xs">Category Icon</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-emerald-400">
                    {formData.icon_source === "ADMIN" ? "Manual Override" : "✨ Automatic Matching"}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-xl bg-black border border-zinc-700 flex items-center justify-center text-white shrink-0">
                    <CategoryIconRenderer
                      iconKey={formData.icon_source === "ADMIN" ? formData.icon_key : liveIconResolution.icon_key}
                      size={24}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-400 min-w-0">
                    <p className="text-white font-bold">
                      Assigned: <span className="font-mono text-emerald-300">{formData.icon_source === "ADMIN" ? formData.icon_key : liveIconResolution.icon_key}</span>
                    </p>
                    <p className="text-[10px] mt-0.5 text-zinc-500">
                      Icon dynamically resolves based on category semantics or select an icon below.
                    </p>
                  </div>
                </div>

                {/* Manual Icon Selector */}
                <div className="pt-2">
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">Select Custom Icon</label>
                  <select
                    value={formData.icon_key}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        icon_key: e.target.value as CategoryIconKey,
                        icon_source: "ADMIN",
                      }))
                    }
                    className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs"
                  >
                    {Object.keys(CATEGORY_ICON_REGISTRY).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_ICON_REGISTRY[k as CategoryIconKey].label} ({k})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Display Order & Navigation Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                  />
                </div>

                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.show_in_navigation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, show_in_navigation: e.target.checked }))}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white"
                    />
                    <span>Show in Navigation</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white text-black font-black uppercase tracking-wider hover:bg-zinc-200"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {isEditModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h3 className="text-base font-black uppercase text-white">
                Edit Category: {selectedCategory.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-semibold focus:outline-none focus:border-white transition"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Slug URL</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-300"
                />
              </div>

              {/* Icon selector */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300 text-xs">Assigned Icon</span>
                  <div className="w-8 h-8 rounded-lg bg-black border border-zinc-700 flex items-center justify-center text-white">
                    <CategoryIconRenderer iconKey={formData.icon_key} iconUrl={formData.icon_url} size={18} />
                  </div>
                </div>

                <select
                  value={formData.icon_key}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      icon_key: e.target.value as CategoryIconKey,
                      icon_source: "ADMIN",
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs"
                >
                  {Object.keys(CATEGORY_ICON_REGISTRY).map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_ICON_REGISTRY[k as CategoryIconKey].label} ({k})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                  />
                </div>

                <div className="flex flex-col justify-end pb-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.show_in_navigation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, show_in_navigation: e.target.checked }))}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white"
                    />
                    <span>Show in Nav Bar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300 font-bold">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white"
                    />
                    <span>Active Status</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white text-black font-black uppercase tracking-wider hover:bg-zinc-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGE CATEGORY MODAL */}
      {isMergeModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                <GitMerge size={18} /> Merge Category
              </h3>
              <button onClick={() => setIsMergeModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
            </div>

            <p className="text-xs text-zinc-400">
              Reassign all products from <strong className="text-white">{selectedCategory.name}</strong> into a target category, and safely archive <strong className="text-white">{selectedCategory.name}</strong>.
            </p>

            <form onSubmit={handleMergeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Target Destination Category</label>
                <select
                  required
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-semibold"
                >
                  <option value="">-- Select Target Category --</option>
                  {categories
                    .filter((c) => c.id !== selectedCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.parent_id ? "Subcategory" : "Main Category"})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mergeTargetId}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-black uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50"
                >
                  Confirm Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
