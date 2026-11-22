import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const BRANDING_PACKAGES = {
  launch_pilot: {
    key: "launch_pilot",
    name: "Launch Pilot (Free Trial)",
    placement_type: "top_search",
    duration_days: 5,
    amount_inr: 0,
    badge: "First Campaign Free",
    summary: "1st-time featured product boost for eligible quality sellers (Admin Approved).",
    features: [
      "Top Featured placement on ZebAlpha catalog feeds for 5 days",
      "Requires ≥5 live catalogs & zero blocked products",
      "Full live impressions, clicks & order tracking",
    ],
  },
  starter_boost: {
    key: "starter_boost",
    name: "Starter Product Boost",
    placement_type: "top_search",
    duration_days: 7,
    amount_inr: 299,
    badge: "Best for New Listings",
    summary: "Promote up to 4 live products at the top of category & search results.",
    features: [
      "Top Featured badge placement on Web & Android App for 7 days",
      "Boosts up to 4 selected products in relevant categories",
      "Live Impressions, Clicks, CTR & Attributed Orders dashboard",
    ],
  },
  homepage_spotlight: {
    key: "homepage_spotlight",
    name: "Homepage Brand Spotlight",
    placement_type: "homepage_spotlight",
    duration_days: 7,
    amount_inr: 599,
    badge: "Most Popular",
    summary: "Dedicated Featured Indian Brand card on zebalpha.shop homepage + Alpha Media social post.",
    features: [
      "Prime Homepage Brand Spotlight showcase on Web & Android App (7 days)",
      "Includes 1 Alpha Media Team Instagram + Facebook promotional feature",
      "Custom brand headline, tagline & up to 6 showcase products",
    ],
  },
  brand_takeover: {
    key: "brand_takeover",
    name: "Growth Brand Takeover",
    placement_type: "brand_takeover",
    duration_days: 14,
    amount_inr: 1499,
    badge: "Maximum Reach",
    summary: "Full 14-day Homepage Spotlight + Top Search Boost + Alpha Media Reels & Stories.",
    features: [
      "14-day Homepage Brand Spotlight + Top Category Search Boost",
      "Alpha Media Team daily Instagram/Facebook reels & story promotion",
      "Priority review by Alpha Seller Support + full ROAS attribution",
    ],
  },
} as const;

type PackageKey = keyof typeof BRANDING_PACKAGES;

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

