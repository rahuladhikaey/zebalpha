import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  extractRadiusKm,
  geocodeIndianPincode,
  haversineDistanceKm,
  parseValidCoord,
  resolvePincodeCoordFromRow,
  ZEB_QUICK_DEFAULT_RADIUS_KM,
  ZEB_QUICK_RADIUS_SETTING_KEY,
} from "@/lib/zebQuickGeo";

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

    // 2 & 3. Validate pincode against active ZebQuick corridor & match sellers within live GPS radius (default 25 km)
    let sellerIds: string[] | null = null;
    let maxRadiusKm = ZEB_QUICK_DEFAULT_RADIUS_KM;
    const sellerDistanceMap = new Map<string, number>();

    if (pincode.length === 6) {
      const [{ data: activePincodes }, { data: radiusSetting }, { data: sellers }] = await Promise.all([
        db
          .from("serviceable_pincodes")
          .select("pincode, area_name, city, corridor_name, lat, lng")
          .eq("is_active", true),
        supabase
          .from("store_settings")
          .select("value")
          .eq("key", ZEB_QUICK_RADIUS_SETTING_KEY)
          .maybeSingle(),
        db
          .from("sellers")
          .select("seller_id, pickup_pincode, city, lat, lng, delivery_radius_km, serviceable_pincodes")
          .eq("is_active", true)
          .eq("is_approved", true),
      ]);

      maxRadiusKm = extractRadiusKm(radiusSetting?.value);

      const pinMap = new Map<string, any>();
      (activePincodes || []).forEach((p: any) => {
        pinMap.set(String(p.pincode || "").replace(/\D/g, "").slice(0, 6), p);
      });

      const pinRow = pinMap.get(pincode);
      if (!pinRow) {
        return NextResponse.json({
          serviceable: false,
          pincode,
          radiusKm: maxRadiusKm,
          products: [],
          message: "ZebQuick 5–6 Hr delivery is currently available on the Sealdah – Krishnanagar route.",
        });
      }

      let customerCoord = resolvePincodeCoordFromRow(pincode, pinRow);
      if (!customerCoord) {
        customerCoord = await geocodeIndianPincode(pincode, pinRow.area_name, pinRow.city);
        if (customerCoord) {
          void db
            .from("serviceable_pincodes")
            .update({ lat: customerCoord.lat, lng: customerCoord.lng })
            .eq("pincode", pincode);
        }
      }

      const custCity = String(pinRow.city || "").trim().toLowerCase();

      if (Array.isArray(sellers) && sellers.length > 0) {
        const matchedIds: string[] = [];
        for (const s of sellers as any[]) {
          const sPin = String(s.pickup_pincode || "").replace(/\D/g, "").slice(0, 6);
          const sellerPinRow = pinMap.get(sPin);
          const sellerCoord =
            parseValidCoord(s.lat, s.lng) ||
            resolvePincodeCoordFromRow(sPin, sellerPinRow);

          if (sPin === pincode) {
            matchedIds.push(s.seller_id);
            sellerDistanceMap.set(String(s.seller_id), 0);
            continue;
          }

          if (Array.isArray(s.serviceable_pincodes) && s.serviceable_pincodes.includes(pincode)) {
            const dist = customerCoord && sellerCoord ? haversineDistanceKm(customerCoord, sellerCoord) : 0;
            matchedIds.push(s.seller_id);
            sellerDistanceMap.set(String(s.seller_id), dist);
            continue;
          }

          if (customerCoord && sellerCoord) {
            const dist = haversineDistanceKm(customerCoord, sellerCoord);
            if (dist <= maxRadiusKm) {
              matchedIds.push(s.seller_id);
              sellerDistanceMap.set(String(s.seller_id), dist);
            }
            continue;
          }

          // Fallback ONLY if GPS coordinates are unavailable for a custom unmapped pincode
          const sellerCity = String(sellerPinRow?.city || s.city || "").trim().toLowerCase();
          if (custCity && sellerCity && custCity === sellerCity) {
            matchedIds.push(s.seller_id);
            sellerDistanceMap.set(String(s.seller_id), 0);
          }
        }

        sellerIds = matchedIds;
        if (sellerIds.length === 0) {
          return NextResponse.json({
            serviceable: true,
            pincode,
            radiusKm: maxRadiusKm,
            products: [],
          });
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

    const productList = (products || []).map((p: any) => ({
      ...p,
      distance_km: sellerDistanceMap.has(String(p.seller_id))
        ? sellerDistanceMap.get(String(p.seller_id))
        : null,
    }));

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
      radiusKm: maxRadiusKm,
      products: productList,
      bestsellerGroups,
    });
  } catch (err: any) {
    return NextResponse.json({ serviceable: false, products: [], error: err?.message || "Server error" }, { status: 500 });
  }
}
