"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { 
  Image as ImageIcon, 
  Plus, 
  Video, 
  FileText, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  Upload, 
  Link2, 
  X, 
  AlertCircle,
  FolderOpen
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CreativeAsset {
  id: string;
  campaign_id?: string | null;
  asset_name: string;
  asset_type: "image" | "video" | "banner" | "logo" | "lookbook" | "document";
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  version: number;
  tags?: string[] | null;
  uploaded_by: string;
  created_at: string;
}

interface CampaignOption {
  id: string;
  name: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<CreativeAsset["asset_type"]>("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directUrl, setDirectUrl] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const [assetRes, campRes] = await Promise.all([
        supabase
          .from("creative_assets")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("media_campaigns")
          .select("id, name")
          .order("name", { ascending: true })
      ]);

      if (assetRes.data) setAssets(assetRes.data as CreativeAsset[]);
      if (campRes.data) setCampaigns(campRes.data as CampaignOption[]);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!assetName) {
        // Derive clean name from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setAssetName(cleanName);
      }
      // Infer asset type
      if (file.type.startsWith("video/")) {
        setAssetType("video");
      } else if (file.type.includes("pdf")) {
        setAssetType("document");
      } else if (file.type.startsWith("image/")) {
        if (file.name.toLowerCase().includes("logo")) setAssetType("logo");
        else if (file.name.toLowerCase().includes("banner")) setAssetType("banner");
        else setAssetType("image");
      }
    }
  };

  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      let finalUrl = directUrl.trim();
      let fileSize = 0;
      let mimeType = "application/octet-stream";

      if (uploadMode === "file") {
        if (!selectedFile) {
          setFormError("Please select a file to upload.");
          setSubmitting(false);
          return;
        }

        fileSize = selectedFile.size;
        mimeType = selectedFile.type || "application/octet-stream";

        // Generate sanitized unique storage path
        const fileExt = selectedFile.name.split(".").pop() || "bin";
        const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `creative-assets/${Date.now()}_${sanitizedName}`;

        // Attempt upload to Supabase 'editorial' bucket
        const { error: uploadError } = await supabase.storage
          .from("editorial")
          .upload(storagePath, selectedFile, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          // If storage bucket isn't configured, check if direct URL fallback is available
          console.warn("Storage upload notice:", uploadError.message);
          setFormError(`Storage error: ${uploadError.message}. You can switch to 'Direct URL' mode to catalog external assets.`);
          setSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("editorial")
          .getPublicUrl(storagePath);

        finalUrl = publicUrlData?.publicUrl || "";
      } else {
        if (!finalUrl) {
          setFormError("Please provide an asset URL.");
          setSubmitting(false);
          return;
        }
        fileSize = 1024 * 500; // Standard 500KB default
        if (assetType === "video") mimeType = "video/mp4";
        else if (assetType === "document") mimeType = "application/pdf";
        else mimeType = "image/jpeg";
      }

      // Parse tags
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      // Insert record into creative_assets
      const { data, error: insertError } = await supabase
        .from("creative_assets")
        .insert({
          asset_name: assetName.trim(),
          asset_type: assetType,
          file_url: finalUrl,
          file_size_bytes: fileSize,
          mime_type: mimeType,
          version: 1,
          tags: tags,
          campaign_id: campaignId || null,
          uploaded_by: session.userId,
        })
        .select()
        .single();

      if (insertError) {
        setFormError(insertError.message);
        return;
      }

      if (data) {
        setAssets([data as CreativeAsset, ...assets]);
        setShowModal(false);
        // Reset form
        setAssetName("");
        setSelectedFile(null);
        setDirectUrl("");
        setTagsInput("");
        setCampaignId("");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred during asset upload.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to remove this creative asset from the catalog?")) return;
    const { error } = await supabase
      .from("creative_assets")
      .delete()
      .eq("id", assetId);

    if (!error) {
      setAssets(assets.filter((a) => a.id !== assetId));
    } else {
      console.error("Error deleting asset:", error.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filter & Search logic
  const filteredAssets = assets.filter((asset) => {
    const matchesFilter = activeFilter === "all" || asset.asset_type === activeFilter;
    const matchesSearch = 
      asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(asset.tags) && asset.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Creative Asset Library" description="Banners, product lookbooks, video campaigns, and brand graphics" />

      <main className="p-8 space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Media Assets Library</h2>
            <p className="text-xs text-zinc-400">Total {assets.length} production assets cataloged across campaigns</p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Asset</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-3 rounded-xl">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {["all", "image", "banner", "video", "logo", "lookbook", "document"].map((type) => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  activeFilter === type
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-dark-800"
                }`}
              >
                {type === "all" ? "All Assets" : `${type}s`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or tags..."
              className="w-full pl-8 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Upload Asset Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Upload Creative Asset</h3>
                    <p className="text-[11px] text-zinc-400">Save lookbook assets, campaign videos, or brand graphics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-dark-950 p-1 rounded-lg border border-dark-800 text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    uploadMode === "file" ? "bg-brand-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>File Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    uploadMode === "url" ? "bg-brand-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Direct URL / CDN</span>
                </button>
              </div>

              <form onSubmit={handleUploadAsset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g. Winter 2026 Raw Silk Hero Banner"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Asset Type</label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="image">Image (Photo)</option>
                      <option value="banner">Promotional Banner</option>
                      <option value="video">Video Reel / Clip</option>
                      <option value="logo">Brand Logo</option>
                      <option value="lookbook">Lookbook Editorial</option>
                      <option value="document">Marketing Spec / PDF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Link Campaign (Optional)</label>
                    <select
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">None / Standalone Asset</option>
                      {campaigns.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {uploadMode === "file" ? (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Upload File (Supabase Storage)</label>
                    <div className="border border-dashed border-dark-700 hover:border-brand-500 rounded-xl p-4 text-center bg-dark-950/60 transition-colors">
                      <input
                        type="file"
                        id="fileInput"
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*,application/pdf"
                      />
                      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-7 h-7 text-zinc-400 mb-1.5" />
                        <span className="text-xs text-brand-400 font-semibold hover:underline">
                          {selectedFile ? selectedFile.name : "Choose a file or click to browse"}
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-1">
                          {selectedFile ? `${formatFileSize(selectedFile.size)} • ${selectedFile.type}` : "PNG, JPG, WebP, MP4, PDF up to 50MB"}
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Asset URL (Cloudinary / CDN)</label>
                    <input
                      type="url"
                      required
                      value={directUrl}
                      onChange={(e) => setDirectUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/... or https://..."
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. lookbook, winter, raw silk, drops"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Save & Catalog Asset</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div className="p-16 text-center bg-dark-900 border border-dark-800 rounded-2xl shadow-xl">
            <FolderOpen className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">
              {searchQuery || activeFilter !== "all" ? "No matching assets found" : "No Creative Assets Uploaded"}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery || activeFilter !== "all" 
                ? "Try adjusting your search keywords or filter criteria."
                : "Store brand graphics, promotional banners, and campaign lookbooks in this centralized library."}
            </p>
            <button
              onClick={() => {
                setFormError(null);
                setShowModal(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Upload First Asset</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden p-3.5 hover:border-dark-700 transition-all shadow-lg flex flex-col justify-between group"
              >
                <div>
                  {/* Media Preview Box */}
                  <div className="h-36 bg-dark-950 rounded-lg overflow-hidden flex items-center justify-center text-zinc-600 mb-3 relative border border-dark-850">
                    {asset.asset_type === "image" || asset.asset_type === "banner" || asset.asset_type === "logo" ? (
                      <img 
                        src={asset.file_url} 
                        alt={asset.asset_name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback to icon if image fails to render
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : asset.asset_type === "video" ? (
                      <div className="flex flex-col items-center gap-1 text-zinc-400">
                        <Video className="w-8 h-8 text-purple-400" />
                        <span className="text-[10px] font-mono">Video Clip</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-400">
                        <FileText className="w-8 h-8 text-blue-400" />
                        <span className="text-[10px] font-mono uppercase">{asset.asset_type}</span>
                      </div>
                    )}
                    
                    {/* Floating Type Badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-dark-950/80 backdrop-blur-md text-white border border-dark-700">
                      {asset.asset_type}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="text-xs font-semibold text-white truncate" title={asset.asset_name}>
                    {asset.asset_name}
                  </div>
                  
                  <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between">
                    <span>{formatFileSize(asset.file_size_bytes)}</span>
                    <span>v{asset.version} • {new Date(asset.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  </div>

                  {/* Tags */}
                  {Array.isArray(asset.tags) && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {asset.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-dark-950 text-zinc-400 border border-dark-800">
                          #{tag}
                        </span>
                      ))}
                      {asset.tags.length > 3 && (
                        <span className="text-[9px] text-zinc-500">+{asset.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 pt-3 border-t border-dark-800 flex items-center justify-between gap-1 text-zinc-400">
                  <div className="flex items-center gap-1">
                    <a
                      href={asset.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open full asset"
                      className="p-1.5 rounded-lg hover:bg-dark-800 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(asset.file_url, asset.id)}
                      title="Copy asset URL"
                      className="p-1.5 rounded-lg hover:bg-dark-800 hover:text-white transition-colors"
                    >
                      {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteAsset(asset.id)}
                    title="Remove asset"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
