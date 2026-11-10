import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

const SLIM_FIELDS =
  "id, name, brand, price, mrp, image_url, images, category_id, subcategory_id, collection, stock, low_stock_limit, status, is_active, is_approved, approval_status, created_at, specifications, seller_id, packages";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(1, limitParam), 40); // Standard 20 items per page

    const cursorParam = searchParams.get("cursor");
    const categoryParam = searchParams.get("category");
    const subcategoryParam = searchParams.get("subcategory");
    const searchParam = searchParams.get("search") || searchParams.get("q");
    const brandParam = searchParams.get("brand");
    const sortParam = searchParams.get("sort") || "newest";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;

    let query = supabase
      .from("products")
      .select(SLIM_FIELDS, { count: "exact" })
      .or("is_active.is.null,is_active.eq.true")
      .neq("approval_status", "rejected")
      .neq("status", "COMING_SOON")
      .neq("tier", "DROP");

    // Category / Collection Filter
    if (categoryParam && categoryParam !== "all" && categoryParam.trim()) {
      const cat = categoryParam.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat);

      if (isUuid) {
        query = query.or(`category_id.eq.${cat},subcategory_id.eq.${cat}`);
      } else {
        const clean = cat.toLowerCase().replace(/[-_]/g, " ").trim();
        const slug = cat.toLowerCase().replace(/\s+/g, "-").trim();
        const synSet = new Set<string>();

        if (/\b(crocs?|clogs?)\b/i.test(clean)) {
          synSet.add("croc");
          synSet.add("crocs");
          synSet.add("clog");
          synSet.add("clogs");
        } else if (/\b(shoes?|sneakers?|footwear|sandals?|slippers?|slides?|loafers?|boots?)\b/i.test(clean)) {
          synSet.add("shoe");
          synSet.add("shoes");
          synSet.add("sneaker");
          synSet.add("sneakers");
          synSet.add("footwear");
          synSet.add("sandal");
          synSet.add("sandals");
          synSet.add("slipper");
          synSet.add("slippers");
        }

        if (/\b(kurtis?|kurtas?|anarkali)\b/i.test(clean)) {
          synSet.add("kurti");
          synSet.add("kurtis");
          synSet.add("kurta");
          synSet.add("kurtas");
          synSet.add("anarkali");
        }

        if (/\b(sarees?|saris?)\b/i.test(clean)) {
          synSet.add("saree");
          synSet.add("sarees");
          synSet.add("sari");
          synSet.add("saris");
        }

        if (/\b(bags?|totes?|handbags?|backpacks?|clutches?)\b/i.test(clean)) {
          synSet.add("tote bag");
          synSet.add("tote bags");
          synSet.add("tote");
          synSet.add("totes");
          synSet.add("handbag");
          synSet.add("handbags");
          synSet.add("backpack");
          synSet.add("bag");
          synSet.add("bags");
        }

        if (/\b(t[- ]?shirts?|tees?|polos?)\b/i.test(clean)) {
          synSet.add("t-shirt");
          synSet.add("tshirt");
          synSet.add("t-shirts");
          synSet.add("tshirts");
          synSet.add("tee");
          synSet.add("tees");
          synSet.add("graphic tee");
          synSet.add("oversized tee");
          synSet.add("polo");
          synSet.add("polos");
        }

        if (/\b(jeans?|denims?|pants?|trousers?|cargos?|shorts?|joggers?)\b/i.test(clean)) {
          synSet.add("jean");
          synSet.add("jeans");
          synSet.add("denim");
          synSet.add("pant");
          synSet.add("pants");
          synSet.add("trouser");
          synSet.add("trousers");
        }

        if (/\b(hoodies?|sweatshirts?|jackets?)\b/i.test(clean)) {
          synSet.add("hoodie");
          synSet.add("hoodies");
          synSet.add("sweatshirt");
          synSet.add("sweatshirts");
          synSet.add("jacket");
        }

        const synonyms = Array.from(synSet);
        let matchedCatIds: string[] = [];

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

          const { data: matchedCats } = await supabase
            .from("categories")
            .select("id, name, parent_id")
            .or(catFilters.join(","));

          if (matchedCats && matchedCats.length > 0) {
            const directIds = matchedCats.map((c: any) => c.id);
            const { data: subcats } = await supabase
              .from("categories")
              .select("id")
              .in("parent_id", directIds);

            matchedCatIds = Array.from(
              new Set([...directIds, ...(subcats || []).map((s: any) => s.id)])
            );
          }
        } catch (_) {}

        const orConditions: string[] = [];
        if (matchedCatIds.length > 0) {
          orConditions.push(`category_id.in.(${matchedCatIds.join(",")})`);
          orConditions.push(`subcategory_id.in.(${matchedCatIds.join(",")})`);
        }

        // Match product textual attributes (WITHOUT non-existent category column)
        orConditions.push(`name.ilike.%${clean}%`);
        orConditions.push(`collection.ilike.%${clean}%`);
        orConditions.push(`description.ilike.%${clean}%`);

        // Deconstruct multi-word clean terms (e.g. "women saree" -> matches "saree")
        const significantWords = clean
          .split(/\s+/)
          .filter((w) => w.length > 2 && w !== "women" && w !== "mens" && w !== "men");
        significantWords.forEach((word) => {
          orConditions.push(`name.ilike.%${word}%`);
        });

        synonyms.forEach((syn) => {
          orConditions.push(`name.ilike.%${syn}%`);
          orConditions.push(`collection.ilike.%${syn}%`);
        });

        if (orConditions.length > 0) {
          query = query.or(orConditions.join(","));
        }
      }
    }

    // Subcategory Filter
    if (subcategoryParam && subcategoryParam.trim()) {
      query = query.eq("subcategory_id", subcategoryParam.trim());
    }

    // Search Query Filter
    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%,collection.ilike.%${q}%`
      );
    }

    // Brand Filter
    if (brandParam && brandParam.trim()) {
      query = query.ilike("brand", `%${brandParam.trim()}%`);
    }

    // Price Range Filter
    if (minPrice !== null && !isNaN(minPrice)) {
      query = query.gte("price", minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      query = query.lte("price", maxPrice);
    }

    // Sorting & Cursor Logic
    const decodedCursor = cursorParam ? decodeCursor(cursorParam) : null;

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
      // Default: newest first (created_at desc)
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      if (decodedCursor) {
        query = query.or(
          `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`
        );
      }
    }

    // Fetch limit + 1 to reliably know if hasMore is true
    query = query.limit(limit + 1);

    const { data: rows, count, error } = await query;

    if (error) {
      console.error("API /api/products error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = rows || [];
    const hasMore = items.length > limit;
    const returnItems = hasMore ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasMore && returnItems.length > 0) {
      const lastItem = returnItems[returnItems.length - 1];
      nextCursor = encodeCursor(lastItem.created_at || new Date().toISOString(), lastItem.id);
    }

    return NextResponse.json(
      {
        items: returnItems,
        nextCursor,
        hasMore,
        totalCount: count || returnItems.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/products:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

