"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Upload,
  PlusCircle,
  PlayCircle,
  Percent,
  Truck,
  Megaphone,
  LayoutGrid,
  Package,
  ShoppingBag,
  IndianRupee,
  ArrowRight,
  Clock,
  X,
  ShieldCheck,
  Store,
  Sparkles,
} from "lucide-react";

type GuideKey = "alpha_media" | "prepare_catalog" | "pricing_commission" | "delivery_returns";

interface SellerHomeProduct {
  id: string;
  name: string;
  image_url?: string | null;
  images?: string[] | null;
  status?: string | null;
  is_active?: boolean | null;
  is_approved?: boolean | null;
  approval_status?: string | null;
  created_at?: string | null;
}

interface SetupAction {
  id: string;
  label: string;
  href: string;
  alertTitle: string;
  alertDesc: string;
  alertCta: string;
}

const GUIDE_CONTENT: Record<
  GuideKey,
  {
    badge: string;
    title: string;
    subtitle: string;
    bullets: string[];
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  alpha_media: {
    badge: "In-House Daily Branding",
    title: "Get Featured by ZebAlpha's Alpha Media Team",
    subtitle:
      "ZebAlpha's dedicated Alpha Media Team creates and posts daily product showcases, reels, and brand promotions across Instagram, Facebook, and social channels.",
    bullets: [
      "Upload at least 5 clean catalogs with crisp front/back images and clear titles.",
      "Add a short Real Product Video Proof link (Instagram Reel / YouTube Short) on your top products.",
      "Connect your store's Instagram/Facebook handle in Settings so our Alpha Media Team can tag and co-promote your emerging brand.",
      "Keep inventory accurate and dispatch on time to unlock recurring social feature spots at ₹0 agency cost.",
    ],
    ctaLabel: "Connect Social Handle in Settings",
    ctaHref: "/dashboard/settings",
  },
  prepare_catalog: {
    badge: "Catalog Quality Guide",
    title: "Prepare High-Converting Catalogs for ZebAlpha",
    subtitle:
      "Clean photos, exact GSM/fabric details, and independent color/size stock make customers trust your products instantly.",
    bullets: [
      "Use bright, uncluttered product photography (vertical 3:4 or square 1:1 framing works best).",
      "Configure every color and size independently in the Variant Matrix so buyers never receive wrong variants.",
      "List at least 5–8 live catalogs across your niche for significantly higher discovery visibility.",
      "Attach a Real Product Video Proof so Tier-2 and Tier-3 shoppers can inspect fabric drape before ordering.",
    ],
    ctaLabel: "Open Catalog Manager",
    ctaHref: "/dashboard/products",
  },
  pricing_commission: {
    badge: "0% Commission Policy",
    title: "0% Core Commission & Fast 5-Day UPI Payouts",
    subtitle:
      "ZebAlpha operates a transparent 0% product commission model for eligible sellers — with zero surprise deductions.",
    bullets: [
      "Keep 100% of your product selling value under ZebAlpha's 0% commission seller policy.",
      "No Bank Account Number, PAN, or Aadhaar upload required — verify your UPI ID once in Payments & Ledger.",
      "Eligible order earnings settle directly to your verified UPI ID within 5 days of delivery.",
      "Track gross sales, settlements, and ledger entries transparently anytime under Payments & Ledger.",
    ],
    ctaLabel: "Go to Payments & UPI Setup",
    ctaHref: "/dashboard/payments",
  },
  delivery_returns: {
    badge: "Pan-India Logistics",
    title: "Delivery, Doorstep Pickup & Responsible Returns",
    subtitle:
      "Ship safely across 28,000+ Indian PIN codes with automated pickup scheduling and fair seller protection.",
    bullets: [
      "Keep your default Pickup Hub address and active phone number updated under Pickup Hubs.",
      "Pack the exact ordered SKU (color & size) and download your shipping label from the Orders tab.",
      "Customers receive a clear 5-day return/exchange window for genuine size or damage issues.",
      "Need help with a pickup, courier delay, or RTO dispute? Contact our Alpha Seller Support Team anytime.",
    ],
    ctaLabel: "Manage Pickup Hubs",
    ctaHref: "/dashboard/addresses",
  },
};