function isMissingTableError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || "").toLowerCase();
  const code = String((err as { code?: string })?.code || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

async function resolveSellerAndBalance(user: { id: string; email?: string | null }) {
  let q = supabaseServer.from("sellers").select("*");
  if (user.email && user.email.trim()) {
    q = q.or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
  } else {
    q = q.or(`user_id.eq.${user.id},id.eq.${user.id}`);
  }
  const { data: seller } = await q.maybeSingle();
  const primarySellerId = String(seller?.id || user.id);
  const sellerIds = Array.from(
    new Set([seller?.id, seller?.user_id, user.id].filter(Boolean) as string[])
  );
  const storeName =
    seller?.business_name ||
    seller?.shop_name ||
    seller?.owner_name ||
    seller?.full_name ||
    (user.email ? user.email.split("@")[0] : "Seller Brand");

  // Compute safe available seller balance from seller_ledger_entries if present
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

  return { primarySellerId, sellerIds, storeName, availableBalance };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveSellerAndBalance(user);

    const [prodRes, campRes] = await Promise.all([
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
        .order("created_at", { ascending: false }),
    ]);

    const migrationRequired = isMissingTableError(campRes.error);

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
    const usedLaunchPilot = campaigns.some(
      (c) => c.package_key === "launch_pilot" && c.approval_status !== "rejected"
    );

    const totalImpressions = campaigns.reduce((s: number, c) => s + Number(c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((s: number, c) => s + Number(c.clicks || 0), 0);
    const totalOrders = campaigns.reduce((s: number, c) => s + Number(c.attributed_orders || 0), 0);
    const totalRevenue = campaigns.reduce((s: number, c) => s + Number(c.attributed_revenue || 0), 0);

    return NextResponse.json({
      success: true,
      migrationRequired,
      razorpayConfigured: Boolean(
        (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim() &&
          (process.env.RAZORPAY_KEY_SECRET || "").trim()
      ),
      seller: {
        id: ctx.primarySellerId,
        storeName: ctx.storeName,
        availableBalance: ctx.availableBalance,
        liveCatalogCount: products.length,
        launchPilotEligible: !usedLaunchPilot && products.length >= 1,
      },
      packages: Object.values(BRANDING_PACKAGES),
      summary: {
        liveCount: campaigns.filter((c) => c.approval_status === "live" || c.approval_status === "approved").length,
        pendingCount: campaigns.filter((c) => c.approval_status === "pending_review").length,
        totalImpressions,
        totalClicks,
        ctrPct: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        totalOrders,
        totalRevenue,
      },
      products,
      campaigns,
    });
  } catch (err) {
    console.error("[API /seller/marketing/branding GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load App Branding campaigns" },
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

    const ctx = await resolveSellerAndBalance(user);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (action === "create_campaign") {
      const packageKey = String(body.packageKey || "") as PackageKey;
      const pkg = BRANDING_PACKAGES[packageKey];
      if (!pkg) {
        return NextResponse.json({ success: false, error: "Invalid branding package selected." }, { status: 400 });
      }

      const productIds: string[] = Array.isArray(body.productIds)
        ? body.productIds.map((x: unknown) => String(x || "").trim()).filter(Boolean).slice(0, 6)
        : [];
      const headline = String(body.headline || "").trim().slice(0, 90);
      const tagline = String(body.tagline || "").trim().slice(0, 140);
      const bannerImageUrl = String(body.bannerImageUrl || "").trim();
      const paymentMethod = String(
        body.paymentMethod || (pkg.amount_inr === 0 ? "launch_pilot" : "upi_manual")
      );
      const paymentRef = String(body.paymentRef || "").trim().slice(0, 100);

      if (productIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "Please select at least 1 live product to promote." },
          { status: 400 }
        );
      }
      if (headline.length < 4) {
        return NextResponse.json(
          { success: false, error: "Please enter a clear brand headline (at least 4 characters)." },
          { status: 400 }
        );
      }

      // Resolve cover banner from first selected product if seller didn't supply custom banner URL
      let resolvedBanner = bannerImageUrl;
      if (!resolvedBanner) {
        const { data: firstProd } = await supabaseServer
          .from("products")
          .select("image_url, images")
          .eq("id", productIds[0])
          .maybeSingle();
        resolvedBanner =
          (typeof firstProd?.image_url === "string" && firstProd.image_url.trim()) ||
          (Array.isArray(firstProd?.images) && typeof firstProd.images[0] === "string"
            ? firstProd.images[0]
            : "") ||
          "";
      }

      // Validate payment method
      let finalPaymentMethod: "launch_pilot" | "razorpay_upi" | "seller_balance" | "upi_manual" =
        "upi_manual";
      let paymentStatus: "free_pilot" | "pending" | "paid" | "deducted" = "pending";
      let razorpayOrder: { id: string; amount: number; currency: string; keyId: string } | null = null;

      if (pkg.key === "launch_pilot") {
        finalPaymentMethod = "launch_pilot";
        paymentStatus = "free_pilot";
      } else if (paymentMethod === "seller_balance") {
        if (ctx.availableBalance < pkg.amount_inr) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient available payout balance (₹${ctx.availableBalance}). Required: ₹${pkg.amount_inr}. Please pay via UPI instead.`,
            },
            { status: 400 }
          );
        }
        finalPaymentMethod = "seller_balance";
        paymentStatus = "deducted";
      } else if (paymentMethod === "razorpay_upi") {
        const keyId = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim();
        const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
        if (keyId && keySecret) {
          const authToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
          const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
              Authorization: `Basic ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: Math.round(pkg.amount_inr * 100),
              currency: "INR",
              receipt: `brand_${Date.now().toString().slice(-10)}`,
              notes: {
                seller_id: ctx.primarySellerId,
                package_key: pkg.key,
              },
            }),
          });
          if (rzpRes.ok) {
            const rzpJson = await rzpRes.json();
            razorpayOrder = {
              id: rzpJson.id,
              amount: rzpJson.amount,
              currency: rzpJson.currency,
              keyId,
            };
            finalPaymentMethod = "razorpay_upi";
            paymentStatus = "pending";
          }
        }
      } else {
        finalPaymentMethod = "upi_manual";
        paymentStatus = paymentRef ? "paid" : "pending";
      }

      const { data: created, error: insErr } = await supabaseServer
        .from("seller_branding_campaigns")
        .insert({
          seller_id: ctx.primarySellerId,
          store_name: ctx.storeName,
          campaign_name: `${ctx.storeName} — ${pkg.name}`,
          package_key: pkg.key,
          placement_type: pkg.placement_type,
          product_ids: productIds,
          headline,
          tagline: tagline || `Discover ${ctx.storeName} on ZebAlpha`,
          banner_image_url: resolvedBanner || null,
          cta_url: `/products/${productIds[0]}`,
          duration_days: pkg.duration_days,
          amount_inr: pkg.amount_inr,
          payment_method: finalPaymentMethod,
          payment_status: paymentStatus,
          payment_ref: razorpayOrder?.id || paymentRef || null,
          approval_status: "pending_review",
        })
        .select("*")
        .single();

      if (insErr) {
        if (isMissingTableError(insErr)) {
          return NextResponse.json(
            {
              success: false,
              migrationRequired: true,
              error:
                "Marketing database tables are not initialized yet. Please run supabase/add_seller_marketing_and_branding_system.sql in Supabase SQL Editor.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        campaign: created,
        razorpayOrder,
        message: razorpayOrder
          ? "Complete UPI payment to submit your campaign for review."
          : "Branding campaign submitted! Our Admin & Alpha Media Team will review and take it live shortly.",
      });
    }

    if (action === "verify_razorpay_payment") {
      const campaignId = String(body.campaignId || "").trim();
      const orderId = String(body.razorpay_order_id || "").trim();
      const paymentId = String(body.razorpay_payment_id || "").trim();
      const signature = String(body.razorpay_signature || "").trim();
      const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

      if (!campaignId || !orderId || !paymentId || !signature || !secret) {
        return NextResponse.json({ success: false, error: "Invalid payment verification payload." }, { status: 400 });
      }

      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (expected !== signature) {
        return NextResponse.json({ success: false, error: "Payment signature mismatch." }, { status: 400 });
      }

      await supabaseServer
        .from("seller_branding_campaigns")
        .update({
          payment_status: "paid",
          payment_ref: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
        .in("seller_id", ctx.sellerIds);

      return NextResponse.json({
        success: true,
        message: "Payment verified! Campaign is queued for Admin & Alpha Media approval.",
      });
    }

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
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
        .in("seller_id", ctx.sellerIds);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Campaign ${nextStatus}.` });
    }

    return NextResponse.json({ success: false, error: "Unsupported branding action" }, { status: 400 });
  } catch (err) {
    console.error("[API /seller/marketing/branding POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
