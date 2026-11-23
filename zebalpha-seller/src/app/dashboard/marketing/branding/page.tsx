"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { supabase } from "@shared/utils/supabaseClient";
import {
  CheckCircle2,
  Eye,
  MousePointerClick,
  ShoppingBag,
  IndianRupee,
  Megaphone,
  Pause,
  Play,
  X,
  CreditCard,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  Store,
  Star,
  Info,
  Search,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Download,
  SlidersHorizontal,
  Clock,
  Flame,
  Link2,
  Sparkles,
  Gift,
  Lock,
} from "lucide-react";

interface BrandingPackage {
  key: "app_offer_99_28d" | "festival_mega_139_45d" | "store_search_49_18d" | "store_search_59_28d";
  track: "app_ad" | "store_pass";
  name: string;
  placement_type: "homepage_spotlight" | "brand_takeover" | "store_search";
  duration_days: number;
  amount_inr: number;
  max_products: number;
  badge: string;
  popular?: boolean;
  instant_activation: boolean;
  summary: string;
  features: string[];
}

interface SellerProductOption {
  id: string;
  name: string;
  price: number;
  mrp: number;
  image_url: string | null;
}

interface BrandingCampaignRow {
  id: string;
  package_key: string;
  placement_type: string;
  headline: string;
  tagline: string | null;
  offer_badge?: string | null;
  banner_image_url: string | null;
  product_ids: string[];
  duration_days: number;
  amount_inr: number;
  payment_method: string;
  payment_status: string;
  payment_ref?: string | null;
  approval_status: string;
  rejection_reason: string | null;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  attributed_orders: number;
  attributed_revenue: number;
  created_at: string;
}

interface BrandingTransactionRow {
  id: string;
  package_key: string;
  track_type: "app_ad" | "store_pass";
  amount_inr: number;
  duration_days: number;
  payment_method: string;
  gateway_payment_id?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

interface SellerProfileState {
  id: string;
  storeName: string;
  email: string;
  phone: string;
  logoUrl: string | null;
  storeSlug: string;
  storeTagline: string;
  storeBannerUrl: string;
  storePassPlan: string | null;
  storePassStatus: "active" | "expired" | "inactive";
  storePassStartsAt: string | null;
  storePassExpiresAt: string | null;
  storePassTrialUsed?: boolean;
  storePassFreeTrialEligible?: boolean;
  storePassRenewalCount: number;
  storeSearchCount: number;
  storeVisitCount: number;
  missedStoreSearches: number;
  missedStoreVisits: number;
  storeSlugBlocked: boolean;
  storeSlugBlockReason: string | null;
  availableBalance: number;
  liveCatalogCount: number;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (res: unknown) => void) => void;
    };
  }
}

