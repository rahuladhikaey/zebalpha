import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { ZEB_QUICK_ALLOWED_SUBCATEGORIES, ZEB_QUICK_CATEGORY_GROUPS } from "@shared/constants/zebQuick";

export async function GET() {
  try {
    const db = getSupabaseServer().schema("zeb_quick");
    const [{ data: mainCats, error: mainErr }, { data: subCats, error: subErr }, { data: finSetting }] = await Promise.all([
      db.from("main_categories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
      db.from("allowed_subcategories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
      getSupabaseServer().from("store_settings").select("value").eq("key", "marketplace_financial_rules").maybeSingle(),
    ]);
    const returnWindowDays = Number((finSetting?.value as any)?.customer_return_window_days ?? 5);

    const mainCategories =
      !mainErr && Array.isArray(mainCats) && mainCats.length > 0
        ? mainCats
        : ZEB_QUICK_CATEGORY_GROUPS.map((name, idx) => ({
            id: `seed-${idx}`,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name,
            display_order: idx + 1,
            is_active: true,
          }));

    const subcategories =
      !subErr && Array.isArray(subCats) && subCats.length > 0
        ? subCats
        : ZEB_QUICK_ALLOWED_SUBCATEGORIES.map((s, idx) => ({
            id: `seed-sub-${idx}`,
            slug: s.slug,
            name: s.name,
            category_group: s.categoryGroup,
            display_order: idx + 1,
            is_active: true,
          }));

    return NextResponse.json({ mainCategories, subcategories, returnWindowDays });
  } catch (err: any) {
    return NextResponse.json({
      mainCategories: ZEB_QUICK_CATEGORY_GROUPS.map((name, idx) => ({
        id: `seed-${idx}`,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        display_order: idx + 1,
        is_active: true,
      })),
      subcategories: ZEB_QUICK_ALLOWED_SUBCATEGORIES.map((s, idx) => ({
        id: `seed-sub-${idx}`,
        slug: s.slug,
        name: s.name,
        category_group: s.categoryGroup,
        display_order: idx + 1,
        is_active: true,
      })),
      warning: err?.message,
    });
  }
}
