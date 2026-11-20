import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch } from "@/lib/cacheHelper";
import { attachRatingsToProducts, fetchProductRatingSummaries } from "@/lib/productRatings";
import {
  applyMultilingualSearchConstraints,
  parseMultilingualSearchQuery,
  rankProductsByQueryConcepts,
} from "@/lib/multilingualSearch";

export const dynamic = "force-dynamic";

const SLIM_FIELDS =
  "id, name, brand, price, mrp, image_url, images, category_id, subcategory_id, collection, stock, low_stock_limit, status, is_active, is_approved, approval_status, created_at, specifications, seller_id";

interface DecodedCursor {
  createdAt: string;
  id: string;
}

function encodeCursor(createdAt: string, id: string): string {
  const payload = JSON.stringify({ createdAt, id });
  return Buffer.from(payload, "utf-8").toString("base64");
}

function decodeCursor(cursorStr: string): DecodedCursor | null {
  try {
    const raw = Buffer.from(cursorStr, "base64").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.createdAt && parsed.id) {
      return parsed;
    }
  } catch (_) {}
  return null;
}

function slimProductRow(p: any) {
  const specs = p.specifications || {};
  const trimmedImages = Array.isArray(p.images) ? p.images.filter(Boolean).slice(0, 3) : [];
  const slimSpecs: Record<string, any> = {};
  if (specs.tier) slimSpecs.tier = specs.tier;
  if (specs.is_premium !== undefined) slimSpecs.is_premium = specs.is_premium;
  if (specs.is_new_drop !== undefined) slimSpecs.is_new_drop = specs.is_new_drop;
  if (specs.collection) slimSpecs.collection = specs.collection;
  if (specs.category) slimSpecs.category = specs.category;
  if (specs.size_chart) slimSpecs.size_chart = true;

  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    mrp: p.mrp,
    image_url: p.image_url,
    images: trimmedImages,
    thumbnail_url: p.thumbnail_url || p.image_url || trimmedImages[0] || "",
    category_id: p.category_id,
    subcategory_id: p.subcategory_id,
    collection: p.collection || specs.collection || "",
    stock: p.stock,
    low_stock_limit: p.low_stock_limit,
    status: p.status,
    is_active: p.is_active,
    created_at: p.created_at,
    seller_id: p.seller_id,
    specifications: Object.keys(slimSpecs).length > 0 ? slimSpecs : undefined,
    rating: p.rating,
    review_count: p.review_count,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 20), 40);

    const cursorParam = searchParams.get("cursor") || "";
    const categoryParam = searchParams.get("category") || "";
    const subcategoryParam = searchParams.get("subcategory") || "";
    const searchParam = searchParams.get("search") || searchParams.get("q") || "";
    const voiceHintParam = searchParams.get("vq") || "";
    const brandParam = searchParams.get("brand") || "";
    const sortParam = searchParams.get("sort") || "newest";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;

    // Canonical cache key so 500 users requesting the same catalog page share 1 Redis/RAM hit
    const cacheKey = `api:products:v2:l=${limit}:c=${cursorParam.slice(0, 40)}:cat=${categoryParam.toLowerCase().trim()}:sub=${subcategoryParam.trim()}:q=${searchParam.toLowerCase().trim().slice(0, 50)}:vq=${voiceHintParam.toLowerCase().trim().slice(0, 30)}:b=${brandParam.toLowerCase().trim()}:s=${sortParam}:min=${minPrice ?? ""}:max=${maxPrice ?? ""}`;
    const ttlSeconds = searchParam.trim() ? 60 : 180;

    const payload = await getCachedOrFetch(
      cacheKey,
      async () => {
        let matchedCatIds: string[] = [];
        let categoryFilterMeta: { clean: string; significantWords: string[]; synonyms: string[] } | null = null;
        let isUuidCategory = false;
        const validCategory =
          categoryParam &&
          categoryParam !== "all" &&
          categoryParam !== "undefined" &&
          categoryParam !== "null" &&
          categoryParam.trim()
            ? categoryParam.trim()
            : null;

        if (validCategory) {
          isUuidCategory = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validCategory);
          if (!isUuidCategory) {
            const clean = validCategory.toLowerCase().replace(/[-_]/g, " ").trim();
            const slug = validCategory.toLowerCase().replace(/\s+/g, "-").trim();
            const synSet = new Set<string>();

            if (/\b(crocs?|clogs?)\b/i.test(clean)) {
              ["croc", "crocs", "clog", "clogs"].forEach((s) => synSet.add(s));
            } else if (/\b(shoes?|sneakers?|footwear|sandals?|slippers?|slides?|loafers?|boots?)\b/i.test(clean)) {
              ["shoe", "shoes", "sneaker", "sneakers", "footwear", "sandal", "sandals", "slipper", "slippers"].forEach((s) => synSet.add(s));
            }
            if (/\b(kurtis?|kurtas?|anarkali)\b/i.test(clean)) {
              ["kurti", "kurtis", "kurta", "kurtas", "anarkali"].forEach((s) => synSet.add(s));
            }
            if (/\b(sarees?|saris?)\b/i.test(clean)) {
              ["saree", "sarees", "sari", "saris"].forEach((s) => synSet.add(s));
            }
            if (/\b(bags?|totes?|handbags?|backpacks?|clutches?)\b/i.test(clean)) {
              ["tote bag", "tote bags", "tote", "totes", "handbag", "handbags", "backpack", "bag", "bags"].forEach((s) => synSet.add(s));
            }
            if (/\b(t[- ]?shirts?|tees?|polos?)\b/i.test(clean)) {
              ["t-shirt", "tshirt", "t-shirts", "tshirts", "tee", "tees", "graphic tee", "oversized tee", "polo", "polos"].forEach((s) => synSet.add(s));
            }
            if (/\b(jeans?|denims?|pants?|trousers?|cargos?|shorts?|joggers?)\b/i.test(clean)) {
              ["jean", "jeans", "denim", "pant", "pants", "trouser", "trousers"].forEach((s) => synSet.add(s));
            }
            if (/\b(hoodies?|sweatshirts?|jackets?)\b/i.test(clean)) {
              ["hoodie", "hoodies", "sweatshirt", "sweatshirts", "jacket"].forEach((s) => synSet.add(s));
            }

            const synonyms = Array.from(synSet);
            const significantWords = clean
              .split(/\s+/)
              .filter((w) => w.length > 2 && w !== "women" && w !== "mens" && w !== "men");
            categoryFilterMeta = { clean, significantWords, synonyms };

            try {
              const catFilters: string[] = [
                `slug.eq.${slug}`,
                `slug.ilike.%${slug}%`,
                `name.ilike.%${clean}%`,
                `description.ilike.%${clean}%`,
              ];
              synonyms.forEach((syn) => {
                catFilters.push(`name.ilike.%${syn}%`);
                catFilters.push(`slug.ilike.%${syn}%`);
              });

              const { data: matchedCats } = await supabaseServer
                .from("categories")
                .select("id, name, parent_id")
                .or(catFilters.join(","));

              if (matchedCats && matchedCats.length > 0) {
                const directIds = matchedCats.map((c: any) => c.id);
                const { data: subcats } = await supabaseServer
                  .from("categories")
                  .select("id")
                  .in("parent_id", directIds);

                matchedCatIds = Array.from(
                  new Set([...directIds, ...(subcats || []).map((s: any) => s.id)])
                );
              }
            } catch (_) {}
          }
        }

        const parsedSearch =
          searchParam && searchParam.trim()
            ? parseMultilingualSearchQuery(searchParam.trim(), voiceHintParam || null)
            : null;
        const decodedCursor = cursorParam ? decodeCursor(cursorParam) : null;

        const executeProductsQuery = async (searchMode: "and" | "or") => {
          let query = supabaseServer
            .from("products")
            .select(SLIM_FIELDS, { count: "exact" })
            .or("is_active.is.null,is_active.eq.true")
            .neq("approval_status", "rejected")
            .neq("status", "COMING_SOON")
            .neq("tier", "DROP");

          if (validCategory) {
            if (isUuidCategory) {
              query = query.or(`category_id.eq.${validCategory},subcategory_id.eq.${validCategory}`);
            } else if (categoryFilterMeta) {
              const orConditions: string[] = [];
              if (matchedCatIds.length > 0) {
                orConditions.push(`category_id.in.(${matchedCatIds.join(",")})`);
                orConditions.push(`subcategory_id.in.(${matchedCatIds.join(",")})`);
              }
              orConditions.push(`name.ilike.%${categoryFilterMeta.clean}%`);
              orConditions.push(`collection.ilike.%${categoryFilterMeta.clean}%`);
              orConditions.push(`description.ilike.%${categoryFilterMeta.clean}%`);
              categoryFilterMeta.significantWords.forEach((word) => {
                orConditions.push(`name.ilike.%${word}%`);
              });
              categoryFilterMeta.synonyms.forEach((syn) => {
                orConditions.push(`name.ilike.%${syn}%`);
                orConditions.push(`collection.ilike.%${syn}%`);
              });
              if (orConditions.length > 0) {
                query = query.or(orConditions.join(","));
              }
            }
          }

          if (subcategoryParam && subcategoryParam.trim()) {
            query = query.eq("subcategory_id", subcategoryParam.trim());
          }

          if (parsedSearch) {
            query = applyMultilingualSearchConstraints(query, parsedSearch, searchMode, maxPrice);
          }

          if (brandParam && brandParam.trim()) {
            query = query.ilike("brand", `%${brandParam.trim()}%`);
          }

          if (minPrice !== null && !isNaN(minPrice)) {
            query = query.gte("price", minPrice);
          }
          if (maxPrice !== null && !isNaN(maxPrice)) {
            query = query.lte("price", maxPrice);
          }

          if (sortParam === "price_asc") {
            query = query.order("price", { ascending: true }).order("id", { ascending: true });
            if (decodedCursor) {
              query = query.gt("id", decodedCursor.id);
            }
          } else if (sortParam === "price_desc") {
            query = query.order("price", { ascending: false }).order("id", { ascending: true });
            if (decodedCursor) {
              query = query.gt("id", decodedCursor.id);
            }
          } else {
            query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
            if (decodedCursor) {
              query = query.or(
                `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`
              );
            }
          }

          query = query.limit(limit + 1);
          return query;
        };

        const primaryResult = await executeProductsQuery("and");
        let rows = primaryResult.data;
        let count = primaryResult.count;
        const error = primaryResult.error;

        if (
          !error &&
          parsedSearch &&
          parsedSearch.concepts.length > 1 &&
          (!rows || rows.length === 0) &&
          !decodedCursor
        ) {
          const broadened = await executeProductsQuery("or");
          if (!broadened.error && broadened.data && broadened.data.length > 0) {
            rows = broadened.data;
            count = broadened.count;
          }
        }

        if (error) {
          throw new Error(error.message);
        }

        const items = rows || [];
        const hasMore = items.length > limit;
        const rawReturnItems = hasMore ? items.slice(0, limit) : items;
        const ratingsMap = await fetchProductRatingSummaries(
          supabaseServer,
          rawReturnItems.map((p: any) => p.id)
        );
        const ratedItems = attachRatingsToProducts(rawReturnItems, ratingsMap);
        const rankedItems = parsedSearch
          ? rankProductsByQueryConcepts(ratedItems, parsedSearch)
          : ratedItems;
        const returnItems = rankedItems.map(slimProductRow);

        let nextCursor: string | null = null;
        if (hasMore && returnItems.length > 0) {
          const lastItem = returnItems[returnItems.length - 1];
          nextCursor = encodeCursor(lastItem.created_at || new Date().toISOString(), String(lastItem.id));
        }

        return {
          items: returnItems,
          nextCursor,
          hasMore,
          totalCount: count || returnItems.length,
        };
      },
      ttlSeconds
    );

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    console.error("Unexpected error in /api/products:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