const STATUS_BADGE: Record<string, string> = {
  live: "bg-emerald-50 text-emerald-800 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  pending_review: "bg-[#FFF8DB] text-[#9A6503] border-[#DFBE6F]",
  paused: "bg-[#FFFDF8] text-[#6E5C3D] border-[#EAD296]",
  rejected: "bg-[#FFF4F2] text-[#991B1B] border-rose-200",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const OFFER_BADGE_PRESETS = [
  "Festive Sale",
  "Flat 30% OFF",
  "Puja Special",
  "Diwali Mega Deal",
  "New Arrivals",
  "Clearance Drop",
];

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function daysRemainingLabel(expiresIso?: string | null): string {
  if (!expiresIso) return "";
  const diff = new Date(expiresIso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return "Expired";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${Math.max(1, hours)}h left`;
}

function formatPaymentMethodLabel(method: string): string {
  const m = String(method || "").toLowerCase();
  if (m === "seller_balance") return "Payout Balance";
  if (m === "free_trial" || m === "launch_pilot") return "60-Day Free Trial";
  return "Online Paid";
}

function loadCheckoutSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[data-zeb-checkout="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.zebCheckout = "1";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AppBrandingPage() {
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [upgradeMigrationRequired, setUpgradeMigrationRequired] = useState(false);
  const [onlineCheckoutReady, setOnlineCheckoutReady] = useState(false);

  const [seller, setSeller] = useState<SellerProfileState>({
    id: "",
    storeName: "Your Brand",
    email: "",
    phone: "",
    logoUrl: null,
    storeSlug: "your-brand",
    storeTagline: "",
    storeBannerUrl: "",
    storePassPlan: null,
    storePassStatus: "inactive",
    storePassStartsAt: null,
    storePassExpiresAt: null,
    storePassTrialUsed: false,
    storePassFreeTrialEligible: false,
    storePassRenewalCount: 0,
    storeSearchCount: 0,
    storeVisitCount: 0,
    missedStoreSearches: 0,
    missedStoreVisits: 0,
    storeSlugBlocked: false,
    storeSlugBlockReason: null,
    availableBalance: 0,
    liveCatalogCount: 0,
  });

  const [packages, setPackages] = useState<BrandingPackage[]>([]);
  const [products, setProducts] = useState<SellerProductOption[]>([]);
  const [campaigns, setCampaigns] = useState<BrandingCampaignRow[]>([]);
  const [transactions, setTransactions] = useState<BrandingTransactionRow[]>([]);
  const [summary, setSummary] = useState({
    liveCount: 0,
    pendingCount: 0,
    totalImpressions: 0,
    totalClicks: 0,
    ctrPct: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  const [activeTab, setActiveTab] = useState<"live" | "pending" | "history">("live");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Storefront Profile Customization Drawer
  const [showStoreEditor, setShowStoreEditor] = useState(false);
  const [editSlug, setEditSlug] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Printable Store QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Locked Modal A: App Offer & Festival Ad (₹99 / ₹139)
  const [activeAppAdPkg, setActiveAppAdPkg] = useState<BrandingPackage | null>(null);
  const [adHeadline, setAdHeadline] = useState("");
  const [adTagline, setAdTagline] = useState("");
  const [adOfferBadge, setAdOfferBadge] = useState("Festive Sale");
  const [adSelectedProductIds, setAdSelectedProductIds] = useState<string[]>([]);
  const [adProductSearch, setAdProductSearch] = useState("");
  const [adPaymentMethod, setAdPaymentMethod] = useState<"online_checkout" | "seller_balance">(
    "online_checkout"
  );
  const [submitting, setSubmitting] = useState(false);

  // Locked Modal B: Store Search & Mini-Storefront Pass (₹49 / ₹59 OR 60-Day New Seller Free Trial)
  const [activeStorePassPkg, setActiveStorePassPkg] = useState<BrandingPackage | null>(null);
  const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
  const [passSlugInput, setPassSlugInput] = useState("");
  const [passTaglineInput, setPassTaglineInput] = useState("");
  const [passPaymentMethod, setPassPaymentMethod] = useState<"online_checkout" | "seller_balance">(
    "online_checkout"
  );

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/branding", { headers, cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setMigrationRequired(Boolean(json.migrationRequired));
        setUpgradeMigrationRequired(Boolean(json.upgradeMigrationRequired));
        setOnlineCheckoutReady(Boolean(json.onlineCheckoutReady));
        if (json.seller) {
          setSeller(json.seller);
          setEditSlug(json.seller.storeSlug || "");
          setEditTagline(json.seller.storeTagline || "");
          setEditBannerUrl(json.seller.storeBannerUrl || "");
        }
        setPackages(json.packages || []);
        setProducts(json.products || []);
        setCampaigns(json.campaigns || []);
        setTransactions(json.transactions || []);
        if (json.summary) setSummary(json.summary);
      }
    } catch {
      notify("Unable to load App Branding dashboard right now.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const storefrontUrl = useMemo(
    () => `https://zebalpha.shop/store/${seller.storeSlug || "your-store"}`,
    [seller.storeSlug]
  );

  const appAdPackages = useMemo(() => packages.filter((p) => p.track === "app_ad"), [packages]);
  const storePassPackages = useMemo(
    () => packages.filter((p) => p.track === "store_pass"),
    [packages]
  );

  const filteredModalProducts = useMemo(() => {
    const q = adProductSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, adProductSearch]);

  const previewAdProducts = useMemo(
    () => products.filter((p) => adSelectedProductIds.includes(p.id)).slice(0, 3),
    [products, adSelectedProductIds]
  );

  const appAdCampaigns = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          c.placement_type !== "store_search" &&
          c.package_key !== "store_search_free_60d" &&
          c.package_key !== "store_search_49_18d" &&
          c.package_key !== "store_search_59_28d"
      ),
    [campaigns]
  );

  const visibleCampaigns = useMemo(() => {
    if (activeTab === "live") {
      return appAdCampaigns.filter(
        (c) => c.approval_status === "live" || c.approval_status === "approved"
      );
    }
    if (activeTab === "pending") {
      return appAdCampaigns.filter((c) => c.approval_status === "pending_review");
    }
    return campaigns;
  }, [appAdCampaigns, campaigns, activeTab]);

  // Open QR Modal & render high-DPI genuine scannable QR code (Strictly Active Pass Only)
  const openQrModal = async () => {
    if (seller.storePassStatus !== "active") {
      notify("Activate your Store Search & Mini-Storefront Pass first to unlock Store QR Code.", "error");
      return;
    }
    setShowQrModal(true);
    try {
      const url = await QRCode.toDataURL(storefrontUrl, {
        width: 360,
        margin: 2,
        color: { dark: "#14120F", light: "#FFFFFF" },
      });
      setQrDataUrl(url);
    } catch {
      notify("Unable to generate Store QR code.", "error");
    }
  };

  const downloadQrPng = () => {
    if (!qrDataUrl || seller.storePassStatus !== "active") return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `zebalpha-store-${seller.storeSlug || "qr"}.png`;
    a.click();
  };

  const copyStoreUrl = async () => {
    if (seller.storePassStatus !== "active") {
      notify("Activate your Store Search & Mini-Storefront Pass first to unlock your Store Link.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopiedLink(true);
      notify("Mini-Storefront link copied!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      notify("Could not copy link automatically.", "error");
    }
  };

  const handleSaveStorefrontProfile = async () => {
    setSavingProfile(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_storefront_profile",
          storeSlug: editSlug,
          storeTagline: editTagline,
          storeBannerUrl: editBannerUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Could not save storefront details.", "error");
        return;
      }
      notify(json.message || "Storefront profile updated!");
      setShowStoreEditor(false);
      await loadData();
    } catch {
      notify("Network error saving storefront profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Locked Package Modals (zero cross-plan mixing!)
  const openFreeTrialModal = () => {
    setActiveAppAdPkg(null);
    setActiveStorePassPkg(null);
    setPassSlugInput(seller.storeSlug || "");
    setPassTaglineInput(seller.storeTagline || "");
    setShowFreeTrialModal(true);
  };

  const openPackageModal = (pkg: BrandingPackage) => {
    setShowFreeTrialModal(false);
    if (pkg.track === "app_ad") {
      setActiveStorePassPkg(null);
      setActiveAppAdPkg(pkg);
      setAdHeadline(
        pkg.key === "festival_mega_139_45d"
          ? `${seller.storeName} Festival Mega Sale`
          : `${seller.storeName} Special Offer`
      );
      setAdTagline(seller.storeTagline || `Direct-from-brand collection by ${seller.storeName}`);
      setAdOfferBadge(pkg.key === "festival_mega_139_45d" ? "Festival Mega Sale" : "Special Offer");
      setAdSelectedProductIds(products.slice(0, Math.min(3, pkg.max_products)).map((p) => p.id));
      setAdProductSearch("");
      setAdPaymentMethod(
        onlineCheckoutReady
          ? "online_checkout"
          : seller.availableBalance >= pkg.amount_inr
            ? "seller_balance"
            : "online_checkout"
      );
    } else {
      // New sellers with unused 60-day free trial activate FREE first — payment unlocks after 60 days!
      if (seller.storePassFreeTrialEligible) {
        openFreeTrialModal();
        return;
      }
      setActiveAppAdPkg(null);
      setActiveStorePassPkg(pkg);
      setPassSlugInput(seller.storeSlug || "");
      setPassTaglineInput(seller.storeTagline || "");
      setPassPaymentMethod(
        onlineCheckoutReady
          ? "online_checkout"
          : seller.availableBalance >= pkg.amount_inr
            ? "seller_balance"
            : "online_checkout"
      );
    }
  };

  const handleActivateFree60dTrial = async () => {
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "activate_free_60d_trial",
          storeSlug: passSlugInput.trim(),
          storeTagline: passTaglineInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Could not activate 60-day Free Trial.", "error");
        return;
      }
      notify(json.message || "60 Days FREE Store Search & Mini-Storefront activated!");
      setShowFreeTrialModal(false);
      await loadData();
    } catch {
      notify("Network error activating 60-day Free Trial.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAdProduct = (id: string, maxLimit: number) => {
    setAdSelectedProductIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxLimit) {
        notify(`This package allows up to ${maxLimit} showcase products.`, "error");
        return prev;
      }
      return [...prev, id];
    });
  };

  // Unified White-Label Online Checkout Launcher
  const launchOnlineCheckout = async (params: {
    checkoutSession: { orderId: string; amount: number; currency: string; keyId: string };
    campaignId: string;
    description: string;
    verifyExtra?: Record<string, unknown>;
    onSuccess: (message: string) => Promise<void>;
  }) => {
    const sdkReady = await loadCheckoutSdk();
    if (!sdkReady || !window.Razorpay) {
      notify("Unable to open secure online checkout. Please check internet and retry.", "error");
      return;
    }

    const checkout = new window.Razorpay({
      key: params.checkoutSession.keyId,
      amount: params.checkoutSession.amount,
      currency: params.checkoutSession.currency || "INR",
      name: "ZebAlpha Marketing",
      description: params.description,
      order_id: params.checkoutSession.orderId,
      prefill: {
        name: seller.storeName,
        email: seller.email || undefined,
        contact: seller.phone || undefined,
      },
      theme: { color: "#F03A46" },
      handler: async (resp: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const headers = await getAuthHeaders();
          const verifyRes = await fetch("/api/seller/marketing/branding", {
            method: "POST",
            headers,
            body: JSON.stringify({
              action: "verify_online_payment",
              campaignId: params.campaignId,
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
              ...(params.verifyExtra || {}),
            }),
          });
          const verifyJson = await verifyRes.json();
          if (!verifyRes.ok || !verifyJson.success) {
            notify(verifyJson?.error || "Payment verification failed.", "error");
            return;
          }
          await params.onSuccess(verifyJson.message || "Payment verified!");
        } catch {
          notify("Network error verifying online payment.", "error");
        }
      },
    });
    checkout.open();
  };

  // Submit Track 1: App Offer / Festival Ad (₹99 or ₹139)
  const handleSubmitAppAd = async () => {
    if (!activeAppAdPkg) return;
    if (adSelectedProductIds.length === 0) {
      notify("Select at least 1 live product to showcase.", "error");
      return;
    }
    if (adHeadline.trim().length < 4) {
      notify("Enter an offer/brand headline (at least 4 characters).", "error");
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const firstSelected = products.find((p) => p.id === adSelectedProductIds[0]);
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_campaign",
          packageKey: activeAppAdPkg.key,
          productIds: adSelectedProductIds,
          headline: adHeadline.trim(),
          tagline: adTagline.trim(),
          offerBadge: adOfferBadge.trim(),
          bannerImageUrl: firstSelected?.image_url || "",
          paymentMethod: adPaymentMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Could not create App Offer campaign.", "error");
        return;
      }

      if (json.checkoutSession && json.campaign?.id) {
        await launchOnlineCheckout({
          checkoutSession: json.checkoutSession,
          campaignId: String(json.campaign.id),
          description: `${activeAppAdPkg.name} (${activeAppAdPkg.duration_days} Days)`,
          onSuccess: async (msg) => {
            notify(msg);
            setActiveAppAdPkg(null);
            setActiveTab("pending");
            await loadData();
          },
        });
      } else {
        notify(json.message || "Campaign submitted for quick Admin approval!");
        setActiveAppAdPkg(null);
        setActiveTab("pending");
        await loadData();
      }
    } catch {
      notify("Network error submitting App Offer campaign.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Track 2: Store Search & Mini-Storefront Pass (₹49 or ₹59)
  const handleSubmitStorePass = async () => {
    if (!activeStorePassPkg) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_campaign",
          packageKey: activeStorePassPkg.key,
          storeSlug: passSlugInput.trim(),
          storeTagline: passTaglineInput.trim(),
          paymentMethod: passPaymentMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Could not start Store Search Pass checkout.", "error");
        return;
      }

      if (json.checkoutSession && json.campaign?.id) {
        await launchOnlineCheckout({
          checkoutSession: json.checkoutSession,
          campaignId: String(json.campaign.id),
          description: `${activeStorePassPkg.name} (${activeStorePassPkg.duration_days} Days)`,
          verifyExtra: {
            storeSlug: json.storeSlug || passSlugInput.trim(),
            storeTagline: passTaglineInput.trim(),
          },
          onSuccess: async (msg) => {
            notify(msg);
            setActiveStorePassPkg(null);
            await loadData();
          },
        });
      } else {
        notify(json.message || "Store Search & Mini-Storefront Pass is LIVE now!");
        setActiveStorePassPkg(null);
        await loadData();
      }
    } catch {
      notify("Network error activating Store Search Pass.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePause = async (camp: BrandingCampaignRow) => {
    const nextStatus = camp.approval_status === "paused" ? "live" : "paused";
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_status",
          campaignId: camp.id,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`Campaign ${nextStatus === "live" ? "resumed" : "paused"}.`);
        await loadData();
      } else {
        notify(json.error || "Failed to update campaign.", "error");
      }
    } catch {
      notify("Network error updating campaign.", "error");
    }
  };

  const totalMissedTraffic = seller.missedStoreSearches + seller.missedStoreVisits;
  const isPassActive = seller.storePassStatus === "active";

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-[#F3E6C5]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-14">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[120] flex items-center gap-2.5 rounded-2xl border px-5 py-3.5 text-xs font-black shadow-xl ${
            toast.type === "error"
              ? "border-rose-300 bg-[#FFF4F2] text-[#991B1B]"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {(migrationRequired || upgradeMigrationRequired) && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-[#FFF8DB] px-5 py-3.5 text-xs font-bold text-[#6E4900]">
          <Info size={16} className="mt-0.5 shrink-0 text-[#B45309]" />
          <span>
            One-time database upgrade required: run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              supabase/upgrade_unified_app_branding_and_store_search.sql
            </code>{" "}
            in Supabase SQL Editor to activate ₹99/₹139 Offer Ads &amp; ₹49/₹59 Store Search Passes.
          </span>
        </div>
      )}

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503] mb-2">
            <Star size={11} className="fill-[#F5B922] text-[#F5B922]" />
            ZebAlpha Unified App Branding &amp; Store Search Suite
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            App Branding &amp; Mini-Storefront
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6E5C3D]">
            Run Offer/Festival Ads on <strong>zebalpha.shop</strong> &amp; Android App, OR unlock{" "}
            <strong>Seller-Based Shop Search + Branded Mini-Storefront + PDP Store Link</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (seller.storePassFreeTrialEligible) {
              openFreeTrialModal();
              return;
            }
            const proPass = storePassPackages.find((p) => p.key === "store_search_59_28d") || packages[0];
            if (proPass) openPackageModal(proPass);
          }}
          data-photo-overlay="true"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 cursor-pointer"
        >
          {seller.storePassFreeTrialEligible ? <Gift size={15} /> : <Store size={15} />}
          <span>
            {seller.storePassFreeTrialEligible
              ? "Activate 60 Days FREE (₹0)"
              : isPassActive
                ? "Extend Store Search Pass"
                : "Unlock Store Search (₹49 / ₹59)"}
          </span>
        </button>
      </div>

      {/* 1B. NEW SELLER 60-DAY FREE WELCOME OFFER BANNER */}
      {seller.storePassFreeTrialEligible && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-[#FFFDF8] to-[#FFF8DB] p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              data-photo-overlay="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"
            >
              <Gift size={18} />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                New Seller Welcome Offer • ₹0 For 60 Full Days
              </span>
              <p className="mt-1 text-sm font-black text-[#14120F]">
                Activate Store Search + Branded Mini-Storefront + PDP Store Link FREE for 60 Days!
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#5C4E35]">
                Grow your brand on Instagram &amp; WhatsApp with <strong>zebalpha.shop/store/{seller.storeSlug}</strong> at ₹0. After 60 free days end, paid renewals start at just ₹49 (18d) or ₹59 (28d).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openFreeTrialModal}
            data-photo-overlay="true"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:bg-emerald-700 cursor-pointer"
          >
            <Gift size={14} />
            <span>Activate 60 Days FREE</span>
          </button>
        </div>
      )}

      {/* 2. MISSED TRAFFIC FOMO BANNER (When Store Pass Inactive/Expired & Missed Searches/Visits > 0) */}
      {!isPassActive && totalMissedTraffic > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#F03A46]/40 bg-gradient-to-r from-[#FFF4F2] via-[#FFFDF8] to-[#FFF8DB] p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              data-photo-overlay="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F03A46] text-white"
            >
              <Flame size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-[#14120F]">
                Buyers are searching for &ldquo;{seller.storeName}&rdquo; right now!
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#5C4E35]">
                <strong>{seller.missedStoreSearches}</strong> shop-name searches &amp;{" "}
                <strong>{seller.missedStoreVisits}</strong> storefront link clicks happened while your
                Store Pass was paused. Reactivate now so customers land directly on your own store!
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {storePassPackages.map((pkg) => (
              <button
                key={pkg.key}
                type="button"
                onClick={() => openPackageModal(pkg)}
                data-photo-overlay={pkg.popular ? "true" : undefined}
                className={`rounded-xl px-4 py-2 text-xs font-black cursor-pointer transition-all ${
                  pkg.popular
                    ? "bg-[#F03A46] text-white hover:brightness-105"
                    : "border border-[#DFBE6F] bg-gradient-to-r from-[#FFF6CC] to-[#F7DC88] text-[#14120F]"
                }`}
              >
                Renew ₹{pkg.amount_inr} ({pkg.duration_days}d)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. TOP KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              Store Search Pass
            </span>
            <Store size={15} className={isPassActive ? "text-emerald-600" : "text-[#F03A46]"} />
          </div>
          <p className="mt-2 text-xl font-black text-[#14120F]">
            {isPassActive
              ? seller.storePassPlan === "store_search_free_60d"
                ? "60d FREE LIVE"
                : "ACTIVE"
              : seller.storePassStatus === "expired"
                ? "EXPIRED"
                : seller.storePassFreeTrialEligible
                  ? "60 DAYS FREE"
                  : "NOT ACTIVE"}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            {isPassActive
              ? `${daysRemainingLabel(seller.storePassExpiresAt)} • Ends ${formatDate(
                  seller.storePassExpiresAt
                )}`
              : seller.storePassFreeTrialEligible
                ? "New Seller Offer: Activate ₹0 now!"
                : "Activate ₹49 (18d) or ₹59 (28d)"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              Store Searches &amp; Visits
            </span>
            <Search size={15} className="text-[#9A6503]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            {(seller.storeSearchCount + seller.storeVisitCount).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            {seller.storeSearchCount} searches • {seller.storeVisitCount} store visits
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              App Ad Views &amp; Clicks
            </span>
            <Eye size={15} className="text-[#F03A46]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            {summary.totalImpressions.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            {summary.totalClicks} clicks ({summary.ctrPct}% CTR) • {summary.liveCount} live
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              Branding Revenue
            </span>
            <IndianRupee size={15} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            ₹{summary.totalRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            Payout Balance: ₹{seller.availableBalance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* 4. FOUR UNIFIED PACKAGES (2 CLEAR TRACKS IN ONE 4-CARD GRID) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-[#14120F]">
              Choose Your Transparent App Branding Package
            </h2>
            <p className="text-xs font-semibold text-[#6E5C3D]">
              Cards 1–2: App Offer &amp; Festival Ads (Admin Reviewed) • Cards 3–4: Seller-Based Search
              + Mini-Storefront + PDP Store Link (Instant Activation)
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <ShieldCheck size={14} /> Zero CPC surprises • 100% Fixed Transparent Pricing
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...appAdPackages, ...storePassPackages].map((pkg) => {
            const isPopular = Boolean(pkg.popular);
            const isStorePass = pkg.track === "store_pass";
            return (
              <div
                key={pkg.key}
                className={`flex flex-col justify-between rounded-[1.5rem] border p-5 transition-all ${
                  isPopular
                    ? "border-[#F03A46] bg-gradient-to-b from-[#FFF7F6] via-white to-[#FFFDF8] shadow-[0_14px_34px_rgba(240,58,70,0.14)]"
                    : isStorePass
                      ? "border-[#DFBE6F] bg-gradient-to-b from-[#FFFDF7] via-white to-[#FFF9EA] shadow-[0_10px_26px_rgba(166,124,28,0.09)]"
                      : "border-[#EAD296] bg-white shadow-[0_8px_24px_rgba(166,124,28,0.06)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isPopular
                          ? "bg-[#F03A46] text-white"
                          : isStorePass
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]"
                      }`}
                      data-photo-overlay={isPopular ? "true" : undefined}
                    >
                      {pkg.badge}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
                      {pkg.instant_activation ? "Instant" : "Reviewed"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-black text-[#14120F] leading-snug">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-[#14120F]">
                      {isStorePass && seller.storePassFreeTrialEligible
                        ? "₹0"
                        : `₹${pkg.amount_inr.toLocaleString("en-IN")}`}
                    </span>
                    <span className="text-xs font-bold text-[#6E5C3D]">
                      {isStorePass && seller.storePassFreeTrialEligible
                        ? "/ 60 days FREE"
                        : `/ ${pkg.duration_days} days`}
                    </span>
                  </div>
                  {isStorePass && seller.storePassFreeTrialEligible && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      <Gift size={10} />
                      Then ₹{pkg.amount_inr}/{pkg.duration_days}d after 60 days
                    </p>
                  )}
                  <p className="mt-2 text-xs font-medium text-[#5C4E35] leading-relaxed">
                    {pkg.summary}
                  </p>

                  <ul className="mt-4 space-y-2 border-t border-[#F0E2BE] pt-4 text-[11px] font-semibold text-[#14120F]">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openPackageModal(pkg)}
                  data-photo-overlay={isPopular ? "true" : undefined}
                  className={`mt-5 w-full rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
                    isPopular
                      ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-md hover:brightness-105"
                      : "border border-[#DFBE6F] bg-gradient-to-r from-[#FFF6CC] to-[#F7DC88] text-[#14120F] shadow-sm hover:brightness-105"
                  }`}
                >
                  {isStorePass
                    ? seller.storePassFreeTrialEligible
                      ? "Activate 60 Days FREE (₹0)"
                      : isPassActive
                        ? `Extend +${pkg.duration_days}d (₹${pkg.amount_inr})`
                        : `Activate ₹${pkg.amount_inr} Pass`
                    : `Select ₹${pkg.amount_inr} Pack`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. MY MINI-STOREFRONT & PRINTABLE QR CONTROL CENTER */}
      <section className="rounded-[1.75rem] border border-[#EAD296] bg-gradient-to-br from-[#FFFDF8] via-white to-[#FFF8EB] p-5 sm:p-6 shadow-[0_10px_28px_rgba(166,124,28,0.08)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFBE6F] bg-[#FFF8DB] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#9A6503]">
                <Link2 size={11} /> My Branded Mini-Storefront &amp; Shop Search
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                  seller.storeSlugBlocked
                    ? "border-rose-300 bg-[#FFF4F2] text-[#991B1B]"
                    : isPassActive
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-[#FFF8DB] text-[#9A6503]"
                }`}
              >
                {seller.storeSlugBlocked
                  ? "Restricted by Admin"
                  : isPassActive
                    ? `LIVE • ${daysRemainingLabel(seller.storePassExpiresAt)}`
                    : "PAUSED — Activate ₹49 / ₹59 Pass"}
              </span>
            </div>

            <h3 className="text-lg font-black text-[#14120F]">
              {seller.storeName} Official Storefront
            </h3>
            <p className="text-xs font-semibold text-[#5C4E35]">
              {isPassActive
                ? "Your Mini-Storefront, Store QR Code & Shop Name Search are LIVE. Customers searching your shop name see ONLY your store!"
                : "Store Link, QR Code, Preview & Customization stay locked until you activate the Store Search & Mini-Storefront Pass."}
            </p>
          </div>

          {isPassActive ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyStoreUrl}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFBE6F] bg-white px-3.5 py-2 text-xs font-black text-[#14120F] hover:bg-[#FFF8DB] cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
              <button
                type="button"
                onClick={openQrModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFBE6F] bg-gradient-to-r from-[#FFF6CC] to-[#F7DC88] px-3.5 py-2 text-xs font-black text-[#14120F] hover:brightness-105 cursor-pointer"
              >
                <QrCode size={14} />
                <span>Store QR Code</span>
              </button>
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-white px-3.5 py-2 text-xs font-black text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46]"
              >
                <span>Preview</span>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => setShowStoreEditor((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2 text-xs font-black text-[#5C4E35] hover:text-[#14120F] cursor-pointer"
              >
                <SlidersHorizontal size={13} />
                <span>{showStoreEditor ? "Hide Editor" : "Customize Store"}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-[#FFF8EB] px-3.5 py-2 text-xs font-black text-[#7A6847] select-none opacity-80">
                <Lock size={13} />
                <span>Link, QR &amp; Preview Locked</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (seller.storePassFreeTrialEligible) {
                    openFreeTrialModal();
                    return;
                  }
                  const proPass =
                    storePassPackages.find((p) => p.key === "store_search_59_28d") ||
                    storePassPackages[0];
                  if (proPass) openPackageModal(proPass);
                }}
                data-photo-overlay="true"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-4 py-2 text-xs font-black text-white shadow-sm hover:brightness-105 cursor-pointer"
              >
                {seller.storePassFreeTrialEligible ? <Gift size={13} /> : <Store size={13} />}
                <span>
                  {seller.storePassFreeTrialEligible
                    ? "Activate 60 Days FREE to Unlock"
                    : "Activate Pass to Unlock"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Shareable URL Pill (Masked & Locked until Store Pass Active!) */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
            isPassActive
              ? "border-[#EAD296] bg-white"
              : "border-dashed border-[#DFBE6F] bg-[#FFFDF6]"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isPassActive ? (
              <Store size={15} className="shrink-0 text-[#9A6503]" />
            ) : (
              <Lock size={15} className="shrink-0 text-[#9A6503]" />
            )}
            <code
              className={`text-xs sm:text-sm font-black truncate ${
                isPassActive ? "text-[#14120F]" : "text-[#8A7A5E] select-none"
              }`}
            >
              {isPassActive
                ? storefrontUrl
                : "https://zebalpha.shop/store/••••••••  (Activate Pass to unlock your Store Link & QR)"}
            </code>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#6E5C3D]">
            <span>{seller.liveCatalogCount} live items</span>
            <span>•</span>
            <span>{seller.storeSearchCount} shop searches</span>
            <span>•</span>
            <span>{seller.storeVisitCount} visits</span>
          </div>
        </div>

        {/* Inline Storefront Customizer (Strictly Active Pass Only) */}
        {isPassActive && showStoreEditor && (
          <div className="rounded-2xl border border-[#DFBE6F] bg-white p-4 sm:p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                  Custom Storefront Link Slug
                </label>
                <div className="flex items-center rounded-xl border border-[#EAD296] bg-[#FFFDF8] overflow-hidden">
                  <span className="bg-[#FFF8DB] px-3 py-2.5 text-[11px] font-black text-[#7A6847] border-r border-[#EAD296] shrink-0">
                    zebalpha.shop/store/
                  </span>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) =>
                      setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="your-shop-name"
                    className="w-full bg-transparent px-3 py-2.5 text-xs font-black text-[#14120F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                  Store Tagline (Shown on Mini-Storefront Header)
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  placeholder="e.g. Authentic Handloom Kurtis & Festive Wear from Kolkata"
                  className="w-full rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-semibold text-[#14120F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                Cover Banner Image URL (Optional — or click a catalog image below)
              </label>
              <input
                type="url"
                value={editBannerUrl}
                onChange={(e) => setEditBannerUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-semibold text-[#14120F]"
              />
              {products.length > 0 && (
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                  {products
                    .filter((p) => p.image_url)
                    .slice(0, 6)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditBannerUrl(p.image_url || "")}
                        className={`h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 cursor-pointer ${
                          editBannerUrl === p.image_url
                            ? "border-[#F03A46]"
                            : "border-[#EAD296]"
                        }`}
                        title={`Use ${p.name} as store cover`}
                      >
                        <img
                          src={p.image_url || ""}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStoreEditor(false)}
                className="rounded-xl border border-[#EAD296] px-4 py-2 text-xs font-bold text-[#5C4E35] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={handleSaveStorefrontProfile}
                data-photo-overlay="true"
                className="rounded-xl bg-[#F03A46] px-5 py-2 text-xs font-black text-white hover:brightness-105 disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? "Saving..." : "Save Storefront Profile"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 6. CAMPAIGNS & PASS HISTORY TABS */}
      <section className="overflow-hidden rounded-[1.5rem] border border-[#EAD296] bg-white shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E2BE] px-6 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "live" as const, label: `Live Offer Ads (${summary.liveCount})` },
              { key: "pending" as const, label: `Pending Review (${summary.pendingCount})` },
              {
                key: "history" as const,
                label: `All Campaigns & Store Pass History (${Math.max(
                  campaigns.length,
                  transactions.length
                )})`,
              },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`whitespace-nowrap border-b-[3px] px-3.5 py-3 text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === t.key
                    ? "border-[#F03A46] font-black text-[#F03A46]"
                    : "border-transparent font-bold text-[#6E5C3D] hover:text-[#14120F]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {visibleCampaigns.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#EAD296] text-[#9A6503]">
                <Megaphone size={24} />
              </div>
              <p className="mt-3 text-sm font-black text-[#14120F]">
                {activeTab === "pending"
                  ? "No Offer/Festival ads waiting for review"
                  : activeTab === "live"
                    ? "No live Offer/Festival ads yet"
                    : "No App Branding or Store Pass records yet"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                Pick a package above: ₹99/₹139 for App Offer &amp; Festival Ads, or ₹49/₹59 for
                Instant Store Search &amp; Mini-Storefront.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAD296] bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                  <th className="px-6 py-3.5">Campaign / Pass</th>
                  <th className="px-5 py-3.5">Package &amp; Payment</th>
                  <th className="px-5 py-3.5">Validity Window</th>
                  <th className="px-5 py-3.5">Performance</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E2BE]">
                {visibleCampaigns.map((c) => {
                  const isPass = c.placement_type === "store_search";
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c.id} className="hover:bg-[#FFFDF8]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#EAD296] bg-[#FFF8DB] flex items-center justify-center text-[#9A6503]">
                            {c.banner_image_url ? (
                              <img
                                src={c.banner_image_url}
                                alt={c.headline}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Store size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-[#14120F] line-clamp-1">{c.headline}</p>
                            <p className="text-[11px] font-semibold text-[#6E5C3D] line-clamp-1">
                              {isPass
                                ? `Store Search + Mini-Storefront + PDP Link`
                                : `${c.product_ids?.length || 0} products • ${c.placement_type.replace(
                                    /_/g,
                                    " "
                                  )}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-[#14120F]">
                          ₹{Number(c.amount_inr || 0).toLocaleString("en-IN")} ({c.duration_days}d)
                        </p>
                        <p className="text-[10px] font-bold uppercase text-[#7A6847]">
                          {formatPaymentMethodLabel(c.payment_method)} • {c.payment_status}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold text-[#5C4E35]">
                        {c.starts_at
                          ? `${formatDate(c.starts_at)} – ${formatDate(c.ends_at)}`
                          : "Awaiting approval"}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#14120F]">
                        {isPass ? (
                          <span className="text-[11px] text-emerald-700 font-black">
                            {seller.storeSearchCount} searches • {seller.storeVisitCount} visits
                          </span>
                        ) : (
                          <>
                            {c.impressions} views • {c.clicks} clicks ({ctr}%)
                            <span className="block text-[11px] text-emerald-700 font-black">
                              {c.attributed_orders} orders • ₹
                              {Number(c.attributed_revenue || 0).toLocaleString("en-IN")}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            STATUS_BADGE[c.approval_status] || STATUS_BADGE.pending_review
                          }`}
                        >
                          {c.approval_status.replace(/_/g, " ")}
                        </span>
                        {c.rejection_reason && (
                          <p className="mt-1 text-[10px] font-bold text-rose-700">
                            {c.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isPass &&
                          (c.approval_status === "live" ||
                            c.approval_status === "approved" ||
                            c.approval_status === "paused") && (
                            <button
                              type="button"
                              onClick={() => handleTogglePause(c)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#DFBE6F] bg-white px-3 py-1.5 text-[11px] font-black text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] cursor-pointer"
                            >
                              {c.approval_status === "paused" ? (
                                <>
                                  <Play size={12} /> Resume
                                </>
                              ) : (
                                <>
                                  <Pause size={12} /> Pause
                                </>
                              )}
                            </button>
                          )}
                        {isPass && isPassActive ? (
                          <a
                            href={storefrontUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-black text-[#14120F] hover:border-[#F03A46]"
                          >
                            <span>Open Store</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : isPass ? (
                          <span className="inline-flex items-center gap-1 rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-bold text-[#8A7A5E]">
                            <Lock size={11} /> Locked
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODAL A (LOCKED): APP OFFER & FESTIVAL AD BUILDER (₹99 / ₹139)        */}
      {/* ===================================================================== */}
      {activeAppAdPkg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setActiveAppAdPkg(null)}
        >
          <div
            className="w-full max-w-3xl rounded-[2rem] border border-[#EAD296] bg-white p-5 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <span className="inline-flex rounded-full border border-[#DFBE6F] bg-[#FFF8DB] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#9A6503]">
                  {activeAppAdPkg.badge} • {activeAppAdPkg.duration_days} Days
                </span>
                <h3 className="mt-1.5 text-xl font-black text-[#14120F]">
                  {activeAppAdPkg.name} — ₹{activeAppAdPkg.amount_inr}
                </h3>
                <p className="text-xs font-semibold text-[#6E5C3D]">
                  Live timer ({activeAppAdPkg.duration_days} days) starts only after quick SuperAdmin
                  approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppAdPkg(null)}
                className="rounded-xl border border-[#EAD296] p-2 text-[#5C4E35] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                      Offer / Festival Tag
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={adOfferBadge}
                      onChange={(e) => setAdOfferBadge(e.target.value)}
                      placeholder="e.g. Festive Sale • Flat 30% OFF"
                      className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2 text-xs font-bold text-[#14120F]"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {OFFER_BADGE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAdOfferBadge(preset)}
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                            adOfferBadge === preset
                              ? "border-[#F03A46] bg-[#FFF4F2] text-[#F03A46]"
                              : "border-[#EAD296] bg-[#FFFDF8] text-[#6E5C3D]"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                      Ad Headline (Shown on ZebAlpha App)
                    </label>
                    <input
                      type="text"
                      maxLength={90}
                      value={adHeadline}
                      onChange={(e) => setAdHeadline(e.target.value)}
                      placeholder="e.g. Puja Festive Kurtis Starting ₹399"
                      className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2.5 text-xs font-bold text-[#14120F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                      Short Sub-Headline / Offer Details
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={adTagline}
                      onChange={(e) => setAdTagline(e.target.value)}
                      placeholder="e.g. Handcrafted styles delivered Pan-India"
                      className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2.5 text-xs font-semibold text-[#14120F]"
                    />
                  </div>
                </div>

                {/* Live Customer App Preview */}
                <div className="rounded-2xl border border-[#DFBE6F] bg-gradient-to-b from-[#FFFDF8] to-[#FFF8EB] p-4 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                    Live Preview on ZebAlpha Web &amp; Android App
                  </span>
                  <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        data-photo-overlay="true"
                        className="rounded-full bg-[#F03A46] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
                      >
                        {adOfferBadge || "Special Offer"}
                      </span>
                      <span className="text-[10px] font-bold text-[#7A6847]">Sponsored</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#14120F]">
                        {adHeadline || `${seller.storeName} Offer`}
                      </p>
                      <p className="text-[11px] font-medium text-[#5C4E35]">
                        {adTagline || "Curated styles delivered Pan-India"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {previewAdProducts.map((pp) => (
                        <div
                          key={pp.id}
                          className="rounded-xl border border-[#F0E2BE] bg-[#FFFDF8] p-1.5"
                        >
                          <div className="aspect-square overflow-hidden rounded-lg bg-[#FFF8DB]">
                            {pp.image_url ? (
                              <img
                                src={pp.image_url}
                                alt={pp.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-[10px] font-black text-[#14120F] truncate">
                            ₹{pp.price}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                    Select Showcase Products ({adSelectedProductIds.length}/
                    {activeAppAdPkg.max_products})
                  </label>
                  <input
                    type="text"
                    value={adProductSearch}
                    onChange={(e) => setAdProductSearch(e.target.value)}
                    placeholder="Filter your live products..."
                    className="w-52 rounded-lg border border-[#EAD296] px-3 py-1 text-xs font-semibold text-[#14120F]"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                  {filteredModalProducts.map((p) => {
                    const checked = adSelectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer ${
                          checked
                            ? "border-[#F03A46] bg-[#FFF4F2]/70"
                            : "border-[#F0E2BE] bg-[#FFFDF8]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAdProduct(p.id, activeAppAdPkg.max_products)}
                          className="h-4 w-4 accent-[#F03A46]"
                        />
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-9 w-9 shrink-0 rounded-lg object-cover border border-[#EAD296]"
                          />
                        )}
                        <span className="text-xs font-bold text-[#14120F] truncate flex-1">
                          {p.name}
                        </span>
                        <span className="text-[11px] font-black text-[#9A6503]">₹{p.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method (White-Label) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer ${
                    adPaymentMethod === "online_checkout"
                      ? "border-[#F03A46] bg-[#FFF4F2]/60"
                      : "border-[#EAD296] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="adPay"
                    checked={adPaymentMethod === "online_checkout"}
                    onChange={() => setAdPaymentMethod("online_checkout")}
                    className="mt-1 accent-[#F03A46]"
                  />
                  <div>
                    <p className="text-xs font-black text-[#14120F] flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[#F03A46]" />
                      Pay ₹{activeAppAdPkg.amount_inr} Online (UPI / Card)
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                      Secure instant checkout. Full refund if not approved.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer ${
                    adPaymentMethod === "seller_balance"
                      ? "border-[#F03A46] bg-[#FFF4F2]/60"
                      : "border-[#EAD296] bg-white"
                  } ${seller.availableBalance < activeAppAdPkg.amount_inr ? "opacity-55" : ""}`}
                >
                  <input
                    type="radio"
                    name="adPay"
                    disabled={seller.availableBalance < activeAppAdPkg.amount_inr}
                    checked={adPaymentMethod === "seller_balance"}
                    onChange={() => setAdPaymentMethod("seller_balance")}
                    className="mt-1 accent-[#F03A46]"
                  />
                  <div>
                    <p className="text-xs font-black text-[#14120F] flex items-center gap-1.5">
                      <Wallet size={14} className="text-[#9A6503]" />
                      Payout Balance (₹{seller.availableBalance.toLocaleString("en-IN")})
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                      {seller.availableBalance >= activeAppAdPkg.amount_inr
                        ? "Instant deduction from settled earnings."
                        : `Requires ₹${activeAppAdPkg.amount_inr} settled balance.`}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="mt-4 shrink-0 flex items-center justify-between gap-3 border-t border-[#F0E2BE] pt-4">
              <div className="text-xs font-bold text-[#5C4E35]">
                {adSelectedProductIds.length} product(s) • ₹{activeAppAdPkg.amount_inr} for{" "}
                {activeAppAdPkg.duration_days} days
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAppAdPkg(null)}
                  className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || adSelectedProductIds.length === 0}
                  onClick={handleSubmitAppAd}
                  data-photo-overlay="true"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>
                    {adSelectedProductIds.length === 0
                      ? "Select Products First"
                      : submitting
                        ? "Processing..."
                        : `Pay ₹${activeAppAdPkg.amount_inr} & Submit`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL B0 (NEW SELLER): 60-DAY FREE STORE SEARCH & MINI-STOREFRONT     */}
      {/* ===================================================================== */}
      {showFreeTrialModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowFreeTrialModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-[2rem] border border-emerald-300 bg-white p-5 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <Gift size={11} /> New Seller Welcome Offer • 60 Days Free (₹0)
                </span>
                <h3 className="mt-1.5 text-xl font-black text-[#14120F]">
                  Activate Store Search &amp; Mini-Storefront — ₹0
                </h3>
                <p className="text-xs font-semibold text-[#6E5C3D]">
                  Full access FREE for 60 days! After 60 days, paid renewal applies (₹49 for 18 days
                  or ₹59 for 28 days).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFreeTrialModal(false)}
                className="rounded-xl border border-[#EAD296] p-2 text-[#5C4E35] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  Unlocked Immediately For 60 Full Days (₹0 Upfront)
                </p>
                <ul className="space-y-1.5 text-xs font-semibold text-[#14120F]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Shop Name &amp; Shop+Product Search:</strong> Customers searching{" "}
                      <em>&ldquo;{seller.storeName}&rdquo;</em> see your verified store card #1 with
                      zero competitor hijacking.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Dedicated Mini-Storefront + Printable QR:</strong> Live showroom at{" "}
                      <code>zebalpha.shop/store/{passSlugInput || seller.storeSlug}</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Clickable PDP Store Link:</strong> &ldquo;Visit {seller.storeName}{" "}
                      Store →&rdquo; unlocked on every product page.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Auto-Pauses After Day 60:</strong> Zero auto-debit! Renew anytime for
                      ₹49 (18d) or ₹59 (28d) to keep the exact same link live.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                    Choose Your Mini-Storefront URL Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-[#EAD296] bg-[#FFFDF8] overflow-hidden">
                    <span className="bg-[#FFF8DB] px-3 py-2.5 text-[11px] font-black text-[#7A6847] border-r border-[#EAD296] shrink-0">
                      zebalpha.shop/store/
                    </span>
                    <input
                      type="text"
                      value={passSlugInput}
                      onChange={(e) =>
                        setPassSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                      placeholder="your-shop-name"
                      className="w-full bg-transparent px-3 py-2.5 text-xs font-black text-[#14120F] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                    Short Storefront Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={passTaglineInput}
                    onChange={(e) => setPassTaglineInput(e.target.value)}
                    placeholder="e.g. Authentic Ethnic & Streetwear • Shipped Pan-India"
                    className="w-full rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-semibold text-[#14120F]"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="mt-4 shrink-0 flex items-center justify-between gap-3 border-t border-[#F0E2BE] pt-4">
              <div className="text-xs font-black text-emerald-800">
                ₹0 Today • 60 Days Free Trial
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFreeTrialModal(false)}
                  className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleActivateFree60dTrial}
                  data-photo-overlay="true"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  <Gift size={14} />
                  <span>{submitting ? "Activating..." : "Activate 60 Days FREE Now"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL B (LOCKED): STORE SEARCH & MINI-STOREFRONT PASS (₹49 / ₹59)     */}
      {/* ===================================================================== */}
      {activeStorePassPkg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setActiveStorePassPkg(null)}
        >
          <div
            className="w-full max-w-xl rounded-[2rem] border border-[#EAD296] bg-white p-5 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <Clock size={11} /> Instant Auto-Activation • {activeStorePassPkg.duration_days} Days
                </span>
                <h3 className="mt-1.5 text-xl font-black text-[#14120F]">
                  {activeStorePassPkg.name} — ₹{activeStorePassPkg.amount_inr}
                </h3>
                <p className="text-xs font-semibold text-[#6E5C3D]">
                  {isPassActive
                    ? `Stacks +${activeStorePassPkg.duration_days} extra days onto your active pass (${formatDate(
                        seller.storePassExpiresAt
                      )}).`
                    : `Activates immediately upon payment and auto-pauses cleanly after ${activeStorePassPkg.duration_days} days.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStorePassPkg(null)}
                className="rounded-xl border border-[#EAD296] p-2 text-[#5C4E35] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              {/* 3 Instant Unlocks Summary */}
              <div className="rounded-2xl border border-[#DFBE6F] bg-[#FFFDF8] p-4 space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#9A6503]">
                  Unlocked Instantly For {activeStorePassPkg.duration_days} Days
                </p>
                <ul className="space-y-2 text-xs font-semibold text-[#14120F]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Direct Shop &amp; Shop+Product Search:</strong> Typing{" "}
                      <em>&ldquo;{seller.storeName}&rdquo;</em> or{" "}
                      <em>&ldquo;{seller.storeName} kurti&rdquo;</em> highlights your store #1 with
                      zero competitor hijacking.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Branded Mini-Storefront + QR:</strong> Full catalog showroom at{" "}
                      <code>zebalpha.shop/store/{passSlugInput || seller.storeSlug}</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>PDP Store Link Unlocked:</strong> Clickable{" "}
                      <em>&ldquo;Visit {seller.storeName} Store →&rdquo;</em> button live on every
                      product detail page.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Confirm Store Slug & Tagline */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                    Your Mini-Storefront URL Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-[#EAD296] bg-[#FFFDF8] overflow-hidden">
                    <span className="bg-[#FFF8DB] px-3 py-2.5 text-[11px] font-black text-[#7A6847] border-r border-[#EAD296] shrink-0">
                      zebalpha.shop/store/
                    </span>
                    <input
                      type="text"
                      value={passSlugInput}
                      onChange={(e) =>
                        setPassSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                      placeholder="your-shop-name"
                      className="w-full bg-transparent px-3 py-2.5 text-xs font-black text-[#14120F] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                    Short Storefront Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={passTaglineInput}
                    onChange={(e) => setPassTaglineInput(e.target.value)}
                    placeholder="e.g. Premium Ethnic & Streetwear • Shipped Pan-India"
                    className="w-full rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-semibold text-[#14120F]"
                  />
                </div>
              </div>

              {/* Payment Method (White-Label Instant Only) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer ${
                    passPaymentMethod === "online_checkout"
                      ? "border-[#F03A46] bg-[#FFF4F2]/60"
                      : "border-[#EAD296] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="passPay"
                    checked={passPaymentMethod === "online_checkout"}
                    onChange={() => setPassPaymentMethod("online_checkout")}
                    className="mt-1 accent-[#F03A46]"
                  />
                  <div>
                    <p className="text-xs font-black text-[#14120F] flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[#F03A46]" />
                      Pay ₹{activeStorePassPkg.amount_inr} Online
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                      UPI / GPay / PhonePe / Card • Live in 2 seconds.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer ${
                    passPaymentMethod === "seller_balance"
                      ? "border-[#F03A46] bg-[#FFF4F2]/60"
                      : "border-[#EAD296] bg-white"
                  } ${seller.availableBalance < activeStorePassPkg.amount_inr ? "opacity-55" : ""}`}
                >
                  <input
                    type="radio"
                    name="passPay"
                    disabled={seller.availableBalance < activeStorePassPkg.amount_inr}
                    checked={passPaymentMethod === "seller_balance"}
                    onChange={() => setPassPaymentMethod("seller_balance")}
                    className="mt-1 accent-[#F03A46]"
                  />
                  <div>
                    <p className="text-xs font-black text-[#14120F] flex items-center gap-1.5">
                      <Wallet size={14} className="text-[#9A6503]" />
                      Payout Balance (₹{seller.availableBalance.toLocaleString("en-IN")})
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                      {seller.availableBalance >= activeStorePassPkg.amount_inr
                        ? "Instant deduction & immediate unlock."
                        : `Needs ₹${activeStorePassPkg.amount_inr} available balance.`}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="mt-4 shrink-0 flex items-center justify-between gap-3 border-t border-[#F0E2BE] pt-4">
              <div className="text-xs font-black text-[#14120F]">
                ₹{activeStorePassPkg.amount_inr} • {activeStorePassPkg.duration_days} Days
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStorePassPkg(null)}
                  className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitStorePass}
                  data-photo-overlay="true"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Store size={14} />
                  <span>
                    {submitting
                      ? "Processing..."
                      : `Pay ₹${activeStorePassPkg.amount_inr} Now • Activate`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL C: PRINTABLE MINI-STOREFRONT QR CODE (ACTIVE PASS ONLY)         */}
      {/* ===================================================================== */}
      {showQrModal && isPassActive && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border border-[#EAD296] bg-white p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#9A6503]">
                Official Storefront QR
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded-xl border border-[#EAD296] p-1.5 text-[#5C4E35] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-2xl border border-[#EAD296] bg-[#FFFDF8] p-4 flex flex-col items-center">
              <p className="text-sm font-black text-[#14120F]">{seller.storeName}</p>
              <p className="text-[11px] font-semibold text-[#6E5C3D] mb-3">
                Scan to visit our verified ZebAlpha Store
              </p>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Storefront QR Code"
                  className="h-56 w-56 rounded-xl border border-[#F0E2BE] bg-white p-2"
                />
              ) : (
                <div className="h-56 w-56 rounded-xl bg-[#FFF8DB] animate-pulse" />
              )}
              <code className="mt-3 text-[11px] font-bold text-[#9A6503] break-all">
                {storefrontUrl}
              </code>
            </div>

            <p className="text-[11px] font-semibold text-[#6E5C3D]">
              Print on parcel thank-you cards, business cards, or shop counter for repeat orders!
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={downloadQrPng}
                data-photo-overlay="true"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F03A46] px-4 py-2.5 text-xs font-black text-white cursor-pointer"
              >
                <Download size={14} /> Download PNG
              </button>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DFBE6F] bg-gradient-to-r from-[#FFF6CC] to-[#F7DC88] px-4 py-2.5 text-xs font-black text-[#14120F] cursor-pointer"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
