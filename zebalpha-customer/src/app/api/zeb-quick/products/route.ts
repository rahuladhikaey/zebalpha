import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = String(searchParams.get("pincode") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    const categoryGroup = searchParams.get("category_group") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const q = (searchParams.get("q") || "").trim();
    const idsParam = searchParams.get("ids") || "";

    const supabase = getSupabaseServer();
    const db = supabase.schema("zeb_quick");

    // 1. If specific IDs requested (e.g. for Wishlist)
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) return NextResponse.json({ serviceable: true, products: [] });
      const { data: items, error } = await db
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("is_active", true);
      if (error) {
        return NextResponse.json({ serviceable: true, products: [], warning: error.message });
      }
      return NextResponse.json({ serviceable: true, products: items || [] });
    }

    // 2. Validate pincode against active ZebQuick corridor
    if (pincode.length === 6) {
      const { data: pinRow } = await db
        .from("serviceable_pincodes")
        .select("pincode, area_name, city, corridor_name")
        .eq("pincode", pincode)
        .eq("is_active", true)
        .maybeSingle();

      if (!pinRow) {
        return NextResponse.json({
          serviceable: false,
          pincode,
          products: [],
          message: "ZebQuick 5–6 Hr delivery is currently available on the Sealdah – Krishnanagar route.",
        });
      }
    }

    // 3. Find local approved ZebQuick sellers serving this pincode
    let sellerIds: string[] | null = null;
    if (pincode.length === 6) {
      const { data: sellers } = await db
        .from("sellers")
        .select("seller_id, pickup_pincode, serviceable_pincodes")
        .eq("is_active", true)
        .eq("is_approved", true);

      if (Array.isArray(sellers) && sellers.length > 0) {
        const matched = sellers.filter(
          (s: any) =>
            s.pickup_pincode === pincode ||
            (Array.isArray(s.serviceable_pincodes) && s.serviceable_pincodes.includes(pincode)) ||
            // Same 3-digit postal zone prefix (e.g. 700xxx or 741xxx or 743xxx)
            (typeof s.pickup_pincode === "string" && s.pickup_pincode.slice(0, 3) === pincode.slice(0, 3))
        );
        sellerIds = matched.map((s: any) => s.seller_id);
        if (sellerIds.length === 0) {
          return NextResponse.json({ serviceable: true, pincode, products: [] });
        }
      }
    }

    // 4. Query ZebQuick products
    let query = db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .gt("zeb_quick_stock", 0)
      .order("activated_at", { ascending: false })
      .limit(100);

    if (sellerIds && sellerIds.length > 0) {
      query = query.in("seller_id", sellerIds);
    }
    if (categoryGroup && categoryGroup !== "All") {
      query = query.eq("category_group", categoryGroup);
    }
    if (subcategory) {
      query = query.eq("subcategory_slug", subcategory);
    }
    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data: products, error } = await query;
    if (error) {
      return NextResponse.json({ serviceable: true, pincode, products: [], warning: error.message });
    }

    const productList = products || [];

    // Build Blinkit-style Bestsellers 2x2 collage groups (ordered by sales velocity, then product count)
    let bestsellerGroups: Array<{
      category_group: string;
      subcategory_slug: string;
      title: string;
      totalCount: number;
      moreCount: number;
      previewImages: string[];
    }> = [];

    if (productList.length > 0 && !categoryGroup && !subcategory && !q) {
      const salesCountByProd = new Map<string, number>();
      try {
        const { data: recentSales } = await db
          .from("order_items")
          .select("zeb_quick_product_id, quantity")
          .limit(500);
        (recentSales || []).forEach((row: any) => {
          const pid = String(row.zeb_quick_product_id || "");
          if (pid) {
            salesCountByProd.set(pid, (salesCountByProd.get(pid) || 0) + Number(row.quantity || 1));
          }
        });
      } catch {}

      const groupMap = new Map<
        string,
        {
          category_group: string;
          subcategory_slug: string;
          title: string;
          salesScore: number;
          images: string[];
          totalCount: number;
        }
      >();

      for (const p of productList) {
        const key = String(p.subcategory_slug || p.category_group || "essentials");
        const niceTitle = key
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        const existing = groupMap.get(key) || {
          category_group: String(p.category_group || "Everyday Essentials"),
          subcategory_slug: String(p.subcategory_slug || ""),
          title: niceTitle,
          salesScore: 0,
          images: [],
          totalCount: 0,
        };
        existing.totalCount += 1;
        existing.salesScore += salesCountByProd.get(String(p.id)) || 0;
        const img =
          p.image_url ||
          (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "");
        if (img && existing.images.length < 4) {
          existing.images.push(String(img));
        }
        groupMap.set(key, existing);
      }

      bestsellerGroups = Array.from(groupMap.values())
        .sort((a, b) => b.salesScore - a.salesScore || b.totalCount - a.totalCount)
        .slice(0, 6)
        .map((g) => ({
          category_group: g.category_group,
          subcategory_slug: g.subcategory_slug,
          title: g.title,
          totalCount: g.totalCount,
          moreCount: Math.max(0, g.totalCount - 4),
          previewImages: g.images,
        }));
    }

    return NextResponse.json({
      serviceable: true,
      pincode,
      products: productList,
      bestsellerGroups,
    });
  } catch (err: any) {
    return NextResponse.json({ serviceable: false, products: [], error: err?.message || "Server error" }, { status: 500 });
  }
}
