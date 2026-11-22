import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type QualityZone = "none" | "green" | "yellow" | "red" | "blocked";

async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch {
    // Fallback to Bearer token below
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

async function resolveSellerIds(user: { id: string; email?: string | null }): Promise<string[]> {
  let query = supabaseServer.from("sellers").select("id, user_id");
  if (user.email && user.email.trim()) {
    query = query.or(
      `user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`
    );
  } else {
    query = query.or(`user_id.eq.${user.id},id.eq.${user.id}`);
  }
  const { data: seller } = await query.maybeSingle();
  return Array.from(new Set([seller?.id, seller?.user_id, user.id].filter(Boolean) as string[]));
}

function classifyZone(scorePct: number | null, totalRatings: number, isHardBlocked: boolean): QualityZone {
  if (isHardBlocked) return "blocked";
  if (scorePct === null || totalRatings === 0) return "none";
  if (scorePct > 25) return "blocked";
  if (scorePct > 22) return "red";
  if (scorePct > 15) return "yellow";
  return "green";
}

function classifyFeedbackTheme(rawText: string): string {
  const t = String(rawText || "").toLowerCase();
  if (/(size|fit|tight|loose|small|large|length|short|shrink)/i.test(t)) return "Size / Fit Mismatch";
  if (/(color|colour|shade|faded|different\s*color|mismatch)/i.test(t)) return "Color Different from Photo";
  if (/(fabric|material|cloth|thin|cheap|gsm|stitch|tear|torn|quality|rough)/i.test(t))
    return "Fabric & Material Quality";
  if (/(damage|broken|defect|stain|dirty|hole|zipper|print\s*peel)/i.test(t))
    return "Damaged / Defective Item";
  if (/(wrong|different\s*item|missing|not\s*same|duplicate|fake)/i.test(t))
    return "Wrong / Misrepresented Product";
  if (/(late|delay|delivery|packaging|pack)/i.test(t)) return "Packaging / Delivery Experience";
  return "General Product Dissatisfaction";
}

function detectListingImprovements(product: Record<string, unknown>): string[] {
  const tips: string[] = [];
  const specs =
    product.specifications && typeof product.specifications === "object"
      ? (product.specifications as Record<string, unknown>)
      : {};

  const imgs = Array.isArray(product.images)
    ? (product.images as string[]).filter((u) => typeof u === "string" && u.trim().length > 0)
    : [];
  const primaryImg = typeof product.image_url === "string" ? product.image_url.trim() : "";
  const pkgImgs = Array.isArray(product.packages)
    ? (product.packages as Array<Record<string, unknown>>).flatMap((pkg) => {
        const list: string[] = [];
        if (typeof pkg?.image_url === "string" && pkg.image_url.trim()) list.push(pkg.image_url.trim());
        if (Array.isArray(pkg?.gallery)) {
          for (const g of pkg.gallery) {
            if (typeof g === "string" && g.trim()) list.push(g.trim());
          }
        }
        return list;
      })
    : [];
  const totalUniqueImgs = new Set([
    ...imgs,
    ...pkgImgs,
    ...(primaryImg ? [primaryImg] : []),
  ]).size;

  if (totalUniqueImgs < 2) {
    tips.push("Add at least 2–4 high-resolution product photos (front, back & fabric close-up)");
  }

  const hasVideo = Boolean(
    String(product.video_proof_url || specs.video_proof_url || "").trim()
  );
  if (!hasVideo) {
    tips.push("Add Real Product Video Proof (Reel / Short) to boost buyer trust & lower returns");
  }

  const desc = String(product.description || "").trim();
  if (desc.length < 30) {
    tips.push("Write a clear product description with fit, material & wash-care details");
  }

  const hasMaterialOrSpecs = Boolean(
    specs.fabric ||
      specs.material ||
      specs.fit_type ||
      specs.gsm ||
      specs.pattern ||
      specs.neck_type ||
      specs.sleeve_type ||
      specs.occasion ||
      specs.sole_material
  );
  if (!hasMaterialOrSpecs) {
    tips.push("Add fabric, fit & key product specifications to prevent buyer expectation gaps");
  }

  return tips;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sellerIds = await resolveSellerIds(user);

    // 1. Fetch all non-deleted products using select("*") so optional schema columns never cause 500s
    const { data: rawProducts, error: prodErr } = await supabaseServer
      .from("products")
      .select("*")
      .in("seller_id", sellerIds)
      .order("created_at", { ascending: false })
      .limit(300);

    if (prodErr) {
      console.error("[API /seller/quality] products query failed:", prodErr);
      return NextResponse.json(
        { success: false, error: prodErr.message || "Failed to load products" },
        { status: 500 }
      );
    }

    const products = (Array.isArray(rawProducts) ? rawProducts : []).filter(
      (p: Record<string, unknown>) => String(p.status || "").toUpperCase() !== "DELETED"
    );
    const productIds = products.map((p: Record<string, unknown>) => String(p.id));

    // 2. Fetch reviews & returns safely with graceful fallbacks
    const [reviewsRes, returnsRes] = await Promise.all([
      (async () => {
        if (productIds.length === 0) return { data: [], error: null };
        try {
          const primary = await supabaseServer
            .from("reviews")
            .select("*")
            .in("product_id", productIds)
            .order("created_at", { ascending: false })
            .limit(2000);
          if (!primary.error) return primary;
          return { data: [], error: primary.error };
        } catch {
          return { data: [], error: null };
        }
      })(),
      (async () => {
        try {
          const r1 = await supabaseServer
            .from("order_returns")
            .select("*")
            .in("seller_id", sellerIds)
            .order("created_at", { ascending: false })
            .limit(500);
          if (!r1.error && Array.isArray(r1.data)) return r1;
        } catch {
          // Fallback to orders.return_reason below
        }
        try {
          const r2 = await supabaseServer
            .from("orders")
            .select("id, return_reason, order_status, created_at")
            .in("seller_id", sellerIds)
            .not("return_reason", "is", null)
            .order("created_at", { ascending: false })
            .limit(300);
          if (!r2.error && Array.isArray(r2.data)) {
            return {
              data: r2.data.map((o: Record<string, unknown>) => ({
                id: o.id,
                reason: o.return_reason,
                comments: "",
                created_at: o.created_at,
              })),
              error: null,
            };
          }
        } catch {
          // Non-fatal
        }
        return { data: [], error: null };
      })(),
    ]);

    const reviews = (Array.isArray(reviewsRes.data) ? reviewsRes.data : []).filter(
      (r: Record<string, unknown>) => r.is_approved !== false && Number.isFinite(Number(r.rating))
    );

    const returnsList = Array.isArray(returnsRes.data) ? returnsRes.data : [];

    // 3. Aggregate reviews by product_id + global feedback themes
    const productReviewsMap = new Map<
      string,
      Array<{ rating: number; comment: string; created_at: string }>
    >();
    const globalThemeCounts = new Map<string, number>();

    let totalRatingsCount = 0;
    let lowRatingsCount = 0;
    let ratingSum = 0;

    for (const r of reviews as Array<Record<string, unknown>>) {
      const pid = String(r.product_id ?? "").trim();
      const ratingVal = Number(r.rating || 0);
      if (!pid || ratingVal < 1 || ratingVal > 5) continue;

      totalRatingsCount += 1;
      ratingSum += ratingVal;

      const comment = typeof r.comment === "string" ? r.comment.trim() : "";
      const createdAt = typeof r.created_at === "string" ? r.created_at : "";

      const arr = productReviewsMap.get(pid) || [];
      arr.push({ rating: ratingVal, comment, created_at: createdAt });
      productReviewsMap.set(pid, arr);

      if (ratingVal <= 2) {
        lowRatingsCount += 1;
        const theme = classifyFeedbackTheme(comment);
        globalThemeCounts.set(theme, (globalThemeCounts.get(theme) || 0) + 1);
      }
    }

    for (const ret of returnsList as Array<Record<string, unknown>>) {
      const text = [ret.reason, ret.comments].filter(Boolean).join(" ").trim();
      if (text) {
        const theme = classifyFeedbackTheme(text);
        globalThemeCounts.set(theme, (globalThemeCounts.get(theme) || 0) + 1);
      }
    }

    const overallQualityScorePct =
      totalRatingsCount > 0
        ? Number(((lowRatingsCount / totalRatingsCount) * 100).toFixed(1))
        : null;
    const overallAvgRating =
      totalRatingsCount > 0 ? Number((ratingSum / totalRatingsCount).toFixed(1)) : null;
    const overallZone = classifyZone(overallQualityScorePct, totalRatingsCount, false);

    const totalFeedbackSignals = Array.from(globalThemeCounts.values()).reduce((a, b) => a + b, 0);
    const topFeedback = Array.from(globalThemeCounts.entries())
      .map(([theme, count]) => ({
        theme,
        count,
        sharePct:
          totalFeedbackSignals > 0 ? Math.round((count / totalFeedbackSignals) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Build per-product quality records
    const productItems = products.map((p: Record<string, unknown>) => {
      const pid = String(p.id ?? "").trim();
      const pReviews = productReviewsMap.get(pid) || [];
      const pTotal = pReviews.length;
      const pLowList = pReviews.filter((r) => r.rating <= 2);
      const pLow = pLowList.length;
      const pAvg =
        pTotal > 0
          ? Number((pReviews.reduce((acc, r) => acc + r.rating, 0) / pTotal).toFixed(1))
          : null;
      const pScorePct = pTotal > 0 ? Number(((pLow / pTotal) * 100).toFixed(1)) : null;

      const statusUpper = String(p.status || "").toUpperCase();
      const isHardBlocked = statusUpper === "BLOCKED";
      const zone = classifyZone(pScorePct, pTotal, isHardBlocked);

      const pThemeMap = new Map<string, number>();
      for (const lr of pLowList) {
        const th = classifyFeedbackTheme(lr.comment);
        pThemeMap.set(th, (pThemeMap.get(th) || 0) + 1);
      }
      const productFeedback = Array.from(pThemeMap.entries())
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const specs =
        p.specifications && typeof p.specifications === "object"
          ? (p.specifications as Record<string, unknown>)
          : {};

      const fixedAt =
        typeof specs.quality_fixed_at === "string" && specs.quality_fixed_at.trim()
          ? specs.quality_fixed_at.trim()
          : null;
      const fixedImprovements = Array.isArray(specs.quality_fixed_improvements)
        ? (specs.quality_fixed_improvements as string[]).filter((s) => typeof s === "string")
        : [];

      const latestLowReviewTs =
        pLowList.length > 0 && pLowList[0].created_at
          ? new Date(pLowList[0].created_at).getTime()
          : 0;
      const fixedAtTs = fixedAt ? new Date(fixedAt).getTime() : 0;
      const isCurrentlyFixed = Boolean(fixedAt && fixedAtTs >= latestLowReviewTs);

      const listingImprovements = detectListingImprovements(p);
      if (pLow > 0 && !isCurrentlyFixed) {
        listingImprovements.unshift(
          `Address ${pLow} negative (1–2★) customer ${pLow === 1 ? "rating" : "ratings"} & verify product quality before dispatch`
        );
      }

      let bucket: "blocked" | "blocking_soon" | "action_pending" | "fixed" | "healthy" = "healthy";

      if (isHardBlocked || (pTotal >= 3 && pScorePct !== null && pScorePct > 25)) {
        bucket = "blocked";
      } else if (isCurrentlyFixed) {
        bucket = "fixed";
      } else if (
        (pTotal >= 2 && pScorePct !== null && pScorePct > 22) ||
        (pLow >= 2 && pScorePct !== null && pScorePct >= 22)
      ) {
        bucket = "blocking_soon";
      } else if (pLow > 0 || listingImprovements.length > 0) {
        bucket = "action_pending";
      }

      const thumb =
        (typeof p.image_url === "string" && p.image_url.trim()) ||
        (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : "") ||
        null;

      return {
        id: pid,
        name: String(p.name || "Untitled Product"),
        sku: String(p.sku || `CAT-${pid.slice(0, 8).toUpperCase()}`),
        price: Number(p.price || 0),
        image_url: thumb,
        status: String(p.status || "ACTIVE"),
        totalRatings: pTotal,
        lowRatings: pLow,
        avgRating: pAvg,
        qualityScorePct: pScorePct,
        zone,
        bucket,
        feedback: productFeedback,
        listingImprovements,
        fixedAt,
        fixedImprovements:
          fixedImprovements.length > 0
            ? fixedImprovements
            : fixedAt
              ? ["Listing quality reviewed and updated by seller"]
              : [],
        updatedAt: String(p.updated_at || p.created_at || ""),
      };
    });

    const summary = {
      lowRatingsCount,
      totalRatingsCount,
      avgRating: overallAvgRating,
      qualityScorePct: overallQualityScorePct,
      zone: overallZone,
      totalProducts: products.length,
      counts: {
        blockingSoon: productItems.filter((i) => i.bucket === "blocking_soon").length,
        actionPending: productItems.filter((i) => i.bucket === "action_pending").length,
        fixed: productItems.filter((i) => i.bucket === "fixed").length,
        blocked: productItems.filter((i) => i.bucket === "blocked").length,
        all: productItems.length,
      },
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      summary,
      topFeedback,
      products: productItems,
    });
  } catch (err) {
    console.error("[API /seller/quality GET] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load quality metrics" },
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

    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId || "").trim();
    const action = String(body.action || "").trim();
    const improvementsFixed = Array.isArray(body.improvementsFixed)
      ? body.improvementsFixed.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

    if (!productId || action !== "mark_fixed") {
      return NextResponse.json(
        { success: false, error: "Invalid quality action payload" },
        { status: 400 }
      );
    }

    const sellerIds = await resolveSellerIds(user);

    const { data: prod, error: fetchErr } = await supabaseServer
      .from("products")
      .select("id, seller_id, specifications")
      .eq("id", productId)
      .in("seller_id", sellerIds)
      .maybeSingle();

    if (fetchErr || !prod) {
      return NextResponse.json(
        { success: false, error: "Product not found for this seller" },
        { status: 404 }
      );
    }

    const existingSpecs =
      prod.specifications && typeof prod.specifications === "object"
        ? (prod.specifications as Record<string, unknown>)
        : {};

    const updatedSpecs = {
      ...existingSpecs,
      quality_fixed_at: new Date().toISOString(),
      quality_fixed_improvements:
        improvementsFixed.length > 0
          ? improvementsFixed
          : ["Product photos, specs & quality verified by seller"],
    };

    // Update specifications safely (do not depend on optional updated_at column existing)
    const { error: updErr } = await supabaseServer
      .from("products")
      .update({ specifications: updatedSpecs })
      .eq("id", productId);

    if (updErr) {
      console.error("[API /seller/quality POST] update failed:", updErr);
      return NextResponse.json(
        { success: false, error: updErr.message || "Failed to mark product as fixed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fixedAt: updatedSpecs.quality_fixed_at,
    });
  } catch (err) {
    console.error("[API /seller/quality POST] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update product quality status" },
      { status: 500 }
    );
  }
}
