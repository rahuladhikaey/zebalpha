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
        // Find category ID by slug or name
        const { data: matchedCats } = await supabase
          .from("categories")
          .select("id")
          .or(`slug.eq.${cat.toLowerCase()},name.ilike.${cat}`);

        if (matchedCats && matchedCats.length > 0) {
          const foundId = matchedCats[0].id;
          const { data: subcats } = await supabase
            .from("categories")
            .select("id")
            .eq("parent_id", foundId);

          const allIds = [foundId, ...(subcats || []).map((s: any) => s.id)];
          query = query.or(
            `category_id.in.(${allIds.join(",")}),subcategory_id.in.(${allIds.join(",")})`
          );
        } else {
          query = query.ilike("name", `%${cat}%`);
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
