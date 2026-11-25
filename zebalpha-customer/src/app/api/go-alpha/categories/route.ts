import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { GO_ALPHA_ALLOWED_SUBCATEGORIES, GO_ALPHA_CATEGORY_GROUPS } from "@shared/constants/goAlpha";

export async function GET() {
  try {
    const db = getSupabaseServer().schema("go_alpha");
    const [{ data: mainCats, error: mainErr }, { data: subCats, error: subErr }] = await Promise.all([
      db.from("main_categories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
      db.from("allowed_subcategories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    ]);

    const mainCategories =
      !mainErr && Array.isArray(mainCats) && mainCats.length > 0
        ? mainCats
        : GO_ALPHA_CATEGORY_GROUPS.map((name, idx) => ({
            id: `seed-${idx}`,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name,
            display_order: idx + 1,
            is_active: true,
          }));

    const subcategories =
      !subErr && Array.isArray(subCats) && subCats.length > 0
        ? subCats
        : GO_ALPHA_ALLOWED_SUBCATEGORIES.map((s, idx) => ({
            id: `seed-sub-${idx}`,
            slug: s.slug,
            name: s.name,
            category_group: s.categoryGroup,
            display_order: idx + 1,
            is_active: true,
          }));

    return NextResponse.json({ mainCategories, subcategories });
  } catch (err: any) {
    return NextResponse.json({
      mainCategories: GO_ALPHA_CATEGORY_GROUPS.map((name, idx) => ({
        id: `seed-${idx}`,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        display_order: idx + 1,
        is_active: true,
      })),
      subcategories: GO_ALPHA_ALLOWED_SUBCATEGORIES.map((s, idx) => ({
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
