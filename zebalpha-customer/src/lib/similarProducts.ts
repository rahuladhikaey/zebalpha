import { Product } from "@/lib/types";
import { supabaseServer } from "@/lib/supabaseServer";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getCachedOrFetch } from "@/lib/cacheHelper";

// Columns verified to exist on products table (NO nonexistent 'rating' or 'review_count' columns)
const SIMILAR_PRODUCT_FIELDS =
  "id, name, brand, price, mrp, stock, status, is_active, is_approved, approval_status, image_url, images, category_id, seller_id, description, packages, specifications, created_at";

export interface SimilarProductItem extends Product {
  rating?: number;
  review_count?: number;
  discount_percentage?: number;
  highlight_label?: string;
  thumbnail_url?: string;
}

export interface ProductTaxonomy {
  family: "kurtis" | "footwear" | "sarees" | "tshirts" | "bags" | "general";
  title: string;
}

/**
 * Detect product taxonomy family and dynamic Flipkart/Amazon-style recommendation title
 */
export function detectProductFamily(product: Product): ProductTaxonomy {
  const name = (product.name || "").toLowerCase();
  const catName = ((product as any).category_name || "").toLowerCase();
  const rawCat = (product.specifications as any)?.category || (product.specifications as any)?.product_type || "";
  const combined = `${name} ${catName} ${rawCat}`;

  // 1. Sarees (Distinctive traditional apparel)
  if (/\b(saree|sari|blouse\s*piece|tissue\s*saree|pallu)\b/i.test(combined)) {
    return { family: "sarees", title: "Similar Sarees & Festive Wear" };
  }

  // 2. Kurtis & Kurtas
  if (/\b(kurti|kurtis|kurta|kurtas|anarkali|tunic|ethnic\s*top)\b/i.test(combined)) {
    return { family: "kurtis", title: "Similar Kurtis & Ethnic Tops" };
  }

  // 3. Footwear & Clogs
  if (/\b(clog|clogs|croc|crocs|slip-on|slides?|sneakers?|footwear|loafers?)\b/i.test(combined)) {
    return { family: "footwear", title: "Similar Clogs & Footwear" };
  }

  // 4. T-Shirts & Tops
  if (/\b(t-shirt|tshirt|tee|tees|polo|hoodie|sweatshirt|oversized\s*tee)\b/i.test(combined)) {
    return { family: "tshirts", title: "Similar T-Shirts & Tops" };
  }

  // 5. Bags & Accessories
  if (/\b(bag|bags|tote|handbag|backpack|purse)\b/i.test(combined)) {
    return { family: "bags", title: "Similar Bags & Accessories" };
  }

  return {
    family: "general",
    title: catName || rawCat ? `Similar Products in ${catName || rawCat}` : "Similar Products You Might Like",
  };
}

/**
 * Resilient Supabase client provider with public anon fallback
 */
function getResilientSupabaseClient(): SupabaseClient {
  try {
    if (supabaseServer) return supabaseServer;
  } catch (e) {
    // Fall through to anon client
  }

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_A_URL ||
    "https://qjpahzstldiatfbutvfc.supabase.co"
  ).trim();

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI"
  ).trim();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Intelligent Similar Products Recommendation Engine (Flipkart / Amazon E-Commerce Grade)
 *
 * Matching Priority:
 * Priority 1 — Same Product Taxonomy Family (e.g. Kurti to Kurti, Clogs to Clogs, Saree to Saree)
 * Priority 2 — Same Category ID
 * Priority 3 — Title Keyword Match
 * Priority 4 — Similar Price Range (±30% gets +30, ±60% gets +15)
 * Priority 5 — Real Review Ratings & Freshness
 */
