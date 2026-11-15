import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient, supabaseServer } from "@/shared/utils/supabaseServer";
import { invalidateCacheKey, invalidateCachePattern } from "@/lib/cacheHelper";
import {
  computeRatingBreakdown,
  fetchProductRatingSummaries,
  type PublicReview,
} from "@/lib/productRatings";

export const dynamic = "force-dynamic";

interface ReviewRow {
  id: string | number;
  product_id: string | number;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  rating: number | string;
  comment?: string | null;
  is_approved?: boolean | null;
  created_at: string;
  updated_at?: string;
}

interface OrderLookupRow {
  user_id?: string | null;
  status?: string | null;
  items?: unknown;
}

const PUBLIC_REVIEW_COLUMNS =
  "id, product_id, user_id, user_name, rating, comment, is_approved, created_at, updated_at";

async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data, error } = await supabaseServer.auth.getUser(token);
        if (!error && data?.user) {
          return data.user;
        }
      }
    }
  } catch {
    // Fall back to cookie-based SSR session check
  }

  try {
    const cookieClient = await createSupabaseServerClient();
    const { data, error } = await cookieClient.auth.getUser();
    if (!error && data?.user) {
      return data.user;
    }
  } catch {
    // Ignore cookie client failure for anonymous visitors
  }

  return null;
}

function getCustomerDisplayName(user: User): string {
  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.trim()
        : "";
  if (metaName) return metaName.slice(0, 80);

  if (user.email) {
    return user.email.split("@")[0].slice(0, 80) || "Customer";
  }

  if (user.phone) {
    const tail = user.phone.slice(-4);
    return `Customer •••${tail}`;
  }

  return "ZebAlpha Customer";
}

function doesOrderContainProduct(orderItems: unknown, productId: string): boolean {
  if (!Array.isArray(orderItems)) return false;
  return orderItems.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as { product_id?: string | number | null; id?: string | number | null };
    const pid = record.product_id ?? record.id;
    return pid != null && String(pid) === productId;
  });
}

async function getVerifiedBuyerSet(productId: string, userIds: string[]): Promise<Set<string>> {
  const verified = new Set<string>();
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return verified;

  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("user_id, status, items")
      .in("user_id", uniqueUserIds);

    if (error || !Array.isArray(data)) return verified;

    for (const order of data as OrderLookupRow[]) {
      const statusLower = String(order.status || "").toLowerCase();
      if (statusLower !== "delivered" && statusLower !== "completed") continue;
      if (order.user_id && doesOrderContainProduct(order.items, productId)) {
        verified.add(String(order.user_id));
      }
    }
  } catch {
    // Non-fatal: verified buyer decoration fails gracefully
  }

  return verified;
}

async function findExistingUserReview(productId: string, user: User): Promise<ReviewRow | null> {
  if (user.id) {
    const { data, error } = await supabaseServer
      .from("reviews")
      .select(`${PUBLIC_REVIEW_COLUMNS}, user_email`)
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data as ReviewRow;
  }

  if (user.email) {
    const { data, error } = await supabaseServer
      .from("reviews")
      .select(`${PUBLIC_REVIEW_COLUMNS}, user_email`)
      .eq("product_id", productId)
      .eq("user_email", user.email)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data as ReviewRow;
  }

  return null;
}

