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

    // 2. Fetch saved layout for selected category (graceful if migration not yet run)
    let savedLayout: any = null;
    let migrationRequired = false;
    try {
      const { data: layoutRow, error: layoutErr } = await supabaseServer
        .from("category_storefront_layouts")
        .select("*")
        .eq("category_id", selectedCat.id)
        .maybeSingle();
      if (layoutErr) {
        if (layoutErr.code === "42P01" || layoutErr.message?.includes("does not exist")) {
          migrationRequired = true;
        }
      } else {
        savedLayout = layoutRow;
      }
    } catch {
      migrationRequired = true;
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

    // 3. Fetch Seller Spotlight Requests (across all categories or selected)
    let spotlightRequests: any[] = [];
    if (!migrationRequired) {
      try {
        const { data: reqs, error: reqErr } = await supabaseServer
          .from("category_spotlight_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60);
        if (!reqErr && Array.isArray(reqs)) {
          spotlightRequests = reqs.map((r: any) => ({
            ...r,
            category_name:
              mainCategories.find((m) => String(m.id) === String(r.category_id))?.name || "Category",
          }));
        }
      } catch {
        // ignore if table not yet created
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        mainCategories,
        selectedCategory: selectedCat,
        blueprint,
        subcategories,
        spotlightRequests,
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
