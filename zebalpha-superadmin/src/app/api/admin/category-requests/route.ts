import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { resolveCategoryIcon } from "@/lib/serverCategoryIcons";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

// GET /api/admin/category-requests (Fetch all seller-created subcategories and audit logs)
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    // 1. Fetch subcategories directly created by sellers from `categories` table
    const { data: sellerCategories, error: catErr } = await supabaseServer
      .from("categories")
      .select("id, name, slug, description, parent_id, created_by, icon_key, icon_url, icon_source, is_active, show_in_navigation, display_order, created_at, updated_at")
      .not("parent_id", "is", null)
      .not("created_by", "is", null)
      .order("created_at", { ascending: false });

    if (catErr) {
      console.error("[Admin Category Requests] Error fetching seller categories:", catErr);
    }

    // 2. Fetch parent main categories to map parent names
    const { data: parentCategories } = await supabaseServer
      .from("categories")
      .select("id, name, slug")
      .is("parent_id", null);

    const parentMap = new Map<string, any>((parentCategories || []).map((p: any) => [p.id, p]));

    // 3. Fetch product counts for each subcategory
    const { data: productCounts } = await supabaseServer
      .from("products")
      .select("subcategory_id");

    const countMap: Record<string, number> = {};
    if (productCounts) {
      for (const p of productCounts) {
        if (p.subcategory_id) {
          countMap[p.subcategory_id] = (countMap[p.subcategory_id] || 0) + 1;
        }
      }
    }

    // 4. Fetch sellers to resolve seller store names / emails
    const { data: sellers } = await supabaseServer
      .from("sellers")
      .select("id, store_name, owner_name, email");

    const sellerMap = new Map<string, any>((sellers || []).map((s: any) => [s.id, s]));

    const seenCategoryIds = new Set<string>();
    const list: any[] = [];

    // Map seller-created subcategories
    if (sellerCategories) {
      for (const cat of sellerCategories) {
        seenCategoryIds.add(cat.id);
        const parent = cat.parent_id ? parentMap.get(cat.parent_id) : null;
        const seller = cat.created_by ? sellerMap.get(cat.created_by) : null;

        list.push({
          id: cat.id,
          category_id: cat.id,
          name: cat.name,
          slug: cat.slug,
          proposed_name: cat.name,
          proposed_slug: cat.slug,
          description: cat.description || null,
          parent_category_id: cat.parent_id,
          parent_category: parent || { id: cat.parent_id, name: "Main Category", slug: "" },
          seller_id: cat.created_by,
          seller_name: seller?.store_name || seller?.owner_name || seller?.email || `Seller #${cat.created_by?.slice(0, 8)}`,
          seller_email: seller?.email || "",
          product_count: countMap[cat.id] || 0,
          is_active: cat.is_active !== false,
          show_in_navigation: cat.show_in_navigation !== false,
          icon_key: cat.icon_key,
          icon_source: cat.icon_source,
          created_at: cat.created_at,
          source: "DIRECT_SELLER_CREATED"
        });
      }
    }

    // 5. Also query category_requests table for any existing historical requests
    try {
      const { data: rawRequests } = await supabaseServer
        .from("category_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (rawRequests) {
        for (const reqItem of rawRequests) {
          if (reqItem.approved_category_id && seenCategoryIds.has(reqItem.approved_category_id)) {
            continue; // Already included from categories table
          }
          const parent = reqItem.parent_category_id ? parentMap.get(reqItem.parent_category_id) : null;
          const seller = reqItem.seller_id ? sellerMap.get(reqItem.seller_id) : null;
          const catId = reqItem.approved_category_id || reqItem.id;

          list.push({
            id: reqItem.id,
            category_id: catId,
            name: reqItem.proposed_name,
            slug: reqItem.proposed_slug,
            proposed_name: reqItem.proposed_name,
            proposed_slug: reqItem.proposed_slug,
            description: reqItem.description || null,
            parent_category_id: reqItem.parent_category_id,
            parent_category: parent || { id: reqItem.parent_category_id, name: "Main Category", slug: "" },
            seller_id: reqItem.seller_id,
            seller_name: seller?.store_name || seller?.name || seller?.email || `Seller #${reqItem.seller_id?.slice(0, 8)}`,
            seller_email: seller?.email || "",
            product_count: countMap[catId] || 0,
            is_active: reqItem.status === "APPROVED",
            show_in_navigation: true,
            created_at: reqItem.created_at,
            source: "CATEGORY_REQUEST"
          });
        }
      }
    } catch (_) {}

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Category Requests GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/category-requests (Fallback endpoint if needed)
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const body = await req.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ success: false, message: "Missing id or action" }, { status: 400 });
    }

    if (action.toUpperCase() === "APPROVE") {
      const { data: request } = await supabaseServer
        .from("category_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (request) {
        const iconRes = resolveCategoryIcon(request.proposed_name);
        const subcatPayload = {
          name: request.proposed_name,
          slug: request.proposed_slug,
          description: request.description || null,
          parent_id: request.parent_category_id,
          icon_key: iconRes.icon_key,
          icon_source: iconRes.icon_source,
          display_order: 10,
          show_in_navigation: true,
          is_active: true,
          created_by: request.seller_id,
        };

        const { data: newCat } = await supabaseServer
          .from("categories")
          .insert([subcatPayload])
          .select();

        await supabaseServer
          .from("category_requests")
          .update({
            status: "APPROVED",
            reviewed_at: new Date().toISOString(),
            approved_category_id: newCat?.[0]?.id,
          })
          .eq("id", id);
      }
      return NextResponse.json({ success: true, message: "Subcategory approved and activated." });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
