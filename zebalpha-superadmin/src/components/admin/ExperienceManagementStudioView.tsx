"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  Palette,
  Sliders,
  Layers,
  Image as ImageIcon,
  Megaphone,
  MessageSquare,
  Bell,
  Grid,
  Calendar,
  History,
  Settings,
  Plus,
  Copy,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Upload,
  Trash2,
  RotateCcw,
  ExternalLink,
  Smartphone,
  Globe,
  Clock,
  Search,
  Heart,
  ShoppingBag,
  Home,
  User,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import { uploadDirectToCloudinary } from "@shared/services/uploadService";
import type {
  ExperienceRecord,
  ExperienceColorTokens,
  ExperienceTypographyTokens,
  ExperienceAssetTokens,
  ExperienceHomeSectionItem,
  ExperienceBannerItem,
  ExperienceCampaignItem,
  ExperiencePopupItem,
  ExperienceAnnouncementItem,
  ExperiencePublicationSnapshot,
  ExperienceAuditLogItem,
  CustomerActiveExperiencePayload,
  ScheduleConflictWarning,
  BannerDestinationType,
  CampaignCategoryType,
  PopupDisplayFrequency,
} from "@/lib/experienceThemes";
import PromotionsStudioView from "./PromotionsStudioView";

type SubModuleKey =
  | "overview"
  | "festival_studio"
  | "color_appearance"
  | "homepage_manager"
  | "banner_artwork"
  | "campaign_manager"
  | "popup_manager"
  | "announcement_manager"
  | "featured_collections"
  | "scheduler"
  | "history_rollback"
  | "settings";

const SUBMODULES: Array<{ id: SubModuleKey; label: string; icon: any; badge?: string }> = [
  { id: "overview", label: "Overview Dashboard", icon: LayoutDashboard },
  { id: "festival_studio", label: "Festival & Theme Studio", icon: Palette, badge: "8 PRESETS" },
  { id: "color_appearance", label: "Color & Appearance", icon: Sliders, badge: "25 TOKENS" },
  { id: "homepage_manager", label: "Homepage Experience", icon: Layers },
  { id: "banner_artwork", label: "Banner & Artwork", icon: ImageIcon, badge: "CDN" },
  { id: "campaign_manager", label: "Campaign Manager", icon: Megaphone },
  { id: "popup_manager", label: "Popup Manager", icon: MessageSquare },
  { id: "announcement_manager", label: "Announcement Manager", icon: Bell },
  { id: "featured_collections", label: "Featured Collections", icon: Grid },
  { id: "scheduler", label: "Experience Scheduler", icon: Calendar, badge: "IST" },
  { id: "history_rollback", label: "Theme History & Rollback", icon: History },
  { id: "settings", label: "Experience Settings", icon: Settings },
];

const COLOR_TOKEN_FIELDS: Array<{
  key: keyof ExperienceColorTokens;
  label: string;
  group: "Brand & Header" | "Backgrounds & Surfaces" | "Buttons & Controls" | "Navigation & Search" | "Badges & Status";
}> = [
  { key: "primaryColor", label: "Primary Brand / Header Color", group: "Brand & Header" },
  { key: "primaryDark", label: "Primary Dark Shade", group: "Brand & Header" },
  { key: "primaryLight", label: "Primary Light / Gradient Top", group: "Brand & Header" },
  { key: "secondaryColor", label: "Secondary Warm / Gradient Fade", group: "Brand & Header" },
  { key: "accentColor", label: "Accent Highlight Color", group: "Brand & Header" },

  { key: "backgroundColor", label: "Main App Background", group: "Backgrounds & Surfaces" },
  { key: "surfaceColor", label: "Soft Section Surface", group: "Backgrounds & Surfaces" },
  { key: "cardBackground", label: "Product Card Background", group: "Backgrounds & Surfaces" },
  { key: "primaryText", label: "Primary Text Color", group: "Backgrounds & Surfaces" },
  { key: "secondaryText", label: "Secondary Muted Text", group: "Backgrounds & Surfaces" },
  { key: "borderColor", label: "Card & Section Border", group: "Backgrounds & Surfaces" },

  { key: "primaryButtonBg", label: "Primary Button Background", group: "Buttons & Controls" },
  { key: "primaryButtonText", label: "Primary Button Text", group: "Buttons & Controls" },
  { key: "secondaryButtonBg", label: "Secondary Button Background", group: "Buttons & Controls" },
  { key: "secondaryButtonText", label: "Secondary Button Text", group: "Buttons & Controls" },

  { key: "navBarBg", label: "Bottom Navigation Background", group: "Navigation & Search" },
  { key: "navBarIcon", label: "Bottom Navigation Active Icon", group: "Navigation & Search" },
  { key: "searchBarBg", label: "Search Bar Background", group: "Navigation & Search" },
  { key: "categoryBarBg", label: "Category Strip Background", group: "Navigation & Search" },

  { key: "priceColor", label: "Product Price Color", group: "Badges & Status" },
  { key: "discountBadgeColor", label: "Discount % Badge Color", group: "Badges & Status" },
  { key: "promoBadgeColor", label: "Promotional Pill Color", group: "Badges & Status" },
  { key: "successColor", label: "Success State Color", group: "Badges & Status" },
  { key: "warningColor", label: "Warning State Color", group: "Badges & Status" },
  { key: "errorColor", label: "Error State Color", group: "Badges & Status" },
];

const ASSET_SLOTS: Array<{ key: keyof ExperienceAssetTokens; label: string; hint: string }> = [
  { key: "headerArtworkUrl", label: "Header Pattern / Festive Backdrop", hint: "Top app header ornamental lattice pattern" },
  { key: "homepageHeroArtworkUrl", label: "Homepage Hero Artwork", hint: "Primary hero banner visual (16:9)" },
  { key: "festivalBackgroundUrl", label: "Festival Page Background", hint: "Optional subtle watermark or festive texture" },
  { key: "festivalLogoUrl", label: "Festival Crest / Logo", hint: "Brand crest shown in header circle" },
  { key: "promotionalArtworkUrl", label: "Promotional Deal Strip Artwork", hint: "Banner for festival deal rail" },
  { key: "categoryArtworkUrl", label: "Category Highlight Artwork", hint: "Accent visual for category bar" },
  { key: "sectionBackgroundUrl", label: "Section Background Artwork", hint: "Optional backdrop for featured section" },
  { key: "popupArtworkUrl", label: "Popup Hero Artwork", hint: "Visual shown at top of festival popup" },
];

