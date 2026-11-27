import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  extractRadiusKm,
  geocodeIndianPincode,
  haversineDistanceKm,
  lookupIndianPincodeMeta,
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
    const userGpsCoord = parseValidCoord(searchParams.get("lat"), searchParams.get("lng"));
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

    // 2 & 3. Pure Blinkit-style real GPS / dynamic geocoded matching within live radius (default 17 km)
    let sellerIds: string[] | null = null;
    let maxRadiusKm = ZEB_QUICK_DEFAULT_RADIUS_KM;
    const sellerDistanceMap = new Map<string, number>();

    if (pincode.length === 6 || userGpsCoord) {
      const [{ data: allPincodes }, { data: radiusSetting }, { data: sellers }] = await Promise.all([
        db
          .from("serviceable_pincodes")
          .select("pincode, area_name, city, corridor_name, lat, lng, is_active"),
        supabase
          .from("store_settings")
          .select("value")
          .eq("key", ZEB_QUICK_RADIUS_SETTING_KEY)
          .maybeSingle(),
        db
          .from("sellers")
          .select("id, seller_id, pickup_pincode, city, lat, lng, delivery_radius_km, serviceable_pincodes")
          .eq("is_active", true)
          .eq("is_approved", true),
      ]);

      maxRadiusKm = extractRadiusKm(radiusSetting?.value);

      const allPinRows = (allPincodes || []) as any[];
      const pinMap = new Map<string, any>();
      const disabledPinSet = new Set<string>();
      for (const p of allPinRows) {
        const clean = String(p.pincode || "").replace(/\D/g, "").slice(0, 6);
        if (p.is_active === false) {
          disabledPinSet.add(clean);
        } else {
          pinMap.set(clean, p);
        }
      }

      // Respect explicit Admin disable
      if (pincode.length === 6 && disabledPinSet.has(pincode)) {
        return NextResponse.json({
          serviceable: false,
          pincode,
          radiusKm: maxRadiusKm,
          products: [],
          message: "ZebQuick 5–6 Hr delivery is currently unavailable in this pincode.",
        });
      }

      const pinRow = pincode.length === 6 ? pinMap.get(pincode) : undefined;
      // Priority 1: Exact live customer GPS (Blinkit-accurate) -> Priority 2: DB pincode cache -> Priority 3: Pan-India auto-geocode
      let customerCoord = userGpsCoord || (pincode.length === 6 ? resolvePincodeCoordFromRow(pincode, pinRow) : null);
      let resolvedCity = String(pinRow?.city || "").trim();

      if (!customerCoord && pincode.length === 6) {
        const meta = await lookupIndianPincodeMeta(pincode, pinRow?.area_name, pinRow?.city);
        customerCoord = meta.coord;
        resolvedCity = resolvedCity || meta.city;
        if (customerCoord && pinRow) {
          void db
            .from("serviceable_pincodes")
            .update({ lat: customerCoord.lat, lng: customerCoord.lng })
            .eq("pincode", pincode);
        }
      }

      const custCity = resolvedCity.toLowerCase();
      const matchedIds: string[] = [];

      if (Array.isArray(sellers) && sellers.length > 0) {
        for (const s of sellers as any[]) {
          const sPin = String(s.pickup_pincode || "").replace(/\D/g, "").slice(0, 6);
          const sellerPinRow = pinMap.get(sPin);
          let sellerCoord =
            parseValidCoord(s.lat, s.lng) ||
            resolvePincodeCoordFromRow(sPin, sellerPinRow);

          // Self-heal seller GPS coordinates automatically if NULL in DB
          if (!sellerCoord && sPin.length === 6) {
            sellerCoord = await geocodeIndianPincode(sPin, sellerPinRow?.area_name, sellerPinRow?.city || s.city);
            if (sellerCoord) {
              void db.from("sellers").update({ lat: sellerCoord.lat, lng: sellerCoord.lng }).eq("id", s.id);
              if (sellerPinRow && !parseValidCoord(sellerPinRow.lat, sellerPinRow.lng)) {
                void db
                  .from("serviceable_pincodes")
                  .update({ lat: sellerCoord.lat, lng: sellerCoord.lng })
                  .eq("pincode", sPin);
              }
            }
          }

          if (pincode.length === 6 && sPin === pincode) {
            matchedIds.push(s.seller_id);
            sellerDistanceMap.set(String(s.seller_id), 0);
            continue;
          }

          if (pincode.length === 6 && Array.isArray(s.serviceable_pincodes) && s.serviceable_pincodes.includes(pincode)) {
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

          // Last-resort fallback ONLY if GPS lookup failed for both sides
          const sellerCity = String(sellerPinRow?.city || s.city || "").trim().toLowerCase();
          if (pinRow && custCity && sellerCity && custCity === sellerCity) {
            matchedIds.push(s.seller_id);
            sellerDistanceMap.set(String(s.seller_id), 0);
          }
        }
      }

      // If pincode wasn't explicitly listed in serviceable_pincodes, verify it falls within 17 km of an active seller or hub
      if (!pinRow && matchedIds.length === 0) {
        let withinHubRadius = false;
        if (customerCoord) {
          for (const [hPin, hRow] of pinMap.entries()) {
            const hCoord = resolvePincodeCoordFromRow(hPin, hRow);
            if (hCoord && haversineDistanceKm(customerCoord, hCoord) <= maxRadiusKm) {
              withinHubRadius = true;
              break;
            }
          }
        }
        if (!withinHubRadius) {
          return NextResponse.json({
            serviceable: false,
            pincode,
            radiusKm: maxRadiusKm,
            products: [],
            message: "ZebQuick 5–6 Hr delivery is coming soon to your area.",
          });
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
