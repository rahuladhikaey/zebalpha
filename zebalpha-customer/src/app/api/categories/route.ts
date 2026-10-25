import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryIcon } from "@/lib/categoryIcons";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHierarchy = searchParams.get("hierarchy") === "true";
    const activeOnly = searchParams.get("active") !== "false";

    let query = supabaseServer
      .from("categories")
      .select("id, name, slug, description, icon_key, icon_url, icon_source, image_url, display_order, is_active, show_in_navigation, parent_id")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.or("is_active.is.null,is_active.eq.true");
    }

    const { data: dbCategories, error } = await query;

    if (error) {
      console.error("[API /api/categories Error]:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const normalized = (dbCategories || []).map((cat) => {
      const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
      return {
        ...cat,
        icon_key: cat.icon_key && cat.icon_source === "ADMIN" ? cat.icon_key : resolved.icon_key,
        icon_source: cat.icon_source || resolved.icon_source,
      };
    });

    if (includeHierarchy) {
      const mainCategories = normalized.filter((c) => !c.parent_id);
      const subcategories = normalized.filter((c) => !!c.parent_id);

      const tree = mainCategories.map((main) => ({
        ...main,
        subcategories: subcategories.filter((sub) => String(sub.parent_id) === String(main.id)),
      }));

      return NextResponse.json({ success: true, data: tree });
    }

    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    console.error("[API /api/categories Exception]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