function formatCatalogTimestamp(iso?: string | null): string {
  if (!iso) return "Just updated";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Recently uploaded";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Recently uploaded";
  }
}

function isProductLive(p: SellerHomeProduct): boolean {
  if (p.is_active === false) return false;
  const st = String(p.status || "").toUpperCase();
  if (["BLOCKED", "DELETED", "ARCHIVED", "DRAFT", "REJECTED", "SUSPENDED", "INACTIVE"].includes(st)) {
    return false;
  }
  const approval = String(p.approval_status || "").toLowerCase();
  if (approval === "rejected" || approval === "pending" || approval === "suspended") {
    return false;
  }
  if (p.is_approved === false) return false;
  return true;
}

export default function SellerHomePage() {
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("Seller");
  const [products, setProducts] = useState<SellerHomeProduct[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [allTimeRevenue, setAllTimeRevenue] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [setupActions, setSetupActions] = useState<SetupAction[]>([]);
  const [selectedStep, setSelectedStep] = useState<1 | 2 | 3>(1);
  const [activeGuide, setActiveGuide] = useState<GuideKey | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSellerHome() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // 1. Fetch seller profile
        let sellerQuery = supabase.from("sellers").select("*");
        if (user.email && user.email.trim()) {
          sellerQuery = sellerQuery.or(
            `user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`
          );
        } else {
          sellerQuery = sellerQuery.or(`user_id.eq.${user.id},id.eq.${user.id}`);
        }
        const { data: seller } = await sellerQuery.maybeSingle();

        if (!isMounted) return;

        const resolvedStoreName =
          seller?.business_name ||
          seller?.shop_name ||
          seller?.owner_name ||
          seller?.full_name ||
          user.user_metadata?.full_name ||
          (user.email ? user.email.split("@")[0] : "Seller");
        setStoreName(resolvedStoreName);

        const sellerIds = Array.from(
          new Set([seller?.id, seller?.user_id, user.id].filter(Boolean) as string[])
        );

        // 2. Load products, pickup locations, metrics & payments in parallel
        const [prodRes, pickupRes, metricsRes, paymentsRes] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, image_url, images, status, is_active, is_approved, approval_status, created_at")
            .in("seller_id", sellerIds)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("seller_pickup_locations")
            .select("id")
            .in("seller_id", sellerIds)
            .limit(5),
          fetch("/api/seller/metrics?period=all&stream=all")
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch("/api/payments")
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (!isMounted) return;

        const fetchedProducts = Array.isArray(prodRes.data)
          ? (prodRes.data as SellerHomeProduct[]).filter(
              (p) => String(p.status || "").toUpperCase() !== "DELETED"
            )
          : [];
        setProducts(fetchedProducts);

        const ordersTotal = Number(metricsRes?.quick_kpis?.totalOrders || 0);
        const ordersPending = Number(metricsRes?.quick_kpis?.pendingOrders || 0);
        const revAllTime = Number(metricsRes?.quick_kpis?.allTimeRevenue || 0);
        setTotalOrders(ordersTotal);
        setPendingOrders(ordersPending);
        setAllTimeRevenue(revAllTime);

        const availBal = Number(
          paymentsRes?.balances?.available_balance ??
            metricsRes?.settlement?.available_balance ??
            0
        );
        setAvailableBalance(availBal);

        // 3. Build missing account setup checklist dynamically from real DB state
        const missing: SetupAction[] = [];

        const hasUpiOnProfile = Boolean(
          String(seller?.upi_id || seller?.phonepay_no || seller?.phonepay_number || "").trim()
        );
        const payoutStatus = String(paymentsRes?.payoutAccount?.verification_status || "");
        const hasVerifiedUpi = payoutStatus === "verified" || hasUpiOnProfile;

        if (!hasVerifiedUpi) {
          missing.push({
            id: "upi",
            label: "Verify UPI ID for 5-Day Payouts",
            href: "/dashboard/payments",
            alertTitle: "Your UPI Payout ID is missing!",
            alertDesc:
              "Add & verify your UPI ID so ZebAlpha can transfer your 0% commission order payouts safely within 5 days.",
            alertCta: "Add UPI ID",
          });
        }

        const pickupCount = Array.isArray(pickupRes.data) ? pickupRes.data.length : 0;
        const hasProfilePickup = Boolean(
          String(seller?.pickup_address || seller?.warehouse_address || "").trim() &&
            String(seller?.pincode || "").trim()
        );
        if (pickupCount === 0 && !hasProfilePickup) {
          missing.push({
            id: "pickup",
            label: "Add Pickup Hub Address",
            href: "/dashboard/addresses",
            alertTitle: "Your Pickup Hub Address is missing!",
            alertDesc:
              "Add your doorstep pickup address and PIN code so our delivery partners can collect orders smoothly.",
            alertCta: "Add Pickup Hub",
          });
        }

        if (!String(seller?.gstin || "").trim()) {
          missing.push({
            id: "enrolment",
            label: "Add 15-Char Enrolment ID / GSTIN",
            href: "/dashboard/settings",
            alertTitle: "Add your 15-Character Enrolment ID or GSTIN!",
            alertDesc:
              "Enrolment ID / GSTIN is needed to publish catalogs and raise compliant tax invoices on your behalf.",
            alertCta: "Add Enrolment ID",
          });
        }

        if (!String(seller?.business_name || seller?.shop_name || "").trim()) {
          missing.push({
            id: "business_type",
            label: "Add Business / Brand Name",
            href: "/dashboard/settings",
            alertTitle: "Complete your Store & Brand Profile!",
            alertDesc:
              "Add your brand name and business category so shoppers recognize your storefront on ZebAlpha.",
            alertCta: "Update Profile",
          });
        }

        if (!String(seller?.social_page_url || user.user_metadata?.social_page_url || "").trim()) {
          missing.push({
            id: "social",
            label: "Link Instagram / Facebook Page (Alpha Media)",
            href: "/dashboard/settings",
            alertTitle: "Connect your Instagram / Facebook page!",
            alertDesc:
              "Link your brand handle so ZebAlpha's Alpha Media Team can tag and promote your products daily.",
            alertCta: "Link Social Page",
          });
        }

        setSetupActions(missing);

        // 4. Determine initial active step automatically
        const liveCount = fetchedProducts.filter(isProductLive).length;
        if (fetchedProducts.length === 0) {
          setSelectedStep(1);
        } else if (liveCount === 0) {
          setSelectedStep(2);
        } else {
          setSelectedStep(3);
        }
      } catch (err) {
        console.error("[Seller Home] Failed to load home state:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSellerHome();
    return () => {
      isMounted = false;
    };
  }, []);

  const liveProducts = useMemo(() => products.filter(isProductLive), [products]);
  const pendingProducts = useMemo(
    () => products.filter((p) => !isProductLive(p)),
    [products]
  );

  const step1Done = products.length > 0;
  const step2Done = liveProducts.length > 0;
  const step3Done = totalOrders > 0;

  const latestProduct = liveProducts[0] || products[0] || null;
  const latestThumb =
    latestProduct?.image_url ||
    (Array.isArray(latestProduct?.images) ? latestProduct.images[0] : null) ||
    null;

  // Only show top coral warning banner for critical missing items (UPI, Pickup, Enrolment ID, Business Name)
  const topCriticalAlert = setupActions.find((a) => a.id !== "social") || null;

  const recommendedTarget = 5;
  const visibilityPct = Math.min(100, Math.round((liveProducts.length / recommendedTarget) * 100));

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-16 rounded-2xl bg-[#FFF4F2] border border-[#F03A46]/20" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded-xl bg-[#F3E6C5]" />
            <div className="h-4 w-48 rounded-lg bg-[#F7EED7]" />
          </div>
          <div className="h-10 w-32 rounded-xl bg-[#F3E6C5]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          <div className="space-y-5">
            <div className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
            <div className="h-24 rounded-3xl bg-white border border-[#EAD296]" />
          </div>
          <div className="space-y-5">
            <div className="h-44 rounded-3xl bg-white border border-[#EAD296]" />
            <div className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      {/* 1. CONDITIONAL TOP ALERT BANNER (Matches Meesho-style urgent action bar in ZebAlpha Coral Theme) */}
      {topCriticalAlert && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#F03A46]/30 bg-gradient-to-r from-[#FFF3F1] via-[#FFF8F6] to-[#FFFDF8] px-5 py-4 shadow-[0_6px_20px_rgba(240,58,70,0.08)]">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F03A46]/10 text-[#F03A46]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-[#B91C1C]">
                {topCriticalAlert.alertTitle}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#5C4E35] leading-relaxed">
                {topCriticalAlert.alertDesc}
              </p>
            </div>
          </div>

          <Link
            href={topCriticalAlert.href}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#F03A46] bg-white px-5 py-2.5 text-xs font-black text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition-all shadow-sm"
          >
            {topCriticalAlert.alertCta}
          </Link>
        </div>
      )}

      {/* 2. WELCOME HEADER + NEED HELP (ALPHA SELLER SUPPORT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            Welcome {storeName}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#6E5C3D]">
            {step3Done
              ? `Your ZebAlpha storefront is live — ${liveProducts.length} live ${
                  liveProducts.length === 1 ? "catalog" : "catalogs"
                } & ${totalOrders} total ${totalOrders === 1 ? "order" : "orders"}`
              : "Let's get your business started in 3 steps"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-4 py-2.5 text-xs font-extrabold text-[#4A3F2B] hover:border-[#C68A12] hover:bg-[#FFF8DB] transition-all"
          >
            <span>Revenue Dashboard</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/dashboard/support"
            className="inline-flex items-center gap-2 rounded-xl border border-[#DFBE6F] bg-white px-4 py-2.5 text-xs font-black text-[#9A6503] hover:border-[#F03A46] hover:text-[#F03A46] hover:bg-[#FFF4F2] transition-all shadow-sm"
          >
            <Headphones size={15} className="text-[#F03A46]" />
            <span>Need Help?</span>
          </Link>
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN MEESHO-STYLE HUB IN ZEBALPHA OFFICIAL IVORY/GOLD/CORAL THEME */}
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr] items-start">
        {/* LEFT COLUMN: 3-STEP ONBOARDING STEPPER + CATALOG VISIBILITY + QUICK SNAPSHOT */}
        <div className="space-y-5">
          {/* 3-Step Card */}
          <section className="overflow-hidden rounded-[1.5rem] border border-[#EAD296] bg-white shadow-[0_12px_32px_rgba(166,124,28,0.08)]">
            {/* Step Tabs Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-[#F0E2BE] bg-[#FFFDF8]">
              {[
                {
                  num: 1 as const,
                  label: "Upload catalogs to get started",
                  done: step1Done,
                },
                {
                  num: 2 as const,
                  label: "Catalogs go live on ZebAlpha",
                  done: step2Done,
                },
                {
                  num: 3 as const,
                  label: "Get your first order",
                  done: step3Done,
                },
              ].map((st) => {
                const isCurrent = selectedStep === st.num;
                return (
                  <button
                    key={st.num}
                    type="button"
                    onClick={() => setSelectedStep(st.num)}
                    className={`relative flex items-center gap-2.5 px-4 py-4 text-left transition-all cursor-pointer border-b-2 sm:border-b-[3px] ${
                      isCurrent
                        ? "border-[#F03A46] bg-white text-[#14120F]"
                        : "border-transparent text-[#6E5C3D] hover:bg-[#FFF8DB]/60"
                    }`}
                  >
                    {st.done ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                        <CheckCircle2 size={14} />
                      </span>
                    ) : (
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black border ${
                          isCurrent
                            ? "bg-[#FFF4F2] text-[#F03A46] border-[#F03A46]/40"
                            : "bg-[#FFF8DB] text-[#9A6503] border-[#DFBE6F]"
                        }`}
                      >
                        {st.num}
                      </span>
                    )}
                    <span
                      className={`text-xs leading-snug ${
                        isCurrent ? "font-black text-[#14120F]" : "font-bold text-[#6E5C3D]"
                      }`}
                    >
                      {st.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step Body Content */}
            <div className="p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl border border-[#F0E2BE] bg-gradient-to-r from-[#FFFDF8] via-white to-[#FFF9EB]/60 p-5 sm:p-6">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Product Preview Thumbnail / Signature Apparel Emblem */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#DFBE6F] bg-gradient-to-br from-[#FFF3C4] to-[#FCE08A] shadow-sm">
                    {latestThumb ? (
                      <img
                        src={latestThumb}
                        alt={latestProduct?.name || "Live catalog"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag size={28} className="text-[#9A6503]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    {selectedStep === 1 && !step1Done ? (
                      <>
                        <h2 className="text-base sm:text-lg font-black text-[#14120F]">
                          Upload your first catalog
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                          Add photos, size/color variants &amp; price — go live at 0% commission.
                        </p>
                      </>
                    ) : selectedStep === 2 && !step2Done ? (
                      <>
                        <h2 className="text-base sm:text-lg font-black text-[#14120F]">
                          {pendingProducts.length > 0
                            ? `${pendingProducts.length} ${
                                pendingProducts.length === 1 ? "Catalog" : "Catalogs"
                              } under review`
                            : "No live catalogs yet"}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-[#6E5C3D] flex items-center gap-1.5">
                          <Clock size={12} className="text-[#9A6503]" />
                          <span>
                            {latestProduct
                              ? `Last uploaded ${formatCatalogTimestamp(latestProduct.created_at)}`
                              : "Upload your first product so our team can approve it fast."}
                          </span>
                        </p>
                      </>
                    ) : selectedStep === 3 && step3Done ? (
                      <>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1">
                          <CheckCircle2 size={11} /> First Order Unlocked
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-[#14120F]">
                          {liveProducts.length} {liveProducts.length === 1 ? "Catalog" : "Catalogs"} live •{" "}
                          {totalOrders} {totalOrders === 1 ? "Order" : "Orders"}
                        </h2>
                        <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                          {latestProduct
                            ? `Latest catalog: ${formatCatalogTimestamp(latestProduct.created_at)}`
                            : `Total Revenue: ₹${allTimeRevenue.toLocaleString("en-IN")}`}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-base sm:text-lg font-black text-[#14120F]">
                          {liveProducts.length}{" "}
                          {liveProducts.length === 1 ? "Catalog" : "Catalogs"} live
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                          {latestProduct
                            ? formatCatalogTimestamp(latestProduct.created_at)
                            : "Ready for your first customer order"}
                        </p>
                        {pendingProducts.length > 0 && (
                          <p className="mt-1 text-[11px] font-bold text-[#9A6503]">
                            + {pendingProducts.length} awaiting approval / inactive
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Primary Bright Coral Action Button */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {selectedStep === 3 && step3Done ? (
                    <>
                      <Link
                        href="/dashboard/orders"
                        data-photo-overlay="true"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 active:scale-[0.98] transition-all"
                      >
                        <span>View Orders</span>
                        <ArrowRight size={14} />
                      </Link>
                      <Link
                        href="/dashboard/products"
                        className="inline-flex items-center justify-center rounded-xl border border-[#DFBE6F] bg-white px-4 py-3 text-xs font-black text-[#14120F] hover:bg-[#FFF8DB] transition-all"
                      >
                        Manage Catalogs
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/dashboard/products"
                      data-photo-overlay="true"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      <span>{step1Done ? "View / Manage Catalogs" : "Upload First Catalog"}</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Helpful status footer inside stepper */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#7A6847]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>0% Commission Policy • Alpha Media Daily Social Promotion Eligible</span>
                </span>
                <Link href="/dashboard/collections" className="text-[#F03A46] hover:underline font-extrabold">
                  Browse Live Collections →
                </Link>
              </div>
            </div>
          </section>

          {/* 4. GET HIGHER VISIBILITY WITH MORE CATALOGS CARD */}
          <section className="rounded-[1.5rem] border border-[#EAD296] bg-white p-5 sm:p-6 shadow-[0_8px_24px_rgba(166,124,28,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <LayoutGrid size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#14120F]">
                    {liveProducts.length < recommendedTarget
                      ? "Get higher visibility with more catalogs"
                      : `Strong catalog presence (${liveProducts.length} catalogs live!)`}
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                    {liveProducts.length < recommendedTarget
                      ? `A minimum of ${recommendedTarget} catalogs is recommended (${liveProducts.length}/${recommendedTarget} live so far)`
                      : "Keep adding fresh styles & Real Product Video Proof to earn Alpha Media Instagram/Facebook features."}
                  </p>
                  {liveProducts.length < recommendedTarget && (
                    <div className="mt-3 max-w-xs">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#FFF3C4] border border-[#EAD296]/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#F03A46] to-[#F5B922] transition-all duration-500"
                          style={{ width: `${Math.max(8, visibilityPct)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/dashboard/products"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#DFBE6F] bg-[#FFFDF8] px-5 py-2.5 text-xs font-black text-[#14120F] hover:border-[#F03A46] hover:bg-[#FFF4F2] hover:text-[#F03A46] transition-all shadow-sm"
              >
                <Upload size={15} />
                <span>Upload</span>
              </Link>
            </div>
          </section>

          {/* 5. COMPACT QUICK SNAPSHOT STRIP (Zero clutter, 1-click access to live store numbers) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/products"
              className="group rounded-2xl border border-[#EAD296] bg-white p-4 hover:border-[#F03A46]/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6847]">
                  Live Catalogs
                </span>
                <Package size={16} className="text-[#9A6503] group-hover:text-[#F03A46] transition-colors" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#14120F]">{liveProducts.length}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                {products.length} total uploaded
              </p>
            </Link>

            <Link
              href="/dashboard/orders"
              className="group rounded-2xl border border-[#EAD296] bg-white p-4 hover:border-[#F03A46]/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6847]">
                  Pending Orders
                </span>
                <ShoppingBag size={16} className="text-[#9A6503] group-hover:text-[#F03A46] transition-colors" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#14120F]">{pendingOrders}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                {totalOrders} all-time orders
              </p>
            </Link>

            <Link
              href="/dashboard/payments"
              className="group rounded-2xl border border-[#EAD296] bg-white p-4 hover:border-[#F03A46]/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6847]">
                  Available Payout
                </span>
                <IndianRupee size={16} className="text-[#9A6503] group-hover:text-[#F03A46] transition-colors" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#14120F]">
                ₹{availableBalance.toLocaleString("en-IN")}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                5-Day Direct UPI Payout
              </p>
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: COMPLETE YOUR ACCOUNT SETUP + LEARN & GROW ON ZEBALPHA */}
        <div className="space-y-5">
          {/* Card A: Complete your account setup */}
          <section className="rounded-[1.5rem] border border-[#EAD296] bg-white p-6 shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
            <h2 className="text-base font-black text-[#14120F]">
              Complete your account setup
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
              Add the below information to improve your selling journey
            </p>

            {setupActions.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-emerald-900">100% Account Ready!</p>
                    <p className="text-[11px] font-semibold text-emerald-700">
                      UPI, Pickup Hub &amp; Brand Profile are all set.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings"
                  className="text-xs font-black text-emerald-800 underline shrink-0"
                >
                  Edit
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {setupActions.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-[#F0E2BE] bg-[#FFFDF8] px-3.5 py-3 hover:border-[#F03A46]/40 hover:bg-[#FFF4F2]/60 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlusCircle
                        size={17}
                        className="shrink-0 text-[#F03A46] group-hover:scale-105 transition-transform"
                      />
                      <span className="text-xs font-extrabold text-[#14120F] group-hover:text-[#F03A46] truncate transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight size={15} className="shrink-0 text-[#9A6503] group-hover:text-[#F03A46]" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Card B: Learn & Grow On ZebAlpha */}
          <section className="rounded-[1.5rem] border border-[#EAD296] bg-white p-6 shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
            <h2 className="text-base font-black text-[#14120F]">
              Learn &amp; Grow on ZebAlpha
            </h2>

            <div className="mt-4 divide-y divide-[#F0E2BE]">
              {/* 1. Alpha Seller Support (Live Help) */}
              <Link
                href="/dashboard/support"
                className="group flex items-start justify-between gap-3 py-3.5 first:pt-1 hover:bg-[#FFFDF8] -mx-2 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF4F2] border border-[#F03A46]/25 text-[#F03A46]">
                    <Headphones size={17} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-[#14120F] group-hover:text-[#F03A46]">
                        Alpha Seller Support
                      </span>
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                        Expert Led
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-[#6E5C3D] leading-snug">
                      Get hands-on help for onboarding, cataloging &amp; scaling your store.
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="mt-1 shrink-0 text-[#9A6503] group-hover:text-[#F03A46]" />
              </Link>

              {/* 2. Alpha Media Team Daily Promotion */}
              <button
                type="button"
                onClick={() => setActiveGuide("alpha_media")}
                className="group w-full text-left flex items-start justify-between gap-3 py-3.5 hover:bg-[#FFFDF8] -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]">
                    <Megaphone size={17} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-[#14120F] group-hover:text-[#F03A46]">
                        Alpha Media Team Promotion
                      </span>
                      <span className="rounded-md bg-[#FFF3C4] border border-[#DFBE6F] px-1.5 py-0.5 text-[10px] font-black text-[#9A6503]">
                        Daily Social
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-[#6E5C3D] leading-snug">
                      Daily Instagram &amp; Facebook product branding for partner brands.
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="mt-1 shrink-0 text-[#9A6503] group-hover:text-[#F03A46]" />
              </button>

              {/* 3. Prepare Catalogs for ZebAlpha */}
              <button
                type="button"
                onClick={() => setActiveGuide("prepare_catalog")}
                className="group w-full text-left flex items-center justify-between gap-3 py-3.5 hover:bg-[#FFFDF8] -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                    <PlayCircle size={17} />
                  </span>
                  <span className="text-xs font-black text-[#14120F] group-hover:text-[#F03A46]">
                    Prepare catalogs &amp; Real Video Proof
                  </span>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#9A6503] group-hover:text-[#F03A46]" />
              </button>

              {/* 4. Pricing & 0% Commission */}
              <button
                type="button"
                onClick={() => setActiveGuide("pricing_commission")}
                className="group w-full text-left flex items-center justify-between gap-3 py-3.5 hover:bg-[#FFFDF8] -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]">
                    <Percent size={17} />
                  </span>
                  <span className="text-xs font-black text-[#14120F] group-hover:text-[#F03A46]">
                    Pricing, 0% Commission &amp; UPI Payouts
                  </span>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#9A6503] group-hover:text-[#F03A46]" />
              </button>

              {/* 5. Delivery & Returns */}
              <button
                type="button"
                onClick={() => setActiveGuide("delivery_returns")}
                className="group w-full text-left flex items-center justify-between gap-3 pt-3.5 pb-1 hover:bg-[#FFFDF8] -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
                    <Truck size={17} />
                  </span>
                  <span className="text-xs font-black text-[#14120F] group-hover:text-[#F03A46]">
                    Delivery, Pickup Hubs &amp; Returns
                  </span>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#9A6503] group-hover:text-[#F03A46]" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* INTERACTIVE LEARN & GROW GUIDE MODAL */}
      {activeGuide && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setActiveGuide(null)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                  <Sparkles size={11} className="text-[#F03A46]" />
                  {GUIDE_CONTENT[activeGuide].badge}
                </span>
                <h3 className="mt-3 text-xl font-black text-[#14120F]">
                  {GUIDE_CONTENT[activeGuide].title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveGuide(null)}
                className="rounded-xl border border-[#EAD296] bg-[#FFFDF8] p-2 text-[#5C4E35] hover:bg-[#FFF4F2] hover:text-[#F03A46] cursor-pointer"
                aria-label="Close Guide"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed text-[#5C4E35]">
              {GUIDE_CONTENT[activeGuide].subtitle}
            </p>

            <ul className="mt-5 space-y-3 rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-4 sm:p-5">
              {GUIDE_CONTENT[activeGuide].bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-[#14120F]">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveGuide(null)}
                className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] hover:bg-[#FFF8DB] cursor-pointer"
              >
                Close
              </button>
              <Link
                href={GUIDE_CONTENT[activeGuide].ctaHref}
                onClick={() => setActiveGuide(null)}
                data-photo-overlay="true"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2.5 text-xs font-black text-white shadow-md hover:brightness-105"
              >
                <Store size={14} />
                <span>{GUIDE_CONTENT[activeGuide].ctaLabel}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
