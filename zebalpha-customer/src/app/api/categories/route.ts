import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch } from "@/lib/cacheHelper";
import { resolveCategoryIcon } from "../../../../../shared/constants/categoryIcons";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHierarchy = searchParams.get("hierarchy") === "true";
    const activeOnly = searchParams.get("active") !== "false";

    const cacheKey = `api:categories:v2:active:${activeOnly}:hier:${includeHierarchy}`;

    const data = await getCachedOrFetch(
      cacheKey,
      async () => {
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
          throw new Error(error.message);
        }

        const normalized = (dbCategories || []).map((cat: any) => {
          const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
          return {
            ...cat,
            icon_key: cat.icon_key && cat.icon_source === "ADMIN" ? cat.icon_key : resolved.icon_key,
            icon_source: cat.icon_source || resolved.icon_source,
          };
        });

        if (includeHierarchy) {
          const mainCategories = normalized.filter((c: any) => !c.parent_id);
          const subcategories = normalized.filter((c: any) => !!c.parent_id);

          return mainCategories.map((main: any) => ({
            ...main,
            subcategories: subcategories.filter((sub: any) => String(sub.parent_id) === String(main.id)),
          }));
        }

        return normalized;
      },
      300 // 5 min L1 RAM + Redis TTL
    );

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API /api/categories Exception]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
