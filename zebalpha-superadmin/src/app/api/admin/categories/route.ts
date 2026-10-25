import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { resolveCategoryIcon } from "@/lib/categoryIcons";

export const dynamic = "force-dynamic";

// GET /api/admin/categories (Fetch all categories with product counts and hierarchy)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("include_inactive") === "true";

    let query = supabaseServer
      .from("categories")
      .select("id, name, slug, description, icon_key, icon_url, icon_source, image_url, display_order, is_active, show_in_navigation, parent_id, created_at, updated_at")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (!includeInactive) {
      query = query.or("is_active.is.null,is_active.eq.true");
    }

    const { data: categories, error } = await query;
    if (error) throw error;

    // Fetch real product count per category (Zero fake data)
    const { data: productCounts, error: countErr } = await supabaseServer
      .from("products")
      .select("category_id, subcategory_id");

    const countMap: Record<string, number> = {};
    if (!countErr && productCounts) {
      for (const p of productCounts) {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
        if (p.subcategory_id) {
          countMap[p.subcategory_id] = (countMap[p.subcategory_id] || 0) + 1;
        }
      }
    }

    const enriched = (categories || []).map((cat: any) => {
      const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
      return {
        ...cat,
        icon_key: cat.icon_key && cat.icon_source === "ADMIN" ? cat.icon_key : resolved.icon_key,
        icon_source: cat.icon_source || resolved.icon_source,
        product_count: countMap[cat.id] || 0,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("[Admin Categories GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/categories (Create Main Category or Subcategory with Auto-Icon)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isArray = Array.isArray(body);
    const rawItems = isArray ? body : [body];

    const payload = rawItems.map((item: any) => {
      const name = (item.name || "").trim();
      const slug = item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const iconRes = resolveCategoryIcon(name, item.icon_key, item.icon_source);

      return {
        name,
        slug,
        description: item.description?.trim() || null,
        parent_id: item.parent_id || null,
        icon_key: item.icon_key && item.icon_source === "ADMIN" ? item.icon_key : iconRes.icon_key,
        icon_url: item.icon_url || null,
        icon_source: item.icon_source === "ADMIN" ? "ADMIN" : iconRes.icon_source,
        image_url: item.image_url || null,
        display_order: parseInt(item.display_order ?? 0, 10) || 0,
        show_in_navigation: item.show_in_navigation !== false,
        is_active: item.is_active !== false,
      };
    });

    const { data, error } = await supabaseServer
      .from("categories")
      .insert(payload)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: isArray ? data : data?.[0] });
  } catch (error: any) {
    console.error("[Admin Categories POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/categories (Update Category)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, message: "Missing id or updates" }, { status: 400 });
    }

    const cleanUpdates: any = { ...updates, updated_at: new Date().toISOString() };

    if (updates.name && (!updates.icon_key || updates.icon_source === "AUTO")) {
      const iconRes = resolveCategoryIcon(updates.name);
      cleanUpdates.icon_key = iconRes.icon_key;
      cleanUpdates.icon_source = iconRes.icon_source;
    }

    const { data, error } = await supabaseServer
      .from("categories")
      .update(cleanUpdates)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("[Admin Categories PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/categories (Safe Archive or Reassign & Delete)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const mergeIntoId = searchParams.get("merge_into_id");
    const force = searchParams.get("force") === "true";

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing category id" }, { status: 400 });
    }

    // 1. If merging into another category, reassign all products first
    if (mergeIntoId) {
      await supabaseServer
        .from("products")
        .update({ category_id: mergeIntoId })
        .eq("category_id", id);

      await supabaseServer
        .from("products")
        .update({ subcategory_id: mergeIntoId })
        .eq("subcategory_id", id);
    }

    // 2. Check remaining product references
    const { count, error: countErr } = await supabaseServer
      .from("products")
      .select("id", { count: "exact", head: true })
      .or(`category_id.eq.${id},subcategory_id.eq.${id}`);

    if (!countErr && count && count > 0 && !force) {
      // Safe Archive: Soft deactivate
      const { error: archiveErr } = await supabaseServer
        .from("categories")
        .update({ is_active: false, show_in_navigation: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (archiveErr) throw archiveErr;

      return NextResponse.json({
        success: true,
        archived: true,
        message: `Category is linked to ${count} active products. It has been safely archived and hidden from customer navigation without breaking historical orders or listings.`,
      });
    }

    const { error } = await supabaseServer
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    console.error("[Admin Categories DELETE Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