function toPublicReview(
  row: ReviewRow,
  verifiedSet: Set<string>,
  fallbackName = "Customer"
): PublicReview {
  const uid = row.user_id ? String(row.user_id) : "";
  return {
    id: row.id,
    product_id: String(row.product_id),
    user_id: row.user_id ?? null,
    user_name: row.user_name || fallbackName,
    rating: Number(row.rating),
    comment: typeof row.comment === "string" ? row.comment : "",
    is_approved: row.is_approved !== false,
    is_verified_buyer: uid ? verifiedSet.has(uid) : false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId")?.trim();
    const productIdsParam = searchParams.get("productIds")?.trim();

    if (productId) {
      const [user, reviewsRes] = await Promise.all([
        getAuthenticatedUser(request),
        supabaseServer
          .from("reviews")
          .select(PUBLIC_REVIEW_COLUMNS)
          .eq("product_id", productId)
          .eq("is_approved", true)
          .order("created_at", { ascending: false }),
      ]);

      if (reviewsRes.error) {
        return NextResponse.json(
          { success: false, error: reviewsRes.error.message },
          { status: 500 }
        );
      }

      const rawReviews = Array.isArray(reviewsRes.data)
        ? (reviewsRes.data as ReviewRow[])
        : [];
      const reviewerIds = rawReviews
        .map((r) => (r.user_id ? String(r.user_id) : ""))
        .filter(Boolean);
      const verifiedSet = await getVerifiedBuyerSet(productId, reviewerIds);

      const reviews: PublicReview[] = rawReviews.map((r) => toPublicReview(r, verifiedSet));

      let userReview: PublicReview | null = null;
      if (user) {
        const match = await findExistingUserReview(productId, user);
        if (match) {
          userReview = toPublicReview(match, verifiedSet, getCustomerDisplayName(user));
        }
      }

      const summary = computeRatingBreakdown(reviews);
      return NextResponse.json({
        success: true,
        reviews,
        summary,
        userReview,
      });
    }

    const ids = productIdsParam
      ? productIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const summaries = await fetchProductRatingSummaries(supabaseServer, ids);
    return NextResponse.json({ success: true, summaries });
  } catch (err: unknown) {
    console.error("[API /reviews GET] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Failed to load reviews";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to submit a rating or review." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const productId = body.productId != null ? String(body.productId).trim() : "";
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required." },
        { status: 400 }
      );
    }

    const parsedRating = Math.round(Number(body.rating));
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json(
        { success: false, error: "Please select a rating between 1 and 5 stars." },
        { status: 400 }
      );
    }

    const cleanComment =
      typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";

    // Verify target product exists before writing review
    const { data: productRow, error: prodErr } = await supabaseServer
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (prodErr) {
      return NextResponse.json(
        { success: false, error: "Could not verify product." },
        { status: 500 }
      );
    }
    if (!productRow) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const displayName = getCustomerDisplayName(user);
    const nowIso = new Date().toISOString();
    const existing = await findExistingUserReview(productId, user);

    let savedRow: ReviewRow | null = null;
    let writeError: { message?: string } | null = null;

    if (existing?.id) {
      const { data, error } = await supabaseServer
        .from("reviews")
        .update({
          rating: parsedRating,
          comment: cleanComment,
          user_id: user.id,
          user_name: displayName,
          user_email: user.email ?? existing.user_email ?? null,
          is_approved: true,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .select(PUBLIC_REVIEW_COLUMNS)
        .single();
      savedRow = data as ReviewRow | null;
      writeError = error;
    } else {
      const { data, error } = await supabaseServer
        .from("reviews")
        .insert([
          {
            product_id: productId,
            user_id: user.id,
            user_name: displayName,
            user_email: user.email ?? null,
            rating: parsedRating,
            comment: cleanComment,
            is_approved: true,
            updated_at: nowIso,
          },
        ])
        .select(PUBLIC_REVIEW_COLUMNS)
        .single();
      savedRow = data as ReviewRow | null;
      writeError = error;
    }

    if (writeError || !savedRow) {
      console.error("[API /reviews POST] Write error:", writeError);
      return NextResponse.json(
        {
          success: false,
          error: writeError?.message || "Failed to save your rating in database.",
        },
        { status: 500 }
      );
    }

    // Recompute summary & invalidate catalog caches in parallel
    const [, , , verifiedSet, summaryRowsRes] = await Promise.all([
      invalidateCacheKey("rec:catalog-snapshot:v1").catch(() => {}),
      invalidateCachePattern("homepage:section:featured:*").catch(() => {}),
      invalidateCachePattern("products:similar:v2:*").catch(() => {}),
      getVerifiedBuyerSet(productId, [user.id]),
      supabaseServer
        .from("reviews")
        .select("rating")
        .eq("product_id", productId)
        .eq("is_approved", true),
    ]);

    try {
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath(`/products/${productId}`);
      revalidatePath("/premium-store");
      revalidatePath("/new-drops");
    } catch {
      // Non-fatal revalidation guard
    }

    const summary = computeRatingBreakdown(
      Array.isArray(summaryRowsRes.data) ? summaryRowsRes.data : [{ rating: parsedRating }]
    );

    const publicReview = toPublicReview(savedRow, verifiedSet, displayName);

    return NextResponse.json({
      success: true,
      updated: Boolean(existing),
      review: publicReview,
      summary: {
        ...summary,
        rating: summary.average,
        review_count: summary.count,
      },
    });
  } catch (err: unknown) {
    console.error("[API /reviews POST] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unexpected server error saving review.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
