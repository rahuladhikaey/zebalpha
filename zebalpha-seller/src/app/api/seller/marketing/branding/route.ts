import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type BrandingTrack = "app_ad" | "store_pass";

export interface BrandingPackageDef {
  key: "app_offer_99_28d" | "festival_mega_139_45d" | "store_search_49_18d" | "store_search_59_28d";
  track: BrandingTrack;
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

export const BRANDING_PACKAGES: Record<BrandingPackageDef["key"], BrandingPackageDef> = {
  app_offer_99_28d: {
    key: "app_offer_99_28d",
    track: "app_ad",
    name: "App Offer & Sale Ad",
    placement_type: "homepage_spotlight",
    duration_days: 28,
    amount_inr: 99,
    max_products: 6,
    badge: "Offer & Sale Ad",
    instant_activation: false,
    summary:
      "Promote seasonal offers, discounts & new launches on the ZebAlpha App & Website for 28 full days.",
    features: [
      "Homepage Offer & Brand Spotlight card on Web & Android App (28 days)",
      "Top Search & Category visibility boost for up to 6 showcase products",
      "Admin quality reviewed • 28-day live timer starts right upon approval",
      "Full Impressions, Clicks, CTR & Verified Attributed Orders dashboard",
    ],
  },
  festival_mega_139_45d: {
    key: "festival_mega_139_45d",
    track: "app_ad",
    name: "Festival & Mega Sale Takeover",
    placement_type: "brand_takeover",
    duration_days: 45,
    amount_inr: 139,
    max_products: 10,
    badge: "Festival Mega Ad",
    instant_activation: false,
    summary:
      "Full 45-day bumper festival & mega-sale visibility across Durga Puja, Diwali, Wedding, Eid & Seasonal Drops.",
    features: [
      "Priority Homepage Mega Takeover placement on Web & Android App (45 days)",
      "Boosts up to 10 best-selling products across Search & Category feeds",
      "Custom Festival / Offer badge & banner headline (Admin quality reviewed)",
      "Best Pan-India festival ROI at just ₹3.08/day with full sales tracking",
    ],
  },
  store_search_49_18d: {
    key: "store_search_49_18d",
    track: "store_pass",
    name: "Store Search & Mini-Storefront",
    placement_type: "store_search",
    duration_days: 18,
    amount_inr: 49,
    max_products: 0,
    badge: "Store Search Pass",
    instant_activation: true,
    summary:
      "Unlock direct Shop Name search, your own branded Mini-Storefront URL & clickable PDP Store Link for 18 days.",
    features: [
      "Shop Name & Shop+Product Search (e.g. 'Your Shop kurti') — zero competitor hijacking",
      "Dedicated branded Mini-Storefront (zebalpha.shop/store/your-shop) + Printable QR",
      "Clickable 'Visit Your Store →' link unlocked on every product page",
      "Instant activation right after payment • Auto-deactivates cleanly after 18 days",
    ],
  },
  store_search_59_28d: {
    key: "store_search_59_28d",
    track: "store_pass",
    name: "Store Search & Mini-Storefront Pro",
    placement_type: "store_search",
    duration_days: 28,
    amount_inr: 59,
    max_products: 0,
    badge: "Most Popular • Best Value",
    popular: true,
    instant_activation: true,
    summary:
      "Full 28-day Seller-Based Search + Branded Mini-Storefront + PDP Store Link with priority rank & live analytics.",
    features: [
      "Everything in Store Search Pass for 28 full days (just ₹2.10/day)",
      "Priority #1 Verified Store rank in Web & Android search autocomplete",
      "Live Store Searches, Mini-Storefront Visits & Missed Traffic alerts",
      "Instant activation & seamless same-link renewal anytime",
    ],
  },
};

type PackageKey = BrandingPackageDef["key"];

const RESERVED_SLUGS = new Set([
  "zebalpha",
  "official",
  "admin",
  "superadmin",
  "seller",
  "sellers",
  "support",
  "store",
  "stores",
  "shop",
  "api",
  "login",
  "signup",
  "cart",
  "checkout",
  "products",
  "product",
  "go",
  "new-drops",
  "categories",
  "profile",
  "orders",
  "wishlist",
  "media",
  "help",
]);

function slugifyStoreName(input: string, fallbackSuffix = "shop"): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  if (cleaned.length >= 3 && !RESERVED_SLUGS.has(cleaned)) return cleaned;
  const safeBase = cleaned || "brand";
  const suffix = fallbackSuffix.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-4) || "1001";
  return `${safeBase.slice(0, 28)}-${suffix}`;
}

function validateCustomSlug(raw: string): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length < 3 || slug.length > 40) {
    return { ok: false, error: "Store link must be 3 to 40 letters, numbers, or hyphens." };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return {
      ok: false,
      error: `"${slug}" is a reserved ZebAlpha address. Please choose your unique shop name.`,
    };
  }
  return { ok: true, slug };
}

function isMissingSchemaError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || "").toLowerCase();
  const code = String((err as { code?: string })?.code || "");
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the")
  );
}

function verifyConstantTimeSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch {
    // Fallback to Bearer token
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

async function resolveSellerContext(user: { id: string; email?: string | null }) {
  let q = supabaseServer.from("sellers").select("*");
  if (user.email && user.email.trim()) {
    q = q.or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
  } else {
    q = q.or(`user_id.eq.${user.id},id.eq.${user.id}`);
  }
  const { data: seller } = await q.maybeSingle();
  const sellerRow = (seller || {}) as Record<string, unknown>;
  const primarySellerId = String(sellerRow.id || user.id);
  const sellerIds = Array.from(
    new Set([sellerRow.id, sellerRow.user_id, user.id].filter(Boolean) as string[])
  );
  const storeName = String(
    sellerRow.business_name ||
    sellerRow.shop_name ||
    sellerRow.owner_name ||
    sellerRow.full_name ||
    (user.email ? user.email.split("@")[0] : "Seller Brand")
  );

  // Evaluate live Store Pass state authoritatively against current time
  const rawPassStatus = String(sellerRow.store_pass_status || "inactive").toLowerCase();
  const expiresAtIso = sellerRow.store_pass_expires_at ? String(sellerRow.store_pass_expires_at) : null;
  const expiresMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0;
  const isBlocked = Boolean(sellerRow.store_slug_blocked);
  const isPassActive =
    rawPassStatus === "active" && !isBlocked && Number.isFinite(expiresMs) && expiresMs > Date.now();
  const effectivePassStatus: "active" | "expired" | "inactive" = isPassActive
    ? "active"
    : expiresAtIso && expiresMs > 0
      ? "expired"
      : "inactive";

  const resolvedSlug =
    typeof sellerRow.store_slug === "string" && sellerRow.store_slug.trim()
      ? sellerRow.store_slug.trim().toLowerCase()
      : slugifyStoreName(storeName, primarySellerId);

  // Compute safe available seller balance from seller_ledger_entries
  let availableBalance = 0;
  try {
    const { data: ledgerRows } = await supabaseServer
      .from("seller_ledger_entries")
      .select("amount, entry_type, status")
      .in("seller_id", sellerIds)
      .limit(1000);

    if (Array.isArray(ledgerRows)) {
      for (const row of ledgerRows as Array<Record<string, unknown>>) {
        const st = String(row.status || "").toLowerCase();
        const amt = Number(row.amount || 0);
        if (!Number.isFinite(amt)) continue;
        if (st === "available" || st === "settled_available" || st === "cleared") {
          availableBalance += amt;
        }
      }
      availableBalance = Math.max(0, Number(availableBalance.toFixed(2)));
    }
  } catch {
    availableBalance = 0;
  }

  const trialUsed = Boolean(sellerRow.store_pass_trial_used);
  const renewalCount = Number(sellerRow.store_pass_renewal_count || 0);
  const freeTrialEligible = !trialUsed && renewalCount === 0 && !isBlocked && !isPassActive;

  return {
    primarySellerId,
    sellerIds,
    storeName,
    sellerEmail: String(sellerRow.email || user.email || ""),
    sellerPhone: String(sellerRow.phone || sellerRow.mobile || ""),
    sellerLogo: typeof sellerRow.business_logo_url === "string" ? sellerRow.business_logo_url : null,
    storeSlug: resolvedSlug,
    hasPersistedSlug: typeof sellerRow.store_slug === "string" && sellerRow.store_slug.trim().length > 0,
    storeTagline: typeof sellerRow.store_tagline === "string" ? sellerRow.store_tagline : "",
    storeBannerUrl: typeof sellerRow.store_banner_url === "string" ? sellerRow.store_banner_url : "",
    storePassPlan: typeof sellerRow.store_pass_plan === "string" ? sellerRow.store_pass_plan : null,
    storePassStatus: effectivePassStatus,
    storePassStartsAt: sellerRow.store_pass_starts_at ? String(sellerRow.store_pass_starts_at) : null,
    storePassExpiresAt: expiresAtIso,
    storePassTrialUsed: trialUsed,
    storePassFreeTrialEligible: freeTrialEligible,
    storePassRenewalCount: renewalCount,
    storeSearchCount: Number(sellerRow.store_search_count || 0),
    storeVisitCount: Number(sellerRow.store_visit_count || 0),
    missedStoreSearches: Number(sellerRow.missed_store_searches || 0),
    missedStoreVisits: Number(sellerRow.missed_store_visits || 0),
    storeSlugBlocked: isBlocked,
    storeSlugBlockReason:
      typeof sellerRow.store_slug_block_reason === "string" ? sellerRow.store_slug_block_reason : null,
    availableBalance,
    hasUpgradeColumns: "store_pass_status" in sellerRow,
  };
}

async function createOnlineCheckoutOrder(amountInr: number, receiptPrefix: string, notes: Record<string, string>) {
  const keyId = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    return null;
  }
  const authToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const gatewayRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      receipt: `${receiptPrefix}_${Date.now().toString().slice(-10)}`,
      notes,
    }),
  });
  if (!gatewayRes.ok) {
    return null;
  }
  const json = await gatewayRes.json();
  return {
    orderId: String(json.id),
    amount: Number(json.amount),
    currency: String(json.currency || "INR"),
    keyId,
  };
}