export async function getSimilarProducts(
  currentProduct: Product,
  limit: number = 20
): Promise<SimilarProductItem[]> {
  const productId = currentProduct.id;
  if (!productId) return [];

  const cacheKey = `products:similar:v2:${productId}:limit:${limit}`;

  return getCachedOrFetch<SimilarProductItem[]>(
    cacheKey,
    async () => {
      try {
        const client = getResilientSupabaseClient();
        const currentTax = detectProductFamily(currentProduct);
        const currentCatId = currentProduct.category_id;
        const currentPrice = Number(currentProduct.price) || 0;
        const currentName = (currentProduct.name || "").toLowerCase().trim();

        const specs = (currentProduct.specifications && typeof currentProduct.specifications === "object")
          ? currentProduct.specifications
          : {};
        const currentGender = (specs.target_gender || specs.gender || "").toLowerCase().trim();

        // 1. Gather Candidate Pool
        let candidatePool: any[] = [];
        const seenIds = new Set<string>([String(productId)]);

        // 1a. If product has category_id, fetch items in that category
        if (currentCatId) {
          try {
            const { data: catProducts, error: catErr } = await client
              .from("products")
              .select(SIMILAR_PRODUCT_FIELDS)
              .eq("category_id", currentCatId)
              .neq("id", productId)
              .or("is_active.is.null,is_active.eq.true")
              .order("created_at", { ascending: false })
              .limit(50);

            if (catProducts && !catErr) {
              for (const p of catProducts) {
                if (!seenIds.has(String(p.id))) {
                  seenIds.add(String(p.id));
                  candidatePool.push(p);
                }
              }
            }
          } catch (cErr) {
            console.warn("[Similar Products] Notice fetching category candidates:", cErr);
          }
        }

        // 1b. Always fetch broader active catalog items to ensure pool is rich and never empty
        try {
          const { data: broaderProducts, error: broadErr } = await client
            .from("products")
            .select(SIMILAR_PRODUCT_FIELDS)
            .neq("id", productId)
            .or("is_active.is.null,is_active.eq.true")
            .order("created_at", { ascending: false })
            .limit(100);

          if (broaderProducts && !broadErr) {
            for (const p of broaderProducts) {
              if (!seenIds.has(String(p.id))) {
                seenIds.add(String(p.id));
                candidatePool.push(p);
              }
            }
          }
        } catch (bErr) {
          console.warn("[Similar Products] Notice fetching broader candidates:", bErr);
        }

        if (candidatePool.length === 0) {
          return [];
        }

        // 2. Filter Valid Products (active, approved, in-stock or coming soon)
        const validCandidates = candidatePool.filter((p: any) => {
          if (String(p.id) === String(productId)) return false;
          if (p.is_active === false) return false;
          if (p.status === "BLOCKED" || p.status === "DELETED" || p.status === "ARCHIVED") return false;
          if (p.approval_status && p.approval_status !== "approved") return false;

          const mainStock = Number(p.stock) || 0;
          let packagesStock = 0;
          if (Array.isArray(p.packages) && p.packages.length > 0) {
            packagesStock = p.packages.reduce((sum: number, pkg: any) => sum + (Number(pkg.stock) || 0), 0);
          }
          if (mainStock <= 0 && packagesStock <= 0 && p.status !== "COMING_SOON") {
            return false;
          }

          return true;
        });

        if (validCandidates.length === 0) {
          return [];
        }

        // 3. Fetch real verified review ratings for candidates
        const candidateIds = validCandidates.map((c) => c.id);
        const ratingMap = new Map<string, { avg: number; count: number }>();

        try {
          const { data: reviewsData } = await client
            .from("reviews")
            .select("product_id, rating")
            .in("product_id", candidateIds)
            .eq("is_approved", true);

          if (reviewsData && reviewsData.length > 0) {
            const sums = new Map<string, { total: number; count: number }>();
            for (const rev of reviewsData) {
              const pid = String(rev.product_id);
              const cur = sums.get(pid) || { total: 0, count: 0 };
              cur.total += Number(rev.rating) || 0;
              cur.count += 1;
              sums.set(pid, cur);
            }
            sums.forEach((val, pid) => {
              ratingMap.set(pid, {
                avg: Number((val.total / val.count).toFixed(1)),
                count: val.count,
              });
            });
          }
        } catch (revErr) {
          console.warn("[Similar Products] Notice fetching reviews:", revErr);
        }

        // Title keyword extractor
        const extractKeywords = (title: string): string[] => {
          return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 3 && !["with", "this", "best", "women", "mens", "neck", "pure"].includes(w));
        };
        const currentKeywords = extractKeywords(currentName);

        // 4. Score each candidate according to recommendation priorities
        interface ScoredProduct {
          product: any;
          score: number;
        }

        const scoredProducts: ScoredProduct[] = validCandidates.map((candidate: any) => {
          let score = 0;
          const cTax = detectProductFamily(candidate);
          const cName = (candidate.name || "").toLowerCase().trim();
          const cPrice = Number(candidate.price) || 0;
          const cSpecs = (candidate.specifications && typeof candidate.specifications === "object")
            ? candidate.specifications
            : {};
          const cGender = (cSpecs.target_gender || cSpecs.gender || "").toLowerCase().trim();

          // Priority 1 — Same Taxonomy Family (e.g. Kurti to Kurti, Clog to Clog)
          if (currentTax.family !== "general" && cTax.family === currentTax.family) {
            score += 200;
          }

          // Priority 2 — Same Category ID
          if (currentCatId && candidate.category_id && String(currentCatId) === String(candidate.category_id)) {
            score += 80;
          }

          // Priority 3 — Title Keyword Match
          if (currentKeywords.length > 0) {
            for (const kw of currentKeywords) {
              if (cName.includes(kw)) {
                score += 25;
              }
            }
          }

          // Priority 4 — Price Range Proximity (±30% gets +30, ±60% gets +15)
          if (currentPrice > 0 && cPrice > 0) {
            const priceRatio = Math.abs(cPrice - currentPrice) / currentPrice;
            if (priceRatio <= 0.3) {
              score += 30;
            } else if (priceRatio <= 0.6) {
              score += 15;
            }
          }

          // Priority 5 — Target Gender
          if (currentGender && cGender && (currentGender === cGender || cGender === "unisex" || currentGender === "unisex")) {
            score += 20;
          }

          // Priority 6 — Verified Ratings
          const rInfo = ratingMap.get(String(candidate.id));
          if (rInfo && rInfo.avg >= 4.0) {
            score += 15;
          }

          return { product: candidate, score };
        });

        // 5. Sort by highest recommendation score
        scoredProducts.sort((a, b) => b.score - a.score);

        // 6. Map into SimilarProductItem with discount & verified ratings
        const results: SimilarProductItem[] = scoredProducts.slice(0, limit).map(({ product: p }) => {
          const price = Number(p.price) || 0;
          const mrp = p.mrp != null && !isNaN(Number(p.mrp)) ? Number(p.mrp) : 0;
          const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

          const rData = ratingMap.get(String(p.id));
          const rating = rData?.avg;
          const reviewCount = rData?.count;

          // Real Highlight Label
          let highlightLabel: string | undefined = undefined;
          if (discountPct >= 50) {
            highlightLabel = "Special Offer";
          } else if (p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === true) {
            highlightLabel = "Premium";
          } else if (p.status === "COMING_SOON" || (p.specifications as any)?.is_new_drop === true) {
            highlightLabel = "New Arrival";
          } else if (reviewCount && reviewCount >= 5 && rating && rating >= 4.2) {
            highlightLabel = "Bestseller";
          }

          const primaryImg = p.image_url || (Array.isArray(p.images) && p.images[0]) || "";

          return {
            ...p,
            price,
            mrp: mrp > 0 ? mrp : undefined,
            discount_percentage: discountPct > 0 ? discountPct : undefined,
            rating,
            review_count: reviewCount,
            highlight_label: highlightLabel,
            thumbnail_url: primaryImg,
          };
        });

        return results;
      } catch (err) {
        console.error("[Similar Products Engine] Error generating recommendations:", err);
        return [];
      }
    },
    180 // 3 min cache TTL
  );
}
