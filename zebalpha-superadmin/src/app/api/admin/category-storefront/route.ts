import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";
import { invalidateCategoriesCache } from "@/lib/redisInvalidator";
import {
  buildDefaultCategoryBlueprint,
  resolveThemeTokens,
  type CategoryThemePresetKey,
  type CategoryWidgetConfig,
} from "@/lib/categoryStorefrontTypes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const { searchParams } = new URL(req.url);
    const requestedCategoryId = searchParams.get("category_id");

    // 1. Fetch all active categories
    const { data: allCats, error: catErr } = await supabaseServer
      .from("categories")
      .select("id, name, slug, icon_key, icon_url, image_url, display_order, is_active, show_in_navigation, parent_id")
      .or("is_active.is.null,is_active.eq.true")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (catErr) throw catErr;

    const rows = (allCats || []) as any[];
    const mainCategories = rows.filter((c) => !c.parent_id);
    const selectedCat =
      (requestedCategoryId && mainCategories.find((c) => String(c.id) === String(requestedCategoryId))) ||
      mainCategories[0] ||
      null;

    if (!selectedCat) {
      return NextResponse.json({
        success: true,
        data: {
          mainCategories: [],
          selectedCategory: null,
          blueprint: null,
          subcategories: [],
          spotlightRequests: [],
          migrationRequired: false,
        },
      });
    }

    const subcategories = rows.filter((c) => String(c.parent_id || "") === String(selectedCat.id));
    const categoryIdSet = [String(selectedCat.id), ...subcategories.map((sc) => String(sc.id))];

    // 2. Fetch saved layout, spotlight requests & real category preview products in parallel
    let savedLayout: any = null;
    let migrationRequired = false;
    let spotlightRequests: any[] = [];
    let previewProducts: any[] = [];
    let previewBrands: Array<{
      brand_name: string;
      product_count: number;
      max_discount: number;
      min_price: number;
      primary_image: string;
      secondary_image: string;
    }> = [];

    const [layoutRes, spotlightRes, productsRes] = await Promise.all([
      (async () => {
        try {
          return await supabaseServer
            .from("category_storefront_layouts")
            .select("*")
            .eq("category_id", selectedCat.id)
            .maybeSingle();
        } catch {
          return { data: null, error: { code: "42P01", message: "does not exist" } };
        }
      })(),
      (async () => {
        try {
          return await supabaseServer
            .from("category_spotlight_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(60);
        } catch {
          return { data: [], error: null };
        }
      })(),
      (async () => {
        try {
          const idCsv = categoryIdSet.join(",");
          return await supabaseServer
            .from("products")
            .select(
              "id, name, brand, seller_name, price, mrp, original_price, image_url, thumbnail_url, images, rating, category_id, subcategory_id, specifications, is_active, status, approval_status"
            )
            .neq("is_active", false)
            .or(`category_id.in.(${idCsv}),subcategory_id.in.(${idCsv})`)
            .order("created_at", { ascending: false })
            .limit(36);
        } catch {
          return { data: [], error: null };
        }
      })(),
    ]);

    if (layoutRes.error) {
      if (layoutRes.error.code === "42P01" || layoutRes.error.message?.includes("does not exist")) {
        migrationRequired = true;
      }
    } else {
      savedLayout = layoutRes.data;
    }

    if (!migrationRequired && !spotlightRes.error && Array.isArray(spotlightRes.data)) {
      spotlightRequests = spotlightRes.data.map((r: any) => ({
        ...r,
        category_name:
          mainCategories.find((m) => String(m.id) === String(r.category_id))?.name || "Category",
      }));
    }

    if (!productsRes.error && Array.isArray(productsRes.data)) {
      previewProducts = productsRes.data
        .filter((p: any) => {
          if (p.is_active === false) return false;
          const st = String(p.status || "").toUpperCase();
          if (st === "DELETED" || st === "COMING_SOON") return false;
          if (String(p.approval_status || "").toLowerCase() === "rejected") return false;
          return true;
        })
        .map((p: any) => {
          const specs = (p.specifications && typeof p.specifications === "object" ? p.specifications : {}) as Record<string, any>;
          const price = Number(p.price || 0);
          const mrp = Number(p.mrp || p.original_price || price);
          const discountPercent = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
          const imgs: string[] = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
          const primaryImg = p.image_url || p.thumbnail_url || imgs[0] || "";
          const rawTags = specs.storefront_tags || specs.store_tags || specs.tags || [];
          const storeTags = Array.isArray(rawTags)
            ? rawTags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
            : [];
          return {
            id: String(p.id),
            name: String(p.name || "Product"),
            brand: String(p.brand || p.seller_name || "Zebalpha").trim(),
            price,
            mrp,
            discountPercent,
            image_url: primaryImg,
            images: imgs.length > 0 ? imgs : primaryImg ? [primaryImg] : [],
            rating: Number(p.rating || 0),
            category_id: p.category_id ? String(p.category_id) : null,
            subcategory_id: p.subcategory_id ? String(p.subcategory_id) : null,
            storeTags,
            isCombo: specs.is_combo === true || specs.is_combo === "true" || /\b(combo|kit|pack of|set of)\b/i.test(String(p.name || "")),
          };
        });

      const brandMap = new Map<
        string,
        { brand_name: string; product_count: number; max_discount: number; min_price: number; primary_image: string; secondary_image: string }
      >();
      for (const p of previewProducts) {
        const key = p.brand.toLowerCase();
        const cur = brandMap.get(key);
        if (!cur) {
          brandMap.set(key, {
            brand_name: p.brand,
            product_count: 1,
            max_discount: p.discountPercent,
            min_price: p.price || 0,
            primary_image: p.image_url,
            secondary_image: p.images[1] || p.image_url,
          });
        } else {
          cur.product_count += 1;
          cur.max_discount = Math.max(cur.max_discount, p.discountPercent);
          if (p.price > 0 && (cur.min_price === 0 || p.price < cur.min_price)) cur.min_price = p.price;
          if (!cur.secondary_image || cur.secondary_image === cur.primary_image) {
            if (p.image_url && p.image_url !== cur.primary_image) cur.secondary_image = p.image_url;
          }
        }
      }
      previewBrands = Array.from(brandMap.values()).sort((a, b) => b.product_count - a.product_count);
    }

    const defaultBp = buildDefaultCategoryBlueprint(
      { id: String(selectedCat.id), name: String(selectedCat.name), slug: String(selectedCat.slug || "") },
      subcategories.map((sc) => ({
        id: String(sc.id),
        name: String(sc.name),
        slug: String(sc.slug || ""),
        image_url: sc.image_url,
        icon_key: sc.icon_key,
        icon_url: sc.icon_url,
      }))
    );

    const savedWidgets = Array.isArray(savedLayout?.widgets) ? (savedLayout.widgets as CategoryWidgetConfig[]) : [];
    const themePreset = (savedLayout?.theme_preset as CategoryThemePresetKey) || defaultBp.theme_preset;
    const blueprint = {
      ...defaultBp,
      is_enabled: savedLayout?.is_enabled !== false,
      theme_preset: themePreset,
      theme_tokens: resolveThemeTokens(themePreset, savedLayout?.theme_tokens || null),
      widgets: (savedWidgets.length > 0 ? savedWidgets : defaultBp.widgets)
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
      updated_at: savedLayout?.updated_at || null,
    };

    return NextResponse.json({
      success: true,
      data: {
        mainCategories,
        selectedCategory: selectedCat,
        blueprint,
        subcategories,
        spotlightRequests,
        previewProducts,
        previewBrands,
        migrationRequired,
      },
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Category Storefront GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireSuperAdmin(req);
    const body = await req.json();

    // Action A: Update Subcategory Portrait Image
    if (body.action === "update_subcategory_image") {
      const { subcategory_id, image_url } = body;
      if (!subcategory_id) {
        return NextResponse.json({ success: false, message: "Missing subcategory_id" }, { status: 400 });
      }
      const { error } = await supabaseServer
        .from("categories")
        .update({ image_url: image_url?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", subcategory_id);
      if (error) throw error;
      await invalidateCategoriesCache();
      return NextResponse.json({ success: true, message: "Subcategory portrait updated" });
    }

    // Action B: Save Category Storefront Blueprint
    const { category_id, is_enabled, theme_preset, theme_tokens, widgets } = body;
    if (!category_id) {
      return NextResponse.json({ success: false, message: "Missing category_id" }, { status: 400 });
    }

    const normalizedWidgets = Array.isArray(widgets)
      ? widgets.map((w: any, idx: number) => ({ ...w, display_order: idx + 1 }))
      : [];

    const { data, error } = await supabaseServer
      .from("category_storefront_layouts")
      .upsert(
        {
          category_id,
          is_enabled: is_enabled !== false,
          theme_preset: theme_preset || "fashion_streetwear_lime",
          theme_tokens: theme_tokens || {},
          widgets: normalizedWidgets,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "category_id" }
      )
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            success: false,
            migrationRequired: true,
            message: "Run supabase/add_category_storefront_sdui_engine.sql in Supabase SQL Editor first.",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    await invalidateCategoriesCache();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Category Storefront PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireSuperAdmin(req);
    const body = await req.json();
    const { request_id, status, rejection_reason } = body;

    if (!request_id || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid request_id or status" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("category_spotlight_requests")
      .update({
        status,
        rejection_reason: status === "REJECTED" ? rejection_reason || "Does not meet guidelines" : null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .select()
      .single();

    if (error) throw error;

    await invalidateCategoriesCache();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Category Storefront PATCH Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
