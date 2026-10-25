import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryIcon } from "@/lib/categoryIcons";

export const dynamic = "force-dynamic";
export const revalidate = 60; // 60s cache

export async function GET() {
  try {
    const { data: dbCategories, error } = await supabaseServer
      .from("categories")
      .select("id, name, slug, description, icon_key, icon_url, icon_source, image_url, display_order, is_active, show_in_navigation, parent_id")
      .is("parent_id", null)
      .or("is_active.is.null,is_active.eq.true")
      .or("show_in_navigation.is.null,show_in_navigation.eq.true")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[API /api/categories/navigation Error]:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const categories = (dbCategories || []).map((cat) => {
      const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: cat.description || null,
        icon_key: cat.icon_key && cat.icon_source === "ADMIN" ? cat.icon_key : resolved.icon_key,
        icon_url: cat.icon_url || null,
        icon_source: cat.icon_source || resolved.icon_source,
        image_url: cat.image_url || null,
        display_order: cat.display_order ?? 0,
        is_active: cat.is_active !== false,
        show_in_navigation: cat.show_in_navigation !== false,
      };
    });

    return NextResponse.json({
      success: true,
      data: categories,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    console.error("[API /api/categories/navigation Exception]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