export default function ExperienceManagementStudioView({
  onNavigateTab,
}: {
  onNavigateTab?: (tabId: string) => void;
}) {
  const [activeSubModule, setActiveSubModule] = useState<SubModuleKey>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Master Backend State
  const [version, setVersion] = useState<number>(1);
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [banners, setBanners] = useState<ExperienceBannerItem[]>([]);
  const [campaigns, setCampaigns] = useState<ExperienceCampaignItem[]>([]);
  const [popups, setPopups] = useState<ExperiencePopupItem[]>([]);
  const [announcements, setAnnouncements] = useState<ExperienceAnnouncementItem[]>([]);
  const [publications, setPublications] = useState<ExperiencePublicationSnapshot[]>([]);
  const [auditLogs, setAuditLogs] = useState<ExperienceAuditLogItem[]>([]);
  const [activeCustomerExp, setActiveCustomerExp] =
    useState<CustomerActiveExperiencePayload | null>(null);
  const [scheduleConflicts, setScheduleConflicts] = useState<ScheduleConflictWarning[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; price: number; mrp?: number; image_url?: string }>
  >([]);

  // Currently selected theme for editing & live phone preview
  const [selectedExpId, setSelectedExpId] = useState<string>("exp_default_zebalpha");
  const [workingExp, setWorkingExp] = useState<ExperienceRecord | null>(null);

  // Create New Theme Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newFestivalName, setNewFestivalName] = useState("");
  const [newThemeDesc, setNewThemeDesc] = useState("");
  const [newThemeBaseId, setNewThemeBaseId] = useState("exp_default_zebalpha");

  // Schedule Modal Inputs
  const [schedStartInput, setSchedStartInput] = useState("");
  const [schedEndInput, setSchedEndInput] = useState("");
  const [schedPriorityInput, setSchedPriorityInput] = useState(10);

  // Confirm Dialog for Publish / Rollback
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const getStorefrontUrl = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
      }
    }
    return process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://zebalpha.shop";
  };

  const triggerStorefrontCachePurge = useCallback(() => {
    const base = getStorefrontUrl();
    fetch(`${base}/api/cache/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "dems" }),
    }).catch(() => {});
  }, []);

  const fetchAllDemsData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/experiences", { cache: "no-store" });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.message || "Failed to load Experience Management data");
      }

      const st = json.data.state;
      const exps: ExperienceRecord[] = Array.isArray(st.experiences) ? st.experiences : [];
      setVersion(Number(st.version || 1));
      setExperiences(exps);
      setBanners(Array.isArray(st.banners) ? st.banners : []);
      setCampaigns(Array.isArray(st.campaigns) ? st.campaigns : []);
      setPopups(Array.isArray(st.popups) ? st.popups : []);
      setAnnouncements(Array.isArray(st.announcements) ? st.announcements : []);
      setPublications(Array.isArray(st.publications) ? st.publications : []);
      setAuditLogs(Array.isArray(st.audit_logs) ? st.audit_logs : []);
      setActiveCustomerExp(json.data.activeCustomerExperience || null);
      setScheduleConflicts(Array.isArray(json.data.scheduleConflicts) ? json.data.scheduleConflicts : []);
      setCategories(Array.isArray(json.data.categories) ? json.data.categories : []);
      setProducts(Array.isArray(json.data.products) ? json.data.products : []);

      const activeOrFirst =
        exps.find((e) => e.id === selectedExpId) ||
        exps.find((e) => e.id === json.data.activeCustomerExperience?.activeExperienceId) ||
        exps[0];

      if (activeOrFirst) {
        setSelectedExpId(activeOrFirst.id);
        setWorkingExp(JSON.parse(JSON.stringify(activeOrFirst)));
        setSchedStartInput(activeOrFirst.start_at ? activeOrFirst.start_at.slice(0, 16) : "");
        setSchedEndInput(activeOrFirst.end_at ? activeOrFirst.end_at.slice(0, 16) : "");
        setSchedPriorityInput(Number(activeOrFirst.priority || 10));
      }
    } catch (e: any) {
      notify(e?.message || "Error loading Experience Management Studio", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedExpId]);

  useEffect(() => {
    fetchAllDemsData();
  }, [fetchAllDemsData]);

  const handleSelectExperience = (expId: string) => {
    const found = experiences.find((e) => e.id === expId);
    if (!found) return;
    setSelectedExpId(found.id);
    setWorkingExp(JSON.parse(JSON.stringify(found)));
    setSchedStartInput(found.start_at ? found.start_at.slice(0, 16) : "");
    setSchedEndInput(found.end_at ? found.end_at.slice(0, 16) : "");
    setSchedPriorityInput(Number(found.priority || 10));
  };

  const executeApiAction = async (payload: Record<string, any>, successMsg: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Operation failed");
      }

      const st = json.data.state;
      const exps: ExperienceRecord[] = Array.isArray(st.experiences) ? st.experiences : [];
      setVersion(Number(st.version || 1));
      setExperiences(exps);
      setBanners(Array.isArray(st.banners) ? st.banners : []);
      setCampaigns(Array.isArray(st.campaigns) ? st.campaigns : []);
      setPopups(Array.isArray(st.popups) ? st.popups : []);
      setAnnouncements(Array.isArray(st.announcements) ? st.announcements : []);
      setPublications(Array.isArray(st.publications) ? st.publications : []);
      setAuditLogs(Array.isArray(st.audit_logs) ? st.audit_logs : []);
      setActiveCustomerExp(json.data.activeCustomerExperience || null);
      setScheduleConflicts(Array.isArray(json.data.scheduleConflicts) ? json.data.scheduleConflicts : []);

      const currentTarget =
        exps.find((e) => e.id === (payload.experience?.id || payload.experienceId || selectedExpId)) ||
        exps[exps.length - 1];

      if (currentTarget) {
        setSelectedExpId(currentTarget.id);
        setWorkingExp(JSON.parse(JSON.stringify(currentTarget)));
      }

      triggerStorefrontCachePurge();
      notify(successMsg, "success");
    } catch (e: any) {
      notify(e?.message || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCloudinaryAssetUpload = async (
    file: File,
    folder: string,
    onUrlReady: (cdnUrl: string) => void,
    slotKey: string
  ) => {
    setUploadingKey(slotKey);
    try {
      const cdnUrl = await uploadDirectToCloudinary(file, folder);
      onUrlReady(cdnUrl);
      notify("✅ Uploaded & optimized on Cloudinary CDN!");
    } catch (e: any) {
      notify(e?.message || "Cloudinary CDN upload failed", "error");
    } finally {
      setUploadingKey(null);
    }
  };

  // Working Theme Token Updater
  const updateColorToken = (key: keyof ExperienceColorTokens, val: string) => {
    if (!workingExp) return;
    setWorkingExp({
      ...workingExp,
      theme_tokens: {
        ...workingExp.theme_tokens,
        [key]: val,
      },
    });
  };

  const updateTypographyToken = (key: keyof ExperienceTypographyTokens, val: any) => {
    if (!workingExp) return;
    setWorkingExp({
      ...workingExp,
      typography: {
        ...workingExp.typography,
        [key]: val,
      },
    });
  };

  const updateAssetToken = (key: keyof ExperienceAssetTokens, val: string) => {
    if (!workingExp) return;
    setWorkingExp({
      ...workingExp,
      assets: {
        ...workingExp.assets,
        [key]: val,
      },
    });
  };

  const moveHomeSection = (idx: number, dir: -1 | 1) => {
    if (!workingExp) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= workingExp.home_sections.length) return;
    const copy = [...workingExp.home_sections];
    const tmp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = tmp;
    const reordered = copy.map((s, i) => ({ ...s, display_order: i + 1 }));
    setWorkingExp({ ...workingExp, home_sections: reordered });
  };

  const updateHomeSection = (secKey: string, patch: Partial<ExperienceHomeSectionItem>) => {
    if (!workingExp) return;
    setWorkingExp({
      ...workingExp,
      home_sections: workingExp.home_sections.map((s) =>
        s.section_key === secKey ? { ...s, ...patch } : s
      ),
    });
  };

  // Dashboard Summary Metrics (100% Real Database State)
  const kpiStats = useMemo(() => {
    const scheduledCount = experiences.filter((e) => e.status === "scheduled").length;
    const draftCount = experiences.filter((e) => e.status === "draft").length;
    const publishedCount = publications.length;
    const activeBannersCount = banners.filter((b) => b.status === "active").length;
    const upcomingFestivals = experiences.filter((e) => !e.is_default && e.status !== "archived");
    const lastPub = publications[0] || null;
    return {
      scheduledCount,
      draftCount,
      publishedCount,
      activeBannersCount,
      upcomingFestivals,
      lastPub,
    };
  }, [experiences, publications, banners]);

  // =========================================================================
  // LIVE INTERACTIVE CUSTOMER ANDROID APP PHONE PREVIEW COMPONENT
  // (Shows real ZebAlpha App structure dynamically styled by workingExp tokens)
  // =========================================================================
  const renderLivePhonePreview = () => {
    const exp = workingExp || experiences[0];
    if (!exp) return null;
    const t = exp.theme_tokens;
    const typo = exp.typography;
    const art = exp.assets;
    const previewBanner =
      banners.find((b) => b.status === "active")?.image_url ||
      art.homepageHeroArtworkUrl ||
      "/banner-grand-opening.jpg";
    const previewProds = products.slice(0, 2);
    const activePopup = popups.find((p) => p.status === "active");
    const activeAnn = announcements.find((a) => a.status === "active");

    return (
      <div className="sticky top-6 rounded-3xl bg-white border border-[#F1E4DE] p-4 shadow-[0_14px_34px_-12px_rgba(240,58,70,0.12)]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1E4DE]">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#F03A46]">
              <Smartphone className="w-3.5 h-3.5" />
              Live Customer App Preview
            </span>
            <h4 className="text-xs font-black text-[#14120F] truncate mt-0.5">
              {exp.name} ({exp.festival_name})
            </h4>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              exp.id === activeCustomerExp?.activeExperienceId
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-[#FFF4F2] text-[#F03A46] border border-[#FECDD3]"
            }`}
          >
            {exp.id === activeCustomerExp?.activeExperienceId ? "LIVE ON APP" : "DRAFT PREVIEW"}
          </span>
        </div>

        {/* Phone Frame */}
        <div
          className="mx-auto w-[292px] rounded-[2.25rem] border-[6px] border-[#14120F] overflow-hidden shadow-2xl relative"
          style={{
            backgroundColor: t.backgroundColor,
            color: t.primaryText,
            fontFamily:
              typo.headingStyle === "serif"
                ? "Georgia, serif"
                : "Outfit, Inter, system-ui, sans-serif",
          }}
        >
          {/* 1. Dynamic App Header + Search Bar + Category Navigation */}
          <div
            className="relative px-3 pt-3 pb-2.5 overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${t.primaryColor} 0%, ${t.primaryLight} 45%, ${t.secondaryColor} 85%, ${t.backgroundColor} 100%)`,
            }}
          >
            {art.headerArtworkUrl && (
              <div
                className="absolute inset-0 opacity-30 bg-cover bg-top pointer-events-none"
                style={{ backgroundImage: `url(${art.headerArtworkUrl})` }}
              />
            )}

            {/* Header Top Row */}
            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-white p-0.5 shadow flex items-center justify-center overflow-hidden">
                  <img
                    src={art.festivalLogoUrl || "/official-logo.png"}
                    alt="ZebAlpha"
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-wider text-white drop-shadow-sm">
                    ZEBALPHA
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-widest text-white/90">
                    {exp.festival_name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-6 w-6 rounded-lg bg-white/90 flex items-center justify-center text-[#14120F]">
                  <Heart className="w-3 h-3" />
                </span>
                <span className="h-6 w-6 rounded-lg bg-white/90 flex items-center justify-center text-[#14120F]">
                  <Bell className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Dynamic Search Bar */}
            <div
              className="relative z-10 flex items-center justify-between rounded-full px-2.5 py-1.5 shadow-sm border"
              style={{
                backgroundColor: t.searchBarBg,
                borderColor: t.borderColor,
              }}
            >
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                <Search className="w-3 h-3" style={{ color: t.primaryColor }} />
                <span>Search &ldquo;240 GSM Oversized Tee&rdquo;</span>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[8px] font-black"
                style={{
                  backgroundColor: t.primaryButtonBg,
                  color: t.primaryButtonText,
                }}
              >
                GO
              </span>
            </div>

            {/* Dynamic Category Strip */}
            <div
              className="relative z-10 mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar rounded-xl px-2 py-1"
              style={{ backgroundColor: t.categoryBarBg }}
            >
              {["For You", "New Drop", "Oversized", "Polos", "Hoodies"].map((c, idx) => (
                <span
                  key={c}
                  className="text-[8.5px] font-black whitespace-nowrap px-1.5 py-0.5 rounded-md"
                  style={
                    idx === 0
                      ? {
                          backgroundColor: t.primaryColor,
                          color: "#FFFFFF",
                        }
                      : { color: t.primaryText }
                  }
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* 2. Announcement Marquee Ticker */}
          {activeAnn && (
            <div
              className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-center truncate border-y"
              style={{
                backgroundColor: t.surfaceColor,
                borderColor: t.borderColor,
                color: t.primaryText,
              }}
            >
              ✦ {activeAnn.message} ✦
            </div>
          )}

          {/* 3. Scrollable Homepage Body Preview */}
          <div className="p-2.5 space-y-2.5 max-h-[340px] overflow-y-auto no-scrollbar">
            {/* Hero Banner */}
            <div
              className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border shadow-sm"
              style={{ borderColor: t.borderColor }}
            >
              <img
                src={previewBanner}
                alt="Hero Preview"
                className="w-full h-full object-cover"
              />
              <span
                className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase shadow"
                style={{
                  backgroundColor: t.promoBadgeColor,
                  color: "#FFFFFF",
                }}
              >
                {exp.festival_name} LIVE
              </span>
            </div>

            {/* Promotional Section Header */}
            <div
              className="rounded-xl p-2 border"
              style={{
                backgroundColor: t.surfaceColor,
                borderColor: t.borderColor,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-[10px] font-black uppercase"
                    style={{ color: typo.headingColor || t.primaryText }}
                  >
                    {exp.home_sections.find((s) => s.is_visible && s.display_order > 3)?.title ||
                      "Curated Collections"}
                  </div>
                  <div className="text-[8px]" style={{ color: t.secondaryText }}>
                    {exp.festival_name} Special Picks
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[8px] font-black"
                  style={{
                    backgroundColor: t.primaryButtonBg,
                    color: t.primaryButtonText,
                  }}
                >
                  Shop →
                </span>
              </div>
            </div>

            {/* 2-Column Product Cards Preview */}
            <div className="grid grid-cols-2 gap-2">
              {(previewProds.length > 0
                ? previewProds
                : [
                    {
                      id: "p1",
                      name: "240 GSM Oversized Graphic Tee",
                      price: 450,
                      mrp: 599,
                      image_url: "/placeholder.png",
                    },
                    {
                      id: "p2",
                      name: "Textured Zip Collar Polo",
                      price: 549,
                      mrp: 799,
                      image_url: "/placeholder.png",
                    },
                  ]
              ).map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-xl border p-1.5 flex flex-col"
                  style={{
                    backgroundColor: t.cardBackground,
                    borderColor: t.borderColor,
                  }}
                >
                  <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-zinc-100">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    <span
                      className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[7px] font-black text-white"
                      style={{ backgroundColor: t.discountBadgeColor }}
                    >
                      25% OFF
                    </span>
                  </div>
                  <div
                    className="mt-1 text-[8.5px] font-bold truncate"
                    style={{ color: t.primaryText }}
                  >
                    {prod.name}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-[10px] font-black" style={{ color: t.priceColor }}>
                      ₹{Number(prod.price || 450)}
                    </span>
                    <span
                      className="text-[7.5px] line-through"
                      style={{ color: t.secondaryText }}
                    >
                      ₹{Number(prod.mrp || 699)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-1 w-full py-1 rounded-lg text-[8px] font-black"
                    style={{
                      backgroundColor: t.primaryButtonBg,
                      color: t.primaryButtonText,
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>

            {/* Active Popup Preview Pill */}
            {activePopup && (
              <div
                className="rounded-xl p-2 border text-center space-y-1 shadow-md"
                style={{
                  backgroundColor: t.cardBackground,
                  borderColor: t.primaryColor,
                }}
              >
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-white"
                  style={{ backgroundColor: t.primaryColor }}
                >
                  {activePopup.popup_type}
                </span>
                <div className="text-[9px] font-black" style={{ color: t.primaryText }}>
                  {activePopup.title}
                </div>
                <div className="text-[7.5px]" style={{ color: t.secondaryText }}>
                  {activePopup.description}
                </div>
              </div>
            )}
          </div>

          {/* 4. Dynamic Bottom Navigation Bar */}
          <div
            className="grid grid-cols-5 items-center py-1.5 px-2 border-t text-[7.5px] font-bold"
            style={{
              backgroundColor: t.navBarBg,
              borderColor: t.borderColor,
              color: t.secondaryText,
            }}
          >
            <div className="flex flex-col items-center" style={{ color: t.navBarIcon }}>
              <Home className="w-3.5 h-3.5" />
              <span className="font-black">Home</span>
            </div>
            <div className="flex flex-col items-center">
              <Grid className="w-3.5 h-3.5" />
              <span>Categories</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="h-6 w-6 rounded-full border-2 p-0.5 bg-white flex items-center justify-center"
                style={{ borderColor: t.accentColor }}
              >
                <img
                  src="/official-logo.png"
                  alt="AI"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cart</span>
            </div>
            <div className="flex flex-col items-center">
              <User className="w-3.5 h-3.5" />
              <span>Account</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !workingExp) {
    return (
      <div className="rounded-3xl bg-white border border-[#F1E4DE] p-8 space-y-6 animate-pulse">
        <div className="h-10 w-80 bg-[#FFF4F2] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#FFF9F8] rounded-2xl border border-[#F1E4DE]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-photo-overlay="false"
      className="rounded-3xl bg-[#FFFFFF] text-[#14120F] border border-[#F1E4DE] shadow-[0_18px_50px_-15px_rgba(240,58,70,0.12)] overflow-hidden select-none"
    >
      {/* =================================================================== */}
      {/* TOP OFFICIAL ZEBALPHA CORAL + WARM CORAL + PURE WHITE STUDIO HEADER */}
      {/* =================================================================== */}
      <div className="bg-gradient-to-r from-[#FFF5F3] via-[#FFFFFF] to-[#FFF4F0] border-b border-[#F1E4DE] px-5 py-5 sm:px-8 sm:py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#FD5852] to-[#F03A46] p-0.5 shadow-md shadow-[#F03A46]/20 flex items-center justify-center shrink-0">
            <img
              src="/official-logo.png"
              alt="ZebAlpha"
              className="h-full w-full rounded-[14px] object-cover bg-white"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F03A46] text-white">
                ZebAlpha DEMS v{version}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF4F2] text-[#F03A46] border border-[#FECDD3]">
                Live Theme: {activeCustomerExp?.name || "Default ZebAlpha Theme"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Asia/Kolkata (IST) • Zero APK Update
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#14120F] tracking-tight mt-1">
              Dynamic Experience &amp; Festival Theme Management System
            </h1>
            <p className="text-xs font-medium text-[#64748B]">
              Control Customer Android App &amp; Website festival themes, 25 color tokens, homepage sections, banners, popups, announcements &amp; IST schedules.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAllDemsData}
            disabled={loading || saving}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFF5F3] border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <a
            href={getStorefrontUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFF5F3] border border-[#F1E4DE] text-[#14120F] text-xs font-black flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-[#F03A46]" />
            <span>Open Customer App</span>
            <ExternalLink className="w-3 h-3 text-[#64748B]" />
          </a>

          {workingExp && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  executeApiAction(
                    { action: "save_experience", experience: workingExp, publishNow: false },
                    `Saved draft for "${workingExp.name}"`
                  )
                }
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF5F3] border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setConfirmDialog({
                    title: `Publish "${workingExp.name}" Live to Customer App?`,
                    description: `This will create an immutable Version v${version + 1} snapshot and immediately update the ZebAlpha Customer Android App & Website to "${workingExp.name}" (${workingExp.festival_name}).`,
                    confirmLabel: `Publish Live (v${version + 1})`,
                    onConfirm: async () => {
                      await executeApiAction(
                        {
                          action: "save_experience",
                          experience: workingExp,
                          publishNow: true,
                        },
                        `🚀 Published "${workingExp.name}" live to Customer App (v${version + 1})!`
                      );
                    },
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-[#F03A46] hover:bg-[#D92B38] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[#F03A46]/25 cursor-pointer active:scale-95 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? "Publishing..." : `Publish "${workingExp.name}"`}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Banner */}
      {toast && (
        <div
          className={`mx-6 mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-black opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Schedule Conflict Warning Strip */}
      {scheduleConflicts.length > 0 && (
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Scheduling Conflict Detected: &ldquo;{scheduleConflicts[0].experienceAName}&rdquo; and &ldquo;{scheduleConflicts[0].experienceBName}&rdquo; overlap ({scheduleConflicts[0].overlapStart.slice(0, 10)} to {scheduleConflicts[0].overlapEnd.slice(0, 10)}). Higher priority wins automatically.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubModule("scheduler")}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-black shrink-0 cursor-pointer"
          >
            Resolve in Scheduler →
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 12-SUBMODULE HORIZONTAL + SIDEBAR NAVIGATION BAR (CORAL + WHITE)    */}
      {/* =================================================================== */}
      <div className="bg-[#FFF9F7] border-b border-[#F1E4DE] px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {SUBMODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeSubModule === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveSubModule(mod.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-2 transition cursor-pointer border ${
                isActive
                  ? "bg-[#F03A46] text-white border-[#F03A46] shadow-sm shadow-[#F03A46]/25"
                  : "bg-white text-[#14120F] border-[#F1E4DE] hover:border-[#FEAA90] hover:bg-[#FFF4F2]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#F03A46]"}`} />
              <span>{mod.label}</span>
              {mod.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#FFF4F2] text-[#F03A46] border border-[#FECDD3]"
                  }`}
                >
                  {mod.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* MAIN STUDIO WORKSPACE + STICKY LIVE PHONE PREVIEW                   */}
      {/* =================================================================== */}
      <div className="p-5 sm:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div
          className={
            activeSubModule === "featured_collections"
              ? "xl:col-span-12 space-y-6"
              : "xl:col-span-8 space-y-6"
          }
        >
          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 1: OVERVIEW DASHBOARD                                 */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "overview" && (
            <div className="space-y-6">
              {/* Real Database KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-[#FFF5F3] border border-[#FECDD3] p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F03A46]">
                    Currently Active Experience
                  </span>
                  <div className="text-base font-black text-[#14120F] mt-1 truncate">
                    {activeCustomerExp?.name || "Default ZebAlpha Theme"}
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748B] mt-1">
                    Festival: <strong className="text-[#14120F]">{activeCustomerExp?.festivalName}</strong>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#F1E4DE] p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                    Customer App Config Version
                  </span>
                  <div className="text-2xl font-black text-[#F03A46] mt-1">
                    v{version}.0
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748B] mt-0.5 truncate">
                    Last updated:{" "}
                    {activeCustomerExp?.lastUpdatedAt
                      ? new Date(activeCustomerExp.lastUpdatedAt).toLocaleString("en-IN")
                      : "Today"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#F1E4DE] p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                    Scheduled &amp; Draft Themes
                  </span>
                  <div className="text-2xl font-black text-[#14120F] mt-1">
                    {kpiStats.scheduledCount} Scheduled • {kpiStats.draftCount} Drafts
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748B] mt-0.5">
                    {kpiStats.publishedCount} Immutable Snapshots
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#F1E4DE] p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                    Active Banners &amp; Campaigns
                  </span>
                  <div className="text-2xl font-black text-[#14120F] mt-1">
                    {kpiStats.activeBannersCount} Banners • {campaigns.length} Campaigns
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748B] mt-0.5">
                    {popups.length} Popups • {announcements.length} Announcements
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="rounded-2xl bg-[#FFF9F7] border border-[#F1E4DE] p-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#14120F]">
                  Quick Experience Actions
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#F03A46] hover:bg-[#D92B38] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Theme</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubModule("festival_studio")}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF4F2] border border-[#F03A46] text-[#F03A46] text-xs font-black cursor-pointer"
                  >
                    Change Active Theme
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubModule("campaign_manager")}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF4F2] border border-[#F1E4DE] text-[#14120F] text-xs font-bold cursor-pointer"
                  >
                    Create Festival Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubModule("homepage_manager")}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF4F2] border border-[#F1E4DE] text-[#14120F] text-xs font-bold cursor-pointer"
                  >
                    Manage Homepage Sections
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubModule("scheduler")}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF4F2] border border-[#F1E4DE] text-[#14120F] text-xs font-bold cursor-pointer"
                  >
                    Schedule Experience
                  </button>
                  <a
                    href={getStorefrontUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF4F2] border border-[#F1E4DE] text-[#14120F] text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <span>Preview Customer App</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#F03A46]" />
                  </a>
                </div>
              </div>

              {/* All Themes & Festivals Table */}
              <div className="rounded-2xl bg-white border border-[#F1E4DE] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#F1E4DE] flex items-center justify-between bg-[#FFFDFB]">
                  <div>
                    <h3 className="text-sm font-black text-[#14120F]">
                      All Festival &amp; Experience Themes ({experiences.length})
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Click any theme to load it into the Live Mobile Preview or publish immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Theme</span>
                  </button>
                </div>

                <div className="divide-y divide-[#F1E4DE]">
                  {experiences.map((exp) => {
                    const isLive = exp.id === activeCustomerExp?.activeExperienceId;
                    const isSelected = exp.id === selectedExpId;
                    return (
                      <div
                        key={exp.id}
                        onClick={() => handleSelectExperience(exp.id)}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected ? "bg-[#FFF5F3]" : "hover:bg-[#FFFDFB]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Color Swatch Trio */}
                          <div className="flex -space-x-1.5 shrink-0">
                            <span
                              className="h-7 w-7 rounded-full border-2 border-white shadow"
                              style={{ backgroundColor: exp.theme_tokens.primaryColor }}
                            />
                            <span
                              className="h-7 w-7 rounded-full border-2 border-white shadow"
                              style={{ backgroundColor: exp.theme_tokens.secondaryColor }}
                            />
                            <span
                              className="h-7 w-7 rounded-full border-2 border-white shadow"
                              style={{ backgroundColor: exp.theme_tokens.accentColor }}
                            />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-[#14120F]">{exp.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF4F2] text-[#F03A46] border border-[#FECDD3]">
                                {exp.festival_name}
                              </span>
                              {isLive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                  ● ACTIVE ON APP
                                </span>
                              )}
                              {!isLive && exp.status === "scheduled" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                                  ⏰ SCHEDULED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5">
                              {exp.description}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectExperience(exp.id);
                              setActiveSubModule("color_appearance");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#F1E4DE] hover:border-[#F03A46] text-xs font-bold text-[#14120F] cursor-pointer"
                          >
                            Customize
                          </button>

                          {!isLive && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDialog({
                                  title: `Activate "${exp.name}" Now?`,
                                  description: `Customer Android App & Website will immediately switch to "${exp.name}" (${exp.festival_name}).`,
                                  confirmLabel: "Publish Live Now",
                                  onConfirm: async () => {
                                    await executeApiAction(
                                      { action: "publish_experience", experienceId: exp.id },
                                      `🚀 "${exp.name}" is now LIVE on Customer App!`
                                    );
                                  },
                                })
                              }
                              className="px-3.5 py-1.5 rounded-lg bg-[#F03A46] hover:bg-[#D92B38] text-white text-xs font-black cursor-pointer"
                            >
                              Publish Live
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 2: FESTIVAL & THEME STUDIO (8 PRESETS + CRUD)         */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "festival_studio" && workingExp && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#14120F]">
                    Festival &amp; Theme Presets Library
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Select any prebuilt Indian festival template or custom theme, edit its identity, duplicate, schedule, or publish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#F03A46] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom Festival Theme</span>
                </button>
              </div>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {experiences.map((exp) => {
                  const isSelected = exp.id === workingExp.id;
                  const isLive = exp.id === activeCustomerExp?.activeExperienceId;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => handleSelectExperience(exp.id)}
                      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-[#F03A46] bg-[#FFF5F3] shadow-md shadow-[#F03A46]/10"
                          : "border-[#F1E4DE] bg-white hover:border-[#FEAA90]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white border border-[#FECDD3] text-[#F03A46]">
                            {exp.festival_name}
                          </span>
                          {isLive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                              ● LIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-700">
                              {exp.status}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-black text-[#14120F]">{exp.name}</h3>
                        <p className="text-xs text-[#64748B] line-clamp-2">{exp.description}</p>

                        {/* Color Palette Preview Bar */}
                        <div className="pt-2 flex items-center gap-1.5">
                          {[
                            exp.theme_tokens.primaryColor,
                            exp.theme_tokens.secondaryColor,
                            exp.theme_tokens.accentColor,
                            exp.theme_tokens.backgroundColor,
                            exp.theme_tokens.primaryButtonBg,
                            exp.theme_tokens.discountBadgeColor,
                          ].map((hex, i) => (
                            <div
                              key={i}
                              className="h-6 flex-1 rounded-lg border border-black/15 shadow-inner"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>

                      <div
                        className="pt-3 border-t border-[#F1E4DE] flex flex-wrap items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              executeApiAction(
                                {
                                  action: "duplicate_experience",
                                  sourceExperienceId: exp.id,
                                  name: `${exp.name} (Copy)`,
                                  festival_name: exp.festival_name,
                                },
                                `Duplicated "${exp.name}"!`
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F1E4DE] hover:border-[#F03A46] text-[11px] font-bold text-[#14120F] flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-[#F03A46]" />
                            <span>Duplicate</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSelectExperience(exp.id);
                              setActiveSubModule("color_appearance");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F1E4DE] hover:border-[#F03A46] text-[11px] font-bold text-[#14120F] cursor-pointer"
                          >
                            Edit Tokens
                          </button>
                        </div>

                        {!isLive ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                title: `Publish "${exp.name}" to Customer App?`,
                                description: `Customers will immediately see "${exp.name}" (${exp.festival_name}). Previous version is saved in Theme History.`,
                                confirmLabel: "Publish Live",
                                onConfirm: async () => {
                                  await executeApiAction(
                                    { action: "publish_experience", experienceId: exp.id },
                                    `🚀 "${exp.name}" published live!`
                                  );
                                },
                              })
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-[#F03A46] hover:bg-[#D92B38] text-white text-[11px] font-black cursor-pointer"
                          >
                            Publish Live
                          </button>
                        ) : (
                          !exp.is_default && (
                            <button
                              type="button"
                              onClick={() =>
                                executeApiAction(
                                  { action: "unpublish_experience", experienceId: exp.id },
                                  `Unpublished "${exp.name}". Reverted to Default ZebAlpha Theme.`
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 text-[11px] font-black cursor-pointer"
                            >
                              Unpublish
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Theme Identity Editor */}
              <div className="rounded-2xl bg-[#FFF9F7] border border-[#F1E4DE] p-5 space-y-4">
                <h3 className="text-sm font-black text-[#14120F]">
                  Editing Theme Identity: {workingExp.name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      value={workingExp.name}
                      onChange={(e) => setWorkingExp({ ...workingExp, name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                      Festival Name
                    </label>
                    <input
                      type="text"
                      value={workingExp.festival_name}
                      onChange={(e) =>
                        setWorkingExp({ ...workingExp, festival_name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                      Priority (Higher Wins Overlaps)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={workingExp.priority}
                      onChange={(e) =>
                        setWorkingExp({ ...workingExp, priority: Number(e.target.value || 5) })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={workingExp.description}
                    onChange={(e) => setWorkingExp({ ...workingExp, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#F1E4DE] text-xs text-[#14120F]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 3: COLOR & APPEARANCE MANAGER (25 TOKENS + ASSETS)    */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "color_appearance" && workingExp && (
            <div className="space-y-6">
              {/* Theme Selector Bar */}
              <div className="rounded-2xl bg-[#FFF5F3] border border-[#FECDD3] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#F03A46] uppercase">
                    Editing Theme:
                  </span>
                  <select
                    value={workingExp.id}
                    onChange={(e) => handleSelectExperience(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#F03A46] text-xs font-black text-[#14120F] cursor-pointer"
                  >
                    {experiences.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.festival_name})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs font-semibold text-[#64748B]">
                  Every color change updates the Live Customer App Preview on the right →
                </span>
              </div>

              {/* 25 Color Design Tokens by Group */}
              {(
                [
                  "Brand & Header",
                  "Backgrounds & Surfaces",
                  "Buttons & Controls",
                  "Navigation & Search",
                  "Badges & Status",
                ] as const
              ).map((groupName) => (
                <div
                  key={groupName}
                  className="rounded-2xl bg-white border border-[#F1E4DE] p-5 space-y-4"
                >
                  <h3 className="text-sm font-black text-[#14120F] uppercase tracking-wider border-b border-[#F1E4DE] pb-2">
                    {groupName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {COLOR_TOKEN_FIELDS.filter((f) => f.group === groupName).map((field) => {
                      const val = workingExp.theme_tokens[field.key] || "#FFFFFF";
                      return (
                        <div
                          key={field.key}
                          className="p-3 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <label className="block text-[11px] font-bold text-[#14120F] truncate">
                              {field.label}
                            </label>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => updateColorToken(field.key, e.target.value)}
                              className="mt-1 w-24 px-2 py-1 rounded-lg bg-white border border-[#F1E4DE] font-mono text-xs font-bold text-[#14120F] uppercase"
                            />
                          </div>
                          <input
                            type="color"
                            value={/^#[0-9A-Fa-f]{6}$/.test(val) ? val : "#F03A46"}
                            onChange={(e) => updateColorToken(field.key, e.target.value)}
                            className="h-10 w-10 rounded-xl border border-[#F1E4DE] cursor-pointer shrink-0 bg-white p-0.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Typography Configuration */}
              <div className="rounded-2xl bg-white border border-[#F1E4DE] p-5 space-y-4">
                <h3 className="text-sm font-black text-[#14120F] uppercase tracking-wider border-b border-[#F1E4DE] pb-2">
                  Typography Tokens (Safe Built-In Fonts)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                      Heading Font Style
                    </label>
                    <select
                      value={workingExp.typography.headingStyle}
                      onChange={(e) => updateTypographyToken("headingStyle", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                    >
                      <option value="sans">Modern Sans (Outfit / Inter)</option>
                      <option value="serif">Festive Editorial Serif</option>
                      <option value="display">Bold Culture Display</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                      Heading Font Weight
                    </label>
                    <select
                      value={workingExp.typography.fontWeight}
                      onChange={(e) => updateTypographyToken("fontWeight", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                    >
                      <option value="bold">Bold (700)</option>
                      <option value="black">Extra Black (900)</option>
                      <option value="medium">Medium (500)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                      Button Text Weight
                    </label>
                    <select
                      value={workingExp.typography.buttonTextWeight}
                      onChange={(e) => updateTypographyToken("buttonTextWeight", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                    >
                      <option value="black">Black Uppercase</option>
                      <option value="bold">Bold</option>
                      <option value="semibold">Semi-Bold</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 8 Visual Assets (Cloudinary CDN Upload) */}
              <div className="rounded-2xl bg-white border border-[#F1E4DE] p-5 space-y-4">
                <h3 className="text-sm font-black text-[#14120F] uppercase tracking-wider border-b border-[#F1E4DE] pb-2">
                  Visual Festival Assets (Cloudinary CDN Direct Upload)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ASSET_SLOTS.map((slot) => {
                    const url = workingExp.assets[slot.key] || "";
                    const isUploading = uploadingKey === slot.key;
                    return (
                      <div
                        key={slot.key}
                        className="p-3.5 rounded-2xl bg-[#FFFDFB] border border-[#F1E4DE] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-black text-[#14120F]">{slot.label}</div>
                            <div className="text-[10px] text-[#64748B]">{slot.hint}</div>
                          </div>
                          <label className="px-3 py-1.5 rounded-xl bg-[#FFF4F2] hover:bg-[#F03A46] hover:text-white border border-[#FECDD3] text-[#F03A46] text-[10px] font-black uppercase cursor-pointer flex items-center gap-1 transition shrink-0">
                            <Upload className="w-3 h-3" />
                            <span>{isUploading ? "Uploading..." : "Upload CDN"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploading}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleCloudinaryAssetUpload(
                                    file,
                                    "dems-festival-assets",
                                    (cdnUrl) => updateAssetToken(slot.key, cdnUrl),
                                    slot.key
                                  );
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          {url && (
                            <img
                              src={url}
                              alt={slot.label}
                              className="h-10 w-10 rounded-lg object-cover border border-[#F1E4DE] shrink-0"
                            />
                          )}
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => updateAssetToken(slot.key, e.target.value)}
                            placeholder="https://res.cloudinary.com/..."
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F1E4DE] text-xs font-mono text-[#14120F]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 4: HOMEPAGE EXPERIENCE MANAGER (11 SDUI SECTIONS)     */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "homepage_manager" && workingExp && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#FFF5F3] border border-[#FECDD3] p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-[#14120F]">
                    Homepage Experience Manager — {workingExp.name}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Reorder supported homepage sections, edit titles/subtitles, configure Flash Deal timers, and toggle Web/Android App visibility. Live product pagination &amp; infinite scroll remain 100% preserved.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {workingExp.home_sections.map((sec, idx) => (
                  <div
                    key={sec.section_key}
                    className={`rounded-2xl border p-4 transition-all ${
                      sec.is_visible
                        ? "bg-white border-[#F1E4DE]"
                        : "bg-zinc-50 border-zinc-200 opacity-70"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveHomeSection(idx, -1)}
                            className="p-1.5 rounded-lg bg-[#FFF5F3] border border-[#FECDD3] text-[#F03A46] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 py-0.5 rounded bg-[#F03A46] text-white text-[10px] font-black">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={idx === workingExp.home_sections.length - 1}
                            onClick={() => moveHomeSection(idx, 1)}
                            className="p-1.5 rounded-lg bg-[#FFF5F3] border border-[#FECDD3] text-[#F03A46] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex-1 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF4F2] border border-[#FECDD3] text-[10px] font-black uppercase text-[#F03A46]">
                              {sec.widget_type}
                            </span>
                            <select
                              value={sec.target_audience || "all"}
                              onChange={(e) =>
                                updateHomeSection(sec.section_key, {
                                  target_audience: e.target.value as any,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#FFFDFB] border border-[#F1E4DE] text-[11px] font-bold text-[#14120F]"
                            >
                              <option value="all">Audience: All Users</option>
                              <option value="new_users">Audience: New Users</option>
                              <option value="app_only">Audience: Android App Only</option>
                              <option value="web_only">Audience: Website Only</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                                Section Title
                              </label>
                              <input
                                type="text"
                                value={sec.title}
                                onChange={(e) =>
                                  updateHomeSection(sec.section_key, { title: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                                Section Subtitle
                              </label>
                              <input
                                type="text"
                                value={sec.subtitle}
                                onChange={(e) =>
                                  updateHomeSection(sec.section_key, { subtitle: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs text-[#14120F]"
                              />
                            </div>
                          </div>

                          {/* Flash Deal Timer Config when FLASH_DEAL_STRIP */}
                          {sec.widget_type === "FLASH_DEAL_STRIP" && (
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#F03A46] mb-1">
                                  Flash Sale Countdown End Time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={
                                    sec.settings_json?.ends_at
                                      ? String(sec.settings_json.ends_at).slice(0, 16)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    updateHomeSection(sec.section_key, {
                                      settings_json: {
                                        ...(sec.settings_json || {}),
                                        ends_at: e.target.value
                                          ? new Date(e.target.value).toISOString()
                                          : "",
                                      },
                                    })
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#FECDD3] text-xs font-bold text-[#14120F]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#F03A46] mb-1">
                                  Flash Badge Text
                                </label>
                                <input
                                  type="text"
                                  value={sec.settings_json?.badge_text || "LIVE FLASH SALE"}
                                  onChange={(e) =>
                                    updateHomeSection(sec.section_key, {
                                      settings_json: {
                                        ...(sec.settings_json || {}),
                                        badge_text: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#FECDD3] text-xs font-bold text-[#14120F]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateHomeSection(sec.section_key, { web_enabled: !sec.web_enabled })
                          }
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                            sec.web_enabled
                              ? "bg-[#FFF4F2] border-[#FECDD3] text-[#F03A46]"
                              : "bg-zinc-100 border-zinc-200 text-zinc-500"
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Web: {sec.web_enabled ? "ON" : "OFF"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateHomeSection(sec.section_key, { app_enabled: !sec.app_enabled })
                          }
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                            sec.app_enabled
                              ? "bg-[#FFF4F2] border-[#FECDD3] text-[#F03A46]"
                              : "bg-zinc-100 border-zinc-200 text-zinc-500"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>App: {sec.app_enabled ? "ON" : "OFF"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateHomeSection(sec.section_key, { is_visible: !sec.is_visible })
                          }
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase border flex items-center gap-1 cursor-pointer ${
                            sec.is_visible
                              ? "bg-[#F03A46] border-[#F03A46] text-white"
                              : "bg-white border-zinc-300 text-zinc-600"
                          }`}
                        >
                          {sec.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{sec.is_visible ? "VISIBLE" : "HIDDEN"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 5: BANNER & ARTWORK MANAGER (CLOUDINARY CDN)          */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "banner_artwork" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#14120F]">
                    Banner &amp; Artwork Manager ({banners.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Upload 16:9 Android &amp; Web hero banners directly to Cloudinary CDN, validate click destinations, and schedule display priority.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBanners([
                        {
                          id: `bnr_${Date.now()}`,
                          title: "New Festival Hero Banner",
                          subtitle: "LIMITED TIME FESTIVAL DROP",
                          image_url: "/banner-grand-opening.jpg",
                          mobile_image_url: "/banner-grand-opening.jpg",
                          destination_type: "page",
                          destination_value: "/products",
                          priority: 10,
                          target_audience: "all",
                          status: "active",
                        },
                        ...banners,
                      ])
                    }
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Banner</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      executeApiAction(
                        { action: "save_banners", banners },
                        "🚀 Banners saved & published to Customer App!"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Publish Banners</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {banners.map((bnr, idx) => (
                  <div
                    key={bnr.id}
                    className="rounded-2xl bg-white border border-[#F1E4DE] p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                  >
                    <div className="md:col-span-4 space-y-2">
                      <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#F1E4DE] bg-[#FFF5F3]">
                        <img
                          src={bnr.mobile_image_url || bnr.image_url}
                          alt={bnr.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label className="w-full py-1.5 rounded-xl bg-[#FFF4F2] hover:bg-[#F03A46] hover:text-white border border-[#FECDD3] text-[#F03A46] text-[11px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingKey === bnr.id ? "Uploading to CDN..." : "Upload Image (Cloudinary)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              handleCloudinaryAssetUpload(
                                f,
                                "hero-banners",
                                (cdnUrl) => {
                                  const next = [...banners];
                                  next[idx] = {
                                    ...next[idx],
                                    image_url: cdnUrl,
                                    mobile_image_url: cdnUrl,
                                  };
                                  setBanners(next);
                                },
                                bnr.id
                              );
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="md:col-span-8 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Banner Title
                          </label>
                          <input
                            type="text"
                            value={bnr.title}
                            onChange={(e) => {
                              const next = [...banners];
                              next[idx] = { ...next[idx], title: e.target.value };
                              setBanners(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Status
                          </label>
                          <select
                            value={bnr.status}
                            onChange={(e) => {
                              const next = [...banners];
                              next[idx] = { ...next[idx], status: e.target.value as any };
                              setBanners(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          >
                            <option value="active">Active</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Click Action Type
                          </label>
                          <select
                            value={bnr.destination_type}
                            onChange={(e) => {
                              const next = [...banners];
                              next[idx] = {
                                ...next[idx],
                                destination_type: e.target.value as BannerDestinationType,
                              };
                              setBanners(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          >
                            <option value="page">Open App Page</option>
                            <option value="product">Open Product</option>
                            <option value="category">Open Category</option>
                            <option value="collection">Open Collection</option>
                            <option value="campaign">Open Campaign</option>
                            <option value="external">External URL</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Destination Path / URL
                          </label>
                          <input
                            type="text"
                            value={bnr.destination_value}
                            onChange={(e) => {
                              const next = [...banners];
                              next[idx] = { ...next[idx], destination_value: e.target.value };
                              setBanners(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-mono text-[#14120F]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Priority
                          </label>
                          <input
                            type="number"
                            value={bnr.priority}
                            onChange={(e) => {
                              const next = [...banners];
                              next[idx] = { ...next[idx], priority: Number(e.target.value || 1) };
                              setBanners(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <input
                          type="text"
                          value={bnr.image_url}
                          onChange={(e) => {
                            const next = [...banners];
                            next[idx] = {
                              ...next[idx],
                              image_url: e.target.value,
                              mobile_image_url: e.target.value,
                            };
                            setBanners(next);
                          }}
                          placeholder="Image CDN URL"
                          className="flex-1 mr-3 px-3 py-1 rounded-lg bg-[#FFFDFB] border border-[#F1E4DE] text-[11px] font-mono text-[#64748B]"
                        />
                        <button
                          type="button"
                          onClick={() => setBanners(banners.filter((_, i) => i !== idx))}
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 6: CAMPAIGN MANAGER                                   */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "campaign_manager" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#14120F]">
                    Promotional Campaign Manager ({campaigns.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Manage Festival Sales, Seasonal Sales, New Arrivals &amp; Brand Campaigns linked to themes and homepage sections. (Uses real product prices — never fake pricing).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCampaigns([
                        {
                          id: `camp_${Date.now()}`,
                          name: "New Festival Sale Campaign",
                          description: "Curated festival fashion drops across categories.",
                          campaign_type: "Festival Sale",
                          priority: 10,
                          associated_theme_id: workingExp?.id || "exp_default_zebalpha",
                          associated_banner_ids: [],
                          associated_section_keys: ["festive_16_slot_grid"],
                          destination_url: "/products",
                          badge_text: "FESTIVAL SALE",
                          status: "active",
                        },
                        ...campaigns,
                      ])
                    }
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Campaign</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      executeApiAction(
                        { action: "save_campaigns", campaigns },
                        "🚀 Campaigns saved & synced!"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Campaigns</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {campaigns.map((camp, idx) => (
                  <div
                    key={camp.id}
                    className="rounded-2xl bg-white border border-[#F1E4DE] p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                          Campaign Name
                        </label>
                        <input
                          type="text"
                          value={camp.name}
                          onChange={(e) => {
                            const next = [...campaigns];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setCampaigns(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                          Campaign Type
                        </label>
                        <select
                          value={camp.campaign_type}
                          onChange={(e) => {
                            const next = [...campaigns];
                            next[idx] = {
                              ...next[idx],
                              campaign_type: e.target.value as CampaignCategoryType,
                            };
                            setCampaigns(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                        >
                          <option value="Festival Sale">Festival Sale</option>
                          <option value="Seasonal Sale">Seasonal Sale</option>
                          <option value="Special Collection">Special Collection</option>
                          <option value="New Arrivals">New Arrivals</option>
                          <option value="Limited-Time Promotion">Limited-Time Promotion</option>
                          <option value="Brand Campaign">Brand Campaign</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                          Status
                        </label>
                        <select
                          value={camp.status}
                          onChange={(e) => {
                            const next = [...campaigns];
                            next[idx] = { ...next[idx], status: e.target.value as any };
                            setCampaigns(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                        >
                          <option value="active">Active</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="draft">Draft</option>
                          <option value="paused">Paused</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                          Associated Theme
                        </label>
                        <select
                          value={camp.associated_theme_id || "exp_default_zebalpha"}
                          onChange={(e) => {
                            const next = [...campaigns];
                            next[idx] = { ...next[idx], associated_theme_id: e.target.value };
                            setCampaigns(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                        >
                          {experiences.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                          Destination URL
                        </label>
                        <input
                          type="text"
                          value={camp.destination_url}
                          onChange={(e) => {
                            const next = [...campaigns];
                            next[idx] = { ...next[idx], destination_url: e.target.value };
                            setCampaigns(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-mono text-[#14120F]"
                        />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Badge Label
                          </label>
                          <input
                            type="text"
                            value={camp.badge_text || ""}
                            onChange={(e) => {
                              const next = [...campaigns];
                              next[idx] = { ...next[idx], badge_text: e.target.value };
                              setCampaigns(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCampaigns(campaigns.filter((_, i) => i !== idx))}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 7: POPUP MANAGER                                      */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "popup_manager" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#14120F]">
                    Customer App Popup Manager ({popups.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Configure non-intrusive Welcome, Festival &amp; Campaign Popups with strict session/daily frequency controls.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPopups([
                        {
                          id: `pop_${Date.now()}`,
                          popup_type: "Festival Popup",
                          title: `${workingExp?.festival_name || "Festive"} Special Welcome!`,
                          description:
                            "Enjoy Flat ₹100 OFF on your 1st order above ₹399 + Free Pan-India Delivery.",
                          image_url: "/banner-grand-opening.jpg",
                          button_text: "Explore Collection",
                          destination_type: "page",
                          destination_value: "/products",
                          display_frequency: "once_per_session",
                          dismissal_behavior: "close_button_and_backdrop",
                          target_audience: "all",
                          priority: 10,
                          status: "active",
                        },
                        ...popups,
                      ])
                    }
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Popup</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      executeApiAction(
                        { action: "save_popups", popups },
                        "🚀 Popups saved & synced to Customer App!"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Popups</span>
                  </button>
                </div>
              </div>

              {popups.length === 0 ? (
                <div className="rounded-2xl bg-[#FFF9F7] border border-[#F1E4DE] p-10 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-[#F03A46] mx-auto" />
                  <p className="text-sm font-black text-[#14120F]">No Active Popups Configured</p>
                  <p className="text-xs text-[#64748B]">
                    Click &ldquo;Add Popup&rdquo; above to create a Festival Greeting or Welcome Offer Popup.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {popups.map((pop, idx) => (
                    <div
                      key={pop.id}
                      className="rounded-2xl bg-white border border-[#F1E4DE] p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Popup Type
                          </label>
                          <select
                            value={pop.popup_type}
                            onChange={(e) => {
                              const next = [...popups];
                              next[idx] = { ...next[idx], popup_type: e.target.value as any };
                              setPopups(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          >
                            <option value="Welcome Popup">Welcome Popup</option>
                            <option value="Festival Popup">Festival Popup</option>
                            <option value="Promotional Popup">Promotional Popup</option>
                            <option value="Campaign Popup">Campaign Popup</option>
                            <option value="Announcement Popup">Announcement Popup</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Popup Title
                          </label>
                          <input
                            type="text"
                            value={pop.title}
                            onChange={(e) => {
                              const next = [...popups];
                              next[idx] = { ...next[idx], title: e.target.value };
                              setPopups(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Frequency Rule
                          </label>
                          <select
                            value={pop.display_frequency}
                            onChange={(e) => {
                              const next = [...popups];
                              next[idx] = {
                                ...next[idx],
                                display_frequency: e.target.value as PopupDisplayFrequency,
                              };
                              setPopups(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          >
                            <option value="once_per_session">Once Per Session</option>
                            <option value="once_per_day">Once Per Day</option>
                            <option value="once_per_campaign">Once Per Campaign</option>
                            <option value="every_visit">Every Eligible Visit</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                          Popup Message / Description
                        </label>
                        <input
                          type="text"
                          value={pop.description}
                          onChange={(e) => {
                            const next = [...popups];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setPopups(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs text-[#14120F]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={pop.button_text}
                            onChange={(e) => {
                              const next = [...popups];
                              next[idx] = { ...next[idx], button_text: e.target.value };
                              setPopups(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            CTA Destination URL
                          </label>
                          <input
                            type="text"
                            value={pop.destination_value}
                            onChange={(e) => {
                              const next = [...popups];
                              next[idx] = { ...next[idx], destination_value: e.target.value };
                              setPopups(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-mono text-[#14120F]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-1">
                            Status
                          </label>
                          <select
                            value={pop.status}
                            onChange={(e) => {
                              const next = [...popups];
                              next[idx] = { ...next[idx], status: e.target.value as any };
                              setPopups(next);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                          >
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="px-3 py-1.5 rounded-xl bg-[#FFF4F2] border border-[#FECDD3] text-[#F03A46] text-[10px] font-black uppercase cursor-pointer flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>Artwork CDN</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  handleCloudinaryAssetUpload(
                                    f,
                                    "popups",
                                    (cdnUrl) => {
                                      const next = [...popups];
                                      next[idx] = { ...next[idx], image_url: cdnUrl };
                                      setPopups(next);
                                    },
                                    pop.id
                                  );
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setPopups(popups.filter((_, i) => i !== idx))}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 8: ANNOUNCEMENT MANAGER                               */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "announcement_manager" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#14120F]">
                    Announcement &amp; Marquee Manager ({announcements.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Publish festival greetings, shopping updates &amp; scrolling marquee announcements in the Customer App.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAnnouncements([
                        {
                          id: `ann_${Date.now()}`,
                          title: "Festival Greeting",
                          message: "SHUBHO UTSAV • FLAT ₹100 OFF ON YOUR FIRST ORDER (CODE: FIRST100)",
                          icon_key: "flame",
                          cta_text: "Shop Now",
                          destination_value: "/products",
                          priority: 10,
                          status: "active",
                        },
                        ...announcements,
                      ])
                    }
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Announcement</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      executeApiAction(
                        { action: "save_announcements", announcements },
                        "🚀 Announcements published to Customer App!"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Publish Announcements</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {announcements.map((ann, idx) => (
                  <div
                    key={ann.id}
                    className="rounded-2xl bg-white border border-[#F1E4DE] p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-2">
                      <select
                        value={ann.icon_key || "flame"}
                        onChange={(e) => {
                          const next = [...announcements];
                          next[idx] = { ...next[idx], icon_key: e.target.value as any };
                          setAnnouncements(next);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                      >
                        <option value="crown">Crown</option>
                        <option value="flame">Flame</option>
                        <option value="tag">Offer Tag</option>
                        <option value="truck">Truck</option>
                        <option value="shield">Shield</option>
                      </select>
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={ann.message}
                        onChange={(e) => {
                          const next = [...announcements];
                          next[idx] = { ...next[idx], message: e.target.value };
                          setAnnouncements(next);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                        placeholder="Announcement message..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={ann.status}
                        onChange={(e) => {
                          const next = [...announcements];
                          next[idx] = { ...next[idx], status: e.target.value as any };
                          setAnnouncements(next);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setAnnouncements(announcements.filter((_, i) => i !== idx))
                        }
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 9: FEATURED COLLECTION & 16-SLOT DEALS MANAGER        */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "featured_collections" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#FFF5F3] border border-[#FECDD3] p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-[#14120F]">
                    Featured Collections &amp; 16-Slot Festival Merchandising Grid
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Configure the 16-Slot Flipkart/Meesho Festival Deal Cards below, or open Curated Category Collections.
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("curated-collections")}
                    className="px-4 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black cursor-pointer"
                  >
                    Open Curated Collections Table →
                  </button>
                )}
              </div>

              <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <PromotionsStudioView />
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 10: EXPERIENCE SCHEDULER (ASIA/KOLKATA)               */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "scheduler" && workingExp && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#FFF5F3] border border-[#FECDD3] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-[#14120F]">
                      Experience Scheduler (Timezone: Asia/Kolkata IST)
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Schedule festival themes in advance. Backend automatically activates on Start Time and automatically restores Default ZebAlpha Theme on End Time.
                    </p>
                  </div>
                </div>

                {/* Schedule Form for Selected Experience */}
                <div className="p-4 rounded-2xl bg-white border border-[#F1E4DE] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#64748B] mb-1">
                        Select Experience to Schedule
                      </label>
                      <select
                        value={workingExp.id}
                        onChange={(e) => handleSelectExperience(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-black text-[#14120F]"
                      >
                        {experiences
                          .filter((e) => !e.is_default)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.festival_name})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#64748B] mb-1">
                        Start Date &amp; Time (IST)
                      </label>
                      <input
                        type="datetime-local"
                        value={schedStartInput}
                        onChange={(e) => setSchedStartInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#64748B] mb-1">
                        End Date &amp; Time (Auto-Expiry)
                      </label>
                      <input
                        type="datetime-local"
                        value={schedEndInput}
                        onChange={(e) => setSchedEndInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#64748B] mb-1">
                        Priority (1–100)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={schedPriorityInput}
                        onChange={(e) => setSchedPriorityInput(Number(e.target.value || 10))}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={saving || workingExp.is_default}
                      onClick={() =>
                        executeApiAction(
                          {
                            action: "schedule_experience",
                            experienceId: workingExp.id,
                            start_at: schedStartInput
                              ? new Date(schedStartInput).toISOString()
                              : null,
                            end_at: schedEndInput ? new Date(schedEndInput).toISOString() : null,
                            priority: schedPriorityInput,
                          },
                          `⏰ Scheduled "${workingExp.name}" (${workingExp.festival_name})!`
                        )
                      }
                      className="px-5 py-2.5 rounded-xl bg-[#F03A46] hover:bg-[#D92B38] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Schedule Selected Experience</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Master Schedule Table */}
              <div className="rounded-2xl bg-white border border-[#F1E4DE] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF5F3] text-[10px] font-black uppercase text-[#64748B] border-b border-[#F1E4DE]">
                    <tr>
                      <th className="py-3.5 px-4">Experience</th>
                      <th className="py-3.5 px-4">Festival</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Start Time (IST)</th>
                      <th className="py-3.5 px-4">End Time (Auto-Restore)</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1E4DE]">
                    {experiences.map((exp) => {
                      const isLive = exp.id === activeCustomerExp?.activeExperienceId;
                      return (
                        <tr key={exp.id} className="hover:bg-[#FFFDFB]">
                          <td className="py-3.5 px-4 font-black text-[#14120F]">{exp.name}</td>
                          <td className="py-3.5 px-4 text-[#64748B] font-semibold">
                            {exp.festival_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#14120F]">
                            P{exp.priority}
                          </td>
                          <td className="py-3.5 px-4 text-[#64748B]">
                            {exp.is_default
                              ? "Always Ready (Fallback)"
                              : exp.start_at
                              ? new Date(exp.start_at).toLocaleString("en-IN")
                              : "Immediate / Manual"}
                          </td>
                          <td className="py-3.5 px-4 text-[#64748B]">
                            {exp.is_default
                              ? "Never Expires"
                              : exp.end_at
                              ? new Date(exp.end_at).toLocaleString("en-IN")
                              : "No End Date"}
                          </td>
                          <td className="py-3.5 px-4">
                            {isLive ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                Active Now
                              </span>
                            ) : exp.status === "scheduled" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                                Scheduled
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600">
                                {exp.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 11: THEME HISTORY, VERSIONING & 1-CLICK ROLLBACK      */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "history_rollback" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-[#14120F]">
                  Immutable Publication History &amp; 1-Click Rollback ({publications.length} Versions)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Every published theme creates an immutable snapshot. Rollback publishes a new version restoring the historical snapshot without deleting history.
                </p>
              </div>

              <div className="space-y-3">
                {publications.map((pub) => (
                  <div
                    key={pub.id}
                    className="rounded-2xl bg-white border border-[#F1E4DE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F03A46] text-white text-[10px] font-black">
                          Version {pub.version}
                        </span>
                        <span className="text-sm font-black text-[#14120F]">
                          {pub.version_label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#FFF4F2] border border-[#FECDD3] text-[10px] font-bold text-[#F03A46]">
                          {pub.festival_name}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        Published by <strong>{pub.published_by}</strong> on{" "}
                        {new Date(pub.published_at).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setConfirmDialog({
                          title: `Roll Back to Version v${pub.version} (${pub.experience_name})?`,
                          description: `This will restore the exact colors, typography, assets, banners, and homepage layout from Version v${pub.version} and publish it as new Version v${version + 1}.`,
                          confirmLabel: `Restore & Publish as v${version + 1}`,
                          onConfirm: async () => {
                            await executeApiAction(
                              { action: "rollback_publication", publicationId: pub.id },
                              `⏪ Rolled back to v${pub.version} (${pub.experience_name}) as new Version v${version + 1}!`
                            );
                          },
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-white hover:bg-[#FFF5F3] border border-[#F03A46] text-[#F03A46] text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore This Version</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Audit Logs */}
              <div className="rounded-2xl bg-white border border-[#F1E4DE] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#FFF5F3] border-b border-[#F1E4DE]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#14120F]">
                    Administrator Audit Trail ({auditLogs.length})
                  </h3>
                </div>
                <div className="divide-y divide-[#F1E4DE] max-h-80 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="px-5 py-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-black text-[#F03A46] mr-2">{log.action}</span>
                        <span className="font-bold text-[#14120F]">
                          {log.experience_name || log.experience_id}
                        </span>
                        <span className="text-[#64748B] ml-2">by {log.admin_email}</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B]">
                        {log.previous_version ? `v${log.previous_version} → v${log.new_version}` : ""}{" "}
                        • {new Date(log.created_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SUBMODULE 12: EXPERIENCE SETTINGS & EMERGENCY RESET             */}
          {/* --------------------------------------------------------------- */}
          {activeSubModule === "settings" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white border border-[#F1E4DE] p-6 space-y-4">
                <h2 className="text-lg font-black text-[#14120F]">
                  Experience Architecture &amp; Cache Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#F1E4DE]">
                    <div className="text-[10px] font-black uppercase text-[#64748B]">
                      Authoritative Timezone
                    </div>
                    <div className="text-base font-black text-[#14120F] mt-1">
                      Asia/Kolkata (IST, UTC+5:30)
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#F1E4DE]">
                    <div className="text-[10px] font-black uppercase text-[#64748B]">
                      Android Offline Cache Policy
                    </div>
                    <div className="text-base font-black text-emerald-700 mt-1">
                      Enabled (LocalStorage + Default Fallback)
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#F1E4DE]">
                    <div className="text-[10px] font-black uppercase text-[#64748B]">
                      Image Storage &amp; Delivery
                    </div>
                    <div className="text-base font-black text-[#14120F] mt-1">
                      Cloudinary CDN (f_auto, q_auto)
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Reset to Default ZebAlpha Theme */}
              <div className="rounded-2xl bg-[#FFF5F3] border-2 border-[#F03A46] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-black text-[#F03A46]">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Emergency Restore Default ZebAlpha Theme</span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Immediately deactivates any custom festival theme and restores the official Default ZebAlpha Bright Coral + Warm Coral + White experience across all Customer Android Apps.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setConfirmDialog({
                      title: "Restore Default ZebAlpha Theme Immediately?",
                      description:
                        "All active festival overrides will be deactivated and the official Default ZebAlpha Theme will be published immediately.",
                      confirmLabel: "Restore Default Theme Now",
                      onConfirm: async () => {
                        await executeApiAction(
                          { action: "emergency_reset_default" },
                          "✅ Restored Default ZebAlpha Theme across all Customer Apps!"
                        );
                      },
                    })
                  }
                  className="px-5 py-3 rounded-xl bg-[#F03A46] hover:bg-[#D92B38] text-white text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-md"
                >
                  Restore Default ZebAlpha Theme
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Customer App Phone Preview */}
        {activeSubModule !== "featured_collections" && (
          <div className="xl:col-span-4">{renderLivePhonePreview()}</div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: CREATE NEW FESTIVAL THEME                                  */}
      {/* =================================================================== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white border border-[#F1E4DE] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F1E4DE] pb-3">
              <h3 className="text-base font-black text-[#14120F]">
                Create New Festival / Campaign Theme
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#64748B] hover:text-[#14120F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                  Start From Preset Template
                </label>
                <select
                  value={newThemeBaseId}
                  onChange={(e) => setNewThemeBaseId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                >
                  {experiences.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.festival_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                  Theme Name *
                </label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="e.g. Grand Diwali Royal Edition 2026"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                  Festival / Occasion Name *
                </label>
                <input
                  type="text"
                  value={newFestivalName}
                  onChange={(e) => setNewFestivalName(e.target.value)}
                  placeholder="e.g. Diwali / Durga Puja / Winter Drop"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs font-bold text-[#14120F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#64748B] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newThemeDesc}
                  onChange={(e) => setNewThemeDesc(e.target.value)}
                  placeholder="Brief description of this seasonal experience..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FFFDFB] border border-[#F1E4DE] text-xs text-[#14120F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1E4DE]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-[#F1E4DE] text-xs font-bold text-[#64748B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newThemeName.trim() || saving}
                onClick={async () => {
                  await executeApiAction(
                    {
                      action: "create_experience",
                      sourceExperienceId: newThemeBaseId,
                      name: newThemeName.trim(),
                      festival_name: newFestivalName.trim() || "Festival Special",
                      description: newThemeDesc.trim(),
                    },
                    `✨ Created "${newThemeName.trim()}"! You can now customize its 25 color tokens.`
                  );
                  setNewThemeName("");
                  setNewFestivalName("");
                  setNewThemeDesc("");
                  setShowCreateModal(false);
                  setActiveSubModule("color_appearance");
                }}
                className="px-5 py-2 rounded-xl bg-[#F03A46] text-white text-xs font-black cursor-pointer disabled:opacity-50"
              >
                Create Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: SENSITIVE ACTION CONFIRMATION DIALOG                       */}
      {/* =================================================================== */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white border border-[#F1E4DE] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-[#14120F]">{confirmDialog.title}</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">{confirmDialog.description}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#F1E4DE] text-xs font-bold text-[#64748B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await fn();
                }}
                className="px-5 py-2 rounded-xl bg-[#F03A46] hover:bg-[#D92B38] text-white text-xs font-black cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
