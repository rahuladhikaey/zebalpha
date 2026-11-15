export interface PublicReview {
  id: string | number;
  product_id: string;
  user_id?: string | null;
  user_name: string;
  rating: number;
  comment: string;
  is_approved?: boolean;
  is_verified_buyer?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductRatingSummary {
  rating: number;
  review_count: number;
}

export interface ProductRatingBreakdown {
  average: number;
  count: number;
  breakdown: Record<5 | 4 | 3 | 2 | 1, number>;
}

/**
 * Aggregates approved review rows into a lookup map keyed by stringified product_id.
 */
export function aggregateReviewsByProductId(
  rows: Array<{ product_id?: string | number | null; rating?: number | string | null }>
): Record<string, ProductRatingSummary> {
  const totals = new Map<string, { sum: number; count: number }>();

  for (const row of rows || []) {
    if (!row || row.product_id == null) continue;
    const ratingNum = Number(row.rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) continue;

    const pid = String(row.product_id);
    const current = totals.get(pid) || { sum: 0, count: 0 };
    current.sum += ratingNum;
    current.count += 1;
    totals.set(pid, current);
  }

  const summaries: Record<string, ProductRatingSummary> = {};
  for (const [pid, { sum, count }] of totals.entries()) {
    summaries[pid] = {
      rating: Number((sum / count).toFixed(1)),
      review_count: count,
    };
  }
  return summaries;
}

/**
 * Computes overall average, total count, and 5..1 star distribution percentages.
 */
export function computeRatingBreakdown(
  rows: Array<{ rating?: number | string | null }>
): ProductRatingBreakdown {
  const counts: Record<5 | 4 | 3 | 2 | 1, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let validCount = 0;

  for (const row of rows || []) {
    const num = Number(row?.rating);
    if (!Number.isFinite(num) || num < 1 || num > 5) continue;
    sum += num;
    validCount += 1;
    const star = Math.min(5, Math.max(1, Math.round(num))) as 5 | 4 | 3 | 2 | 1;
    counts[star] += 1;
  }

  if (validCount === 0) {
    return {
      average: 0,
      count: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  return {
    average: Number((sum / validCount).toFixed(1)),
    count: validCount,
    breakdown: {
      5: Math.round((counts[5] / validCount) * 100),
      4: Math.round((counts[4] / validCount) * 100),
      3: Math.round((counts[3] / validCount) * 100),
      2: Math.round((counts[2] / validCount) * 100),
      1: Math.round((counts[1] / validCount) * 100),
    },
  };
}

/**
 * Attaches aggregated rating and review_count onto a product array.
 */
export function attachRatingsToProducts<T extends { id: string | number; rating?: number; review_count?: number }>(
  products: T[],
  ratingsMap: Record<string, ProductRatingSummary>
): Array<T & ProductRatingSummary> {
  return (products || []).map((p) => {
    const summary = ratingsMap[String(p.id)];
    return {
      ...p,
      rating: summary ? summary.rating : 0,
      review_count: summary ? summary.review_count : 0,
    };
  });
}

type ReviewQueryResult = PromiseLike<{
  data: Array<{ product_id?: string | number | null; rating?: number | string | null }> | null;
  error: { message: string } | null;
}>;

interface ReviewReadClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => ReviewQueryResult & {
        in: (column: string, values: string[]) => ReviewQueryResult;
      };
    };
  };
}

/**
 * Fetches approved reviews (only non-PII product_id + rating columns) in safe ID batches
 * and returns a map of product ratings without touching nonexistent products.rating columns.
 */
export async function fetchProductRatingSummaries(
  client: unknown,
  productIds?: Array<string | number>
): Promise<Record<string, ProductRatingSummary>> {
  const typedClient = client as ReviewReadClient | null | undefined;
  if (!typedClient) return {};
  if (Array.isArray(productIds) && productIds.length === 0) return {};

  try {
    const allRows: Array<{ product_id?: string | number | null; rating?: number | string | null }> = [];

    if (Array.isArray(productIds) && productIds.length > 0) {
      const uniqueIds = Array.from(new Set(productIds.map((id) => String(id)).filter(Boolean)));
      const chunkSize = 80;

      for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const { data, error } = await typedClient
          .from("reviews")
          .select("product_id, rating")
          .eq("is_approved", true)
          .in("product_id", chunk);

        if (error) {
          console.warn("[Ratings] Batch summary query notice:", error.message);
          continue;
        }
        if (Array.isArray(data)) {
          allRows.push(...data);
        }
      }
    } else {
      const { data, error } = await typedClient
        .from("reviews")
        .select("product_id, rating")
        .eq("is_approved", true);

      if (error) {
        console.warn("[Ratings] Global summary query notice:", error.message);
        return {};
      }
      if (Array.isArray(data)) {
        allRows.push(...data);
      }
    }

    return aggregateReviewsByProductId(allRows);
  } catch (err) {
    console.warn("[Ratings] Exception fetching rating summaries:", err);
    return {};
  }
}

/**
 * Dispatches a custom browser event and clears local summary hints so any open
 * views / tabs can refresh rating badges after a customer submits or updates a review.
 */
export function broadcastReviewUpdated(productId: string | number, summary?: ProductRatingSummary) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("zebalpha:review-updated", {
      detail: {
        productId: String(productId),
        summary,
      },
    })
  );
}
