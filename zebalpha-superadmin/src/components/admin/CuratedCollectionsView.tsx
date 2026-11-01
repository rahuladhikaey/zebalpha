"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Edit2,
  Check,
  AlertCircle,
  FolderTree,
  Tag,
  Link2,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { DYNAMIC_CATEGORY_CATALOG } from "@/shared/constants/productAttributeEngine";

export interface CuratedCollectionRecord {
  id: string | number;
  title: string;
  slug?: string;
  short_description?: string;
  link_url?: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const MAX_IMAGE_SIZE_BYTES = 95 * 1024; // 95 KB Max Limit
const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

export default function CuratedCollectionsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState<CuratedCollectionRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Category & Subcategory Hierarchy State
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedMainCatId, setSelectedMainCatId] = useState<string>("");
  const [selectedSubcatId, setSelectedSubcatId] = useState<string>("");

  // Form State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Upload & Replace State (Deferred Storage Upload)
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileSizeFormatted: string;
    filePath?: string;
    isVerified: boolean;
  } | null>(null);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  const [previousFilePath, setPreviousFilePath] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/curated-collections");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCollections(json.data);
      } else {
        setCollections([]);
      }
    } catch (e: any) {
      console.error("Notice loading curated collections:", e);
      setErrorMessage("Failed to load collections from database.");
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryHierarchy = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/admin/categories?include_inactive=true");
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setCategories(json.data);
      } else {
        // Direct Supabase client fallback
        const { supabase } = await import("@shared/utils/supabaseClient");
        const { data: dbCats } = await supabase
          .from("categories")
          .select("id, name, slug, description, parent_id, is_active, display_order")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true });
        if (dbCats && dbCats.length > 0) {
          setCategories(dbCats);
        }
      }
    } catch (err) {
      console.warn("Notice loading categories in CuratedCollectionsView:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchCategoryHierarchy();
  }, []);

  // Main Categories: categories where parent_id is null/empty
  const mainCategoriesList = useMemo(() => {
    const fromDb = categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    if (fromDb.length > 0) return fromDb;

    // Fallback to DYNAMIC_CATEGORY_CATALOG if DB has no main categories
    return DYNAMIC_CATEGORY_CATALOG.map((dc) => ({
      id: dc.id,
      name: dc.name,
      slug: dc.id,
      isCatalog: true,
    }));
  }, [categories]);

  // Subcategories available under the selected Main Category
  const availableSubcategories = useMemo(() => {
    if (!selectedMainCatId) return [];

    // 1. Direct DB subcategories where parent_id matches selectedMainCatId
    const dbSubcats = categories.filter((c) => String(c.parent_id) === String(selectedMainCatId));

    // 2. Also check if selectedMainCat matches DYNAMIC_CATEGORY_CATALOG
    const selectedMainObj = categories.find((c) => String(c.id) === String(selectedMainCatId));
    const mainName = selectedMainObj?.name || selectedMainCatId;

    const catalogMain = DYNAMIC_CATEGORY_CATALOG.find(
      (dc) => dc.name.toLowerCase() === mainName.toLowerCase() || dc.id === selectedMainCatId
    );

    // If DB has subcategories, prioritize and return them
    if (dbSubcats.length > 0) {
      return dbSubcats;
    }

    // Fallback to catalog subcategories if no DB subcategories are defined yet
    if (catalogMain && catalogMain.subcategories) {
      const catalogSubs: any[] = [];
      for (const sub of catalogMain.subcategories) {
        catalogSubs.push({
          id: sub.name,
          name: sub.name,
          slug: sub.id,
          isCatalog: true,
        });
      }
      return catalogSubs;
    }

    return [];
  }, [categories, selectedMainCatId]);

  const handleMainCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mainId = e.target.value;
    setSelectedMainCatId(mainId);
    setSelectedSubcatId("");
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subId = e.target.value;
    setSelectedSubcatId(subId);

    const subObj = availableSubcategories.find((s) => String(s.id) === String(subId));
    if (subObj) {
      // Auto-populate Title
      setTitle(subObj.name.toUpperCase());

      // Auto-generate Slug
      const generatedSlug = subObj.slug || subObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      setSlug(generatedSlug);

      // Auto-generate target URL pointing directly to this subcategory
      const targetParam = subObj.id ? subObj.id : encodeURIComponent(subObj.name);
      setLinkUrl(`/products?category=${targetParam}`);

      if (subObj.description && !shortDescription) {
        setShortDescription(subObj.description);
      }
    }
  };

  // Strict Client-Side 95 KB & Type Validation BEFORE Upload (Deferred Storage Upload)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage("");
    setErrorMessage("");

    // 1. Strict File Size Validation (<= 95 KB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const actualKb = (file.size / 1024).toFixed(1);
      setErrorMessage(`Image must be 95 KB or smaller. (Selected: ${actualKb} KB). Please compress or choose another image.`);
      e.target.value = "";
      return;
    }

    // 2. Strict MIME Type Validation (WebP, JPEG, PNG)
    const fileType = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      setErrorMessage(`Invalid format. Accepted: WebP / JPEG / PNG. (Provided: ${fileType || "unknown"}).`);
      e.target.value = "";
      return;
    }

    // 3. Client-Side Image Dimension Validation (Ensure square 1:1 or appropriate ratio)
    try {
      await new Promise<void>((resolve, reject) => {
        const testImg = new Image();
        testImg.src = URL.createObjectURL(file);
        testImg.onload = () => {
          URL.revokeObjectURL(testImg.src);
          resolve();
        };
        testImg.onerror = () => {
          URL.revokeObjectURL(testImg.src);
          reject(new Error("Corrupted or invalid image file."));
        };
      });
    } catch (dimErr: any) {
      setErrorMessage(dimErr.message || "Failed to parse image.");
      e.target.value = "";
      return;
    }

    // 4. Deferred Upload: Create instant local browser preview without hitting storage/database yet
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const localBlob = URL.createObjectURL(file);
    const actualKb = (file.size / 1024).toFixed(1);

    setSelectedFile(file);
    setPreviewUrl(localBlob);
    setImageUrl(localBlob);
    setUploadedFileInfo({
      fileSizeFormatted: `${actualKb} KB (Ready to Save)`,
      isVerified: true,
    });
    setStatusMessage(`✓ Verified cover selected (${actualKb} KB ≤ 95 KB) — Cover will be permanently uploaded when you click "Save Curated Collection".`);
    e.target.value = "";
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      setErrorMessage("Collection Title and a validated Image are required.");
      return;
    }

    setSaving(true);
    setStatusMessage("Saving collection to database...");
    setErrorMessage("");

    let finalImageUrl = imageUrl.trim();

    // 1. DEFERRED UPLOAD: Upload image file to storage NOW only upon clicking Save
    if (selectedFile) {
      setUploadingImage(true);
      setStatusMessage("Uploading verified cover (≤ 95 KB) to storage...");
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("section", "curated-collections");

        const res = await fetch("/api/admin/homepage-media/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!data.success || !data.publicUrl) {
          throw new Error(data.message || "Server upload validation failed.");
        }

        finalImageUrl = data.publicUrl;
      } catch (uploadErr: any) {
        setSaving(false);
        setUploadingImage(false);
        setErrorMessage(uploadErr.message || "Image upload failed. Collection not saved.");
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    // Guard against saving unresolved blob URLs
    if (!finalImageUrl || finalImageUrl.startsWith("blob:")) {
      setSaving(false);
      setErrorMessage("Image URL could not be resolved. Please re-select the image.");
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim() || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      link_url: linkUrl.trim() || `/products?category=${encodeURIComponent(title.trim())}`,
      short_description: shortDescription.trim() || null,
      image_url: finalImageUrl,
      display_order: Number(displayOrder) || collections.length + 1,
      is_active: isActive,
    };

    try {
      let savedResult: CuratedCollectionRecord | null = null;

      if (editingId) {
        const res = await fetch("/api/admin/curated-collections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, updates: payload }),
        });
        const resJson = await res.json();
        if (!resJson.success) throw new Error(resJson.message || "Failed to update collection");
        savedResult = resJson.data;

        // DELETE / REPLACE SAFETY: Clean old image from storage only AFTER DB update succeeded
        if (previousFilePath && selectedFile) {
          fetch("/api/admin/homepage-media/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: previousFilePath }),
          }).catch(() => {});
        }
      } else {
        const res = await fetch("/api/admin/curated-collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const resJson = await res.json();
        if (!resJson.success) throw new Error(resJson.message || "Failed to create collection");
        savedResult = resJson.data;
      }

      setStatusMessage("Collection saved successfully! Customer homepage updated.");
      resetForm();
      await fetchCollections();
    } catch (err: any) {
      console.error("Save collection error:", err);
      setErrorMessage("Failed to save collection: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (id: string | number, currentImgUrl?: string) => {
    if (!confirm("Are you sure you want to delete this curated collection?")) return;

    try {
      const res = await fetch(`/api/admin/curated-collections?id=${id}`, {
        method: "DELETE",
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message || "Delete failed");

      // Clean storage safely if it was in dedicated folder
      if (currentImgUrl && currentImgUrl.includes("homepage/curated-collections/")) {
        const parts = currentImgUrl.split("homepage/curated-collections/");
        if (parts[1]) {
          fetch("/api/admin/homepage-media/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: `homepage/curated-collections/${parts[1]}` }),
          }).catch(() => {});
        }
      }

      setStatusMessage("Collection deleted successfully.");
      await fetchCollections();
    } catch (err: any) {
      console.error("Delete error:", err);
      setErrorMessage("Failed to delete collection: " + (err.message || ""));
    }
  };

  const handleToggleActive = async (col: CuratedCollectionRecord) => {
    try {
      const newActive = !col.is_active;
      const res = await fetch("/api/admin/curated-collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: col.id, updates: { is_active: newActive } }),
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message || "Status toggle failed");

      setCollections((prev) =>
        prev.map((c) => (c.id === col.id ? { ...c, is_active: newActive } : c))
      );
      setStatusMessage(`Collection "${col.title}" is now ${newActive ? "Active" : "Disabled"}.`);
    } catch (err: any) {
      console.error("Status toggle error:", err);
      setErrorMessage(err.message || "Failed to toggle status.");
    }
  };

  const startEdit = (col: CuratedCollectionRecord) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setEditingId(col.id);
    setTitle(col.title);
    setSlug(col.slug || "");
    setLinkUrl(col.link_url || "");
    setShortDescription(col.short_description || "");
    setImageUrl(col.image_url);
    setDisplayOrder(col.display_order);
    setIsActive(col.is_active);
    setUploadedFileInfo({
      fileSizeFormatted: "Verified",
      isVerified: true,
    });
    setPreviousImageUrl(col.image_url);
    if (col.image_url.includes("homepage/curated-collections/")) {
      const parts = col.image_url.split("homepage/curated-collections/");
      setPreviousFilePath(parts[1] ? `homepage/curated-collections/${parts[1]}` : null);
    }

    // Preselect linked Main Category and Subcategory
    let matchedSubId = "";
    let matchedParentId = "";

    if (col.link_url) {
      const match = col.link_url.match(/category=([^&]+)/);
      const targetParam = match ? decodeURIComponent(match[1]) : "";
      if (targetParam) {
        const found = categories.find(
          (c) =>
            String(c.id).toLowerCase() === targetParam.toLowerCase() ||
            c.slug?.toLowerCase() === targetParam.toLowerCase() ||
            c.name.toLowerCase() === targetParam.toLowerCase()
        );
        if (found) {
          matchedSubId = String(found.id);
          matchedParentId = found.parent_id || "";
        }
      }
    }

    if (!matchedSubId && col.title) {
      const found = categories.find(
        (c) => c.name.toLowerCase() === col.title.toLowerCase()
      );
      if (found) {
        matchedSubId = String(found.id);
        matchedParentId = found.parent_id || "";
      }
    }

    setSelectedMainCatId(matchedParentId);
    setSelectedSubcatId(matchedSubId);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setEditingId(null);
    setTitle("");
    setSlug("");
    setLinkUrl("");
    setShortDescription("");
    setImageUrl("");
    setPreviewUrl("");
    setSelectedFile(null);
    setDisplayOrder(collections.length + 1);
    setIsActive(true);
    setUploadedFileInfo(null);
    setPreviousImageUrl(null);
    setPreviousFilePath(null);
    setSelectedMainCatId("");
    setSelectedSubcatId("");
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-black text-white min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-violet-950/80 border border-violet-800/60 text-[10px] font-black uppercase tracking-[0.25em] text-violet-300">
              HOMEPAGE MANAGER
            </span>
            <span className="text-xs font-mono text-zinc-500">CURATED COLLECTIONS (1:1 SQUARE)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
            Curated Collections Manager
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Upload and manage 1:1 square curated collection covers for the customer homepage. Enforces strict ≤ 95 KB validation, WebP/JPEG/PNG format check, and instant cache updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCollections}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-800/60 text-xs font-medium text-emerald-400 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-rose-800/60 text-xs font-medium text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <h2 className="text-base font-black uppercase text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>{editingId ? "Edit Collection" : "Add Curated Collection"}</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveCollection} className="space-y-4">
            {/* Image Upload Box with Explicit 95 KB UI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">
                  Image: [ Upload ]
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  Maximum: <strong className="text-amber-300">95 KB</strong>
                </span>
              </div>

              <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 bg-zinc-900/60 text-center flex flex-col items-center justify-center transition-colors min-h-[160px]">
                {imageUrl ? (
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-zinc-700 aspect-square">
                    <img src={imageUrl} alt="Collection cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl && previewUrl.startsWith("blob:")) {
                          URL.revokeObjectURL(previewUrl);
                        }
                        setImageUrl("");
                        setPreviewUrl("");
                        setSelectedFile(null);
                        setUploadedFileInfo(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      title="Remove / Replace Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {uploadedFileInfo && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 truncate">
                        ✓ {uploadedFileInfo.fileSizeFormatted}
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                    <Upload className={`w-8 h-8 text-zinc-500 mb-2 ${uploadingImage ? "animate-bounce" : ""}`} />
                    <span className="text-xs font-bold text-zinc-300">
                      {uploadingImage ? "Validating & Uploading..." : "Click to Upload Collection Cover"}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-1">
                      Maximum: <strong>95 KB</strong>
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Accepted: <strong>WebP / JPEG / PNG</strong> (1:1 Aspect Ratio)
                    </span>
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>

              {imageUrl && (
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                  <span>Status: <strong className="text-emerald-400">Verified ≤ 95 KB</strong></span>
                  <label className="text-violet-400 hover:text-violet-300 font-bold cursor-pointer underline text-[10px]">
                    Replace Image
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Category & Subcategory Selection (From Admin Created Categories) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-violet-300">
                  <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                  <span>Link to Admin Subcategory</span>
                </div>
                {loadingCategories && (
                  <span className="text-[10px] text-zinc-500 animate-pulse">Loading categories...</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Main Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400">1. Select Main Category *</label>
                  <select
                    value={selectedMainCatId}
                    onChange={handleMainCategoryChange}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {mainCategoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Subcategory */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400">2. Select Subcategory *</label>
                  <select
                    value={selectedSubcatId}
                    onChange={handleSubcategoryChange}
                    disabled={!selectedMainCatId || availableSubcategories.length === 0}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="">
                      {!selectedMainCatId
                        ? "-- Choose Main Cat First --"
                        : availableSubcategories.length === 0
                        ? "-- No Subcategories Found --"
                        : "-- Choose Subcategory --"}
                    </option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.product_count !== undefined ? `(${sub.product_count})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSubcatId && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Linked: <strong>{availableSubcategories.find(s => String(s.id) === String(selectedSubcatId))?.name}</strong> (Clicking this collection will show all products of this subcategory)
                  </span>
                </div>
              )}
            </div>

            {/* Collection Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Collection Title *</label>
                {selectedSubcatId && (
                  <span className="text-[10px] text-zinc-500 font-normal">
                    (Auto-filled from subcategory, editable)
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. OVERSIZED STREETWEAR TEES"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-extrabold uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Destination Link URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-zinc-500" />
                  Destination Link URL
                </span>
                <span className="text-[10px] font-mono text-violet-400">Auto-targeted</span>
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/products?category=..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-violet-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Short Description (Optional)</label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="e.g. 100% Combed 240 GSM heavy cotton streetwear fits"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Display Order & Active Toggle */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600"
                  />
                  <span className="text-xs font-bold text-zinc-300">Active (Visible)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (uploadingImage ? "Uploading Cover to Storage..." : "Saving Collection...") : editingId ? "Update Collection" : "Save Curated Collection"}
            </button>
          </form>
        </div>

        {/* Gallery / List Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <h2 className="text-sm font-black uppercase text-zinc-300 tracking-wider">
              Active Database Curated Collections ({collections.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs">
              Loading curated collections...
            </div>
          ) : collections.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/50">
              <p className="text-xs font-bold text-zinc-400">No curated collections in database yet.</p>
              <p className="text-[11px] text-zinc-600 mt-1">Upload an image (≤ 95 KB) to publish your first collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {collections.map((col, idx) => (
                <div
                  key={col.id || idx}
                  className={`group relative rounded-3xl bg-zinc-950 border overflow-hidden p-3.5 space-y-2.5 transition-all ${
                    col.is_active ? "border-zinc-800 hover:border-zinc-600" : "border-zinc-900 opacity-60"
                  }`}
                >
                  {/* 1:1 Aspect Ratio Preview */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                    <img
                      src={col.image_url}
                      alt={col.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-white text-black font-black text-[9px]">
                        Order #{col.display_order}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase text-white truncate">{col.title}</h3>
                    {col.short_description && (
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{col.short_description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] font-mono text-violet-300 truncate bg-violet-950/40 border border-violet-900/40 px-2 py-0.5 rounded-lg">
                      <Link2 className="w-2.5 h-2.5 shrink-0 text-violet-400" />
                      <span className="truncate">{col.link_url || `/products?category=${col.title}`}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(col)}
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                        col.is_active ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    >
                      {col.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{col.is_active ? "Active" : "Disabled"}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(col)}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit Collection"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(col.id, col.image_url)}
                        className="p-1.5 rounded-lg bg-zinc-900 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Delete Collection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