async function activateStorePassForSeller(params: {
  ctx: Awaited<ReturnType<typeof resolveSellerContext>>;
  pkg: BrandingPackageDef;
  customSlug?: string;
  customTagline?: string;
  customBannerUrl?: string;
}) {
  const { ctx, pkg, customSlug, customTagline, customBannerUrl } = params;
  const now = new Date();
  const nowIso = now.toISOString();
  const existingExpMs = ctx.storePassExpiresAt ? new Date(ctx.storePassExpiresAt).getTime() : 0;
  const isCurrentlyActive = ctx.storePassStatus === "active" && existingExpMs > now.getTime();
  const baseMs = isCurrentlyActive ? existingExpMs : now.getTime();
  const newExpiresIso = new Date(baseMs + pkg.duration_days * 86_400_000).toISOString();

  const updatePayload: Record<string, unknown> = {
    store_pass_plan: pkg.key,
    store_pass_status: "active",
    store_pass_starts_at: isCurrentlyActive && ctx.storePassStartsAt ? ctx.storePassStartsAt : nowIso,
    store_pass_expires_at: newExpiresIso,
    store_pass_renewal_count: ctx.storePassRenewalCount + 1,
    updated_at: nowIso,
  };

  if (customSlug) updatePayload.store_slug = customSlug;
  else if (!ctx.hasPersistedSlug) updatePayload.store_slug = ctx.storeSlug;
  if (customTagline !== undefined) updatePayload.store_tagline = customTagline;
  if (customBannerUrl !== undefined) updatePayload.store_banner_url = customBannerUrl;

  const { error } = await supabaseServer
    .from("sellers")
    .update(updatePayload)
    .eq("id", ctx.primarySellerId);

  return { error, startsAt: String(updatePayload.store_pass_starts_at), expiresAt: newExpiresIso };
}

