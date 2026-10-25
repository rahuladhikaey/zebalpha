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
    const { parent_category_id, proposed_name, description, reason } = body;

    if (!parent_category_id) {
      return NextResponse.json({ success: false, error: "Parent Main Category is required" }, { status: 400 });
    }

    if (!proposed_name || typeof proposed_name !== "string" || proposed_name.trim().length < 2) {
      return NextResponse.json({ success: false, error: "Valid subcategory name is required (min 2 characters)" }, { status: 400 });
    }

    const cleanName = proposed_name.trim();

    // 1. Verify parent category exists and is a Main Category (parent_id is null)
    const { data: parentCat, error: parentError } = await supabaseServer
      .from("categories")
      .select("id, name, parent_id, is_active")
      .eq("id", parent_category_id)
      .maybeSingle();

    if (parentError || !parentCat) {
      return NextResponse.json({ success: false, error: "Invalid parent Main Category specified" }, { status: 400 });
    }

    if (parentCat.parent_id !== null) {
      return NextResponse.json({ success: false, error: "Subcategories can only be proposed under a Main Category" }, { status: 400 });
    }

    // 2. Check if an approved subcategory with this name already exists under the parent
    const { data: existingApproved } = await supabaseServer
      .from("categories")
      .select("id, name")
      .eq("parent_id", parent_category_id)
      .ilike("name", cleanName)
      .maybeSingle();

    if (existingApproved) {
      return NextResponse.json({
        success: false,
        error: `A subcategory named "${existingApproved.name}" already exists under ${parentCat.name}. You can select it directly.`,
        existing_category_id: existingApproved.id
      }, { status: 409 });
    }

    // 3. Check if seller already has a pending request with this name
    const { data: existingRequest } = await supabaseServer
      .from("category_requests")
      .select("id, status")
      .eq("seller_id", sellerId)
      .eq("parent_category_id", parent_category_id)
      .ilike("proposed_name", cleanName)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: `You already have a pending proposal for "${cleanName}" under ${parentCat.name}. Super Admin review is in progress.`
      }, { status: 409 });
    }

    const proposedSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newRequest = {
      seller_id: sellerId,
      parent_category_id,
      proposed_name: cleanName,
      proposed_slug: proposedSlug,
      description: description ? String(description).trim() : null,
      reason: reason ? String(reason).trim() : null,
      status: "PENDING",
      created_at: new Date().toISOString()
    };

    const { data: created, error: insertError } = await supabaseServer
      .from("category_requests")
      .insert([newRequest])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Proposal for "${cleanName}" submitted successfully. It will be reviewed by Super Admin.`,
      request: created
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to submit request" }, { status: 500 });
  }
}
