import { Product } from "@/lib/types";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch } from "@/lib/cacheHelper";

const SIMILAR_PRODUCT_FIELDS =
  "id, name, brand, price, mrp, stock, status, is_active, is_approved, image_url, images, category_id, seller_id, description, packages, specifications, rating, review_count, created_at";

export interface SimilarProductItem extends Product {
  rating?: number;
  review_count?: number;
  discount_percentage?: number;
  highlight_label?: string;
}

/**
 * Intelligent Similar Products Recommendation Engine
 *
 * Matching Priority:
 * Priority 1 — Same Product Type / Subcategory / Style (e.g. Oversized T-Shirt vs Oversized T-Shirt)
 * Priority 2 — Same Category and Subcategory
 * Priority 3 — Similar Price Range (approx ±30% range preferred)
 * Priority 4 — Similar Attributes (Gender, Fabric, Fit, Color, Brand)
 * Priority 5 — Popularity, Freshness, and High Inventory Quality
 */
export async function getSimilarProducts(
  currentProduct: Product,
  limit: number = 20
): Promise<SimilarProductItem[]> {
  const productId = currentProduct.id;
  if (!productId) return [];

  const cacheKey = `products:similar:${productId}:limit:${limit}`;

  return getCachedOrFetch<SimilarProductItem[]>(
    cacheKey,
    async () => {
      try {
        const specs = (currentProduct.specifications && typeof currentProduct.specifications === "object")
          ? currentProduct.specifications
          : {};

        const currentName = (currentProduct.name || "").toLowerCase().trim();
        const currentBrand = (currentProduct.brand || specs.brand || "").toLowerCase().trim();
        const currentCatId = currentProduct.category_id;
        const currentPrice = Number(currentProduct.price) || 0;
        const currentProductType = (specs.product_type || specs.productTypeId || specs.type || "").toLowerCase().trim();
        const currentSubcategory = (specs.subcategory || specs.subcategory_name || "").toLowerCase().trim();
        const currentGender = (specs.target_gender || specs.gender || "").toLowerCase().trim();
        const currentFit = (specs.fit_type || specs.fit || "").toLowerCase().trim();
        const currentFabric = (specs.fabric || specs.material || "").toLowerCase().trim();
        const currentColor = (
          (currentProduct as any).default_color ||
          (currentProduct as any).main_color ||
          specs.default_color ||
          specs.main_color ||
          specs.color ||
          ""
        ).toLowerCase().trim();

        // Infer search keywords from product title if type/subcategory missing
        // e.g., "oversized t-shirt", "polo", "hoodie", "cargo", "shirt", "jacket", "kurti", "saree", "sneakers"
        const inferKeywords = (title: string): string[] => {
          const keywords: string[] = [];
          const patterns = [
            "oversized t-shirt",
            "oversized tee",
            "t-shirt",
            "tshirt",
            "tee",
            "polo",
            "hoodie",
            "sweatshirt",
            "cargo",
            "shirt",
            "kurti",
            "kurta",
            "saree",
            "dress",
            "jacket",
            "shoes",
            "sneakers",
            "jeans",
            "trouser",
            "shorts",
            "blazer",
            "cap",
            "watch",
          ];
          for (const pat of patterns) {
            if (title.includes(pat)) {
              keywords.push(pat);
            }
          }
          return keywords;
        };

        const currentTitleKeywords = inferKeywords(currentName);

        // 1. Fetch Candidate Pool
        // Prefer products in the same category first, or broader pool if category has few items
        let candidatePool: any[] = [];

        if (currentCatId) {
          const { data: catProducts } = await supabaseServer
            .from("products")
            .select(SIMILAR_PRODUCT_FIELDS)
            .eq("category_id", currentCatId)
            .neq("id", productId)
            .or("is_active.is.null,is_active.eq.true")
            .order("created_at", { ascending: false })
            .limit(100);

          if (catProducts && catProducts.length > 0) {
            candidatePool = catProducts;
          }
        }

        // If candidate pool is too small (< 8 items), fetch broader active catalog products
        if (candidatePool.length < 8) {
          const { data: broaderProducts } = await supabaseServer
            .from("products")
            .select(SIMILAR_PRODUCT_FIELDS)
            .neq("id", productId)
            .or("is_active.is.null,is_active.eq.true")
            .order("created_at", { ascending: false })
            .limit(120);

          if (broaderProducts && broaderProducts.length > 0) {
            const existingIds = new Set(candidatePool.map((p) => String(p.id)));
            for (const bp of broaderProducts) {
              if (!existingIds.has(String(bp.id))) {
                candidatePool.push(bp);
                existingIds.add(String(bp.id));
              }
            }
          }
        }

        if (candidatePool.length === 0) {
          return [];
        }

        // Filter out items with no stock, blocked, or inactive
        const validCandidates = candidatePool.filter((p: any) => {
          if (String(p.id) === String(productId)) return false;
          if (p.is_active === false) return false;
          if (p.status === "BLOCKED" || p.status === "DELETED" || p.status === "ARCHIVED") return false;
          if (p.approval_status && p.approval_status !== "approved") return false;

          // Check inventory / stock
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

        // Fetch verified ratings for the candidate IDs from 'reviews' table
        const candidateIds = validCandidates.map((c) => c.id);
        const ratingMap = new Map<string, { avg: number; count: number }>();

        try {
          const { data: reviewsData } = await supabaseServer
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
          console.warn("[Similar Products] Notice fetching candidate reviews:", revErr);
        }

        // 2. Score each candidate according to matching priorities
        interface ScoredProduct {
          product: any;
          score: number;
        }

        const scoredProducts: ScoredProduct[] = validCandidates.map((candidate: any) => {
          let score = 0;
          const cSpecs = (candidate.specifications && typeof candidate.specifications === "object")
            ? candidate.specifications
            : {};

          const cName = (candidate.name || "").toLowerCase().trim();
          const cBrand = (candidate.brand || cSpecs.brand || "").toLowerCase().trim();
          const cProductType = (cSpecs.product_type || cSpecs.productTypeId || cSpecs.type || "").toLowerCase().trim();
          const cSubcategory = (cSpecs.subcategory || cSpecs.subcategory_name || "").toLowerCase().trim();
          const cGender = (cSpecs.target_gender || cSpecs.gender || "").toLowerCase().trim();
          const cFit = (cSpecs.fit_type || cSpecs.fit || "").toLowerCase().trim();
          const cFabric = (cSpecs.fabric || cSpecs.material || "").toLowerCase().trim();
          const cColor = (
            (candidate as any).default_color ||
            (candidate as any).main_color ||
            cSpecs.default_color ||
            cSpecs.main_color ||
            cSpecs.color ||
            ""
          ).toLowerCase().trim();
          const cPrice = Number(candidate.price) || 0;

          // Priority 1 — Same Product Type / Explicit Keyword (Weight: 100)
          if (currentProductType && cProductType && currentProductType === cProductType) {
            score += 100;
          } else {
            // Check title keyword intersection
            const cKeywords = inferKeywords(cName);
            const commonKeywords = currentTitleKeywords.filter((k) => cKeywords.includes(k) || cName.includes(k));
            if (commonKeywords.length > 0) {
              score += commonKeywords.length * 40;
            }
          }

          // Priority 2 — Same Category & Subcategory (Weight: 50)
          if (currentCatId && candidate.category_id && String(currentCatId) === String(candidate.category_id)) {
            score += 50;
          }
          if (currentSubcategory && cSubcategory && currentSubcategory === cSubcategory) {
            score += 40;
          }

          // Priority 3 — Similar Price Range (±30% gets +30, ±50% gets +15)
          if (currentPrice > 0 && cPrice > 0) {
            const priceRatio = Math.abs(cPrice - currentPrice) / currentPrice;
            if (priceRatio <= 0.3) {
              score += 30;
            } else if (priceRatio <= 0.5) {
              score += 15;
            }
          }

          // Priority 4 — Similar Attributes (Gender, Fabric, Fit, Color, Brand)
          if (currentGender && cGender && (currentGender === cGender || cGender === "unisex" || currentGender === "unisex")) {
            score += 20;
          }
          if (currentBrand && cBrand && currentBrand === cBrand) {
            score += 15;
          }
          if (currentFit && cFit && currentFit === cFit) {
            score += 12;
          }
          if (currentFabric && cFabric && currentFabric === cFabric) {
            score += 10;
          }
          if (currentColor && cColor && currentColor === cColor) {
            score += 8;
          }

          // Priority 5 — Ratings, Freshness & Popularity
          const rInfo = ratingMap.get(String(candidate.id)) || {
            avg: Number(candidate.rating) || 0,
            count: Number(candidate.review_count) || 0,
          };

          if (rInfo.avg >= 4.0) {
            score += 10;
          }
          if (rInfo.count > 5) {
            score += 5;
          }

          return { product: candidate, score };
        });

        // 3. Sort by highest score descending
        scoredProducts.sort((a, b) => b.score - a.score);

        // 4. Map into SimilarProductItem with calculated discount and verified rating
        const results: SimilarProductItem[] = scoredProducts.slice(0, limit).map(({ product: p }) => {
          const price = Number(p.price) || 0;
          const mrp = p.mrp != null && !isNaN(Number(p.mrp)) ? Number(p.mrp) : 0;
          const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

          // Rating: only use real rating from reviews or real database column
          const rData = ratingMap.get(String(p.id));
          const rating = rData?.avg || (Number(p.rating) > 0 ? Number(p.rating) : undefined);
          const reviewCount = rData?.count || (Number(p.review_count) > 0 ? Number(p.review_count) : undefined);

          // Real Highlight Label
          let highlightLabel: string | undefined = undefined;
          const pSpecs = (p.specifications && typeof p.specifications === "object") ? p.specifications : {};
          if (discountPct >= 50) {
            highlightLabel = "Special Offer";
          } else if (p.tier === "PREMIUM" || pSpecs.is_premium === true) {
            highlightLabel = "Premium";
          } else if (p.status === "COMING_SOON" || pSpecs.is_new_drop === true) {
            highlightLabel = "New Arrival";
          } else if (reviewCount && reviewCount >= 10 && rating && rating >= 4.2) {
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
