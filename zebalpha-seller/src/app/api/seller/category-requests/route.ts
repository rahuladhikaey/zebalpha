import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) { }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Resolve seller ID
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id")
      .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    const { data: requests, error } = await supabaseServer
      .from("category_requests")
      .select(`
        id,
        seller_id,
        parent_category_id,
        proposed_name,
        proposed_slug,
        description,
        reason,
        status,
        rejection_reason,
        approved_category_id,
        created_at,
        reviewed_at,
        parent_category:categories!category_requests_parent_category_id_fkey(id, name, slug)
      `)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback query if foreign key relation name is different
      const { data: fallbackRequests, error: fallbackError } = await supabaseServer
        .from("category_requests")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ success: false, error: fallbackError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, requests: fallbackRequests || [] });
    }

    return NextResponse.json({ success: true, requests: requests || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch category requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id")
      .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    const body = await req.json();
    const parent_category_id = body.parent_category_id;
    const rawName = body.name || body.proposed_name || "";

    if (!parent_category_id) {
      return NextResponse.json({ success: false, error: "Parent Main Category is required" }, { status: 400 });
    }

    if (!rawName || typeof rawName !== "string" || rawName.trim().length < 2) {
      return NextResponse.json({ success: false, error: "Valid subcategory name is required (min 2 characters)" }, { status: 400 });
    }

    const cleanName = rawName.trim();

    // 1. Verify parent category exists and is a Main Category
    const { data: parentCat, error: parentError } = await supabaseServer
      .from("categories")
      .select("id, name, parent_id, is_active, icon_key")
      .eq("id", parent_category_id)
      .maybeSingle();

    if (parentError || !parentCat) {
      return NextResponse.json({ success: false, error: "Invalid parent Main Category specified" }, { status: 400 });
    }

    // 2. Check if subcategory with this name already exists under the parent
    const { data: existingSubcat } = await supabaseServer
      .from("categories")
      .select("id, name, slug, parent_id, is_active")
      .eq("parent_id", parent_category_id)
      .ilike("name", cleanName)
      .maybeSingle();

    if (existingSubcat) {
      // If it exists and is inactive, activate it
      if (!existingSubcat.is_active) {
        await supabaseServer
          .from("categories")
          .update({ is_active: true })
          .eq("id", existingSubcat.id);
      }

      return NextResponse.json({
        success: true,
        message: `Subcategory "${existingSubcat.name}" already exists and has been selected.`,
        category: existingSubcat
      }, { status: 200 });
    }

    // 3. Generate clean slug
    let baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) {
      baseSlug = `subcat-${Date.now().toString(36)}`;
    }

    let finalSlug = baseSlug;
    const { data: slugMatch } = await supabaseServer
      .from("categories")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (slugMatch) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // 4. Directly create active subcategory in database
    const newCategoryPayload = {
      name: cleanName,
      slug: finalSlug,
      parent_id: parent_category_id,
      is_active: true,
      show_in_navigation: true,
      created_by: sellerId,
      icon_key: parentCat.icon_key || "package",
      icon_source: "AUTO",
      display_order: 0,
    };

    const { data: createdCategory, error: insertError } = await supabaseServer
      .from("categories")
      .insert([newCategoryPayload])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // 5. Optional audit log entry in category_requests (marked as APPROVED)
    try {
      await supabaseServer.from("category_requests").insert([{
        seller_id: sellerId,
        parent_category_id,
        proposed_name: cleanName,
        proposed_slug: finalSlug,
        status: "APPROVED",
        approved_category_id: createdCategory.id,
        reviewed_at: new Date().toISOString()
      }]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Subcategory "${cleanName}" created successfully!`,
      category: createdCategory
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to create subcategory" }, { status: 500 });
  }
}