async function recordBrandingTransaction(params: {
  sellerId: string;
  storeName: string;
  campaignId?: string | null;
  packageKey: string;
  trackType: BrandingTrack;
  amountInr: number;
  durationDays: number;
  paymentMethod: "online_checkout" | "seller_balance" | "free_trial";
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  notes?: string;
}) {
  try {
    await supabaseServer.from("seller_branding_transactions").insert({
      seller_id: params.sellerId,
      store_name: params.storeName,
      campaign_id: params.campaignId || null,
      package_key: params.packageKey,
      track_type: params.trackType,
      amount_inr: params.amountInr,
      duration_days: params.durationDays,
      payment_method: params.paymentMethod,
      gateway_order_id: params.gatewayOrderId || null,
      gateway_payment_id: params.gatewayPaymentId || null,
      status: "verified",
      notes: params.notes || null,
    });
  } catch {
    // Non-blocking if ledger migration hasn't been executed yet
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveSellerContext(user);

    const [prodRes, campRes, txRes] = await Promise.all([
      supabaseServer
        .from("products")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseServer
        .from("seller_branding_campaigns")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseServer
        .from("seller_branding_transactions")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const migrationRequired = isMissingSchemaError(campRes.error);
    const upgradeMigrationRequired = !ctx.hasUpgradeColumns || isMissingSchemaError(txRes.error);

    const products = (Array.isArray(prodRes.data) ? prodRes.data : [])
      .filter((p: Record<string, unknown>) => {
        const st = String(p.status || "").toUpperCase();
        return (
          p.is_active !== false &&
          !["DELETED", "BLOCKED", "ARCHIVED", "REJECTED", "DRAFT"].includes(st)
        );
      })
      .map((p: Record<string, unknown>) => ({
        id: String(p.id),
        name: String(p.name || "Untitled Product"),
        price: Number(p.price || 0),
        mrp: Number(p.mrp || 0),
        image_url:
          (typeof p.image_url === "string" && p.image_url.trim()) ||
          (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : null),
      }));

    const campaigns: Array<Record<string, unknown>> =
      !campRes.error && Array.isArray(campRes.data)
        ? (campRes.data as Array<Record<string, unknown>>)
        : [];
    const transactions: Array<Record<string, unknown>> =
      !txRes.error && Array.isArray(txRes.data)
        ? (txRes.data as Array<Record<string, unknown>>)
        : [];

    const appAdCampaigns = campaigns.filter(
      (c) =>
        c.placement_type !== "store_search" &&
        c.package_key !== "store_search_free_60d" &&
        c.package_key !== "store_search_49_18d" &&
        c.package_key !== "store_search_59_28d"
    );

    const totalImpressions = appAdCampaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
    const totalClicks = appAdCampaigns.reduce((s, c) => s + Number(c.clicks || 0), 0);
    const totalOrders = appAdCampaigns.reduce((s, c) => s + Number(c.attributed_orders || 0), 0);
    const totalRevenue = appAdCampaigns.reduce((s, c) => s + Number(c.attributed_revenue || 0), 0);

    const onlineCheckoutReady = Boolean(
      (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim() &&
      (process.env.RAZORPAY_KEY_SECRET || "").trim()
    );

    return NextResponse.json({
      success: true,
      migrationRequired,
      upgradeMigrationRequired,
      onlineCheckoutReady,
      seller: {
        id: ctx.primarySellerId,
        storeName: ctx.storeName,
        email: ctx.sellerEmail,
        phone: ctx.sellerPhone,
        logoUrl: ctx.sellerLogo,
        storeSlug: ctx.storeSlug,
        storeTagline: ctx.storeTagline,
        storeBannerUrl: ctx.storeBannerUrl,
        storePassPlan: ctx.storePassPlan,
        storePassStatus: ctx.storePassStatus,
        storePassStartsAt: ctx.storePassStartsAt,
        storePassExpiresAt: ctx.storePassExpiresAt,
        storePassTrialUsed: ctx.storePassTrialUsed,
        storePassFreeTrialEligible: ctx.storePassFreeTrialEligible,
        storePassRenewalCount: ctx.storePassRenewalCount,
        storeSearchCount: ctx.storeSearchCount,
        storeVisitCount: ctx.storeVisitCount,
        missedStoreSearches: ctx.missedStoreSearches,
        missedStoreVisits: ctx.missedStoreVisits,
        storeSlugBlocked: ctx.storeSlugBlocked,
        storeSlugBlockReason: ctx.storeSlugBlockReason,
        availableBalance: ctx.availableBalance,
        liveCatalogCount: products.length,
      },
      packages: Object.values(BRANDING_PACKAGES),
      summary: {
        liveCount: appAdCampaigns.filter(
          (c) => c.approval_status === "live" || c.approval_status === "approved"
        ).length,
        pendingCount: appAdCampaigns.filter((c) => c.approval_status === "pending_review").length,
        totalImpressions,
        totalClicks,
        ctrPct: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        totalOrders,
        totalRevenue,
      },
      products,
      campaigns,
      transactions,
    });
  } catch (err) {
    console.error("[API /seller/marketing/branding GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load App Branding dashboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveSellerContext(user);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const nowIso = new Date().toISOString();

    // -------------------------------------------------------------------------
    // 1. UPDATE MINI-STOREFRONT PROFILE (SLUG / TAGLINE / BANNER)
    // -------------------------------------------------------------------------
    if (action === "update_storefront_profile") {
      if (ctx.storePassStatus !== "active") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Please activate your Store Search & Mini-Storefront Pass first to unlock storefront customization and links.",
          },
          { status: 403 }
        );
      }

      if (ctx.storeSlugBlocked) {
        return NextResponse.json(
          {
            success: false,
            error:
              ctx.storeSlugBlockReason ||
              "Your storefront link is currently restricted by ZebAlpha Admin. Please contact Seller Support.",
          },
          { status: 403 }
        );
      }

      const rawSlug = String(body.storeSlug || ctx.storeSlug || "");
      const validated = validateCustomSlug(rawSlug);
      if (!validated.ok) {
        return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
      }

      // Check uniqueness across sellers
      const { data: conflict } = await supabaseServer
        .from("sellers")
        .select("id")
        .ilike("store_slug", validated.slug)
        .neq("id", ctx.primarySellerId)
        .maybeSingle();

      if (conflict?.id) {
        return NextResponse.json(
          {
            success: false,
            error: `zebalpha.shop/store/${validated.slug} is already taken by another store. Try adding your city or brand word.`,
          },
          { status: 409 }
        );
      }

      const storeTagline = String(body.storeTagline || "").trim().slice(0, 140);
      const storeBannerUrl = String(body.storeBannerUrl || "").trim().slice(0, 500);

      const { error: updErr } = await supabaseServer
        .from("sellers")
        .update({
          store_slug: validated.slug,
          store_tagline: storeTagline || null,
          store_banner_url: storeBannerUrl || null,
          updated_at: nowIso,
        })
        .eq("id", ctx.primarySellerId);

      if (updErr) {
        if (isMissingSchemaError(updErr)) {
          return NextResponse.json(
            {
              success: false,
              upgradeMigrationRequired: true,
              error:
                "Please run supabase/upgrade_unified_app_branding_and_store_search.sql in Supabase SQL Editor first.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        storeSlug: validated.slug,
        message: `Storefront link saved: zebalpha.shop/store/${validated.slug}`,
      });
    }

    // -------------------------------------------------------------------------
    // 1B. NEW SELLER 60-DAY FREE STORE SEARCH & MINI-STOREFRONT TRIAL (ONE-TIME)
    //     Auto-expires after 60 days; paid plans (₹49/18d or ₹59/28d) apply thereafter!
    // -------------------------------------------------------------------------
    if (action === "activate_free_60d_trial") {
      if (ctx.storeSlugBlocked) {
        return NextResponse.json(
          {
            success: false,
            error:
              ctx.storeSlugBlockReason ||
              "Your storefront link is restricted by ZebAlpha Admin. Please contact Seller Support.",
          },
          { status: 403 }
        );
      }

      if (!ctx.storePassFreeTrialEligible) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your 60-day Free New Seller Trial has already been claimed. Please renew with ₹49 (18 days) or ₹59 (28 days).",
          },
          { status: 400 }
        );
      }

      let desiredSlug = ctx.storeSlug;
      if (typeof body.storeSlug === "string" && body.storeSlug.trim()) {
        const validated = validateCustomSlug(body.storeSlug);
        if (!validated.ok) {
          return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
        }
        const { data: conflict } = await supabaseServer
          .from("sellers")
          .select("id")
          .ilike("store_slug", validated.slug)
          .neq("id", ctx.primarySellerId)
          .maybeSingle();
        if (conflict?.id) {
          return NextResponse.json(
            {
              success: false,
              error: `zebalpha.shop/store/${validated.slug} is already taken. Please pick a unique shop slug.`,
            },
            { status: 409 }
          );
        }
        desiredSlug = validated.slug;
      }

      const customTagline =
        typeof body.storeTagline === "string" ? body.storeTagline.trim().slice(0, 140) : ctx.storeTagline;
      const trialDays = 60;
      const now = new Date();
      const trialExpiresIso = new Date(now.getTime() + trialDays * 86_400_000).toISOString();

      // Atomic one-time guard: only updates if store_pass_trial_used is still false!
      const { data: updatedSeller, error: trialErr } = await supabaseServer
        .from("sellers")
        .update({
          store_slug: desiredSlug,
          store_tagline: customTagline || null,
          store_pass_plan: "store_search_free_60d",
          store_pass_status: "active",
          store_pass_starts_at: nowIso,
          store_pass_expires_at: trialExpiresIso,
          store_pass_trial_used: true,
          store_pass_trial_activated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", ctx.primarySellerId)
        .eq("store_pass_trial_used", false)
        .select("id")
        .maybeSingle();

      if (trialErr) {
        return NextResponse.json(
          {
            success: false,
            upgradeMigrationRequired: isMissingSchemaError(trialErr),
            error: isMissingSchemaError(trialErr)
              ? "Please run the updated supabase/upgrade_unified_app_branding_and_store_search.sql in Supabase SQL Editor."
              : trialErr.message,
          },
          { status: isMissingSchemaError(trialErr) ? 503 : 500 }
        );
      }

      if (!updatedSeller?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "60-day Free New Seller Trial has already been activated for this store.",
          },
          { status: 409 }
        );
      }

      // Audit campaign & transaction records
      let trialCampaignId: string | null = null;
      try {
        const { data: camp } = await supabaseServer
          .from("seller_branding_campaigns")
          .insert({
            seller_id: ctx.primarySellerId,
            store_name: ctx.storeName,
            campaign_name: `${ctx.storeName} — 60-Day Free Store Search & Mini-Storefront Trial`,
            package_key: "store_search_free_60d",
            placement_type: "store_search",
            product_ids: [],
            headline: `${ctx.storeName} 60-Day Free New Seller Storefront`,
            tagline: customTagline || `Direct Shop Search + zebalpha.shop/store/${desiredSlug}`,
            banner_image_url: ctx.storeBannerUrl || ctx.sellerLogo || null,
            cta_url: `/store/${desiredSlug}`,
            duration_days: trialDays,
            amount_inr: 0,
            payment_method: "free_trial",
            payment_status: "free_pilot",
            payment_ref: "NEW_SELLER_60D_FREE",
            paid_at: nowIso,
            approval_status: "live",
            starts_at: nowIso,
            ends_at: trialExpiresIso,
          })
          .select("id")
          .single();
        trialCampaignId = camp?.id ? String(camp.id) : null;
      } catch {
        // Non-blocking audit insert
      }

      await recordBrandingTransaction({
        sellerId: ctx.primarySellerId,
        storeName: ctx.storeName,
        campaignId: trialCampaignId,
        packageKey: "store_search_free_60d",
        trackType: "store_pass",
        amountInr: 0,
        durationDays: trialDays,
        paymentMethod: "free_trial",
        notes: "New Seller 60-Day Free Store Search + Mini-Storefront + PDP Link Trial",
      });

      return NextResponse.json({
        success: true,
        activated: true,
        storeSlug: desiredSlug,
        expiresAt: trialExpiresIso,
        message: `60 Days FREE activated! Your Shop Search, Mini-Storefront (zebalpha.shop/store/${desiredSlug}) & PDP Store Link are LIVE now. Paid renewals (₹49/₹59) start only after 60 days.`,
      });
    }

    // -------------------------------------------------------------------------
    // 2. CREATE ORDER / PAY FOR ANY OF THE 4 UNIFIED PACKAGES
    // -------------------------------------------------------------------------
    if (action === "create_campaign") {
      const packageKey = String(body.packageKey || "") as PackageKey;
      const pkg = BRANDING_PACKAGES[packageKey];
      if (!pkg) {
        return NextResponse.json(
          { success: false, error: "Invalid App Branding package selected." },
          { status: 400 }
        );
      }

      const paymentChoice =
        body.paymentMethod === "seller_balance" ? "seller_balance" : "online_checkout";

      // Validate seller balance if paying via balance
      if (paymentChoice === "seller_balance" && ctx.availableBalance < pkg.amount_inr) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient available payout balance (₹${ctx.availableBalance.toLocaleString(
              "en-IN"
            )}). Required: ₹${pkg.amount_inr}. Please use Online Payment instead.`,
          },
          { status: 400 }
        );
      }

      // TRACK 1: APP OFFER & FESTIVAL ADS (₹99/28d, ₹139/45d)
      if (pkg.track === "app_ad") {
        const productIds: string[] = Array.isArray(body.productIds)
          ? body.productIds
            .map((x: unknown) => String(x || "").trim())
            .filter(Boolean)
            .slice(0, pkg.max_products)
          : [];
        const headline = String(body.headline || "").trim().slice(0, 90);
        const tagline = String(body.tagline || "").trim().slice(0, 140);
        const offerBadge = String(body.offerBadge || "").trim().slice(0, 40);
        let bannerImageUrl = String(body.bannerImageUrl || "").trim();

        if (productIds.length === 0) {
          return NextResponse.json(
            { success: false, error: "Please select at least 1 live product to showcase." },
            { status: 400 }
          );
        }
        if (headline.length < 4) {
          return NextResponse.json(
            { success: false, error: "Please enter an offer or brand headline (at least 4 characters)." },
            { status: 400 }
          );
        }

        if (!bannerImageUrl) {
          const { data: firstProd } = await supabaseServer
            .from("products")
            .select("image_url, images")
            .eq("id", productIds[0])
            .maybeSingle();
          bannerImageUrl =
            (typeof firstProd?.image_url === "string" && firstProd.image_url.trim()) ||
            (Array.isArray(firstProd?.images) && typeof firstProd.images[0] === "string"
              ? firstProd.images[0]
              : "") ||
            "";
        }

        let checkoutSession: { orderId: string; amount: number; currency: string; keyId: string } | null =
          null;
        if (paymentChoice === "online_checkout") {
          checkoutSession = await createOnlineCheckoutOrder(pkg.amount_inr, "zbad", {
            seller_id: ctx.primarySellerId,
            package_key: pkg.key,
            track: "app_ad",
          });
          if (!checkoutSession) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Online checkout is temporarily unavailable. Please use Available Payout Balance or try again shortly.",
              },
              { status: 503 }
            );
          }
        }

        const insertPayload: Record<string, unknown> = {
          seller_id: ctx.primarySellerId,
          store_name: ctx.storeName,
          campaign_name: `${ctx.storeName} — ${pkg.name}`,
          package_key: pkg.key,
          placement_type: pkg.placement_type,
          product_ids: productIds,
          headline,
          tagline: tagline || `Shop ${ctx.storeName} specials on ZebAlpha`,
          offer_badge: offerBadge || (pkg.key === "festival_mega_139_45d" ? "Festival Mega Sale" : "Special Offer"),
          banner_image_url: bannerImageUrl || null,
          cta_url: `/products/${productIds[0]}`,
          duration_days: pkg.duration_days,
          amount_inr: pkg.amount_inr,
          payment_method: paymentChoice,
          payment_status: paymentChoice === "seller_balance" ? "deducted" : "pending",
          payment_ref: checkoutSession?.orderId || (paymentChoice === "seller_balance" ? "BALANCE_DEDUCTED" : null),
          payment_order_id: checkoutSession?.orderId || null,
          paid_at: paymentChoice === "seller_balance" ? nowIso : null,
          approval_status: "pending_review",
        };

        let createdRes = await supabaseServer
          .from("seller_branding_campaigns")
          .insert(insertPayload)
          .select("*")
          .single();

        // Graceful fallback if optional upgrade columns aren't added yet
        if (createdRes.error && isMissingSchemaError(createdRes.error)) {
          delete insertPayload.offer_badge;
          delete insertPayload.payment_order_id;
          delete insertPayload.paid_at;
          if (insertPayload.payment_method === "online_checkout") {
            insertPayload.payment_method = "razorpay_upi";
          }
          createdRes = await supabaseServer
            .from("seller_branding_campaigns")
            .insert(insertPayload)
            .select("*")
            .single();
        }

        if (createdRes.error) {
          return NextResponse.json(
            {
              success: false,
              upgradeMigrationRequired: true,
              error:
                "Database migration required: please run supabase/upgrade_unified_app_branding_and_store_search.sql in Supabase SQL Editor.",
            },
            { status: 503 }
          );
        }

        if (paymentChoice === "seller_balance") {
          await recordBrandingTransaction({
            sellerId: ctx.primarySellerId,
            storeName: ctx.storeName,
            campaignId: String(createdRes.data.id),
            packageKey: pkg.key,
            trackType: "app_ad",
            amountInr: pkg.amount_inr,
            durationDays: pkg.duration_days,
            paymentMethod: "seller_balance",
            notes: `Payout balance payment for ${pkg.name}`,
          });
        }

        return NextResponse.json({
          success: true,
          track: "app_ad",
          campaign: createdRes.data,
          checkoutSession,
          message:
            paymentChoice === "seller_balance"
              ? `₹${pkg.amount_inr} paid from Payout Balance! Your ${pkg.duration_days}-day ad is queued for Admin approval.`
              : `Complete ₹${pkg.amount_inr} online payment to submit your ${pkg.duration_days}-day ad for Admin approval.`,
        });
      }

      // TRACK 2: STORE SEARCH + MINI-STOREFRONT + PDP STORE LINK PASS (₹49/18d, ₹59/28d)
      if (ctx.storeSlugBlocked) {
        return NextResponse.json(
          {
            success: false,
            error:
              ctx.storeSlugBlockReason ||
              "Your storefront link is restricted by ZebAlpha Admin. Please contact Seller Support before activating.",
          },
          { status: 403 }
        );
      }

      let desiredSlug = ctx.storeSlug;
      if (typeof body.storeSlug === "string" && body.storeSlug.trim()) {
        const validated = validateCustomSlug(body.storeSlug);
        if (!validated.ok) {
          return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
        }
        const { data: conflict } = await supabaseServer
          .from("sellers")
          .select("id")
          .ilike("store_slug", validated.slug)
          .neq("id", ctx.primarySellerId)
          .maybeSingle();
        if (conflict?.id) {
          return NextResponse.json(
            {
              success: false,
              error: `zebalpha.shop/store/${validated.slug} is already taken. Please pick a unique shop slug.`,
            },
            { status: 409 }
          );
        }
        desiredSlug = validated.slug;
      }

      const customTagline =
        typeof body.storeTagline === "string" ? body.storeTagline.trim().slice(0, 140) : ctx.storeTagline;
      const customBannerUrl =
        typeof body.storeBannerUrl === "string" ? body.storeBannerUrl.trim().slice(0, 500) : ctx.storeBannerUrl;

      let checkoutSession: { orderId: string; amount: number; currency: string; keyId: string } | null =
        null;
      if (paymentChoice === "online_checkout") {
        checkoutSession = await createOnlineCheckoutOrder(pkg.amount_inr, "zbsp", {
          seller_id: ctx.primarySellerId,
          package_key: pkg.key,
          track: "store_pass",
          store_slug: desiredSlug,
        });
        if (!checkoutSession) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Online checkout is temporarily unavailable. Please use Available Payout Balance or try again shortly.",
            },
            { status: 503 }
          );
        }
      }

      const passCampaignInsert: Record<string, unknown> = {
        seller_id: ctx.primarySellerId,
        store_name: ctx.storeName,
        campaign_name: `${ctx.storeName} — ${pkg.name}`,
        package_key: pkg.key,
        placement_type: "store_search",
        product_ids: [],
        headline: `${ctx.storeName} Mini-Storefront & Shop Search`,
        tagline: customTagline || `Direct Shop Search + zebalpha.shop/store/${desiredSlug}`,
        banner_image_url: customBannerUrl || ctx.sellerLogo || null,
        cta_url: `/store/${desiredSlug}`,
        duration_days: pkg.duration_days,
        amount_inr: pkg.amount_inr,
        payment_method: paymentChoice,
        payment_status: paymentChoice === "seller_balance" ? "deducted" : "pending",
        payment_ref: checkoutSession?.orderId || "BALANCE_DEDUCTED",
        payment_order_id: checkoutSession?.orderId || null,
        paid_at: paymentChoice === "seller_balance" ? nowIso : null,
        approval_status: paymentChoice === "seller_balance" ? "live" : "pending_review",
      };

      const { data: createdCamp, error: campErr } = await supabaseServer
        .from("seller_branding_campaigns")
        .insert(passCampaignInsert)
        .select("*")
        .single();

      if (campErr) {
        return NextResponse.json(
          {
            success: false,
            upgradeMigrationRequired: true,
            error:
              "Database migration required: please run supabase/upgrade_unified_app_branding_and_store_search.sql in Supabase SQL Editor.",
          },
          { status: 503 }
        );
      }

      // If paid via Seller Payout Balance → INSTANT AUTO-ACTIVATION!
      if (paymentChoice === "seller_balance") {
        const act = await activateStorePassForSeller({
          ctx,
          pkg,
          customSlug: desiredSlug,
          customTagline,
          customBannerUrl,
        });
        if (act.error) {
          return NextResponse.json(
            {
              success: false,
              upgradeMigrationRequired: isMissingSchemaError(act.error),
              error: act.error.message,
            },
            { status: 500 }
          );
        }

        await supabaseServer
          .from("seller_branding_campaigns")
          .update({
            starts_at: act.startsAt,
            ends_at: act.expiresAt,
            approval_status: "live",
            updated_at: nowIso,
          })
          .eq("id", createdCamp.id);

        await recordBrandingTransaction({
          sellerId: ctx.primarySellerId,
          storeName: ctx.storeName,
          campaignId: String(createdCamp.id),
          packageKey: pkg.key,
          trackType: "store_pass",
          amountInr: pkg.amount_inr,
          durationDays: pkg.duration_days,
          paymentMethod: "seller_balance",
          notes: `Instant Store Search & Mini-Storefront Pass (${pkg.duration_days}d) via Payout Balance`,
        });

        return NextResponse.json({
          success: true,
          track: "store_pass",
          activated: true,
          storeSlug: desiredSlug,
          expiresAt: act.expiresAt,
          campaign: createdCamp,
          message: `Store Search & Mini-Storefront LIVE for ${pkg.duration_days} days! Your link zebalpha.shop/store/${desiredSlug} is active now.`,
        });
      }

      // Online payment pending user confirmation in modal
      return NextResponse.json({
        success: true,
        track: "store_pass",
        activated: false,
        storeSlug: desiredSlug,
        campaign: createdCamp,
        checkoutSession,
        message: `Complete ₹${pkg.amount_inr} online payment to instantly activate Shop Search & Mini-Storefront for ${pkg.duration_days} days.`,
      });
    }

    // -------------------------------------------------------------------------
    // 3. VERIFY ONLINE PAYMENT (IDEMPOTENT + CONSTANT-TIME HMAC-SHA256)
    // -------------------------------------------------------------------------
    if (action === "verify_online_payment" || action === "verify_razorpay_payment") {
      const campaignId = String(body.campaignId || "").trim();
      const orderId = String(body.orderId || body.razorpay_order_id || "").trim();
      const paymentId = String(body.paymentId || body.razorpay_payment_id || "").trim();
      const signature = String(body.signature || body.razorpay_signature || "").trim();
      const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

      if (!campaignId || !orderId || !paymentId || !signature || !secret) {
        return NextResponse.json(
          { success: false, error: "Invalid payment verification details." },
          { status: 400 }
        );
      }

      if (!verifyConstantTimeSignature(orderId, paymentId, signature, secret)) {
        return NextResponse.json(
          { success: false, error: "Payment signature verification failed. Please contact support." },
          { status: 400 }
        );
      }

      // Idempotency guard: prevent double activation/extension on retried webhook/callback
      try {
        const { data: existingTx } = await supabaseServer
          .from("seller_branding_transactions")
          .select("id, status")
          .eq("gateway_payment_id", paymentId)
          .maybeSingle();
        if (existingTx?.id) {
          return NextResponse.json({
            success: true,
            alreadyVerified: true,
            message: "Payment already verified and applied!",
          });
        }
      } catch {
        // Ignore if table not created yet
      }

      const { data: camp } = await supabaseServer
        .from("seller_branding_campaigns")
        .select("*")
        .eq("id", campaignId)
        .in("seller_id", ctx.sellerIds)
        .maybeSingle();

      if (!camp) {
        return NextResponse.json(
          { success: false, error: "Branding campaign record not found." },
          { status: 404 }
        );
      }

      const pkgKey = String(camp.package_key || "") as PackageKey;
      const pkg = BRANDING_PACKAGES[pkgKey];

      // TRACK 2: STORE SEARCH PASS → INSTANT AUTO-ACTIVATION
      if (pkg && pkg.track === "store_pass") {
        const desiredSlug =
          typeof body.storeSlug === "string" && body.storeSlug.trim()
            ? body.storeSlug.trim().toLowerCase()
            : ctx.storeSlug;
        const customTagline =
          typeof body.storeTagline === "string" ? body.storeTagline.trim().slice(0, 140) : undefined;
        const customBannerUrl =
          typeof body.storeBannerUrl === "string"
            ? body.storeBannerUrl.trim().slice(0, 500)
            : undefined;

        const act = await activateStorePassForSeller({
          ctx,
          pkg,
          customSlug: desiredSlug,
          customTagline,
          customBannerUrl,
        });

        if (act.error) {
          return NextResponse.json(
            {
              success: false,
              upgradeMigrationRequired: isMissingSchemaError(act.error),
              error: act.error.message,
            },
            { status: 500 }
          );
        }

        await supabaseServer
          .from("seller_branding_campaigns")
          .update({
            payment_status: "paid",
            payment_ref: paymentId,
            payment_order_id: orderId,
            payment_txn_id: paymentId,
            paid_at: nowIso,
            approval_status: "live",
            starts_at: act.startsAt,
            ends_at: act.expiresAt,
            updated_at: nowIso,
          })
          .eq("id", campaignId)
          .in("seller_id", ctx.sellerIds);

        await recordBrandingTransaction({
          sellerId: ctx.primarySellerId,
          storeName: ctx.storeName,
          campaignId,
          packageKey: pkg.key,
          trackType: "store_pass",
          amountInr: pkg.amount_inr,
          durationDays: pkg.duration_days,
          paymentMethod: "online_checkout",
          gatewayOrderId: orderId,
          gatewayPaymentId: paymentId,
          notes: `Verified online payment — Instant Store Pass (${pkg.duration_days}d)`,
        });

        return NextResponse.json({
          success: true,
          activated: true,
          storeSlug: desiredSlug,
          expiresAt: act.expiresAt,
          message: `Payment verified! Your Shop Search, Mini-Storefront (zebalpha.shop/store/${desiredSlug}) & PDP Store Link are LIVE for ${pkg.duration_days} days!`,
        });
      }

      // TRACK 1: APP OFFER & FESTIVAL AD → QUEUED FOR SUPERADMIN APPROVAL
      await supabaseServer
        .from("seller_branding_campaigns")
        .update({
          payment_status: "paid",
          payment_ref: paymentId,
          payment_order_id: orderId,
          payment_txn_id: paymentId,
          paid_at: nowIso,
          approval_status: "pending_review",
          updated_at: nowIso,
        })
        .eq("id", campaignId)
        .in("seller_id", ctx.sellerIds);

      if (pkg) {
        await recordBrandingTransaction({
          sellerId: ctx.primarySellerId,
          storeName: ctx.storeName,
          campaignId,
          packageKey: pkg.key,
          trackType: "app_ad",
          amountInr: pkg.amount_inr,
          durationDays: pkg.duration_days,
          paymentMethod: "online_checkout",
          gatewayOrderId: orderId,
          gatewayPaymentId: paymentId,
          notes: `Verified online payment — ${pkg.name} (${pkg.duration_days}d, awaiting Admin approval)`,
        });
      }

      return NextResponse.json({
        success: true,
        activated: false,
        message:
          "Online payment verified! Your App Offer/Festival Ad is queued for quick SuperAdmin review.",
      });
    }

    // -------------------------------------------------------------------------
    // 4. PAUSE / RESUME LIVE APP AD CAMPAIGN
    // -------------------------------------------------------------------------
    if (action === "update_status") {
      const campaignId = String(body.campaignId || "").trim();
      const nextStatus = String(body.status || "").trim();
      if (!campaignId || !["paused", "live"].includes(nextStatus)) {
        return NextResponse.json({ success: false, error: "Invalid status update." }, { status: 400 });
      }

      const { error: updErr } = await supabaseServer
        .from("seller_branding_campaigns")
        .update({
          approval_status: nextStatus,
          updated_at: nowIso,
        })
        .eq("id", campaignId)
        .in("seller_id", ctx.sellerIds);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Campaign ${nextStatus === "live" ? "resumed" : "paused"}.`,
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported App Branding action." }, { status: 400 });
  } catch (err) {
    console.error("[API /seller/marketing/branding POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
